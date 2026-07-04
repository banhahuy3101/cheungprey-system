import { useState } from "react";
import { LuChevronDown, LuChevronRight, LuUsers } from "react-icons/lu";

export default function MemberOrgChart({ members = [] }) {
  const [expanded, setExpanded] = useState({});

  // Build hierarchy from registered_village_code
  const tree = {};

  members.forEach((m) => {
    const code = m.registered_village_code || "unknown";
    const province = code.slice(0, 2) || "00";
    const district = code.slice(0, 4) || "0000";
    const commune = code.slice(0, 6) || "000000";
    const village = code;

    if (!tree[province]) tree[province] = { name: province, children: {}, members: [] };
    if (!tree[province].children[district]) tree[province].children[district] = { name: district, children: {}, members: [] };
    if (!tree[province].children[district].children[commune]) {
      tree[province].children[district].children[commune] = { name: commune, children: {}, members: [] };
    }
    if (!tree[province].children[district].children[commune].children[village]) {
      tree[province].children[district].children[commune].children[village] = { name: village, members: [] };
    }

    tree[province].members.push(m);
    tree[province].children[district].members.push(m);
    tree[province].children[district].children[commune].members.push(m);
    tree[province].children[district].children[commune].children[village].members.push(m);
  });

  const toggle = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderNode = (node, level = 0, path = "") => {
    const key = path || node.name;
    const isExpanded = expanded[key] !== false; // default open
    const hasChildren = Object.keys(node.children || {}).length > 0;
    const count = node.members?.length || 0;

    return (
      <div key={key} style={{ marginLeft: level * 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            cursor: hasChildren ? "pointer" : "default",
            borderRadius: 6,
            background: level === 0 ? "#f1f5f9" : "transparent",
          }}
          onClick={() => hasChildren && toggle(key)}
        >
          {hasChildren && (
            isExpanded ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />
          )}
          <LuUsers size={14} />
          <span style={{ fontWeight: level === 0 ? 600 : 500 }}>
            {node.name}
          </span>
          <span style={{ color: "#64748b", fontSize: 12 }}>
            ({count})
          </span>
        </div>

        {isExpanded && hasChildren && (
          <div style={{ marginTop: 2 }}>
            {Object.values(node.children).map((child) =>
              renderNode(child, level + 1, `${key}-${child.name}`)
            )}
          </div>
        )}

        {isExpanded && !hasChildren && node.members?.length > 0 && (
          <div style={{ paddingLeft: 24, fontSize: 13, color: "#475569" }}>
            {node.members.slice(0, 5).map((m, i) => (
              <div key={i}>
                • {m.last_name_kh} {m.first_name_kh}
              </div>
            ))}
            {node.members.length > 5 && <div>+{node.members.length - 5} more</div>}
          </div>
        )}
      </div>
    );
  };

  if (members.length === 0) {
    return <div style={{ padding: 20, color: "#64748b" }}>No members to display in org chart.</div>;
  }

  return (
    <div style={{ padding: 16, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <div style={{ fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <LuUsers /> Organization Chart (Province → District → Commune → Village)
      </div>
      {Object.values(tree).map((node) => renderNode(node))}
    </div>
  );
}
