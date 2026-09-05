import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuPlus, LuPencil, LuTrash2,
  LuLayers, LuChevronRight
} from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../components/Toast";
import { menuItemsAPI } from "../../api/menuItems";
import cacheService from "../../services/cacheService";

export default function SettingsMenuItems() {
  const navigate = useNavigate();
  const toast = useToast();
  const [treeItems, setTreeItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const treeRes = await menuItemsAPI.getTree();
      const treeData = treeRes.data?.data || treeRes.data || [];
      setTreeItems(Array.isArray(treeData) ? treeData : []);
    } catch (err) {
      toast.error(err.response?.data?.error || "មិនអាចផ្ទុកបញ្ជីម៉ឺនុយបានទេ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (item) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបម៉ឺនុយ "${item.title}" នេះមែនទេ?`)) return;
    try {
      await menuItemsAPI.delete(item.id);
      cacheService.clearMenuItems();
      toast.success("បានលុបម៉ឺនុយបានសម្រេច");
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || "លុបមិនបានសម្រេច");
    }
  };

  const renderTreeRow = (item, level = 0) => {
    const isChild = level > 0;
    return (
      <tr key={item.id} style={{ background: isChild ? "#fafafa" : "#ffffff" }}>
        <td style={{ textAlign: "center" }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.82rem",
            fontWeight: "700",
            color: "#1e3a8a",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "0.15rem 0.55rem",
            borderRadius: "8px",
            fontFamily: "monospace",
            minWidth: "2.2rem"
          }}>
            #{item.sort_order}
          </span>
        </td>
        <td style={{ paddingLeft: `${level * 1.5 + 0.75}rem`, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {isChild && <LuChevronRight size={14} style={{ color: "#94a3b8" }} />}
            <span style={{ fontWeight: isChild ? 600 : 700, color: isChild ? "#334155" : "#0f172a" }}>
              {item.title}
            </span>
            {item.title_en && (
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>({item.title_en})</span>
            )}
          </div>
        </td>
        <td style={{ textAlign: "left" }}>
          {item.module_key ? (
            <span style={{ fontSize: "0.78rem", background: "#e0f2fe", color: "#0369a1", padding: "0.15rem 0.5rem", borderRadius: "6px", fontWeight: 600 }}>
              {item.module_key}
            </span>
          ) : "-"}
        </td>
        <td style={{ textAlign: "left" }}>
          {item.sub_module ? (
            <span style={{ fontSize: "0.78rem", background: "#f1f5f9", color: "#475569", padding: "0.15rem 0.5rem", borderRadius: "6px", fontWeight: 600 }}>
              {item.sub_module}
            </span>
          ) : "-"}
        </td>
        <td style={{ textAlign: "left" }}>
          {item.feature_key ? (
            <span style={{ fontSize: "0.78rem", background: "#fef3c7", color: "#b45309", padding: "0.15rem 0.5rem", borderRadius: "6px", fontWeight: 600 }}>
              {item.feature_key}
            </span>
          ) : "-"}
        </td>
        <td style={{ textAlign: "left" }}>
          {item.path ? (
            <code style={{ fontSize: "0.78rem", color: "#4f46e5" }}>{item.path}</code>
          ) : "-"}
        </td>
        <td style={{ textAlign: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{item.icon || "-"}</span>
        </td>
        <td style={{ textAlign: "center" }}>
          <span style={{
            fontSize: "0.75rem",
            padding: "0.15rem 0.5rem",
            borderRadius: "12px",
            fontWeight: 700,
            background: item.is_active ? "#d1fae5" : "#fee2e2",
            color: item.is_active ? "#065f46" : "#991b1b"
          }}>
            {item.is_active ? "សកម្ម" : "អសកម្ម"}
          </span>
        </td>
        <td style={{ textAlign: "center" }}>
          <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center" }}>
            <button
              className="btn-icon"
              title="បន្ថែមម៉ឺនុយរង (Add Child)"
              onClick={() => navigate(`/settings/menu-items/create?parent_id=${item.id}`)}
              style={{ color: "#0284c7" }}
            >
              <LuPlus size={16} />
            </button>
            <button
              className="btn-icon"
              title="កែប្រែ"
              onClick={() => navigate(`/settings/menu-items/edit?id=${item.id}`)}
            >
              <LuPencil size={15} />
            </button>
            <button
              className="btn-icon text-danger"
              title="លុប"
              onClick={() => handleDelete(item)}
            >
              <LuTrash2 size={15} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderTreeRecursively = (items, level = 0) => {
    if (!Array.isArray(items)) return [];
    const rows = [];
    const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    sorted.forEach((item) => {
      rows.push(renderTreeRow(item, level));
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        rows.push(...renderTreeRecursively(item.children, level + 1));
      }
    });
    return rows;
  };

  return (
    <div className="page" style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "2rem" }}>
      <PageHeader
        showBack={() => navigate("/settings")}
        title="គ្រប់គ្រងម៉ឺនុយប្រព័ន្ធ (Menu Items Management)"
        subtitle="កំណត់ ម៉ូឌុល ម៉ូឌុលរង លក្ខណៈពិសេស និងម៉ឺនុយកូនតាមឋានានុក្រម"
        icon={<LuLayers size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់", path: "/settings" },
          { label: "ម៉ឺនុយប្រព័ន្ធ" },
        ]}
        actions={
          <button className="btn btn-primary" onClick={() => navigate("/settings/menu-items/create")}>
            <LuPlus /> បង្កើតម៉ឺនុយថ្មី
          </button>
        }
      />

      {/* Main Table View */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>កំពុងផ្ទុកបញ្ជីម៉ឺនុយ...</div>
      ) : treeItems.length === 0 ? (
        <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
          មិនទាន់មានម៉ឺនុយត្រូវបានបង្កើតនៅឡើយទេ។ ចុចប៊ូតុង **+ បង្កើតម៉ឺនុយថ្មី** ដើម្បីចាប់ផ្តើម។
        </div>
      ) : (
        <div className="table-responsive shadow-sm" style={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <table className="table" style={{ width: "100%", margin: 0, borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "center", width: "7%" }}>លំដាប់</th>
                <th style={{ textAlign: "left", width: "25%" }}>ឈ្មោះម៉ឺនុយ (Title)</th>
                <th style={{ textAlign: "left", width: "12%" }}>ម៉ូឌុល (Module)</th>
                <th style={{ textAlign: "left", width: "12%" }}>ម៉ូឌុលរង (Sub Module)</th>
                <th style={{ textAlign: "left", width: "13%" }}>លក្ខណៈពិសេស (Feature)</th>
                <th style={{ textAlign: "left", width: "13%" }}>ផ្លូវ (Path)</th>
                <th style={{ textAlign: "center", width: "8%" }}>រូបតំណាង</th>
                <th style={{ textAlign: "center", width: "6%" }}>ស្ថានភាព</th>
                <th style={{ textAlign: "center", width: "8%" }}>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {renderTreeRecursively(treeItems)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
