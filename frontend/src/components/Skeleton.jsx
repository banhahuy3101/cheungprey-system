export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>{Array.from({ length: cols }).map((_, i) => <th key={i}><div style={{ height: "0.85rem", width: "80%", background: "#e2e8f0", borderRadius: "4px", animation: "pulse 1.5s infinite" }} /></th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><div style={{ height: "0.85rem", background: c === 0 ? "#f1f5f9" : "#e2e8f0", borderRadius: "4px", width: c === cols - 1 ? "60%" : "75%", animation: "pulse 1.5s infinite", animationDelay: `${r * 0.1}s` }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCard({ height = "200px" }) {
  return (
    <div style={{ height, background: "#f1f5f9", borderRadius: "var(--radius)", animation: "pulse 1.5s infinite" }} />
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height="100px" />
      ))}
    </div>
  );
}
