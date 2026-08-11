import { useState, useEffect } from "react";
import {
  LuArrowLeft, LuPlus, LuCreditCard, LuClock,
  LuSparkles, LuCircleCheck, LuQrCode, LuRefreshCw
} from "react-icons/lu";
import { membershipAPI } from "../../api/membership";
import Modal from "../settings/Modal";

export default function MembershipCards({ memberId, onBack }) {
  const [cards, setCards] = useState([]);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ card_no: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cardSide, setCardSide] = useState("front");

  const fetchData = async () => {
    try {
      const [cardsRes, profileRes] = await Promise.all([
        membershipAPI.getCards(memberId),
        membershipAPI.getProfile(memberId),
      ]);
      setCards(cardsRes.data?.data || cardsRes.data || []);
      const prof = profileRes.data?.data || profileRes.data;
      setMember(prof?.member || null);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [memberId]);

  const generateCardNo = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    setForm({ card_no: `CPP-${date}-${rand}` });
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!form.card_no.trim()) {
      setError("សូមបញ្ចូលលេខកាតសមាជិក");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await membershipAPI.issueCard(memberId, form);
      setShowModal(false);
      setForm({ card_no: "" });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "ចេញកាតបរាជ័យ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCard = async (cardId, newStatus) => {
    try {
      await membershipAPI.updateCard(cardId, { card_status: newStatus });
      fetchData();
    } catch {
      //
    }
  };

  const activeCard = cards.find(c => c.card_status === "Issued" || c.card_status === "Delivered") || cards[0];

  const statusLabel = (s) => {
    const map = { Pending: "រង់ចាំ", Issued: "បានចេញ", Delivered: "បានប្រគល់", Expired: "ផុតកំណត់", Replaced: "បានជំនួស" };
    return map[s] || s;
  };

  const statusBadgeStyle = (s) => {
    switch (s) {
      case "Delivered":
        return { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
      case "Issued":
        return { background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" };
      case "Pending":
        return { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
      case "Expired":
      case "Replaced":
        return { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" };
      default:
        return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
    }
  };

  const fullNameKh = member ? `${member.last_name_kh} ${member.first_name_kh}` : "ឈ្មោះសមាជិក";
  const fullNameEn = member ? `${member.first_name_en} ${member.last_name_en}`.toUpperCase() : "MEMBER NAME";

  if (loading) {
    return <div className="page"><div className="loading">កំពុងផ្ទុកព័ត៌មានកាតសមាជិក...</div></div>;
  }

  return (
    <div className="page" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onBack}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", fontWeight: "600" }}
          >
            <LuArrowLeft size={16} /> ត្រឡប់
          </button>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontSize: "1.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <LuCreditCard style={{ color: "var(--primary)" }} /> កាតសមាជិកឌីជីថល (Digital Membership Card)
            </h2>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              គ្រប់គ្រង និងមើលកាតសមាជិកផ្លូវការរបស់ {fullNameKh}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => { generateCardNo(); setShowModal(true); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", borderRadius: "10px", padding: "0.6rem 1.2rem", fontWeight: "600" }}
        >
          <LuPlus size={18} /> ចេញកាតថ្មី
        </button>
      </div>

      {/* Main Grid: Left Digital Smart Card Visual + Right History & Quick Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.75rem", alignItems: "start" }}>

        {/* LEFT COLUMN: Modern Smart Membership Card Visual Display */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LuSparkles size={16} style={{ color: "#f59e0b" }} /> ប័ណ្ណសមាជិកផ្លូវការ
            </span>
            <div style={{ display: "flex", gap: "0.3rem", background: "#e2e8f0", padding: "3px", borderRadius: "8px" }}>
              <button
                type="button"
                onClick={() => setCardSide("front")}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  borderRadius: "6px",
                  border: "none",
                  background: cardSide === "front" ? "#ffffff" : "transparent",
                  color: cardSide === "front" ? "#1e40af" : "#64748b",
                  boxShadow: cardSide === "front" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer"
                }}
              >
                ខាងមុខ
              </button>
              <button
                type="button"
                onClick={() => setCardSide("back")}
                style={{
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  borderRadius: "6px",
                  border: "none",
                  background: cardSide === "back" ? "#ffffff" : "transparent",
                  color: cardSide === "back" ? "#1e40af" : "#64748b",
                  boxShadow: cardSide === "back" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer"
                }}
              >
                ខាងក្រោយ
              </button>
            </div>
          </div>

          {/* THE DIGITAL CARD UI */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1.586 / 1",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)",
              color: "#ffffff",
              padding: "1.5rem 1.75rem",
              boxShadow: "0 20px 40px -15px rgba(30, 58, 138, 0.35), 0 0 0 1px rgba(255,255,255,0.15) inset",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontFamily: "var(--font-khmer, sans-serif)",
            }}
          >
            {/* Background Decorative Waves */}
            <div
              style={{
                position: "absolute",
                top: "-40%",
                right: "-20%",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(255,255,255,0) 70%)",
                pointerEvents: "none"
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-50%",
                left: "-20%",
                width: "350px",
                height: "350px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(255,255,255,0) 70%)",
                pointerEvents: "none"
              }}
            />

            {cardSide === "front" ? (
              <>
                {/* Header: Org Title & Status Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "42px", height: "42px", borderRadius: "10px",
                      background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.2)", fontSize: "1.2rem", color: "#fbbf24"
                    }}>
                      🏛️
                    </div>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "800", letterSpacing: "0.02em", color: "#ffffff" }}>
                        គណបក្សប្រជាជនកម្ពុជា
                      </div>
                      <div style={{ fontSize: "0.65rem", fontWeight: "700", color: "#93c5fd", letterSpacing: "0.1em" }}>
                        CAMBODIAN PEOPLE'S PARTY
                      </div>
                    </div>
                  </div>
                  {activeCard && (
                    <span style={{
                      fontSize: "0.7rem", fontWeight: "700", padding: "0.2rem 0.6rem", borderRadius: "999px",
                      background: activeCard.card_status === "Delivered" ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.2)",
                      color: activeCard.card_status === "Delivered" ? "#4ade80" : "#ffffff",
                      border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(6px)"
                    }}>
                      {statusLabel(activeCard.card_status)}
                    </span>
                  )}
                </div>

                {/* Body: Chip & Member Details */}
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", zIndex: 2, margin: "0.5rem 0" }}>
                  {/* EMV Chip Graphic */}
                  <div style={{
                    width: "42px", height: "32px", borderRadius: "6px",
                    background: "linear-gradient(135deg, #fde047 0%, #d97706 100%)",
                    border: "1px solid #b45309", position: "relative", flexShrink: 0
                  }}>
                    <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#b45309" }} />
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: "40%", width: "1px", background: "#b45309" }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "#ffffff", lineHeight: "1.2", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                      {fullNameKh}
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#bfdbfe", letterSpacing: "0.05em", marginTop: "2px" }}>
                      {fullNameEn}
                    </div>
                  </div>
                </div>

                {/* Footer: Card Number & Dates */}
                <div style={{ zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: "0.62rem", color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      លេខកាត / CARD NO.
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "800", fontFamily: "monospace", letterSpacing: "0.15em", color: "#ffffff" }}>
                      {activeCard ? activeCard.card_no : (member?.membership_card_no || "CARD-0000-0000")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.62rem", color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      តួនាទី / ROLE
                    </div>
                    <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#fef08a" }}>
                      {member?.party_role || "សមាជិក"}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* CARD BACK SIDE */
              <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", zIndex: 2 }}>
                <div style={{
                  height: "36px", background: "#020617", margin: "-1.5rem -1.75rem 0.5rem -1.75rem",
                  display: "flex", alignItems: "center", padding: "0 1.5rem"
                }}>
                  <span style={{ fontSize: "0.6rem", color: "#64748b", letterSpacing: "0.1em" }}>AUTHORIZED SIGNATURE / ហត្ថលេខាផ្លូវការ</span>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <div style={{ background: "#ffffff", padding: "6px", borderRadius: "8px", flexShrink: 0 }}>
                    <LuQrCode size={64} style={{ color: "#0f172a" }} />
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                    <p style={{ margin: 0, fontWeight: "600" }}>ប័ណ្ណនេះជាសម្បត្តិរបស់ គណបក្សប្រជាជនកម្ពុជា។</p>
                    <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.65rem" }}>
                      ប្រសិនបើបានរើសបាន សូមប្រគល់ជូនការិយាល័យគណបក្សដែលនៅជិតបំផុត។
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#93c5fd", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "0.5rem" }}>
                  <span>ថ្ងៃចេញ: {activeCard?.issued_at?.slice(0, 10) || "—"}</span>
                  <span>ផុតកំណត់: {activeCard?.expired_at?.slice(0, 10) || "គ្មានកំណត់"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Card History Table & Status Control */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem", borderRadius: "14px" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <LuClock style={{ color: "var(--primary)" }} /> ប្រវត្តិ និងស្ថានភាពកាតសមាជិក
            </h3>

            {cards.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
                <LuCreditCard size={36} style={{ color: "#cbd5e1", marginBottom: "0.5rem" }} />
                <p style={{ margin: 0, fontWeight: "500" }}>មិនទាន់មានកាតសមាជិកនៅឡើយទេ</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { generateCardNo(); setShowModal(true); }}
                  style={{ marginTop: "0.85rem", borderRadius: "8px" }}
                >
                  + ចេញកាតដំបូង
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>លេខកាត</th>
                      <th>ស្ថានភាព</th>
                      <th>ថ្ងៃចេញកាត</th>
                      <th>សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((c, i) => (
                      <tr key={c.id}>
                        <td>{i + 1}</td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#0f172a" }}>{c.card_no}</span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: "0.75rem", fontWeight: "700", padding: "0.2rem 0.55rem",
                            borderRadius: "6px", display: "inline-block", ...statusBadgeStyle(c.card_status)
                          }}>
                            {statusLabel(c.card_status)}
                          </span>
                        </td>
                        <td style={{ color: "#475569" }}>
                          {c.issued_at?.slice(0, 10) || "—"}
                        </td>
                        <td>
                          <div className="actions" style={{ display: "flex", gap: "0.35rem" }}>
                            {c.card_status === "Issued" && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                title="ប្រគល់កាត"
                                onClick={() => handleUpdateCard(c.id, "Delivered")}
                                style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.72rem" }}
                              >
                                <LuCheckCircle2 size={13} style={{ verticalAlign: "middle" }} /> ប្រគល់
                              </button>
                            )}
                            {c.card_status !== "Expired" && c.card_status !== "Replaced" && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                title="ផុតកំណត់"
                                onClick={() => handleUpdateCard(c.id, "Expired")}
                                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.72rem" }}
                              >
                                ផុតកំណត់
                              </button>
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
        </div>

      </div>

      {/* Modal: Issue New Card */}
      {showModal && (
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="💳 ចេញកាតសមាជិកថ្មី"
        >
          <form onSubmit={handleIssue}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem", display: "block" }}>
                  លេខកាតសមាជិក / Card Number <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="modern-form-input"
                    value={form.card_no}
                    onChange={(e) => setForm({ card_no: e.target.value })}
                    placeholder="CPP-2026-0001"
                    required
                    style={{ flex: 1, fontFamily: "monospace", fontWeight: "700", fontSize: "1rem" }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={generateCardNo}
                    title="បង្កើតលេខស្វ័យប្រវត្តិ"
                    style={{ borderRadius: "8px", whiteSpace: "nowrap" }}
                  >
                    <LuRefreshCw size={14} /> ស្វ័យប្រវត្តិ
                  </button>
                </div>
              </div>

              {error && <div className="alert alert-error" style={{ fontSize: "0.85rem" }}>{error}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  បោះបង់
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "កំពុងរក្សាទុក..." : "រក្សាទុក និងចេញកាត"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
