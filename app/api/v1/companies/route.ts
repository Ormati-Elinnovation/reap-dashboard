import { OPTIONS, reportRoute } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = reportRoute({ group: "company", sub: "card", extras: ["holder"] });

export { OPTIONS };
