import { LuChartNoAxesColumnIncreasing } from "react-icons/lu";
import { formatUSD } from "../utils/finance";

function MonthlyBar({ point, maxVal, mode }) {
  const isExpense = mode === "expense";
  const amount = isExpense ? point.expense : point.income;
  const widthPct = maxVal > 0 ? (amount / maxVal) * 100 : 4;

  return (
    <div className="finance-chart-row">
      <span className="finance-chart-label">{point.month}</span>
      <div className="finance-chart-bar-wrap">
        <div
          className={`finance-chart-bar finance-chart-bar-single ${isExpense ? "expense" : "income"}`}
          style={{ width: `${Math.max(widthPct, 6)}%` }}
        />
      </div>
      <span className={`finance-chart-values ${isExpense ? "finance-amount-expense" : "finance-amount-income"}`}>
        {formatUSD(amount)}
      </span>
    </div>
  );
}

export default function FinanceCharts({ analytics, mode = "income" }) {
  if (!analytics?.monthly?.length) return null;

  const isExpense = mode === "expense";
  const maxVal = Math.max(
    0,
    ...analytics.monthly.map((p) => (isExpense ? p.expense || 0 : p.income || 0))
  );

  const hasData = analytics.monthly.some((p) => (isExpense ? p.expense : p.income) > 0);
  if (!hasData) return null;

  return (
    <div className="card finance-panel finance-charts">
      <div className="finance-panel-header">
        <h3 className="finance-panel-title">
          <LuChartNoAxesColumnIncreasing className="finance-panel-icon" />
          {isExpense ? "គំនូសចំណាយតាមខែ" : "គំនូសចំណូលតាមខែ"}
        </h3>
      </div>
      <div className="finance-chart-body">
        {analytics.monthly.map((p) => (
          <MonthlyBar key={p.month} point={p} maxVal={maxVal} mode={mode} />
        ))}
      </div>
    </div>
  );
}
