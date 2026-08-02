import { useState, useEffect } from "react";
import { LuUsers } from "react-icons/lu";
import { partyAPI } from "../../api/party";

function flattenTree(nodes) {
  const root = {};
  const walk = (list, parentPath = []) => {
    for (const n of list) {
      const code = n.zone_code;
      const node = {
        code,
        name: n.name_kh || n.name_en || code,
        type: parentPath.length === 0 ? "Province" : parentPath.length === 1 ? "District" : parentPath.length === 2 ? "Commune" : "Village",
        children: {},
        memberCount: 0,
      };
      if (parentPath.length === 0) {
        root[code] = node;
      } else {
        let parent = root;
        for (const p of parentPath) {
          parent = parent[p]?.children;
          if (!parent) break;
        }
        if (parent) parent[code] = node;
      }
      if (n.children && n.children.length > 0) {
        walk(n.children, [...parentPath, code]);
      }
    }
  };
  walk(nodes);
  return root;
}

function countMembers(tree, members) {
  members.forEach((m) => {
    const code = m.registered_village_code;
    if (!code) return;
    const p = code.slice(0, 2);
    const d = code.slice(0, 4);
    const c = code.slice(0, 6);
    if (tree[p]) {
      tree[p].memberCount++;
      if (tree[p].children[d]) {
        tree[p].children[d].memberCount++;
        if (tree[p].children[d]?.children[c]) {
          tree[p].children[d].children[c].memberCount++;
          if (tree[p].children[d]?.children[c]?.children[code]) {
            tree[p].children[d].children[c].children[code].memberCount++;
          }
        }
      }
    }
  });
}

export default function MemberOrgChartFull({ members = [] }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTree = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await partyAPI.getZoneTree();
        const data = res.data?.data || res.data;
        const zones = Array.isArray(data) ? data : [];
        const flat = flattenTree(zones);
        countMembers(flat, members);
        setTree(flat);
      } catch (e) {
        console.error(e);
        setError("Failed to load hierarchy.");
      } finally {
        setLoading(false);
      }
    };
    fetchTree();
  }, [members]);

  const renderGraph = (node, level = 0) => {
    if (!node) return null;
    const children = Object.values(node.children || {});
    const hasChildren = children.length > 0;
    const count = node.memberCount || 0;
    const color = level === 0 ? "#1e40af" : level === 1 ? "#3b82f6" : level === 2 ? "#60a5fa" : "#93c5fd";

    return (
      <div key={node.code} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            minWidth: 160,
            padding: "10px 14px",
            background: color,
            color: "#fff",
            borderRadius: 10,
            textAlign: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            fontSize: level === 0 ? 15 : 13,
            fontWeight: 600,
            maxWidth: 220,
            wordBreak: "break-word",
          }}
        >
          {node.name}
          {count > 0 && (
            <div style={{ fontSize: 11, marginTop: 3, opacity: 0.9 }}>
              <LuUsers size={12} style={{ verticalAlign: "middle" }} /> {count}
            </div>
          )}
        </div>

        {hasChildren && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 2, height: 16, background: "#94a3b8" }} />
            <div style={{ display: "flex", position: "relative" }}>
              {children.length > 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: "#94a3b8",
                  }}
                />
              )}
              {children.map((child) => (
                <div key={child.code} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 4px" }}>
                  <div style={{ width: 2, height: 16, background: "#94a3b8" }} />
                  {renderGraph(child, level + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>កំពុងផ្ទុក Org Chart...</div>;
  if (error) return <div style={{ padding: 20, color: "#ef4444" }}>{error}</div>;
  if (!tree || Object.keys(tree).length === 0) return <div style={{ padding: 20, color: "#ef4444" }}>No hierarchy data found.</div>;

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, overflowX: "auto" }}>
      <div style={{ fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <LuUsers /> Organization Chart (ខេត្ត → ស្រុក → ឃុំ → ភូមិ)
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
        {Object.values(tree).map((node) => renderGraph(node))}
      </div>
    </div>
  );
}
