import { handler, json, readJson } from "@/lib/http";
import { validatePackage } from "@/lib/domain";
import { deletePackage, getPackage, updatePackage } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (_request, { params }) => {
  const { id } = await params;
  return json(getPackage(id));
});

export const PATCH = handler(async (request, { params }) => {
  const { id } = await params;
  const body = await readJson(request);
  return json(updatePackage(id, validatePackage(body, { partial: true })));
});

export const DELETE = handler(async (_request, { params }) => {
  const { id } = await params;
  deletePackage(id);
  return new Response(null, { status: 204 });
});
