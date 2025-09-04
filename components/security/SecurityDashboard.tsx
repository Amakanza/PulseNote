// components/security/SecurityDashboard.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Shield, Key, Users, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SecurityStatus {
  totpEnabled: boolean;
  activeSessions: number;
  recentLogins: number;
  workspaceCount: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export default function SecurityDashboard() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      const supa = supabaseClient();
      const { data: { user } } = await supa.auth.getUser();

      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Check TOTP status
      const totpResponse = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });
      const totpData = await totpResponse.json();

      // Get workspace count
      const { data: memberships } = await supa
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', user.id);

      // Get active sessions count
      const { data: sessions } = await supa
        .from('user_sessions')
        .select('id')
        .eq('user_id', user.id)
        .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Active in last 30 days

      const securityStatus: SecurityStatus = {
        totpEnabled: totpData.enabled || false,
        activeSessions: sessions?.length || 0,
        recentLogins: sessions?.length || 0, // Simplified
        workspaceCount: memberships?.length || 0,
        riskLevel: calculateRiskLevel(totpData.enabled, sessions?.length || 0)
      };

      setStatus(securityStatus);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskLevel = (totpEnabled: boolean, sessionCount: number): 'low' | 'medium' | 'high' => {
    if (!totpEnabled && sessionCount > 5) return 'high';
    if (!totpEnabled || sessionCount > 3) return 'medium';
    return 'low';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="panel p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-slate-200 rounded"></div>
            <div className="h-24 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-6">
        <div className="text-red-600">Error loading security status: {error}</div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-900">Security Overview</h2>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(status.riskLevel)}`}>
            Risk Level: {status.riskLevel.charAt(0).toUpperCase() + status.riskLevel.slice(1)}
          </div>
        </div>

        {/* Security Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className={`p-3 rounded-lg ${status.totpEnabled ? 'bg-green-100' : 'bg-red-100'}`}>
              {status.totpEnabled ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div>
              <div className="text-sm text-slate-600">Two-Factor Auth</div>
              <div className="font-semibold">
                {status.totpEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Active Sessions</div>
              <div className="font-semibold">{status.activeSessions}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Workspaces</div>
              <div className="font-semibold">{status.workspaceCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Key className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Recent Logins</div>
              <div className="font-semibold">{status.recentLogins}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="panel p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Security Recommendations</h3>
        <div className="space-y-3">
          {!status.totpEnabled && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-red-800">Enable Two-Factor Authentication</div>
                <div className="text-sm text-red-700 mt-1">
                  Protect your account with an additional layer of security. 
                  <a href="/settings/security" className="underline ml-1">Set up 2FA now</a>
                </div>
              </div>
            </div>
          )}

          {status.activeSessions > 3 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-yellow-800">Review Active Sessions</div>
                <div className="text-sm text-yellow-700 mt-1">
                  You have {status.activeSessions} active sessions. 
                  <a href="/settings/sessions" className="underline ml-1">Review and revoke unused sessions</a>
                </div>
              </div>
            </div>
          )}

          {status.riskLevel === 'low' && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-800">Good Security Posture</div>
                <div className="text-sm text-green-700 mt-1">
                  Your account security is well configured. Continue monitoring your activity regularly.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
