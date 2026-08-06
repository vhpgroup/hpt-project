import { handler, json, readJson } from "@/lib/http";
import { validateReceipt } from "@/lib/domain";
import { createReceipt, listReceipts } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (_request, { params }) => {
  const { id } = await params;
  return json({ data: listReceipts(id) });
});

export const POST = handler(async (request, { params }) => {
  const { id } = await params;
  const body = await readJson(request);
  return json(createReceipt(id, validateReceipt(body)), 201);
});
