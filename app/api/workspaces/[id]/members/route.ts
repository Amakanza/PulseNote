export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { user_id, role = 'viewer' } = await req.json(); // Accept user_id directly
    
    if (!user_id || !user_id.trim()) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check permissions
    const { data: currentUserMembership } = await supa
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!currentUserMembership || !['owner', 'admin'].includes(currentUserMembership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Check if user exists
    const { data: targetUser } = await supa
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already a member
    const { data: existingMembership } = await supa
      .from("workspace_memberships")
      .select("*")
      .eq("workspace_id", params.id)
      .eq("user_id", user_id)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    // Add member
    const { error } = await supa
      .from("workspace_memberships")
      .insert({ 
        workspace_id: params.id, 
        user_id: user_id, 
        role 
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
