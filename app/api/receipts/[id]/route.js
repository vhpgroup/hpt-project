import { handler, json, readJson } from "@/lib/http";
import { validateReceipt } from "@/lib/domain";
import { deleteReceipt, updateReceipt } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = handler(async (request, { params }) => {
  const { id } = await params;
  const body = await readJson(request);
  return json(updateReceipt(id, validateReceipt(body, { partial: true })));
});

export const DELETE = handler(async (_request, { params }) => {
  const { id } = await params;
  return json(deleteReceipt(id));
});
