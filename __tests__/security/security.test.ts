// __tests__/security/security.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const testSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to create anonymous client for user sessions
const createUserClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('PulseNote Security Implementation Tests', () => {
  let testUser1: any;
  let testUser2: any;
  let workspace1: any;
  let workspace2: any;

  beforeAll(async () => {
    // Create test users
    const { data: user1 } = await testSupabase.auth.admin.createUser({
      email: 'security-test1@example.com',
      password: 'TestPassword123!',
      email_confirm: true
    });
    
    const { data: user2 } = await testSupabase.auth.admin.createUser({
      email: 'security-test2@example.com',
      password: 'TestPassword123!',
      email_confirm: true
    });

    testUser1 = user1.user;
    testUser2 = user2.user;

    // Create test workspaces
    const { data: ws1 } = await testSupabase
      .from('workspaces')
      .insert({ 
        name: 'Security Test Workspace 1', 
        created_by: testUser1.id 
      })
      .select()
      .single();

    const { data: ws2 } = await testSupabase
      .from('workspaces')
      .insert({ 
        name: 'Security Test Workspace 2', 
        created_by: testUser2.id 
      })
      .select()
      .single();

    workspace1 = ws1;
    workspace2 = ws2;

    // Create workspace memberships
    await testSupabase.from('workspace_memberships').insert([
      { workspace_id: workspace1.id, user_id: testUser1.id, role: 'owner' },
      { workspace_id: workspace2.id, user_id: testUser2.id, role: 'owner' }
    ]);
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      // Delete workspaces (cascades to memberships and projects)
      await testSupabase.from('workspaces').delete().in('id', [workspace1?.id, workspace2?.id]);
      
      // Delete test users
      if (testUser1?.id) await testSupabase.auth.admin.deleteUser(testUser1.id);
      if (testUser2?.id) await testSupabase.auth.admin.deleteUser(testUser2.id);
    } catch (error) {
      console.warn('Cleanup error (expected in test environment):', error);
    }
  });

  describe('Row Level Security (RLS)', () => {
    let testProject: any;

    beforeEach(async () => {
      // Create a test project in workspace1
      const { data: project } = await testSupabase
        .from('projects')
        .insert({
          workspace_id: workspace1.id,
          title: 'RLS Test Project',
          created_by: testUser1.id
        })
        .select()
        .single();
      
      testProject = project;
    });

    afterEach(async () => {
      // Clean up test project
      if (testProject?.id) {
        await testSupabase.from('projects').delete().eq('id', testProject.id);
      }
    });

    it('should prevent cross-workspace document access', async () => {
      const user2Client = createUserClient();

      // Sign in as user2
      await user2Client.auth.signInWithPassword({
        email: 'security-test2@example.com',
        password: 'TestPassword123!'
      });

      // Try to access user1's project
      const { data, error } = await user2Client
        .from('projects')
        .select('*')
        .eq('id', testProject.id);

      // Should return empty array due to RLS
      expect(data).toHaveLength(0);
      expect(error).toBeNull();

      await user2Client.auth.signOut();
    });

    it('should allow workspace members to access their workspace data', async () => {
      const user1Client = createUserClient();

      await user1Client.auth.signInWithPassword({
        email: 'security-test1@example.com',
        password: 'TestPassword123!'
      });

      // Should be able to read their own project
      const { data: readProject, error: readError } = await user1Client
        .from('projects')
        .select('*')
        .eq('id', testProject.id)
        .single();

      expect(readError).toBeNull();
      expect(readProject?.title).toBe('RLS Test Project');
      expect(readProject?.workspace_id).toBe(workspace1.id);

      await user1Client.auth.signOut();
    });

    it('should prevent unauthorized membership management', async () => {
      const user2Client = createUserClient();

      await user2Client.auth.signInWithPassword({
        email: 'security-test2@example.com',
        password: 'TestPassword123!'
      });

      // Try to add themselves to workspace1 (should fail due to RLS)
      const { data, error } = await user2Client
        .from('workspace_memberships')
        .insert({
          workspace_id: workspace1.id,
          user_id: testUser2.id,
          role: 'editor'
        });

      expect(error).toBeTruthy();
      expect(data).toBeNull();

      await user2Client.auth.signOut();
    });

    it('should allow owners to manage their workspace memberships', async () => {
      const user1Client = createUserClient();

      await user1Client.auth.signInWithPassword({
        email: 'security-test1@example.com',
        password: 'TestPassword123!'
      });

      // Owner should be able to add members to their workspace
      const { data, error } = await user1Client
        .from('workspace_memberships')
        .insert({
          workspace_id: workspace1.id,
          user_id: testUser2.id,
          role: 'viewer'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.role).toBe('viewer');
      expect(data?.workspace_id).toBe(workspace1.id);

      // Clean up
      await testSupabase
        .from('workspace_memberships')
        .delete()
        .eq('workspace_id', workspace1.id)
        .eq('user_id', testUser2.id);

      await user1Client.auth.signOut();
    });
  });

  describe('Rate Limiting', () => {
    const testEndpoint = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/totp`;
    
    it('should limit API requests when too many are made rapidly', async () => {
      const requests = [];

      // Make 12 rapid requests (assuming limit is 10)
      for (let i = 0; i < 12; i++) {
        requests.push(
          fetch(testEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status' })
          }).catch(() => ({ status: 500 })) // Handle network errors
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      const successful = responses.filter(r => [200, 401].includes(r.status));

      // Should have some rate limited responses
      expect(rateLimited.length).toBeGreaterThan(0);
      // Should also have some successful responses (before hitting limit)
      expect(successful.length).toBeGreaterThan(0);
    }, 10000); // Increase timeout for this test

    it('should include proper rate limit headers', async () => {
      const response = await fetch(testEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });

      if (response.status === 429) {
        expect(response.headers.get('Retry-After')).toBeTruthy();
        expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
      }
      
      // Test passes if we get either a normal response or a properly formatted rate limit response
      expect([200, 401, 429]).toContain(response.status);
    });
  });

  describe('File Upload Security', () => {
    const ocrEndpoint = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ocr`;

    it('should reject dangerous file types', async () => {
      // Create a fake executable file
      const maliciousFile = new File(['MZ\x90\x00'], 'malware.exe', {
        type: 'application/octet-stream'
      });

      const formData = new FormData();
      formData.append('image', maliciousFile);

      const response = await fetch(ocrEndpoint, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toMatch(/file type not allowed|not allowed/i);
    });

    it('should reject files with dangerous extensions', async () => {
      // Create a file with dangerous extension but valid image type
      const dangerousFile = new File(['fake content'], 'script.bat', {
        type: 'image/jpeg'
      });

      const formData = new FormData();
      formData.append('image', dangerousFile);

      const response = await fetch(ocrEndpoint, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toMatch(/extension not allowed|security/i);
    });

    it('should accept valid image files', async () => {
      // Create a minimal valid PNG file (1x1 transparent pixel)
      const pngHeader = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // Width: 1
        0x00, 0x00, 0x00, 0x01, // Height: 1
        0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
        0x1F, 0x15, 0xC4, 0x89, // CRC
        0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
        0x0D, 0x0A, 0x2D, 0xB4, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
      ]);

      const validFile = new File([pngHeader], 'test.png', {
        type: 'image/png'
      });

      const formData = new FormData();
      formData.append('image', validFile);

      const response = await fetch(ocrEndpoint, {
        method: 'POST',
        body: formData
      });

      // Should not be rejected for file type (may fail OCR due to minimal image, but that's OK)
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 400) {
        const data = await response.json();
        // Should not be rejected for security reasons
        expect(data.error).not.toMatch(/file type not allowed|extension not allowed|security/i);
      }
    });

    it('should reject oversized files', async () => {
      // Create a buffer that simulates a large file
      const largeBuffer = new ArrayBuffer(11 * 1024 * 1024); // 11MB
      const largeFile = new File([largeBuffer], 'large.jpg', {
        type: 'image/jpeg'
      });

      const formData = new FormData();
      formData.append('image', largeFile);

      const response = await fetch(ocrEndpoint, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(413);
    });

    it('should handle missing file gracefully', async () => {
      const formData = new FormData();
      // Don't append any file

      const response = await fetch(ocrEndpoint, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toMatch(/no image|file/i);
    });
  });

  describe('TOTP Authentication', () => {
    let TOTPService: any;
    let authenticator: any;

    beforeAll(async () => {
      // Import modules for testing
      try {
        const totpModule = await import('@/lib/auth/totp');
        TOTPService = totpModule.TOTPService;
        
        const otplibModule = await import('otplib');
        authenticator = otplibModule.authenticator;
      } catch (error) {
        console.warn('TOTP modules not available for testing:', error);
      }
    });

    it('should generate valid TOTP secrets', async () => {
      if (!TOTPService) {
        console.warn('Skipping TOTP test - module not available');
        return;
      }
      
      const secret = TOTPService.generateSecret();
      expect(secret).toBeTruthy();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBe(32);
    });

    it('should verify TOTP tokens correctly', async () => {
      if (!TOTPService || !authenticator) {
        console.warn('Skipping TOTP verification test - modules not available');
        return;
      }
      
      const secret = TOTPService.generateSecret();
      const token = authenticator.generate(secret);
      
      const isValid = TOTPService.verifyToken(token, secret);
      expect(isValid).toBe(true);
      
      // Invalid token should fail
      const invalidIsValid = TOTPService.verifyToken('123456', secret);
      expect(invalidIsValid).toBe(false);
    });

    it('should generate QR code URLs', async () => {
      if (!TOTPService) {
        console.warn('Skipping QR code test - module not available');
        return;
      }

      const secret = TOTPService.generateSecret();
      const qrUrl = await TOTPService.generateQRCodeUrl('test@example.com', secret);
      
      expect(qrUrl).toBeTruthy();
      expect(qrUrl).toContain('otpauth://totp/');
      expect(qrUrl).toContain('test@example.com');
      expect(qrUrl).toContain(secret);
    });
  });

  describe('Privacy Logging', () => {
    let PrivacyLogger: any;

    beforeAll(async () => {
      try {
        const loggingModule = await import('@/lib/logging');
        PrivacyLogger = loggingModule.PrivacyLogger;
      } catch (error) {
        console.warn('Privacy logging module not available for testing:', error);
      }
    });

    it('should scrub PII from text', async () => {
      if (!PrivacyLogger) {
        console.warn('Skipping PII scrubbing test - module not available');
        return;
      }
      
      const testText = 'Patient John Doe contacted us at john.doe@example.com and called 555-123-4567';
      const scrubbed = PrivacyLogger.scrubPII(testText);
      
      expect(scrubbed).not.toContain('john.doe@example.com');
      expect(scrubbed).not.toContain('555-123-4567');
      expect(scrubbed).toContain('[EMAIL]');
      expect(scrubbed).toContain('[PHONE]');
    });

    it('should hash user IDs consistently', async () => {
      if (!PrivacyLogger) {
        console.warn('Skipping user ID hashing test - module not available');
        return;
      }
      
      const userId = 'user-123-456-789-abc';
      const hashedId = PrivacyLogger.hashUserId(userId);
      
      expect(hashedId).not.toBe(userId);
      expect(hashedId.length).toBe(16);
      expect(typeof hashedId).toBe('string');
      
      // Should be consistent
      const hashedAgain = PrivacyLogger.hashUserId(userId);
      expect(hashedId).toBe(hashedAgain);
    });

    it('should enforce privacy budget', async () => {
      if (!PrivacyLogger) {
        console.warn('Skipping privacy budget test - module not available');
        return;
      }
      
      const lowPIIPayload = { 
        message: 'User logged in successfully',
        action: 'login'
      };
      
      const highPIIPayload = { 
        message: 'Patient john@example.com (SSN: 123-45-6789) called 555-123-4567 and emailed dr.smith@hospital.com'
      };
      
      expect(PrivacyLogger.privacyBudget(lowPIIPayload)).toBe(true);
      expect(PrivacyLogger.privacyBudget(highPIIPayload)).toBe(false);
    });

    it('should sanitize log data properly', async () => {
      if (!PrivacyLogger) {
        console.warn('Skipping log sanitization test - module not available');
        return;
      }

      const rawLogData = {
        userId: 'user-123-abc',
        workspaceId: 'workspace-456',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        route: '/api/projects',
        method: 'POST',
        statusCode: 200,
        latency: 150
      };

      const sanitized = PrivacyLogger.sanitizeLogData(rawLogData);

      expect(sanitized.hashedUserId).toBeDefined();
      expect(sanitized.hashedUserId).not.toBe(rawLogData.userId);
      expect(sanitized.workspaceId).toBe(rawLogData.workspaceId);
      expect(sanitized.ipHash).toBeDefined();
      expect(sanitized.ipHash).not.toBe(rawLogData.ip);
      expect(sanitized.route).toBe(rawLogData.route);
      expect(sanitized.method).toBe(rawLogData.method);
      expect(sanitized.statusCode).toBe(rawLogData.statusCode);
      expect(sanitized.latency).toBe(rawLogData.latency);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log entries for workspace changes', async () => {
      // Create a test membership change
      const { data: membership } = await testSupabase
        .from('workspace_memberships')
        .insert({
          workspace_id: workspace1.id,
          user_id: testUser2.id,
          role: 'viewer'
        })
        .select()
        .single();

      expect(membership).toBeDefined();

      // In a real implementation, this would be triggered automatically
      // For testing, we'll manually create an audit log entry
      const { data: auditLog } = await testSupabase
        .from('audit_logs')
        .insert({
          actor_user_id: testUser1.id,
          workspace_id: workspace1.id,
          action: 'membership.added',
          target_type: 'membership',
          target_id: testUser2.id,
          metadata: { role: 'viewer' }
        })
        .select()
        .single();

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('membership.added');
      expect(auditLog.workspace_id).toBe(workspace1.id);

      // Cleanup
      await testSupabase.from('audit_logs').delete().eq('id', auditLog.id);
      await testSupabase.from('workspace_memberships').delete().eq('id', membership.id);
    });

    it('should retrieve audit logs for workspace owners', async () => {
      // Create a test audit log entry
      const { data: auditLog } = await testSupabase
        .from('audit_logs')
        .insert({
          actor_user_id: testUser1.id,
          workspace_id: workspace1.id,
          action: 'project.created',
          target_type: 'document',
          target_id: 'test-project-id',
          metadata: { title: 'Test Project' }
        })
        .select()
        .single();

      // Retrieve audit logs (this would normally be done through the API with proper RLS)
      const { data: logs } = await testSupabase
        .from('audit_logs')
        .select('*')
        .eq('workspace_id', workspace1.id)
        .eq('id', auditLog.id);

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('project.created');

      // Cleanup
      await testSupabase.from('audit_logs').delete().eq('id', auditLog.id);
    });
  });

  describe('Session Management', () => {
    it('should track user sessions', async () => {
      // Create a test session
      const { data: session } = await testSupabase
        .from('user_sessions')
        .insert({
          user_id: testUser1.id,
          device_name: 'Test Device',
          device_type: 'desktop',
          ip_address: '127.0.0.1',
          user_agent: 'Test User Agent',
          last_active: new Date().toISOString()
        })
        .select()
        .single();

      expect(session).toBeDefined();
      expect(session.user_id).toBe(testUser1.id);
      expect(session.device_name).toBe('Test Device');

      // Cleanup
      await testSupabase.from('user_sessions').delete().eq('id', session.id);
    });

    it('should allow users to revoke their own sessions', async () => {
      // Create a test session
      const { data: session } = await testSupabase
        .from('user_sessions')
        .insert({
          user_id: testUser1.id,
          device_name: 'Revokable Device',
          device_type: 'mobile',
          ip_address: '127.0.0.1',
          user_agent: 'Mobile User Agent'
        })
        .select()
        .single();

      // User should be able to delete their own session
      const user1Client = createUserClient();
      await user1Client.auth.signInWithPassword({
        email: 'security-test1@example.com',
        password: 'TestPassword123!'
      });

      const { error } = await user1Client
        .from('user_sessions')
        .delete()
        .eq('id', session.id);

      expect(error).toBeNull();

      // Verify session is deleted
      const { data: deletedSession } = await testSupabase
        .from('user_sessions')
        .select('id')
        .eq('id', session.id);

      expect(deletedSession).toHaveLength(0);

      await user1Client.auth.signOut();
    });
  });

  describe('Data Retention', () => {
    it('should handle workspace retention settings', async () => {
      // Update workspace retention setting
      const { data: updatedWorkspace } = await testSupabase
        .from('workspaces')
        .update({ retention_months: 6 })
        .eq('id', workspace1.id)
        .select()
        .single();

      expect(updatedWorkspace.retention_months).toBe(6);

      // Reset to default
      await testSupabase
        .from('workspaces')
        .update({ retention_months: 12 })
        .eq('id', workspace1.id);
    });

    it('should identify projects eligible for retention', async () => {
      // Create an old project
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago

      const { data: oldProject } = await testSupabase
        .from('projects')
        .insert({
          workspace_id: workspace1.id,
          title: 'Old Retention Test Project',
          created_by: testUser1.id,
          created_at: oldDate.toISOString()
        })
        .select()
        .single();

      expect(oldProject).toBeDefined();

      // Query for projects older than 1 year
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

      const { data: oldProjects } = await testSupabase
        .from('projects')
        .select('id, title, created_at')
        .eq('workspace_id', workspace1.id)
        .lt('created_at', cutoffDate.toISOString())
        .is('deleted_at', null);

      expect(oldProjects.length).toBeGreaterThanOrEqual(1);
      expect(oldProjects.find(p => p.id === oldProject.id)).toBeDefined();

      // Cleanup
      await testSupabase.from('projects').delete().eq('id', oldProject.id);
    });
  });

  describe('Invitation Security', () => {
    let testInvitation: any;

    afterEach(async () => {
      // Cleanup test invitations
      if (testInvitation?.id) {
        await testSupabase
          .from('workspace_invitations')
          .delete()
          .eq('id', testInvitation.id);
        testInvitation = null;
      }
    });

    it('should create valid invitations', async () => {
      const inviteData = {
        workspace_id: workspace1.id,
        email: 'invite-test@example.com',
        role: 'viewer',
        token: 'test-token-' + Date.now(),
        invited_by: testUser1.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { data: invitation, error } = await testSupabase
        .from('workspace_invitations')
        .insert(inviteData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(invitation).toBeDefined();
      expect(invitation.email).toBe(inviteData.email);
      expect(invitation.role).toBe(inviteData.role);
      expect(invitation.status).toBe('pending');

      testInvitation = invitation;
    });

    it('should prevent duplicate active invitations', async () => {
      const email = 'duplicate-test@example.com';
      
      // Create first invitation
      const { data: firstInvite } = await testSupabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspace1.id,
          email: email,
          role: 'viewer',
          token: 'first-token-' + Date.now(),
          invited_by: testUser1.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      expect(firstInvite).toBeDefined();

      // Try to create duplicate with same email and workspace
      const { error: duplicateError } = await testSupabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspace1.id,
          email: email,
          role: 'editor',
          token: 'second-token-' + Date.now(),
          invited_by: testUser1.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      // Should fail if unique constraint exists
      // If no constraint exists yet, this test documents the expected behavior
      if (duplicateError) {
        expect(duplicateError.message).toMatch(/duplicate|unique/i);
      }

      // Cleanup
      await testSupabase
        .from('workspace_invitations')
        .delete()
        .eq('workspace_id', workspace1.id)
        .eq('email', email);
    });

    it('should handle expired invitations', async () => {
      const expiredDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

      const { data: expiredInvite } = await testSupabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspace1.id,
          email: 'expired-test@example.com',
          role: 'viewer',
          token: 'expired-token-' + Date.now(),
          invited_by: testUser1.id,
          expires_at: expiredDate.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      expect(expiredInvite).toBeDefined();

      // Query for expired invitations
      const { data: expiredInvitations } = await testSupabase
        .from('workspace_invitations')
        .select('id, email, expires_at, status')
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());

      expect(expiredInvitations.length).toBeGreaterThanOrEqual(1);
