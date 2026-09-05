import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as Icons from "react-icons/lu";
import { LuArrowLeft, LuSave, LuLayers, LuCheck, LuX, LuChevronDown, LuSearch } from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../components/Toast";
import { menuItemsAPI } from "../../api/menuItems";
import Select from "../../components/Select";

// Dynamically load all available Lucide icons from react-icons/lu
const ALL_LUCIDE_ICONS = Object.keys(Icons)
  .filter((key) => key.startsWith("Lu") && typeof Icons[key] === "function")
  .sort();

const FEATURED_ICON_LABELS = {
  LuLayoutDashboard: "LuLayoutDashboard (ផ្ទាំងបញ្ជាទំព័រដើម)",
  LuUsers: "LuUsers (សមាជិក/ក្រុម/អ្នកប្រើប្រាស់)",
  LuVote: "LuVote (អ្នកបោះឆ្នោត)",
  LuFolderOpen: "LuFolderOpen (ឯកសារ)",
  LuFileText: "LuFileText (កំណត់ត្រា)",
  LuScrollText: "LuScrollText (របាយការណ៍)",
  LuTrendingUp: "LuTrendingUp (លទ្ធផលការងារ)",
  LuSettings: "LuSettings (ការកំណត់)",
  LuShield: "LuShield (សិទ្ធិ/សុវត្ថិភាព)",
  LuKey: "LuKey (ពាក្យសម្ងាត់)",
  LuUser: "LuUser (ប្រវត្តិរូប)",
  LuMapPin: "LuMapPin (ទីតាំង/តំបន់)",
  LuFolder: "LuFolder (ថតឯកសារ)",
  LuListOrdered: "LuListOrdered (អ្នកអនុម័ត/លំដាប់)",
  LuLayers: "LuLayers (ម៉ឺនុយ/ជាន់)",
};

function SearchableIconSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredIcons = ALL_LUCIDE_ICONS.filter((name) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const label = (FEATURED_ICON_LABELS[name] || "").toLowerCase();
    return name.toLowerCase().includes(q) || label.includes(q);
  });

  const SelectedIconComp = value && Icons[value] ? Icons[value] : Icons.LuFolder;

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "0.55rem 0.75rem",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.88rem",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }}>
          <div style={{ color: "#0284c7", display: "flex", alignItems: "center" }}>
            <SelectedIconComp size={18} />
          </div>
          <span style={{ fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {FEATURED_ICON_LABELS[value] || value || "LuFolder"}
          </span>
        </div>
        <LuChevronDown size={16} style={{ color: "#64748b", flexShrink: 0 }} />
      </button>

      {/* Search Popover Dropdown Panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            maxHeight: "280px",
          }}
        >
          {/* Search Bar Input */}
          <div style={{ position: "relative" }}>
            <LuSearch
              size={15}
              style={{
                position: "absolute",
                left: "0.6rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              autoFocus
              placeholder="ស្វែងរករូបតំណាង... (Search icons e.g. user, file, settings)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.5rem 0.45rem 2rem",
                fontSize: "0.82rem",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                outline: "none",
              }}
            />
          </div>

          {/* Icon List Grid */}
          <div
            style={{
              overflowY: "auto",
              maxHeight: "200px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {filteredIcons.length === 0 ? (
              <div style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#64748b", textAlign: "center" }}>
                រកមិនឃើញរូបតំណាងឈ្មោះ "{query}"
              </div>
            ) : (
              filteredIcons.map((name) => {
                const IconC = Icons[name];
                const isSelected = value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                      setQuery("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.45rem 0.65rem",
                      borderRadius: "6px",
                      border: "none",
                      background: isSelected ? "#eff6ff" : "transparent",
                      color: isSelected ? "#1e3a8a" : "#334155",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "0.83rem",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {IconC && <IconC size={18} style={{ color: isSelected ? "#0284c7" : "#64748b", flexShrink: 0 }} />}
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {FEATURED_ICON_LABELS[name] || name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const MODULE_KEY_OPTIONS = [
  { value: "", label: "-- ជ្រើសរើសម៉ូឌុល (None) --" },
  { value: "dashboard", label: "dashboard - ផ្ទាំងបញ្ជា" },
  { value: "membership", label: "membership - គ្រប់គ្រងសមាជិក" },
  { value: "voters", label: "voters - បញ្ជីឈ្មោះអ្នកបោះឆ្នោត" },
  { value: "files", label: "files - ឯកសារ និងប្រព័ន្ធតម្កល់" },
  { value: "reports", label: "reports - របាយការណ៍" },
  { value: "performance", label: "performance - សូចនាករសមិទ្ធកម្ម" },
  { value: "settings", label: "settings - ការកំណត់ប្រព័ន្ធ" },
];

const SUB_MODULE_OPTIONS = [
  { value: "", label: "-- ជ្រើសរើសម៉ូឌុលរង (None) --" },
  { value: "list", label: "list - បញ្ជីឈ្មោះ" },
  { value: "create", label: "create - បង្កើតថ្មី" },
  { value: "queue", label: "queue - បញ្ជីផ្ទៀងផ្ទាត់ពាក្យសុំ" },
  { value: "users", label: "users - គ្រប់គ្រងអ្នកប្រើប្រាស់" },
  { value: "workflow", label: "workflow - អ្នកអនុម័ត" },
  { value: "menu_items", label: "menu_items - គ្រប់គ្រងម៉ឺនុយប្រព័ន្ធ" },
  { value: "performance_period", label: "performance_period - កាលភាគសមិទ្ធកម្ម" },
  { value: "report_templates", label: "report_templates - ទម្រង់របាយការណ៍" },
  { value: "technical", label: "technical - ការកំណត់បច្ចេកទេស" },
  { value: "technical_system", label: "technical_system - ការកំណត់ប្រព័ន្ធ" },
  { value: "zone_chiefs", label: "zone_chiefs - កំណត់ប្រធានភូមិសាស្ត្រ" },
  { value: "performance", label: "performance - គ្រប់គ្រង Performance" },
  { value: "cron", label: "cron - ការងារ Cron" },
];

const FEATURE_KEY_OPTIONS = [
  { value: "", label: "-- ជ្រើសរើសលក្ខណៈពិសេស (None) --" },
  { value: "dashboard", label: "dashboard - ផ្ទាំងបញ្ជា" },
  { value: "members", label: "members - គ្រប់គ្រងសមាជិក" },
  { value: "voters", label: "voters - អ្នកបោះឆ្នោត" },
  { value: "files", label: "files - ឯកសារ" },
  { value: "reports", label: "reports - របាយការណ៍" },
  { value: "performance", label: "performance - សូចនាករសមិទ្ធកម្ម" },
  { value: "settings", label: "settings - ការកំណត់" },
  { value: "users", label: "users - អ្នកប្រើប្រាស់" },
  { value: "technical", label: "technical - បច្ចេកទេស" },
  { value: "performance_admin", label: "performance_admin - Performance Admin" },
];

export default function SettingsMenuItemForm() {
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");
  const id = paramId || queryId;
  const isEdit = Boolean(id);

  const defaultParentId = searchParams.get("parent_id") || "";

  const toast = useToast();

  const [flatItems, setFlatItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [parentId, setParentId] = useState(defaultParentId);
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [moduleKey, setModuleKey] = useState("");
  const [subModule, setSubModule] = useState("");
  const [featureKey, setFeatureKey] = useState("");
  const [path, setPath] = useState("");
  const [icon, setIcon] = useState("LuFolder");
  const [sortOrder, setSortOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await menuItemsAPI.getFlat();
        const items = res.data?.data || res.data || [];
        const flatList = Array.isArray(items) ? items : [];
        setFlatItems(flatList);

        if (isEdit) {
          const item = flatList.find((i) => String(i.id) === String(id));
          if (item) {
            setParentId(item.parent_id || "");
            setTitle(item.title || "");
            setTitleEn(item.title_en || "");
            setModuleKey(item.module_key || "");
            setSubModule(item.sub_module || "");
            setFeatureKey(item.feature_key || "");
            setPath(item.path || "");
            setIcon(item.icon || "LuFolder");
            setSortOrder(item.sort_order || 0);
            setIsActive(item.is_active !== false);
            setIsVisible(item.is_visible !== false);
          } else {
            toast.error("រកមិនឃើញព័ត៌មានម៉ឺនុយទេ");
          }
        } else {
          setSortOrder(flatList.length + 1);
        }
      } catch (err) {
        toast.error("មិនអាចផ្ទុកទិន្នន័យបានទេ");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("សូមបញ្ចូលឈ្មោះម៉ឺនុយ (ខ្មែរ)");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        parent_id: parentId || null,
        title: title.trim(),
        title_en: titleEn.trim(),
        module_key: moduleKey.trim(),
        sub_module: subModule.trim(),
        feature_key: featureKey.trim(),
        path: path.trim(),
        icon: icon.trim(),
        sort_order: parseInt(sortOrder) || 0,
        is_active: isActive,
        is_visible: isVisible,
      };

      if (isEdit) {
        await menuItemsAPI.update(id, payload);
        toast.success("បានកែប្រែម៉ឺនុយបានសម្រេច!");
      } else {
        await menuItemsAPI.create(payload);
        toast.success("បានបង្កើតម៉ឺនុយថ្មីបានសម្រេច!");
      }

      navigate("/settings/menu-items");
    } catch (err) {
      toast.error(err.response?.data?.error || "រក្សាទុកមិនបានសម្រេច");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem", textAlign: "center", color: "#64748b" }}>
        កំពុងផ្ទុកព័ត៌មានម៉ឺនុយ...
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: "3rem" }}>
      <PageHeader
        showBack={() => navigate("/settings/menu-items")}
        title={isEdit ? "កែប្រែម៉ឺនុយប្រព័ន្ធ" : "បង្កើតម៉ឺនុយប្រព័ន្ធថ្មី"}
        subtitle={isEdit ? `កែប្រែព័ត៌មានម៉ឺនុយ "${title}"` : "កំណត់ព័ត៌មាន ម៉ូឌុល ម៉ូឌុលរង និងលក្ខណៈពិសេសរបស់ម៉ឺនុយ"}
        icon={<LuLayers size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់", path: "/settings" },
          { label: "ម៉ឺនុយប្រព័ន្ធ", path: "/settings/menu-items" },
          { label: isEdit ? "កែប្រែ" : "បង្កើតថ្មី" },
        ]}
      />

      {/* Main Card Form */}
      <div className="card shadow-sm" style={{ padding: "1.75rem", borderRadius: "14px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Order & Parent Menu Item */}
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "1.25rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
                លំដាប់ (Order) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                className="form-control"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{ fontWeight: "700", color: "#0284c7" }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
                ម៉ឺនុយមេ (Parent Menu Item)
              </label>
              <Select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">-- គ្មាន (ម៉ឺនុយមេថ្នាក់លើគេ / Top Level) --</option>
                {flatItems
                  .filter((item) => !isEdit || String(item.id) !== String(id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.module_key ? `[${item.module_key}] ` : ""}{item.title}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          {/* Titles: Khmer & English */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
                ឈ្មោះម៉ឺនុយ (ខ្មែរ) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ឧ. គ្រប់គ្រងអ្នកប្រើប្រាស់"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
                ឈ្មោះម៉ឺនុយ (English)
              </label>
              <input
                type="text"
                className="form-control"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. User Management"
              />
            </div>
          </div>

          {/* Module Key, Sub Module, Feature Key Dropdowns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
                ម៉ូឌុល (Module Key)
              </label>
              <Select
                value={moduleKey}
                onChange={(e) => setModuleKey(e.target.value)}
                style={{ width: "100%" }}
              >
                {MODULE_KEY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {moduleKey && !MODULE_KEY_OPTIONS.some((o) => o.value === moduleKey) && (
                  <option value={moduleKey}>{moduleKey} (ផ្សេងៗ)</option>
                )}
              </Select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
                ម៉ូឌុលរង (Sub Module)
              </label>
              <Select
                value={subModule}
                onChange={(e) => setSubModule(e.target.value)}
                style={{ width: "100%" }}
              >
                {SUB_MODULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {subModule && !SUB_MODULE_OPTIONS.some((o) => o.value === subModule) && (
                  <option value={subModule}>{subModule} (ផ្សេងៗ)</option>
                )}
              </Select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
                លក្ខណៈពិសេស (Feature Key)
              </label>
              <Select
                value={featureKey}
                onChange={(e) => setFeatureKey(e.target.value)}
                style={{ width: "100%" }}
              >
                {FEATURE_KEY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {featureKey && !FEATURE_KEY_OPTIONS.some((o) => o.value === featureKey) && (
                  <option value={featureKey}>{featureKey} (ផ្សេងៗ)</option>
                )}
              </Select>
            </div>
          </div>

          {/* Route Path & Icon */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
                ផ្លូវ Route (Path)
              </label>
              <input
                type="text"
                className="form-control"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="ឧ. /settings/modules/workflow"
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
                រូបតំណាង (Icon)
              </label>
              <SearchableIconSelect value={icon} onChange={setIcon} />
            </div>
          </div>

          {/* Status Checkboxes */}
          <div style={{ display: "flex", gap: "2rem", padding: "0.5rem 0" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600, color: "#334155" }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ accentColor: "#0284c7", width: "18px", height: "18px" }}
              />
              ម៉ឺនុយសកម្ម (Is Active)
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600, color: "#334155" }}>
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                style={{ accentColor: "#0284c7", width: "18px", height: "18px" }}
              />
              បង្ហាញលើ Navigation (Is Visible)
            </label>
          </div>

          {/* Footer Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/settings/menu-items")}
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <LuSave size={16} /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
