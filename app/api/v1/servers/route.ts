import { OPTIONS, reportRoute } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

// Same scope as the Servers tab: AWS / AUTOMAT / MongoDB.
export const GET = reportRoute({
  group: "srv_group",
  sub: "card",
  extras: ["holder", "company"],
  require: "srv_group",
});

export { OPTIONS };
