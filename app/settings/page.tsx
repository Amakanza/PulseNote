// app/settings/security/page.tsx - Updated with better error handling and backup codes
"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import SecurityDashboard from '@/components/security/SecurityDashboard';
import { Shield, Key, Smartphone, QrCode, Copy, Check, AlertTriangle, Download } from 'lucide-react';

export default function SecuritySettingsPage() {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

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
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setTotpEnabled(data.enabled || false);
      
      if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.error('TOTP status check failed:', err);
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setShowSetup(true);
    } catch (err: any) {
      console.error('TOTP generation failed:', err);
      setError('Failed to generate 2FA setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const enableTOTP = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code from your authenticator app');
      return;
    }

    if (!/^\d{6}$/.test(verificationCode.replace(/\s/g, ''))) {
      setError('Verification code must be 6 digits');
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message || 'Two-factor authentication enabled successfully!');
        setTotpEnabled(true);
        setShowSetup(false);
        
        // Show backup codes if provided
        if (data.backupCodes && Array.isArray(data.backupCodes)) {
          setBackupCodes(data.backupCodes);
          setShowBackupCodes(true);
        }
        
        // Clear form
        setQrCodeUrl('');
        setSecret('');
        setVerificationCode('');
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || 'Failed to enable 2FA');
      }
    } catch (err: any) {
      console.error('TOTP enable failed:', err);
      setError('Failed to enable 2FA. Please check your code and try again.');
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message || 'Two-factor authentication disabled');
        setTotpEnabled(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to disable 2FA');
      }
    } catch (err: any) {
      console.error('TOTP disable failed:', err);
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
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = secret;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const copyBackupCodes = async () => {
    try {
      const codesText = backupCodes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setBackupCodesCopied(true);
      setTimeout(() => setBackupCodesCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy backup codes:', err);
    }
  };

  const downloadBackupCodes = () => {
    const codesText = `PulseNote - Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes (use each code only once):\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nKeep these codes in a safe place. You can use them to access your account if you lose your authenticator device.`;
    
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulsenote-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-800 font-medium">Success</p>
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Backup Codes Modal */}
        {showBackupCodes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-lg font-semibold mb-4">Save Your Backup Codes</h2>
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device. Each code can only be used once.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{index + 1}.</span>
                      <span className="font-semibold">{code}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={copyBackupCodes}
                    className={`btn flex-1 flex items-center justify-center gap-2 ${
                      backupCodesCopied ? 'bg-green-100 text-green-700' : ''
                    }`}
                  >
                    {backupCodesCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {backupCodesCopied ? 'Copied!' : 'Copy Codes'}
                  </button>
                  
                  <button
                    onClick={downloadBackupCodes}
                    className="btn flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                
                <button
                  onClick={() => setShowBackupCodes(false)}
                  className="w-full btn btn-primary"
                >
                  I Saved My Backup Codes
                </button>
              </div>
            </div>
          </div>
        )}

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

          {!totpEnabled && !showSetup && (
            <div className="space-y-4">
              <p className="text-slate-600">
                Add an extra layer of security to your account with two-factor authentication. 
                You will need an authenticator app like Google Authenticator, Authy, or 1Password.
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
                        src={qrCodeUrl}
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
                    className="input flex-1 max-w-xs text-center text-lg font-mono tracking-widest"
                    maxLength={6}
                    disabled={loading}
                    autoComplete="off"
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
                    setError(null);
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
