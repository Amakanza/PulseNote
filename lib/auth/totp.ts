// lib/auth/totp.ts - Enhanced version with better error handling and backup codes
import { authenticator } from 'otplib';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import QRCode from 'qrcode';
import crypto from 'crypto';

export interface TOTPResult {
  success: boolean;
  error?: string;
  message?: string;
  backupCodes?: string[];
}

export class TOTPService {
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  static async generateQRCodeUrl(email: string, secret: string): Promise<string> {
    try {
      const serviceName = 'PulseNote';
      const otpauth = authenticator.keyuri(email, serviceName, secret);
      return await QRCode.toDataURL(otpauth);
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  static verifyToken(token: string, secret: string): boolean {
    try {
      // Remove spaces and validate format
      const cleanToken = token.replace(/\s/g, '');
      if (!/^\d{6}$/.test(cleanToken)) {
        return false;
      }
      
      return authenticator.verify({ token: cleanToken, secret });
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  static async enableTOTP(userId: string, secret: string, token: string): Promise<TOTPResult> {
    try {
      console.log('Enabling TOTP for user:', userId);
      
      // Verify the token first
      if (!this.verifyToken(token, secret)) {
        console.log('Token verification failed');
        return { success: false, error: 'Invalid verification code. Please check your authenticator app.' };
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      console.log('Generated backup codes, attempting database insert');

      // Store the secret in the database
      const { error } = await supabaseAdmin
        .from('user_totp_secrets')
        .upsert({
          user_id: userId,
          secret: secret,
          enabled: true,
          backup_codes: backupCodes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Database error enabling TOTP:', error);
        return { 
          success: false, 
          error: `Database error: ${error.message}. Please try again.` 
        };
      }

      console.log('TOTP enabled successfully');
      
      return { 
        success: true, 
        message: 'Two-factor authentication enabled successfully!',
        backupCodes 
      };
    } catch (error: any) {
      console.error('Unexpected error enabling TOTP:', error);
      return { 
        success: false, 
        error: `Failed to enable 2FA: ${error.message}` 
      };
    }
  }

  static async disableTOTP(userId: string): Promise<TOTPResult> {
    try {
      console.log('Disabling TOTP for user:', userId);
      
      const { error } = await supabaseAdmin
        .from('user_totp_secrets')
        .update({ 
          enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Database error disabling TOTP:', error);
        return { 
          success: false, 
          error: `Failed to disable 2FA: ${error.message}` 
        };
      }

      console.log('TOTP disabled successfully');
      
      return { 
        success: true, 
        message: 'Two-factor authentication disabled successfully.' 
      };
    } catch (error: any) {
      console.error('Unexpected error disabling TOTP:', error);
      return { 
        success: false, 
        error: `Failed to disable 2FA: ${error.message}` 
      };
    }
  }

  static async getTOTPStatus(userId: string): Promise<{ 
    enabled: boolean; 
    error?: string;
    hasBackupCodes?: boolean;
    createdAt?: string;
  }> {
    try {
      console.log('Getting TOTP status for user:', userId);
      
      const { data, error } = await supabaseAdmin
        .from('user_totp_secrets')
        .select('enabled, backup_codes, created_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no record exists, that's fine - 2FA is just not enabled
        if (error.code === 'PGRST116') {
          return { enabled: false };
        }
        
        console.error('Database error getting TOTP status:', error);
        return { 
          enabled: false, 
          error: `Database error: ${error.message}` 
        };
      }

      return { 
        enabled: data?.enabled || false,
        hasBackupCodes: Array.isArray(data?.backup_codes) && data.backup_codes.length > 0,
        createdAt: data?.created_at
      };
    } catch (error: any) {
      console.error('Unexpected error getting TOTP status:', error);
      return { 
        enabled: false, 
        error: `Failed to check 2FA status: ${error.message}` 
      };
    }
  }

  static async verifyTOTPForUser(userId: string, token: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_totp_secrets')
        .select('secret, enabled')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single();

      if (error || !data || !data.enabled) {
        return false;
      }

      const isValid = this.verifyToken(token, data.secret);

      if (isValid) {
        // Update last_used timestamp
        await supabaseAdmin
          .from('user_totp_secrets')
          .update({ 
            last_used: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying TOTP for user:', error);
      return false;
    }
  }

  // Generate backup codes for account recovery
  private static generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // Verify backup code and mark as used
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_totp_secrets')
        .select('backup_codes, enabled')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single();

      if (error || !data || !data.enabled || !Array.isArray(data.backup_codes)) {
        return false;
      }

      const normalizedCode = code.toUpperCase().replace(/\s/g, '');
      const codeIndex = data.backup_codes.findIndex(bc => bc === normalizedCode);
      
      if (codeIndex === -1) {
        return false;
      }

      // Remove the used backup code
      const updatedCodes = data.backup_codes.filter((_, index) => index !== codeIndex);
      
      await supabaseAdmin
        .from('user_totp_secrets')
        .update({ 
          backup_codes: updatedCodes,
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      return true;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }
}
