import { LuChevronLeft, LuChevronRight, LuInbox } from "react-icons/lu";
import { SkeletonTable } from "./Skeleton";

/**
 * Reusable & Consistent DataTable Component for District Management System
 *
 * @param {Object} props
 * @param {Array} props.columns - Column definitions: [{ key, label, render, align, width }]
 * @param {Array} props.data - Array of table row items
 * @param {boolean} props.loading - Loading state
 * @param {string} props.emptyMessage - Custom empty message
 * @param {Function} props.onRowClick - Optional row click handler (row) => void
 * @param {Object} props.pagination - Optional pagination props { page, totalPages, total, onPageChange }
 * @param {boolean} props.selectable - Enable checkbox selection
 * @param {Array} props.selectedIds - Array of selected item IDs
 * @param {Function} props.onSelectRow - Handler for selecting a single row (id) => void
 * @param {Function} props.onSelectAll - Handler for selecting all rows () => void
 * @param {string} props.rowKey - Property name for unique row key (default "id")
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "គ្មានទិន្នន័យ",
  onRowClick,
  pagination,
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  rowKey = "id",
}) {
  const isAllSelected = selectable && data.length > 0 && selectedIds.length === data.length;

  if (loading) {
    return (
      <div className="card" style={{ padding: "1rem", borderRadius: "14px", border: "1px solid #f1f5f9" }}>
        <SkeletonTable rows={5} cols={columns.length || 5} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div
        className="card"
        style={{
          padding: 0,
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          background: "#ffffff",
        }}
      >
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table
            className="table"
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: "0.84rem",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {selectable && (
                  <th style={{ width: "40px", textAlign: "center", padding: "0.75rem 0.6rem" }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={onSelectAll}
                      style={{ cursor: "pointer", borderRadius: "4px" }}
                    />
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th
                    key={col.key || idx}
                    style={{
                      textAlign: col.align || "left",
                      width: col.width || "auto",
                      padding: "0.75rem 1rem",
                      fontWeight: 700,
                      color: "#475569",
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      borderBottom: "1px solid #e2e8f0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <LuInbox size={32} style={{ opacity: 0.3 }} />
                      <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, rIdx) => {
                  const keyVal = row[rowKey] || rIdx;
                  const isSelected = selectable && selectedIds.includes(keyVal);

                  return (
                    <tr
                      key={keyVal}
                      onClick={() => onRowClick && onRowClick(row)}
                      style={{
                        background: isSelected ? "#eff6ff" : "#ffffff",
                        borderBottom: rIdx === data.length - 1 ? "none" : "1px solid #f1f5f9",
                        cursor: onRowClick ? "pointer" : "default",
                        transition: "background 0.12s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "#ffffff";
                      }}
                    >
                      {selectable && (
                        <td
                          style={{ textAlign: "center", padding: "0.75rem 0.6rem" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelectRow && onSelectRow(keyVal)}
                            style={{ cursor: "pointer", borderRadius: "4px" }}
                          />
                        </td>
                      )}
                      {columns.map((col, cIdx) => (
                        <td
                          key={col.key || cIdx}
                          style={{
                            textAlign: col.align || "left",
                            padding: "0.75rem 1rem",
                            color: "#0f172a",
                            verticalAlign: "middle",
                            borderBottom: "1px solid #f1f5f9",
                          }}
                        >
                          {col.render ? col.render(row[col.key], row, rIdx) : (row[col.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem 0.25rem",
            fontSize: "0.82rem",
            color: "#64748b",
          }}
        >
          <div>
            បង្ហាញ {data.length} នៃសរុប {pagination.total || data.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                borderRadius: "8px",
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
              }}
            >
              <LuChevronLeft size={16} /> មុន
            </button>

            <span style={{ fontWeight: 600, color: "#0f172a", padding: "0 0.4rem" }}>
              ទំព័រ {pagination.page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                borderRadius: "8px",
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
              }}
            >
              បន្ទាប់ <LuChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
