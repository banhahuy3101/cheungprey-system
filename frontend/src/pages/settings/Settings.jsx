import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuKeyRound, LuShield, LuTarget, LuWrench, LuFileText, LuMapPin, LuSettings2, LuClock, LuSettings } from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, hasAnyFeature } from "../../utils/permissions";
import api from "../../api/client";

const ICON_MAP = {
  LuShield,
  LuKeyRound,
  LuMapPin,
  LuFileText,
  LuWrench,
  LuSettings2,
  LuTarget,
  LuClock,
};

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/settings/catalog");
        const data = res.data?.data || res.data || [];
        setCatalog(Array.isArray(data) ? data : []);
      } catch {
        setCatalog([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibleItems = catalog.filter((item) => {
    if (item.features && Array.isArray(item.features)) {
      return hasAnyFeature(user, item.features);
    }
    if (item.key) {
      return canAccess(user, item.key);
    }
    return true;
  });

  return (
    <div className="page">
      <PageHeader
        title="ការកំណត់ប្រព័ន្ធ"
        subtitle="គ្រប់គ្រងសិទ្ធិ អ្នកប្រើប្រាស់ ម៉ឺនុយ និងការកំណត់បច្ចេកទេសប្រព័ន្ធ"
        icon={<LuSettings size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់" },
        ]}
      />

      {loading ? (
        <div className="loading" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
          កំពុងផ្ទុកការកំណត់...
        </div>
      ) : (
        <div className="settings-grid">
          {visibleItems.map((item) => {
            const IconComp = ICON_MAP[item.icon] || LuShield;
            return (
              <div key={item.path} className="card settings-nav-card" onClick={() => navigate(item.path)}>
                <div className="settings-nav-card-inner">
                  <div className="settings-nav-icon">
                    <IconComp size={24} />
                  </div>
                  <div>
                    <div className="settings-nav-title">{item.title}</div>
                    <div className="settings-nav-desc">{item.desc}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
