import { settingsService } from './settings';
import { getErrorMessage } from '$lib/shared/utils/errorUtils';

export interface TotpSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TotpStatus {
  enabled: boolean;
  backupCodesCount: number;
}

export interface TotpVerificationResult {
  valid: boolean;
  error?: string;
}

export class TotpService {
  /**
   * Get current TOTP status for the authenticated user
   */
  static async getStatus(): Promise<TotpStatus> {
    const response = await settingsService.makeRequest('/totp/status', {
      method: 'GET'
    });
    return response;
  }

  /**
   * Generate TOTP setup data (secret, QR code, backup codes)
   */
  static async generateSetup(): Promise<TotpSetupData> {
    const response = await settingsService.makeRequest('/totp/setup', {
      method: 'POST'
    });
    return response;
  }

  /**
   * Enable TOTP for the user after verifying the setup
   */
  static async enableTotp(secret: string, token: string, backupCodes: string[]): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await settingsService.makeRequest('/totp/enable', {
        method: 'POST',
        body: JSON.stringify({
          secret,
          token,
          backupCodes
        })
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to enable TOTP')
      };
    }
  }

  /**
   * Disable TOTP for the user
   */
  static async disableTotp(currentPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await settingsService.makeRequest('/totp/disable', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword
        })
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to disable TOTP')
      };
    }
  }

  /**
   * Verify a TOTP token
   */
  static async verifyToken(token: string): Promise<TotpVerificationResult> {
    try {
      const response = await settingsService.makeRequest('/totp/verify', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      return response;
    } catch (error: any) {
      return {
        valid: false,
        error: getErrorMessage(error, 'Failed to verify token')
      };
    }
  }

  /**
   * Verify a backup code
   */
  static async verifyBackupCode(code: string): Promise<TotpVerificationResult> {
    try {
      const response = await settingsService.makeRequest('/totp/backup-codes/verify', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      return response;
    } catch (error: any) {
      return {
        valid: false,
        error: getErrorMessage(error, 'Failed to verify backup code')
      };
    }
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(currentPassword: string): Promise<{ backupCodes?: string[]; error?: string }> {
    try {
      const response = await settingsService.makeRequest('/totp/backup-codes/regenerate', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword
        })
      });
      return response;
    } catch (error: any) {
      return {
        error: getErrorMessage(error, 'Failed to regenerate backup codes')
      };
    }
  }

  /**
   * Validate token format (6 digits)
   */
  static validateTokenFormat(token: string): boolean {
    return /^\d{6}$/.test(token);
  }

  /**
   * Format backup code for display (add spaces for readability)
   */
  static formatBackupCode(code: string): string {
    // If the code contains dashes, keep them; otherwise add spaces every 4 characters
    if (code.includes('-')) {
      return code;
    }
    return code.replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Clean backup code for submission (remove spaces and keep only alphanumeric + dashes)
   */
  static cleanBackupCode(code: string): string {
    return code.replace(/\s+/g, '').toUpperCase();
  }
}
