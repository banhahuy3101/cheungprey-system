import { useState, useEffect, useCallback } from "react";
import { performanceAPI } from "../../api/performance";

export default function DomainManager() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      const { data } = await performanceAPI.getDomains();
      setDomains(data?.data || data || []);
    } catch (e) { setMessage(e?.response?.data?.error || "Failed to load domains"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      {message && <div className="alert alert-success">{message}</div>}
      {loading ? <div className="loading">កំពុងផ្ទុក...</div> : (
        <div className="table-responsive">
          <table className="table">
            <thead><tr><th>Code</th><th>ឈ្មោៈខ្មែរ</th><th>Name EN</th><th>Sort</th></tr></thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id}>
                  <td>{d.code}</td>
                  <td>{d.name_kh}</td>
                  <td>{d.name_en}</td>
                  <td>{d.sort_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
