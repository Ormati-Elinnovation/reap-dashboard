import { OPTIONS, reportRoute } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = reportRoute({ group: "merchant", sub: "card", extras: ["holder", "company"] });

export { OPTIONS };
