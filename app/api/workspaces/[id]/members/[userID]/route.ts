// app/api/workspaces/[id]/members/[userId]/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serve";

// Update member role
export async function PATCH(
  req: Request, 
  { params }: { params: { id: string; userId:
