// lib/auth/totp.ts
import { authenticator } from 'otplib';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export class TOTPService {
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  static async generateQRCodeUrl(email: string, secret: string): Promise<string> {
    const serviceName = 'PulseNote';
    const otpauth = authenticator.keyuri(email, serviceName, secret);
    return otpauth;
  }

  static verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }

  static async enableTOTP(userId: string, secret: string, token: string): Promise<{ success: boolean; error?: string }> {
    // Verify the token first
    if (!this.verifyToken(token, secret)) {
      return { success: false, error: 'Invalid verification code' };
    }

    try {
      const { error } = await supabaseAdmin
        .from('user_totp')
        .upsert({
          user_id: userId,
          secret,
          enabled: true,
          backup_codes: this.generateBackupCodes()
        });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async disableTOTP(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('user_totp')
        .update({ enabled: false })
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getTOTPStatus(userId: string): Promise<{ enabled: boolean; secret?: string }> {
    const { data } = await supabaseAdmin
      .from('user_totp')
      .select('enabled, secret')
      .eq('user_id', userId)
      .single();

    return {
      enabled: data?.enabled || false,
      secret: data?.secret
    };
  }

  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }
}
