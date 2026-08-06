import { handler, json } from "@/lib/http";
import { listAudit } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (request) => {
  const url = new URL(request.url);
  const get = (key) => url.searchParams.get(key) || undefined;
  return json(
    listAudit({
      entityType: get("entityType"),
      entityId: get("entityId"),
      actor: get("actor"),
      page: get("page"),
      pageSize: get("pageSize"),
    })
  );
});
