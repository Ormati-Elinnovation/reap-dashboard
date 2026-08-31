import { OPTIONS, reportRoute } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = reportRoute({ group: "card", sub: "merchant", extras: ["holder", "company"] });

export { OPTIONS };
