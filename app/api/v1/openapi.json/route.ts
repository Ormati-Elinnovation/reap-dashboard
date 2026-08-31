import { apiJson, preflight, requestOrigin } from "@/lib/api/http";
import { buildOpenApiSpec } from "@/lib/api/openapi";

// Public — describes the API, exposes no data. Consumed by /api-docs and by
// client generators (openapi-generator, Postman import, etc).
export const dynamic = "force-dynamic";

export const GET = (req: Request) => apiJson(req, buildOpenApiSpec(requestOrigin(req)));

export const OPTIONS = preflight;
