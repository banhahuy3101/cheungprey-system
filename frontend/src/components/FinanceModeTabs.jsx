import { NavLink } from "react-router-dom";
import { LuTrendingUp, LuTrendingDown } from "react-icons/lu";

const TABS = [
  { to: "/finances/income", icon: LuTrendingUp, label: "ចំណូល" },
  { to: "/finances/expense", icon: LuTrendingDown, label: "ចំណាយ" },
];

export default function FinanceModeTabs() {
  return (
    <nav className="finance-mode-tabs" aria-label="ប្រភេទហិរញ្ញវត្ថុ">
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `finance-mode-tab ${isActive ? "active" : ""}`}
        >
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
