import { TwitterOpenApi } from 'twitter-openapi-typescript';
import { TweetService, type TweetData } from './tweetService';
import { NotificationService } from './notificationService';

export class TwitterApiService {
  private static api: TwitterOpenApi | null = null;
  private static client: any = null;
  private static lastFetchTime: number = 0;
  private static consecutiveErrors: number = 0;
  private static lastConnectionStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';
  private static lastNotificationTime: number = 0;
  private static readonly MIN_FETCH_INTERVAL = 30000; // Minimum 30 seconds
  private static readonly MAX_CONSECUTIVE_ERRORS = 5; // 5 consecutive errors
  private static readonly NOTIFICATION_COOLDOWN = 30 * 60 * 1000; // 30 minutes

  /**
   * Initialize the Twitter API client with authentication cookies
   * Cookies should be obtained from a logged-in Twitter/X session
   */
  static async initialize(): Promise<boolean> {
    try {
      const cookies = process.env.TWITTER_COOKIES;
      
      if (!cookies) {
        console.error('[Twitter API] TWITTER_COOKIES environment variable is not set');
        return false;
      }

      // Parse cookies string (format: "cookie1=value1; cookie2=value2")
      const cookieMap: Record<string, string> = {};
      cookies.split(';').forEach(cookie => {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex);
          const value = trimmed.substring(equalIndex + 1);
          cookieMap[key] = value;
        }
      });

      this.api = new TwitterOpenApi();
      
      this.client = await this.api.getClientFromCookies(cookieMap);

