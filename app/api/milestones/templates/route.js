// app/api/milestones/templates/route.js
//
// GET — list available milestone templates, for a "start from
// template" picker. No project/workspace scoping needed — templates
// are static and global, not tied to any one workspace. Still behind
// a session check for consistency with the rest of the API, not
// because template names are sensitive.
//
// Not on the original checklist — added because POST
// /api/milestones/from-template needs a templateKey, and there was no
// way for a frontend to know what keys exist without hardcoding them.
// Small enough that it seemed better to include than to leave as a gap.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMilestoneTemplates } from "@/lib/milestoneTemplates";
import { handleApiError } from "@/lib/http-errors";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ templates: listMilestoneTemplates() });
  } catch (error) {
    return handleApiError(error);
  }
}