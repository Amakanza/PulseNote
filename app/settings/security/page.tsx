// app/settings/security/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import SecurityDashboard from '@/components/security/SecurityDashboard';
import { Shield, Key, Smartphone, QrCode, Copy, Check } from 'lucide-react';

export default function SecuritySettingsPage() {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    checkTOTPStatus();
  }, []);

  const checkTOTPStatus = async () => {
    try {
      const response = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });
      const data = await response.json();
      setTotpEnabled(data.enabled || false);
    } catch (err: any) {
      setError('Failed to check 2FA status');
    }
  };

  const generateTOTP = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      });

      const data = await response.json();
      
      if (response.ok) {
        setQrCodeUrl(data.qrCodeUrl);
        setSecret(data.secret);
        setShowSetup(true);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError('Failed to generate 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const enableTOTP = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'enable', 
          secret, 
          token: verificationCode.trim() 
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('Two-factor authentication enabled successfully!');
        setTotpEnabled(true);
        setShowSetup(false);
        setQrCodeUrl('');
        setSecret('');
        setVerificationCode('');
      } else {
        setError(data.error || 'Failed to enable 2FA');
      }
    } catch (err: any) {
      setError('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const disableTOTP = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('Two-factor authentication disabled');
        setTotpEnabled(false);
      } else {
        setError(data.error || 'Failed to disable 2FA');
      }
    } catch (err: any) {
      setError('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy secret:', err);
    }
  };

  return (
    <div className="container-narrow py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="panel p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-slate-600" />
            <h1 className="text-2xl font-bold text-slate-900">Security Settings</h1>
          </div>
          <p className="text-slate-600">
            Manage your account security and privacy settings
          </p>
        </div>

        {/* Security Dashboard */}
        <SecurityDashboard />

        {/* Two-Factor Authentication */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Two-Factor Authentication</h2>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              totpEnabled 
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {totpEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {!totpEnabled && !showSetup && (
            <div className="space-y-4">
              <p className="text-slate-600">
                Add an extra layer of security to your account with two-factor authentication. 
                You'll need an authenticator app like Google Authenticator or Authy.
              </p>
              <button
                onClick={generateTOTP}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                {loading ? 'Setting up...' : 'Set Up Two-Factor Authentication'}
              </button>
            </div>
          )}

          {totpEnabled && (
            <div className="space-y-4">
              <p className="text-slate-600">
                Two-factor authentication is enabled for your account. You can disable it below if needed.
              </p>
              <button
                onClick={disableTOTP}
                disabled={loading}
                className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
              </button>
            </div>
          )}

          {showSetup && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-900 mb-3">Step 1: Scan QR Code</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Scan this QR code with your authenticator app, or enter the secret manually.
                </p>
                
                {qrCodeUrl && (
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                        alt="2FA QR Code"
                        className="w-48 h-48 border rounded-lg"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="mb-4">
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Manual Entry Secret
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-slate-100 rounded text-sm font-mono break-all">
                            {secret}
                          </code>
                          <button
                            onClick={copySecret}
                            className="btn btn-sm p-2 flex-shrink-0"
                            title="Copy secret"
                          >
                            {secretCopied ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium text-slate-900 mb-3">Step 2: Verify Setup</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Enter the 6-digit code from your authenticator app to complete setup.
                </p>
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input flex-1 max-w-xs"
                    maxLength={6}
                    disabled={loading}
                  />
                  <button
                    onClick={enableTOTP}
                    disabled={!verificationCode || verificationCode.length !== 6 || loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Verifying...' : 'Enable 2FA'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSetup(false);
                    setQrCodeUrl('');
                    setSecret('');
                    setVerificationCode('');
                  }}
                  className="btn"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