      console.log('[Twitter API] Client initialized successfully');
      return true;
    } catch (error: any) {
      console.error('[Twitter API] Failed to initialize client:', error.message);
      return false;
    }
  }

  /**
   * Get the latest tweet from a user's timeline
   * @param username - Twitter username (without @)
   */
  static async getLatestTweet(username: string): Promise<TweetData | null> {
    try {
      if (!this.client) {
        const initialized = await this.initialize();
        if (!initialized) {
          return null;
        }
      }

      if (!this.client) {
        console.error('[Twitter API] Client is not initialized');
        return null;
      }

      // Get user by screen name using getUserApi
      const userResult = await this.client.getUserApi().getUserByScreenName({ screenName: username });
      
      // Extract user ID
      let userId: string | null = null;
      let userData: any = null;
      
      if (userResult.data?.user) {
        userData = userResult.data.user;
        userId = userData.restId || null;
      } else if (userResult.data?.raw?.result) {
        userData = userResult.data.raw.result;
        userId = userData.restId || null;
      }

      if (!userId) {
        console.error('[Twitter API] Could not get user ID for:', username);
        console.error('[Twitter API] Response structure:', JSON.stringify(userResult.data, null, 2));
        return null;
      }

      console.log('[Twitter API] Found user ID:', userId);

      // Get user timeline tweets using getTweetApi
      const timelineResult = await this.client.getTweetApi().getUserTweets({
        userId: userId,
        count: 1,
      });

      // Extract tweet data from timeline response
      const responseData = timelineResult.data || timelineResult;
      
      console.log('[Twitter API] Timeline response structure:', JSON.stringify(responseData, null, 2).substring(0, 1500));

      // Extract tweet from the timeline structure
      let tweetData: any = null;
      
      if (responseData.raw?.instruction) {
        for (const instruction of responseData.raw.instruction) {
          if (instruction.entries) {
            for (const entry of instruction.entries) {
              if (entry.content?.itemContent?.tweetResults?.result) {
                tweetData = entry.content.itemContent.tweetResults.result;
                break;
              }
            }
            if (tweetData) break;
          }
        }
      }
      
      // Fallback: try to find tweet recursively if structure is off
      if (!tweetData) {
        function findTweet(obj: any, depth = 0): any {
          if (depth > 10) return null;
          
          if (obj && typeof obj === 'object') {
            // Check for tweet object with legacy data
            if (obj.legacy && (obj.legacy.full_text || obj.legacy.text)) {
              return obj;
            }
            if (obj.full_text || obj.text) {
              return obj;
            }
            
            for (const key in obj) {
              const result = findTweet(obj[key], depth + 1);
              if (result) return result;
            }
          }
          return null;
        }
        tweetData = findTweet(responseData);
      }

      if (!tweetData) {
        console.log('[Twitter API] No tweet data found in response');
        return null;
      }

      console.log('[Twitter API] Tweet data keys:', Object.keys(tweetData));
      console.log('[Twitter API] Full tweet data structure:', JSON.stringify(tweetData, null, 2).substring(0, 2000));

      // Extract tweet information from the tweet result
      // The tweet data structure: tweetResults.result has a legacy property with the actual tweet
      // The legacy property contains: id_str, full_text, etc.
      const tweetLegacy = tweetData.legacy;
      
      if (!tweetLegacy) {
        console.error('[Twitter API] Tweet data does not have legacy property');
        // Try alternative paths
        if (tweetData.tweet?.legacy) {
          console.log('[Twitter API] Found legacy in tweet.tweet.legacy');
          const altLegacy = tweetData.tweet.legacy;
          const tweetId = altLegacy.id_str || altLegacy.id?.toString() || null;
          const tweetText = altLegacy.full_text || altLegacy.text || '';
          if (tweetId && tweetText) {
            // Use this alternative path
            const userLegacy = userData?.legacy || userData;
            const authorName = userLegacy?.name || '';
            const authorUsername = userLegacy?.screenName || userLegacy?.screen_name || username;
            const profileImage = userLegacy?.profileImageUrlHttps || userLegacy?.profile_image_url_https || userLegacy?.profile_image_url || null;
            const tweetUrl = `https://x.com/${authorUsername}/status/${tweetId}`;
            const profileUrl = `https://x.com/${authorUsername}`;

            return {
              tweetId: tweetId,
              content: tweetText,
              authorName: authorName,
              authorUsername: authorUsername,
              authorProfileImage: profileImage,
              authorProfileUrl: profileUrl,
              tweetUrl: tweetUrl,
            };
          }
        }
        return null;
      }
      
      const tweetId = tweetLegacy.idStr || tweetLegacy.id_str || tweetLegacy.id?.toString() || null;
      const tweetText = tweetLegacy.fullText || tweetLegacy.full_text || tweetLegacy.text || '';
      
      if (!tweetId || !tweetText) {
        console.error('[Twitter API] Could not extract tweet ID or text from legacy');
        console.error('[Twitter API] Legacy structure:', JSON.stringify(tweetLegacy, null, 2).substring(0, 500));
        return null;
      }
      
      console.log('[Twitter API] Successfully extracted tweet:', tweetId);

      // Extract user information
      let userLegacy = null;
      let profileImage = null;
      
      // Check if tweet has user data embedded
      if (tweetData.core?.userResults?.result?.legacy) {
        userLegacy = tweetData.core.userResults.result.legacy;
        profileImage = userLegacy.profileImageUrlHttps || userLegacy.profile_image_url_https || userLegacy.profile_image_url || null;
      }
      
      // Fall back to original user data if not found in tweet
      if (!userLegacy) {
        userLegacy = userData?.legacy || userData;
        profileImage = userLegacy?.profileImageUrlHttps || userLegacy?.profile_image_url_https || userLegacy?.profile_image_url || null;
      }
      
      const authorName = userLegacy?.name || '';
      const authorUsername = userLegacy?.screenName || userLegacy?.screen_name || username;
      const tweetUrl = `https://x.com/${authorUsername}/status/${tweetId}`;
      const profileUrl = `https://x.com/${authorUsername}`;
      
      console.log('[Twitter API] Profile image URL:', profileImage);

      const result: TweetData = {
        tweetId: tweetId,
        content: tweetText,
        authorName: authorName,
        authorUsername: authorUsername,
        authorProfileImage: profileImage,
        authorProfileUrl: profileUrl,
        tweetUrl: tweetUrl,
      };

      return result;
    } catch (error: any) {
      console.error('[Twitter API] Error fetching latest tweet:', error.message);
      console.error('[Twitter API] Error stack:', error.stack);
      return null;
    }
  }

  /**
   * Fetch and update the latest tweet in the database
   * @param username - Twitter username (without @)
   */
  static async fetchAndUpdateLatestTweet(username: string): Promise<boolean> {
    try {
      // Rate limiting: Don't fetch too frequently
      const now = Date.now();
      const timeSinceLastFetch = now - this.lastFetchTime;
      
      if (timeSinceLastFetch < this.MIN_FETCH_INTERVAL) {
        const waitTime = this.MIN_FETCH_INTERVAL - timeSinceLastFetch;
        console.log(`[Twitter API] Rate limiting: waiting ${Math.ceil(waitTime / 1000)}s before next fetch`);
        return false;
      }

      if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
        const backoffTime = 10 * 60 * 1000;
        if (timeSinceLastFetch < backoffTime) {
          console.log(`[Twitter API] Too many errors, backing off for ${Math.ceil((backoffTime - timeSinceLastFetch) / 60000)} minutes`);
          return false;
        } else {
          this.consecutiveErrors = 0;
        }
      }

      this.lastFetchTime = now;
      const tweetData = await this.getLatestTweet(username);
      
      if (!tweetData) {
        console.log('[Twitter API] No tweet data to update');
        this.consecutiveErrors++;
        return false;
      }

      // Check if this is a new tweet by comparing with the latest in DB
      const existingTweet = await TweetService.getLatestTweet();
      
      // Only update if it's a new tweet
      if (existingTweet && existingTweet.tweetId === tweetData.tweetId) {
        console.log('[Twitter API] Tweet is already up to date:', tweetData.tweetId);
        this.consecutiveErrors = 0;
        return true;
      }

      // Save the new tweet
      const success = await TweetService.upsertTweet(tweetData);
      
      if (success) {
        console.log('[Twitter API] Successfully updated tweet:', tweetData.tweetId);
        this.consecutiveErrors = 0;
      } else {
        console.error('[Twitter API] Failed to save tweet to database');
        this.consecutiveErrors++;
      }

      return success;
    } catch (error: any) {
      this.consecutiveErrors++;
      console.error('[Twitter API] Error in fetchAndUpdateLatestTweet:', error.message);
      
      // Check for rate limiting errors
      if (error.message?.includes('rate limit') || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        console.error('[Twitter API] ⚠️  Rate limit detected! Backing off for 15 minutes');
        this.consecutiveErrors = this.MAX_CONSECUTIVE_ERRORS;
      }
      
      // Trigger health check if multiple consecutive errors
      if (this.consecutiveErrors >= 3) {
        const username = process.env.TWITTER_USERNAME;
        if (username) {
          this.checkConnectionHealth(username).catch(err => {
            console.error('[Twitter API] Health check failed during error handling:', err.message);
          });
        }
      }
      
      return false;
    }
  }

  /**
   * Check if service is configured
   */
  static isConfigured(): boolean {
    return !!process.env.TWITTER_COOKIES && !!process.env.TWITTER_USERNAME;
  }

  /**
   * Test the Twitter API connection
   * Returns connection status, error message, and failure type
   */
  static async testConnection(username?: string): Promise<{ 
    connected: boolean; 
    message: string;
    failureType?: 'authentication' | 'rate_limit' | 'network' | 'api_error' | 'configuration' | 'unknown';
    details?: string;
  }> {
    try {
      const testUsername = username || process.env.TWITTER_USERNAME;
      if (!testUsername) {
        return {
          connected: false,
          message: 'Twitter username not configured',
          failureType: 'configuration',
          details: 'TWITTER_USERNAME environment variable is not set'
        };
      }

      if (!process.env.TWITTER_COOKIES) {
        return {
          connected: false,
          message: 'Twitter cookies not configured',
          failureType: 'configuration',
          details: 'TWITTER_COOKIES environment variable is not set'
        };
      }

      if (!this.client) {
        try {
          const initialized = await this.initialize();
          if (!initialized) {
            return {
              connected: false,
              message: 'Failed to initialize Twitter API client',
              failureType: 'authentication',
              details: 'Client initialization failed - cookies may be invalid or expired'
            };
          }
        } catch (initError: any) {
          return {
            connected: false,
            message: 'Failed to initialize client',
            failureType: 'authentication',
            details: initError.message || 'Authentication failed - cookies may be expired'
          };
        }
      }

      if (!this.client) {
        return {
          connected: false,
          message: 'Client is not initialized',
          failureType: 'configuration',
          details: 'Client initialization did not complete'
        };
      }

      try {
        const userResult = await this.client.getUserApi().getUserByScreenName({ 
          screenName: testUsername 
        });

        if (userResult.data?.user || userResult.data?.raw?.result) {
          return {
            connected: true,
            message: 'Connection successful'
          };
        } else {
          return {
            connected: false,
            message: 'Failed to fetch user data',
            failureType: 'api_error',
            details: 'API returned empty or invalid response'
          };
        }
      } catch (apiError: any) {
        const errorMessage = apiError.message || String(apiError);
        const errorString = errorMessage.toLowerCase();

        // Detect specific error types
        if (errorString.includes('rate limit') || 
            errorString.includes('429') || 
            errorString.includes('too many requests') ||
            errorString.includes('rate_limit')) {
          return {
            connected: false,
            message: 'Rate limit exceeded',
            failureType: 'rate_limit',
            details: 'Twitter API rate limit has been reached. Please wait before retrying.'
          };
        }

        if (errorString.includes('unauthorized') || 
            errorString.includes('401') ||
            errorString.includes('forbidden') ||
            errorString.includes('403') ||
            errorString.includes('authentication') ||
            errorString.includes('cookie') ||
            errorString.includes('token')) {
          return {
            connected: false,
            message: 'Authentication failed',
            failureType: 'authentication',
            details: 'Cookies may be expired or invalid. Please update TWITTER_COOKIES in your .env file.'
          };
        }

        if (errorString.includes('network') || 
            errorString.includes('timeout') ||
            errorString.includes('econnrefused') ||
            errorString.includes('enotfound')) {
          return {
            connected: false,
            message: 'Network error',
            failureType: 'network',
            details: 'Unable to reach Twitter API. Check your internet connection.'
          };
        }
        return {
          connected: false,
          message: 'API request failed',
          failureType: 'api_error',
          details: errorMessage
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      const errorString = errorMessage.toLowerCase();

      if (errorString.includes('network') || 
          errorString.includes('timeout') ||
          errorString.includes('econnrefused')) {
        return {
          connected: false,
          message: 'Network error',
          failureType: 'network',
          details: errorMessage
        };
      }

      return {
        connected: false,
        message: 'Connection test failed',
        failureType: 'unknown',
        details: errorMessage
      };
    }
  }

  /**
   * Check connection health and send notifications if needed
   */
  static async checkConnectionHealth(username: string): Promise<boolean> {
    try {
      const connectionTest = await this.testConnection(username);
      const now = Date.now();

      // Only send notification if status changed and cooldown has passed
      const shouldNotify = 
        (this.lastConnectionStatus === 'connected' && !connectionTest.connected) ||
        (this.lastConnectionStatus === 'disconnected' && connectionTest.connected) ||
        (this.lastConnectionStatus === 'unknown' && !connectionTest.connected);

      const canNotify = (now - this.lastNotificationTime) > this.NOTIFICATION_COOLDOWN;

      if (shouldNotify && canNotify && NotificationService.isConfigured()) {
        if (!connectionTest.connected) {
          const errorDetails = connectionTest.details 
            ? `${connectionTest.message}\n\nDetails: ${connectionTest.details}\n\nFailure Type: ${connectionTest.failureType || 'unknown'}`
            : connectionTest.message;
          
          await NotificationService.sendTwitterConnectionFailure(errorDetails);
          this.lastNotificationTime = now;
          this.lastConnectionStatus = 'disconnected';
        } else {
          await NotificationService.sendTwitterConnectionRestored();
          this.lastNotificationTime = now;
          this.lastConnectionStatus = 'connected';
        }
      } else if (connectionTest.connected) {
        this.lastConnectionStatus = 'connected';
      } else {
        this.lastConnectionStatus = 'disconnected';
      }

      if (!connectionTest.connected) {
        console.error(`[Twitter API] Connection failed: ${connectionTest.message}`);
        if (connectionTest.failureType) {
          console.error(`[Twitter API] Failure type: ${connectionTest.failureType}`);
        }
        if (connectionTest.details) {
          console.error(`[Twitter API] Details: ${connectionTest.details}`);
        }
      }

      return connectionTest.connected;
    } catch (error: any) {
      console.error('[Twitter API] Error checking connection health:', error.message);
      return false;
    }
  }
}

