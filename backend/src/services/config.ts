import { db } from '../db';
import { siteConfig } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface SiteConfigValue {
  key: string;
  value: any;
  dataType: string;
  description?: string;
}

export interface SiteConfig {
  default_weather_type: 'none' | 'rain' | 'snow';
  default_weather_speed: number;
  enforce_weather_effects: boolean;
  site_title: string;
  site_description: string;
}

// Environment variable fallbacks
const ENV_FALLBACKS: Partial<SiteConfig> = {
  default_weather_type: (process.env.DEFAULT_WEATHER_TYPE as 'none' | 'rain' | 'snow') || 'none',
  default_weather_speed: parseFloat(process.env.DEFAULT_WEATHER_SPEED || '1.0'),
  enforce_weather_effects: process.env.ENFORCE_WEATHER_EFFECTS === 'true',
  site_title: process.env.SITE_TITLE || 'dane.gg - Software Engineer & Designer',
  site_description: process.env.SITE_DESCRIPTION || 'Hi, I\'m Dane! I\'m a software engineer & freelance designer from Manchester, UK.'
};

export class ConfigService {
  private static cache: Map<string, any> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get a single configuration value with fallback to environment variables
   */
  static async get(key: string): Promise<any> {
    // Check cache first
    if (this.cache.has(key) && this.isCacheValid(key)) {
      return this.cache.get(key);
    }

    try {
      // Try to get from database
      const config = await db
        .select()
        .from(siteConfig)
        .where(eq(siteConfig.key, key))
        .limit(1);

      let value: any;
      
      if (config.length > 0) {
        // Parse value based on data type
        const configItem = config[0];
        value = this.parseValue(configItem.value, configItem.dataType);
      } else {
        // Fall back to environment variable
        value = ENV_FALLBACKS[key as keyof SiteConfig];
        
        if (value === undefined) {
          console.warn(`Configuration key '${key}' not found in database or environment variables`);
          return null;
        }
      }

      // Cache the result
      this.cache.set(key, value);
      this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);

      return value;
    } catch (error) {
      console.error(`Error fetching config key '${key}':`, error);
      
      // Fall back to environment variable on error
      const fallbackValue = ENV_FALLBACKS[key as keyof SiteConfig];
      if (fallbackValue !== undefined) {
        console.warn(`Using environment fallback for config key '${key}'`);
        return fallbackValue;
      }
      
      return null;
    }
  }

  /**
   * Get all configuration values with fallbacks
   */
  static async getAll(): Promise<SiteConfig> {
    try {
      const configs = await db
        .select()
        .from(siteConfig)
        .where(eq(siteConfig.isActive, true))
        .orderBy(siteConfig.key);

      const result: any = {};

      // Process database values
      configs.forEach(config => {
        result[config.key] = this.parseValue(config.value, config.dataType);
      });

      // Fill in any missing values with environment fallbacks
      Object.keys(ENV_FALLBACKS).forEach(key => {
        if (!(key in result)) {
          result[key] = ENV_FALLBACKS[key as keyof SiteConfig];
        }
      });

      return result as SiteConfig;
    } catch (error) {
      console.error('Error fetching all config:', error);
      console.warn('Using environment variable fallbacks only');
      return ENV_FALLBACKS as SiteConfig;
    }
  }

  /**
   * Set a configuration value
   */
  static async set(key: string, value: any, dataType: string = 'string'): Promise<SiteConfigValue> {
    const stringValue = this.stringifyValue(value, dataType);

    try {
      // Check if config exists
      const existingConfig = await db
        .select()
        .from(siteConfig)
        .where(eq(siteConfig.key, key))
        .limit(1);

      let result: SiteConfigValue;

      if (existingConfig.length === 0) {
        // Create new config
        const newConfig = await db
          .insert(siteConfig)
          .values({
            key,
            value: stringValue,
            dataType,
            isActive: true
          })
          .returning();

        result = {
          key: newConfig[0].key,
          value: this.parseValue(newConfig[0].value, newConfig[0].dataType),
          dataType: newConfig[0].dataType,
          description: newConfig[0].description || undefined
        };
      } else {
        // Update existing config
        const updatedConfig = await db
          .update(siteConfig)
          .set({
            value: stringValue,
            dataType,
            updatedAt: new Date()
          })
          .where(eq(siteConfig.key, key))
          .returning();

        result = {
          key: updatedConfig[0].key,
          value: this.parseValue(updatedConfig[0].value, updatedConfig[0].dataType),
          dataType: updatedConfig[0].dataType,
          description: updatedConfig[0].description || undefined
        };
      }

      // Update cache
      this.cache.set(key, result.value);
      this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);

      return result;
    } catch (error) {
      console.error(`Error setting config key '${key}':`, error);
      throw error;
    }
  }

  /**
   * Clear the configuration cache
   */
  static clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Parse a value based on its data type
   */
  private static parseValue(value: string, dataType: string): any {
    switch (dataType) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return parseFloat(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch (e) {
          console.error(`Failed to parse JSON for value: ${value}`, e);
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Convert a value to string for storage
   */
  private static stringifyValue(value: any, dataType: string): string {
    switch (dataType) {
      case 'boolean':
        return value.toString();
      case 'number':
        return value.toString();
      case 'json':
        return JSON.stringify(value);
      default:
        return value.toString();
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private static isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }
}
