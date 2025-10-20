import { browser } from '$app/environment';

export interface TrackingData {
  pagePath: string;
  visitorId?: string;
  sessionId?: string;
  screenResolution?: string;
  language?: string;
  referrer?: string;
}

export class TrackingService {
  private static instance: TrackingService;
  private visitorId: string | null = null;
  private sessionId: string | null = null;

  private constructor() {
    if (browser) {
      this.initializeTracking();
    }
  }

  public static getInstance(): TrackingService {
    if (!TrackingService.instance) {
      TrackingService.instance = new TrackingService();
    }
    return TrackingService.instance;
  }

  private initializeTracking() {
    if (!browser) return;

    this.visitorId = this.getCookie('visitor_id') || this.generateId();
    this.sessionId = this.getCookie('session_id') || this.generateId();

    this.setCookie('visitor_id', this.visitorId, 365); // 1 year
    this.setCookie('session_id', this.sessionId, 1); // 1 day
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private getCookie(name: string): string | null {
    if (!browser) return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private setCookie(name: string, value: string, days: number) {
    if (!browser) return;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  }

  private getScreenResolution(): string {
    if (!browser) return '';
    return `${window.screen.width}x${window.screen.height}`;
  }

  private getLanguage(): string {
    if (!browser) return '';
    return navigator.language || 'en-US';
  }

  private getReferrer(): string {
    if (!browser) return '';
    return document.referrer || '';
  }

  public trackPageView(pagePath: string) {
    if (!browser) return;

    const trackingData: TrackingData = {
      pagePath,
      visitorId: this.visitorId || undefined,
      sessionId: this.sessionId || undefined,
      screenResolution: this.getScreenResolution(),
      language: this.getLanguage(),
      referrer: this.getReferrer()
    };

    // Send tracking data to frontend API endpoint
    this.sendTrackingData('/api/visitor-stats/track', trackingData);
  }

  public trackSiteVisit() {
    if (!browser) return;

    const trackingData: TrackingData = {
      pagePath: window.location.pathname,
      visitorId: this.visitorId || undefined,
      sessionId: this.sessionId || undefined,
      screenResolution: this.getScreenResolution(),
      language: this.getLanguage(),
      referrer: this.getReferrer()
    };

    // Send tracking data to backend
    this.sendTrackingData('/api/track/site-visit', trackingData);
  }

  private async sendTrackingData(endpoint: string, data: TrackingData) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Error sending tracking data:', error);
    }
  }
}

// Export singleton instance
export const trackingService = TrackingService.getInstance();


