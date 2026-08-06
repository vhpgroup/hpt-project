import { handler, json, readJson } from "@/lib/http";
import { validateProject } from "@/lib/domain";
import { deleteProject, getProject, updateProject } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (_request, { params }) => {
  const { id } = await params;
  return json(getProject(id));
});

export const PATCH = handler(async (request, { params }) => {
  const { id } = await params;
  const body = await readJson(request);
  const patch = validateProject(body, { partial: true });
  return json(updateProject(id, patch));
});

export const DELETE = handler(async (_request, { params }) => {
  const { id } = await params;
  deleteProject(id);
  return new Response(null, { status: 204 });
});
