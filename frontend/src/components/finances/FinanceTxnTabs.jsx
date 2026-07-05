import { NavLink } from "react-router-dom";
import { LuTrendingUp, LuTrendingDown } from "react-icons/lu";

const TABS = [
  { to: "/finances/income", icon: LuTrendingUp, label: "ចំណូល" },
  { to: "/finances/expense", icon: LuTrendingDown, label: "ចំណាយ" },
];

export default function FinanceTxnTabs() {
  return (
    <nav className="fms-txn-tabs" aria-label="ប្រភេទហិរញ្ញវត្ថុ">
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `fms-txn-tab ${isActive ? "active" : ""}`}
        >
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
