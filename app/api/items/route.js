import { handler, json, readJson, searchParams } from "@/lib/http";
import { validateItem } from "@/lib/domain";
import { createItem, listItems } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (request) => json(listItems(searchParams(request))));

export const POST = handler(async (request) => {
  const body = await readJson(request);
  const data = validateItem(body);
  return json(createItem(data), 201);
});
