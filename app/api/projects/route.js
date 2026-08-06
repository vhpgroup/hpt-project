import { handler, json, readJson, searchParams } from "@/lib/http";
import { validateProject } from "@/lib/domain";
import { createProject, listProjects } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (request) => json(listProjects(searchParams(request))));

export const POST = handler(async (request) => {
  const body = await readJson(request);
  const data = validateProject(body);
  return json(createProject(data), 201);
});
