import { handler, json, readJson } from "@/lib/http";
import { validateItem } from "@/lib/domain";
import { deleteItem, getItem, updateItem } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (_request, { params }) => {
  const { id } = await params;
  return json(getItem(id));
});

export const PATCH = handler(async (request, { params }) => {
  const { id } = await params;
  const body = await readJson(request);
  const patch = validateItem(body, { partial: true });
  return json(updateItem(id, patch));
});

export const DELETE = handler(async (_request, { params }) => {
  const { id } = await params;
  deleteItem(id);
  return new Response(null, { status: 204 });
});
