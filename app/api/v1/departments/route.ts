import { OPTIONS, reportRoute } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = reportRoute({ group: "department", sub: "merchant", require: "department" });

export { OPTIONS };
