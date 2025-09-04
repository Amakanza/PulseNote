import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/reports - Get all reports for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's reports/projects with workspace information
    const { data: reports, error } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        content,
        created_at,
        updated_at,
        workspace_id,
        created_by,
        workspace:workspaces(
          id,
          name
        )
      `)
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data for the frontend
    const transformedReports = (reports || []).map(report => ({
      id: report.id,
      title: report.title || 'Untitled Report',
      content: report.content,
      created_at: report.created_at,
      updated_at: report.updated_at,
      workspace_id: report.workspace_id,
      workspace_name: (report.workspace as any)?.name || 'Personal',
      created_by: report.created_by
    }));

    return NextResponse.json({ 
      reports: transformedReports,
      total: transformedReports.length 
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, workspace_id } = body;

    // Validate required fields
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' }, 
        { status: 400 }
      );
    }

    // Check if workspace exists and user has access (if workspace_id provided)
    if (workspace_id) {
      const { data: membership } = await supabase
        .from('workspace_memberships')
        .select('role')
        .eq('workspace_id', workspace_id)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to workspace' }, 
          { status: 403 }
        );
      }
    }

    // Create the new report
    const { data: report, error } = await supabase
      .from('projects')
      .insert({
        title: title.trim(),
        content: content || '',
        workspace_id: workspace_id || null,
        created_by: user.id,
        updated_at: new Date().toISOString()
      })
      .select(`
        id,
        title,
        content,
        created_at,
        updated_at,
        workspace_id,
        created_by,
        workspace:workspaces(
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Database error creating report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the response
    const transformedReport = {
      id: report.id,
      title: report.title,
      content: report.content,
      created_at: report.created_at,
      updated_at: report.updated_at,
      workspace_id: report.workspace_id,
      workspace_name: (report.workspace as any)?.name || 'Personal',
      created_by: report.created_by
    };

    return NextResponse.json(
      { 
        report: transformedReport,
        message: 'Report created successfully' 
      }, 
      { status: 201 }
    );

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PUT /api/reports - Update an existing report
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, content } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' }, 
        { status: 400 }
      );
    }

    // Check if user owns the report
    const { data: existingReport } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!existingReport || existingReport.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Report not found or access denied' }, 
        { status: 404 }
      );
    }

    // Update the report
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content;

    const { data: report, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        title,
        content,
        created_at,
        updated_at,
        workspace_id,
        created_by,
        workspace:workspaces(
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Database error updating report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the response
    const transformedReport = {
      id: report.id,
      title: report.title,
      content: report.content,
      created_at: report.created_at,
      updated_at: report.updated_at,
      workspace_id: report.workspace_id,
      workspace_name: (report.workspace as any)?.name || 'Personal',
      created_by: report.created_by
    };

    return NextResponse.json({
      report: transformedReport,
      message: 'Report updated successfully'
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/reports - Delete a report
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' }, 
        { status: 400 }
      );
    }

    // Check if user owns the report
    const { data: existingReport } = await supabase
      .from('projects')
      .select('created_by, title')
      .eq('id', id)
      .single();

    if (!existingReport || existingReport.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Report not found or access denied' }, 
        { status: 404 }
      );
    }

    // Delete the report
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error deleting report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Report "${existingReport.title}" deleted successfully`
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
