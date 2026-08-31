import { OPTIONS, reportRoute } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

// Same scope as the Technology tab: rows that carry a tech_group.
export const GET = reportRoute({ group: "tech_group", sub: "tech_supplier", require: "tech_group" });

export { OPTIONS };
