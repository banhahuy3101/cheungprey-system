import React from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
} from "react-icons/lu";
import { toKhmerDigits } from "../utils/khmerNumberSpelling";
import "../style/pagination.css";

/**
 * Reusable Pagination UI Component
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-based)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} [props.totalItems=0] - Total count of items
 * @param {number} [props.pageSize=25] - Current page size
 * @param {number[]} [props.pageSizeOptions=[25, 50, 100]] - Array of available page size numbers
 * @param {Function} props.onPageChange - Handler called when a page is clicked
 * @param {Function} [props.onPageSizeChange] - Handler called when page size changes
 * @param {string} [props.itemLabel="នាក់"] - Label suffix for total items count
 * @param {boolean} [props.showPageSize=true] - Whether to show the page size dropdown
 * @param {boolean} [props.showSummary=true] - Whether to show the results range summary
 * @param {string} [props.className=""] - Additional container CSS classes
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 25,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = "នាក់",
  showPageSize = true,
  showSummary = true,
  className = "",
}) {
  if (totalItems <= 0 && totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
    );
  };

  const pages = getPageNumbers();

  return (
    <div className={`app-pagination-container ${className}`.trim()}>
      {/* Left Side: Summary & Page Size */}
      <div className="app-pagination-info">
        {showSummary && totalItems > 0 && (
          <div className="app-pagination-summary">
            បង្ហាញ{" "}
            <span className="app-pagination-summary-bold">
              {toKhmerDigits(from)} - {toKhmerDigits(to)}
            </span>{" "}
            នៃសរុប{" "}
            <span className="app-pagination-summary-bold">
              {toKhmerDigits(totalItems)}
            </span>{" "}
            {itemLabel}
          </div>
        )}

        {showPageSize && onPageSizeChange && (
          <div className="app-pagination-size-wrap">
            <span className="app-pagination-size-label">
              បង្ហាញក្នុងមួយទំព័រ ៖
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
              }}
              className="app-pagination-select"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {toKhmerDigits(opt)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right Side: Reusable Pagination Buttons */}
      {totalPages > 1 && (
        <nav className="app-pagination-nav" aria-label="Pagination">
          {/* First Page */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={(e) => {
              e.preventDefault();
              onPageChange && onPageChange(1);
            }}
            className="app-pagination-btn"
            title="ទំព័រដំបូង"
          >
            <LuChevronsLeft size={16} />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={(e) => {
              e.preventDefault();
              onPageChange && onPageChange(Math.max(1, currentPage - 1));
            }}
            className="app-pagination-btn"
            title="ទំព័រមុន"
          >
            <LuChevronLeft size={16} />
          </button>

          {/* Page Numbers */}
          {pages.map((p, idx, arr) => (
            <React.Fragment key={p}>
              {idx > 0 && p - arr[idx - 1] > 1 && (
                <span className="app-pagination-ellipsis">...</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange && onPageChange(p);
                }}
                className={`app-pagination-btn ${currentPage === p ? "is-active" : ""}`}
              >
                {toKhmerDigits(p)}
              </button>
            </React.Fragment>
          ))}

          {/* Next Page */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={(e) => {
              e.preventDefault();
              onPageChange && onPageChange(Math.min(totalPages, currentPage + 1));
            }}
            className="app-pagination-btn"
            title="ទំព័របន្ទាប់"
          >
            <LuChevronRight size={16} />
          </button>

          {/* Last Page */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={(e) => {
              e.preventDefault();
              onPageChange && onPageChange(totalPages);
            }}
            className="app-pagination-btn"
            title="ទំព័រចុងក្រោយ"
          >
            <LuChevronsRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
