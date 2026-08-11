import { LuUsers, LuBanknote, LuActivity, LuUserCheck, LuCreditCard, LuFileSearch } from "react-icons/lu";

const icons = {
  members: LuUsers,
  dues: LuBanknote,
  activity: LuActivity,
  positions: LuUserCheck,
  cards: LuCreditCard,
  search: LuFileSearch,
};

export default function EmptyState({ type = "search", title, message, actionLabel, onAction }) {
  const Icon = icons[type] || LuFileSearch;

  const defaults = {
    members: { title: "មិនទាន់មានសមាជិក", message: "ចាប់ផ្តើមដោយបន្ថែមសមាជិកថ្មី" },
    dues: { title: "មិនទាន់មានការបង់រំលោះ", message: "មិនទាន់មានប្រវត្តិបង់រំលោះសម្រាប់សមាជិកនេះទេ" },
    activity: { title: "មិនទាន់មានសកម្មភាព", message: "មិនទាន់មានកំណត់ត្រាសកម្មភាពសម្រាប់សមាជិកនេះទេ" },
    positions: { title: "មិនទាន់មានប្រវត្តិឋានៈ", message: "មិនទាន់មានការតែងតាំងឋានៈសម្រាប់សមាជិកនេះទេ" },
    cards: { title: "មិនទាន់មានកាត", message: "មិនទាន់មានកាតសមាជិកដែលបានចេញ" },
    search: { title: "រកមិនឃើញ", message: "មិនមានលទ្ធផលសម្រាប់ការស្វែងរកនេះ" },
  };

  const d = defaults[type] || defaults.search;

  return (
    <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
      <Icon size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: "1rem" }} />
      <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text)", fontSize: "1rem" }}>{title || d.title}</h3>
      <p style={{ margin: "0 0 1rem 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>{message || d.message}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
