import { authenticate } from "@/lib/api/auth";
import { apiJson, handle, preflight } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(req, async () => {
    const scope = await authenticate(req);
    return apiJson(req, {
      key: scope.name,
      access: {
        all_companies: scope.all_companies,
        companies: scope.all_companies ? "all" : scope.companies,
        denied_cards: scope.denied_cards,
      },
      permissions: ["read"],
    });
  });

export const OPTIONS = preflight;
