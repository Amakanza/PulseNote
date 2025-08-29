-- Workspace Invite System Database Setup

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create workspace_invites table
CREATE TABLE IF NOT EXISTS workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_expires_at ON workspace_invites(expires_at);

-- 4. Drop existing functions if they exist to avoid conflicts
DROP FUNCTION IF EXISTS create_workspace_invite(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_workspace_invite_v2(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS accept_workspace_invite(TEXT);
DROP FUNCTION IF EXISTS accept_workspace_invite_v2(TEXT);

-- 5. Create the invite creation function
CREATE OR REPLACE FUNCTION create_workspace_invite_v2(
    p_workspace UUID,
    p_email TEXT,
    p_role TEXT,
    p_invited_by UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
    v_invite_id UUID;
BEGIN
    -- Validate inputs
    IF p_workspace IS NULL OR p_email IS NULL OR p_role IS NULL OR p_invited_by IS NULL THEN
        RAISE EXCEPTION 'All parameters are required';
    END IF;

    -- Check if workspace exists
    IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace) THEN
        RAISE EXCEPTION 'Workspace not found';
    END IF;

    -- Check if inviter is a member of the workspace
    IF NOT EXISTS (
        SELECT 1 FROM workspace_memberships 
        WHERE workspace_id = p_workspace AND user_id = p_invited_by
    ) THEN
        RAISE EXCEPTION 'You must be a member of the workspace to invite others';
    END IF;

    -- Check if invite already exists for this email and workspace
    IF EXISTS (
        SELECT 1 FROM workspace_invites 
        WHERE workspace_id = p_workspace 
        AND email = LOWER(p_email)
        AND accepted_at IS NULL
        AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'An active invite already exists for this email';
    END IF;

    -- Generate a secure token
    v_token := encode(gen_random_bytes(32), 'hex');

    -- Create the invite
    INSERT INTO workspace_invites (
        workspace_id,
        email,
        role,
        token,
        invited_by
    ) VALUES (
        p_workspace,
        LOWER(p_email),
        p_role::user_role,
        v_token,
        p_invited_by
    ) RETURNING id INTO v_invite_id;

    RETURN v_token;
END;
$$;

-- 6. Create the invite acceptance function
CREATE OR REPLACE FUNCTION accept_workspace_invite_v2(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite workspace_invites%ROWTYPE;
    v_user_id UUID;
    v_result JSON;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Find the invite
    SELECT * INTO v_invite 
    FROM workspace_invites 
    WHERE token = p_token 
    AND accepted_at IS NULL 
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invite token');
    END IF;

    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM workspace_memberships 
        WHERE workspace_id = v_invite.workspace_id 
        AND user_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'You are already a member of this workspace');
    END IF;

    -- Check if email matches (for security)
    IF LOWER(v_invite.email) != LOWER((SELECT email FROM auth.users WHERE id = v_user_id)) THEN
        RETURN json_build_object('success', false, 'error', 'Email address does not match invite');
    END IF;

    -- Add user to workspace
    INSERT INTO workspace_memberships (
        workspace_id,
        user_id,
        role
    ) VALUES (
        v_invite.workspace_id,
        v_user_id,
        v_invite.role
    );

    -- Mark invite as accepted
    UPDATE workspace_invites 
    SET accepted_at = NOW(), accepted_by = v_user_id
    WHERE id = v_invite.id;

    RETURN json_build_object(
        'success', true, 
        'message', 'Successfully joined workspace',
        'workspace_id', v_invite.workspace_id
    );
END;
$$;

-- 7. Create RLS policies for workspace_invites table
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invites they created
CREATE POLICY "Users can view invites they created" ON workspace_invites
    FOR SELECT USING (invited_by = auth.uid());

-- Policy: Users can view invites for their email (for acceptance)
CREATE POLICY "Users can view invites for their email" ON workspace_invites
    FOR SELECT USING (
        LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
    );

-- Policy: Workspace admins/owners can view all invites for their workspace
CREATE POLICY "Workspace admins can view workspace invites" ON workspace_invites
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_memberships wm
            WHERE wm.workspace_id = workspace_invites.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

-- Policy: Users can create invites for workspaces they're members of
CREATE POLICY "Users can create workspace invites" ON workspace_invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_memberships wm
            WHERE wm.workspace_id = workspace_invites.workspace_id
            AND wm.user_id = auth.uid()
        )
        AND invited_by = auth.uid()
    );

-- Policy: Users can update invites for acceptance
CREATE POLICY "Users can update invites for acceptance" ON workspace_invites
    FOR UPDATE USING (
        LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
        AND accepted_at IS NULL
    );

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON workspace_invites TO authenticated;
GRANT EXECUTE ON FUNCTION create_workspace_invite_v2(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_workspace_invite_v2(TEXT) TO authenticated;

-- 9. Helper function for adding workspace members with proper type casting
CREATE OR REPLACE FUNCTION add_workspace_member(p_workspace_id UUID, p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS 1555
BEGIN
  INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES (p_workspace_id, p_user_id, p_role::user_role);
END;
1555;

GRANT EXECUTE ON FUNCTION add_workspace_member(UUID, UUID, TEXT) TO authenticated;
