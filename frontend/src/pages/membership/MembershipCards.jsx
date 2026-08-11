import { useState, useEffect } from "react";
import { LuArrowLeft, LuPlus } from "react-icons/lu";
import { membershipAPI } from "../../api/membership";
import Select from "../../components/Select";

export default function MembershipCards({ memberId, onBack }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ card_no: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetch = () => {
    membershipAPI.getCards(memberId).then((res) => {
      setCards(res.data?.data || res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [memberId]);

  const handleIssue = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await membershipAPI.issueCard(memberId, form);
      setShowModal(false);
      setForm({ card_no: "" });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to issue card");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCard = async (cardId, newStatus) => {
    try {
      await membershipAPI.updateCard(cardId, { card_status: newStatus });
      fetch();
    } catch {
      //
    }
  };

  const statusLabel = (s) => {
    const map = { Pending: "រង់ចាំ", Issued: "បានចេញ", Delivered: "បានប្រគល់", Expired: "ផុតកំណត់", Replaced: "បានជំនួស" };
    return map[s] || s;
  };

  const statusBadge = (s) => {
    const map = { Pending: "badge-warning", Issued: "badge-info", Delivered: "badge-success", Expired: "badge-danger", Replaced: "badge" };
    return map[s] || "badge";
  };

  if (loading) return <div className="page"><div className="loading">កំពុងផ្ទុក...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={onBack}><LuArrowLeft /></button>
          <h2 className="section-title">កាតសមាជិក</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><LuPlus /> ចេញកាត</button>
      </div>

      <div className="card">
        {cards.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>មិនទាន់មានកាត</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>#</th><th>លេខកាត</th><th>ស្ថានភាព</th><th>ចេញនៅ</th><th>ប្រគល់នៅ</th><th>ផុតកំណត់</th><th></th></tr></thead>
              <tbody>
                {cards.map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td><strong>{c.card_no}</strong></td>
                    <td><span className={`badge ${statusBadge(c.card_status)}`}>{statusLabel(c.card_status)}</span></td>
                    <td>{c.issued_at?.slice(0, 10)}</td>
                    <td>{c.delivered_at?.slice(0, 10) || "—"}</td>
                    <td>{c.expired_at?.slice(0, 10) || "—"}</td>
                    <td>
                      <div className="actions">
                        {c.card_status === "Issued" && (
                          <button className="btn-icon" title="ប្រគល់" onClick={() => handleUpdateCard(c.id, "Delivered")}>✓</button>
                        )}
                        {c.card_status !== "Expired" && c.card_status !== "Replaced" && (
                          <button className="btn-icon" title="ផុតកំណត់" onClick={() => handleUpdateCard(c.id, "Expired")}>⏰</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3>ចេញកាតសមាជិក</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleIssue}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label>លេខកាត *</label>
                  <input name="card_no" value={form.card_no} onChange={(e) => setForm({ card_no: e.target.value })} placeholder="CARD-001" required />
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>បោះបង់</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "រក្សាទុក..." : "ចេញកាត"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
