export type Cube = { lbl: string; val: string; cnt?: string; accent?: boolean };

export default function SummaryCards({ cubes }: { cubes: Cube[] }) {
  return (
    <div className="cards">
      {cubes.map((c, i) => (
        <div className="card" key={i}>
          <div className="lbl">{c.lbl}</div>
          <div className="val" style={c.accent ? { color: "var(--accent)" } : undefined}>
            {c.val}
          </div>
          {c.cnt && <div className="cnt">{c.cnt}</div>}
        </div>
      ))}
    </div>
  );
}
