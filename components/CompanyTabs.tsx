"use client";
import { useBasket } from "@/lib/store";
import { fmt } from "@/lib/format";

export default function CompanyTabs({
  companies,
  scopeTot,
}: {
  companies: string[];
  scopeTot: (co: string) => number;
}) {
  const view = useBasket((s) => s.view);
  const setView = useBasket((s) => s.setView);
  const tabs = ["__all__", ...companies];
  return (
    <div className="tabs">
      {tabs.map((co) => (
        <button key={co} className={co === view ? "on" : ""} onClick={() => setView(co)}>
          {co === "__all__" ? "הכל" : co} <span className="s">${fmt(scopeTot(co))}</span>
        </button>
      ))}
    </div>
  );
}
