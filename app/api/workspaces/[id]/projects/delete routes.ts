// app/api/workspaces/[id]/projects/route.ts - Complete the POST function
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title } = await req.json();
    
    if (!title?.trim()) {
      return NextResponse.json({ error: "Project title is required" }, { status: 400 });
    }

    // Check user permissions (editor+)
    const { data: membership } = await supa
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Create project
    const { data: project, error } = await supa
      .from("projects")
      .insert({
        workspace_id: params.id,
        title: title.trim(),
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
