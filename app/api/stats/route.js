import { handler, json } from "@/lib/http";
import { getStats, listOwners } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => json({ ...getStats(), owners: listOwners() }));
