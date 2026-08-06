import { handler, json, readJson, searchParams } from "@/lib/http";
import { validatePackage } from "@/lib/domain";
import { createPackage, listPackages } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async (request) => json(listPackages(searchParams(request))));

export const POST = handler(async (request) => {
  const body = await readJson(request);
  return json(createPackage(validatePackage(body)), 201);
});
