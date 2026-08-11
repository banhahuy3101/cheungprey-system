import { useState } from "react";
import { LuArrowLeft, LuUpload } from "react-icons/lu";
import { membershipAPI } from "../../api/membership";

export default function MembershipImport({ onBack, onDone }) {
  const [json, setJson] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleImport = async () => {
    setError("");
    setResult(null);
    setSubmitting(true);
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        setError("JSON must be an array of members");
        setSubmitting(false);
        return;
      }
      const res = await membershipAPI.bulkImport(parsed);
      setResult(res.data?.data || res.data);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format");
      } else {
        setError(err.response?.data?.error || "Import failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={onBack}><LuArrowLeft /></button>
          <h2 className="section-title">នាំចូលសមាជិក</h2>
        </div>
      </div>

      <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ padding: "1rem" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
            បិទភ្ជាប់ JSON array នៃសមាជិក។ វាលដែលត្រូវការ: <code>membership_card_no</code>, <code>last_name_kh</code>, <code>first_name_kh</code>, <code>last_name_en</code>, <code>first_name_en</code>, <code>gender</code>, <code>date_of_birth</code>, <code>phone_number</code>, <code>registered_village_code</code>, <code>join_date</code>.
          </p>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={12}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
            placeholder={`[
  {
    "membership_card_no": "M-2026-0001",
    "last_name_kh": "ចាន់ដារ៉ា",
    "first_name_kh": "សុខ",
    "gender": "Male",
    ...
  }
]`}
          />
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" onClick={onBack}>ត្រឡប់</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={submitting || !json.trim()}>
              {submitting ? "កំពុងនាំចូល..." : <><LuUpload /> នាំចូល</>}
            </button>
          </div>
          {error && <div className="alert alert-error" style={{ marginTop: "1rem" }}>{error}</div>}
        </div>
      </div>

      {result && (
        <div className="card" style={{ maxWidth: "800px", margin: "1rem auto" }}>
          <div style={{ padding: "1rem" }}>
            <h4 style={{ marginBottom: "0.75rem" }}>លទ្ធផលនាំចូល</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ textAlign: "center", padding: "0.75rem", background: "var(--bg)", borderRadius: "var(--radius)" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{result.total}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>សរុប</div>
              </div>
              <div style={{ textAlign: "center", padding: "0.75rem", background: "var(--bg)", borderRadius: "var(--radius)" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--success)" }}>{result.created}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>បានបង្កើត</div>
              </div>
              <div style={{ textAlign: "center", padding: "0.75rem", background: "var(--bg)", borderRadius: "var(--radius)" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--danger)" }}>{result.errors + (result.duplicates || 0)}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>បរាជ័យ / ស្ទួន</div>
              </div>
            </div>
            {result.duplicate_details && result.duplicate_details.length > 0 && (
              <div>
                <h5 style={{ marginBottom: "0.5rem", color: "var(--danger)" }}>ទិន្នន័យស្ទួន</h5>
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>#</th><th>វាល</th><th>តម្លៃ</th><th>មូលហេតុ</th></tr></thead>
                    <tbody>
                      {result.duplicate_details.map((d, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{d.field}</td>
                          <td>{d.value}</td>
                          <td>{d.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <button className="btn btn-primary" onClick={onDone} style={{ marginTop: "1rem" }}>ទៅកាន់បញ្ជីសមាជិក</button>
          </div>
        </div>
      )}
    </div>
  );
}
