// lib/auth/totp.ts - Missing implementation needed for TOTP to work
import { authenticator } from 'otplib';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import QRCode from 'qrcode';

export class TOTPService {
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  static async generateQRCodeUrl(email: string, secret: string): Promise<string> {
    const serviceName = 'PulseNote';
    const otpauth = authenticator.keyuri(email, serviceName, secret);
    return await QRCode.toDataURL(otpauth);
  }

  static verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      return false;
    }
  }

  static async enableTOTP(userId: string, secret: string, token: string) {
    try {
      // Verify the token first
      if (!this.verifyToken(token, secret)) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Store the secret in the database
      const { error } = await supabaseAdmin
        .from('user_totp_secrets')
        .upsert({
          user_id: userId,
          secret: secret,
          enabled: true,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async disableTOTP(userId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('user_totp_secrets')
        .update({ enabled: false })
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getTOTPStatus(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_totp_secrets')
        .select('enabled')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return { enabled: data?.enabled || false };
    } catch (error: any) {
      return { enabled: false, error: error.message };
    }
  }
}

// lib/audit.ts - Missing audit logger implementation
export class AuditLogger {
  static async log(params: {
    actorUserId: string;
    workspaceId: string;
    action: string;
    targetType: string;
    targetId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    try {
      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          actor_user_id: params.actorUserId,
          workspace_id: params.workspaceId,
          action: params.action,
          target_type: params.targetType,
          target_id: params.targetId,
          ip_address: params.ipAddress,
          user_agent: params.userAgent,
          metadata: params.metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Audit log error:', error);
      }
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  }
}

// Required database tables (SQL to run in Supabase)
/*
-- User TOTP secrets table
CREATE TABLE user_totp_secrets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_totp_secrets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own TOTP secrets
CREATE POLICY "Users can manage own TOTP" ON user_totp_secrets
  FOR ALL USING (auth.uid() = user_id);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID REFERENCES auth.users(id),
  workspace_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see audit logs for their workspaces
CREATE POLICY "Users can view workspace audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships wm 
      WHERE wm.workspace_id = audit_logs.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );
*/
