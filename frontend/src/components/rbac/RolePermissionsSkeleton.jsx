import React from "react";

export default function RolePermissionsSkeleton() {
  return (
    <div className="settings-page rbac-page">
      <style>{`
        @keyframes rbacShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-box {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
          background-size: 200% 100%;
          animation: rbacShimmer 1.4s infinite ease-in-out;
          border-radius: 8px;
        }
      `}</style>

      {/* Header Skeleton */}
      <div className="rbac-header" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="shimmer-box" style={{ width: 42, height: 42, borderRadius: "10px" }} />
          <div>
            <div className="shimmer-box" style={{ width: 240, height: 22, marginBottom: 8 }} />
            <div className="shimmer-box" style={{ width: 360, height: 14 }} />
          </div>
        </div>
        <div className="shimmer-box" style={{ width: 170, height: 42, borderRadius: "10px" }} />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="rbac-metric-grid" style={{ marginBottom: "1.5rem" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rbac-metric" style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "1.2rem", borderRadius: "12px", display: "flex", gap: "1rem", alignItems: "center" }}>
            <div className="shimmer-box" style={{ width: 46, height: 46, borderRadius: "10px", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="shimmer-box" style={{ width: 50, height: 24, marginBottom: 6 }} />
              <div className="shimmer-box" style={{ width: 130, height: 14 }} />
            </div>
          </div>
        ))}
      </div>

      {/* 2-Column Layout Skeleton */}
      <div className="rbac-layout">
        {/* Role List Skeleton */}
        <div className="rbac-panel" style={{ background: "#ffffff", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div className="shimmer-box" style={{ width: 140, height: 20, marginBottom: "1.25rem" }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", marginBottom: "0.6rem", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
              <div className="shimmer-box" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="shimmer-box" style={{ width: 110, height: 16, marginBottom: 4 }} />
                <div className="shimmer-box" style={{ width: 70, height: 12 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Matrix Table Skeleton */}
        <div className="rbac-panel" style={{ background: "#ffffff", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center" }}>
            <div className="shimmer-box" style={{ width: 220, height: 24 }} />
            <div className="shimmer-box" style={{ width: 190, height: 36, borderRadius: "8px" }} />
          </div>
          <div className="shimmer-box" style={{ width: "100%", height: 38, marginBottom: "1.25rem", borderRadius: "8px" }} />

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "0.75rem" }}><div className="shimmer-box" style={{ width: 130, height: 16 }} /></th>
                <th style={{ padding: "0.75rem" }}><div className="shimmer-box" style={{ width: 50, height: 16, margin: "0 auto" }} /></th>
                <th style={{ padding: "0.75rem" }}><div className="shimmer-box" style={{ width: 50, height: 16, margin: "0 auto" }} /></th>
                <th style={{ padding: "0.75rem" }}><div className="shimmer-box" style={{ width: 50, height: 16, margin: "0 auto" }} /></th>
                <th style={{ padding: "0.75rem" }}><div className="shimmer-box" style={{ width: 50, height: 16, margin: "0 auto" }} /></th>
                <th style={{ padding: "0.75rem" }}><div className="shimmer-box" style={{ width: 50, height: 16, margin: "0 auto" }} /></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.85rem 0.75rem" }}><div className="shimmer-box" style={{ width: 150, height: 16 }} /></td>
                  <td style={{ padding: "0.85rem 0.75rem" }}><div className="shimmer-box" style={{ width: 18, height: 18, margin: "0 auto", borderRadius: "4px" }} /></td>
                  <td style={{ padding: "0.85rem 0.75rem" }}><div className="shimmer-box" style={{ width: 18, height: 18, margin: "0 auto", borderRadius: "4px" }} /></td>
                  <td style={{ padding: "0.85rem 0.75rem" }}><div className="shimmer-box" style={{ width: 18, height: 18, margin: "0 auto", borderRadius: "4px" }} /></td>
                  <td style={{ padding: "0.85rem 0.75rem" }}><div className="shimmer-box" style={{ width: 18, height: 18, margin: "0 auto", borderRadius: "4px" }} /></td>
                  <td style={{ padding: "0.85rem 0.75rem" }}><div className="shimmer-box" style={{ width: 18, height: 18, margin: "0 auto", borderRadius: "4px" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
