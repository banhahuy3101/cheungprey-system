import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft,
  LuClock,
  LuPlay,
  LuRotateCw,
  LuCheck,
  LuTriangleAlert,
  LuServer,
  LuDatabase,
  LuActivity,
  LuSend,
  LuExternalLink,
  LuShare2,
  LuCopy,
  LuEye,
} from "react-icons/lu";
import { adminAPI } from "../../api/admin";
import { useToast } from "../../components/Toast";
import FormModal from "../../components/FormModal";

export default function SettingsCron() {
  const navigate = useNavigate();
  const toast = useToast();

  const [cronState, setCronState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getCronStatus();
      const data = res.data?.data ?? res.data ?? null;
      setCronState(data);
    } catch {
      toast.error("ផ្ទុកព័ត៌មានស្ថានភាព Cron មិនបានសម្រេច");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const [retryingJobs, setRetryingJobs] = useState({});

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await adminAPI.runCronNow();
      toast.success("បានដំណើរការការងារថែទាំ Cron ភ្លាមៗដោយជោគជ័យ!");
      setTimeout(() => {
        fetchStatus();
      }, 1500);
    } catch {
      toast.error("ដំណើរការ Cron មិនបានសម្រេច");
    } finally {
      setRunning(false);
    }
  };

  const handleRetryJob = async (jobKey, jobName) => {
    const key = jobKey || jobName;
    setRetryingJobs((prev) => ({ ...prev, [key]: true }));
    try {
      await adminAPI.retryCronJob(key);
      toast.success(`បានព្យាយាមរត់ឡើងវិញនូវការងារ «${jobName}» ដោយជោគជ័យ!`);
      await fetchStatus();
    } catch {
      toast.error(`ព្យាយាមរត់ការងារ «${jobName}» មិនបានសម្រេច`);
    } finally {
      setRetryingJobs((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleJoinTelegram = () => {
    const tgLink = cronState?.telegram?.link || "https://t.me/cheungprey_system_bot";
    window.open(tgLink, "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = async () => {
    const tgLink = cronState?.telegram?.link || "https://t.me/cheungprey_system_bot";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Telegram Cron Notification Bot",
          text: "តំណចូលរួមទទួលកំណត់ហេតុ Telegram អូតូម៉ាតិចសម្រាប់ប្រព័ន្ធ",
          url: tgLink,
        });
      } else {
        await navigator.clipboard.writeText(tgLink);
        toast.success("បានចម្លងតំណ Telegram ទៅកាន់ Clipboard ដោយជោគជ័យ!");
      }
    } catch {
      await navigator.clipboard.writeText(tgLink);
      toast.success("បានចម្លងតំណ Telegram ទៅកាន់ Clipboard!");
    }
  };

  return (
    <div className="page rbac-shell">
      {/* Top Header */}
      <div className="rbac-topbar">
        <div className="rbac-title-row">
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់">
            <LuArrowLeft />
          </button>
          <div className="rbac-title-icon" style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", color: "#fff" }}>
            <LuClock size={22} />
          </div>
          <div>
            <h2 className="rbac-title">ការងារ Cron & ថែទាំប្រព័ន្ធ (Cron Scheduler)</h2>
            <span className="rbac-subtitle">
              ពិនិត្យមើលស្ថានភាព Cron nightly, ដំណើរការថែទាំ Supabase DB, និងកំណត់ហេតុតាម Telegram
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchStatus}
            disabled={loading}
            title="ធ្វើបច្ចុប្បន្នភាព"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "10px" }}
          >
            <LuRotateCw size={16} className={loading ? "spin" : ""} /> ផ្ទុកឡើងវិញ
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRunNow}
            disabled={running}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              border: "none",
            }}
          >
            <LuPlay size={16} /> {running ? "កំពុងរត់ Cron..." : "ដំណើរការ Cron ឥឡូវនេះ (Run Now)"}
          </button>
        </div>
      </div>

      {/* Main Status Metrics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            ស្ថានភាព Scheduler
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: cronState?.running ? "#22c55e" : "#ef4444",
                boxShadow: cronState?.running ? "0 0 8px #22c55e" : "none",
              }}
            />
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: cronState?.running ? "#15803d" : "#b91c1c" }}>
              {cronState?.running ? "កំពុងដំណើរការ (Active)" : "បានបញ្ឈប់ (Stopped)"}
            </span>
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            ល្វែងម៉ោង (Timezone)
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", marginTop: "0.5rem" }}>
            {cronState?.timezone || "Asia/Phnom_Penh (UTC+7)"}
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            រត់ចុងក្រោយ (Last Run)
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0369a1", marginTop: "0.5rem" }}>
            {cronState?.last_run || "មិនទាន់បានរត់"}
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            រត់បន្ទាប់ (Next Scheduled Run)
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#4f46e5", marginTop: "0.5rem" }}>
            {cronState?.next_run || "00:00:00 (រៀងរាល់យប់)"}
          </div>
        </div>
      </div>

      {/* Telegram Notification Log Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
          border: "1px solid #bae6fd",
          borderRadius: "14px",
          padding: "1.1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flex: 1, minWidth: "260px" }}>
          <div style={{ background: "#0284c7", color: "#fff", padding: "0.6rem", borderRadius: "10px", display: "flex", flexShrink: 0 }}>
            <LuSend size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0369a1", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              កំណត់ហេតុ Telegram អូតូម៉ាតិច (Nightly Telegram Notification)
              {cronState?.telegram?.enabled && (
                <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", padding: "0.15rem 0.5rem", borderRadius: "10px", fontWeight: 700 }}>
                  ● ភ្ជាប់រួច (Connected)
                </span>
              )}
            </h4>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#0c4a6e", lineHeight: "1.4" }}>
              រាល់ពេលការងារ Cron ដំណើរការចប់សព្វគ្រប់ ប្រព័ន្ធនឹងផ្ញើសេចក្តីរាយការណ៍ និងស្ថានភាព Pings / Counts ទៅកាន់ Telegram Bot ស្វ័យប្រវត្តិ។
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleJoinTelegram}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: "10px",
              background: "#0284c7",
              border: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              padding: "0.5rem 1rem",
            }}
          >
            <LuExternalLink size={15} /> ចូលរួម Telegram ឥឡូវនេះ (Join Now)
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleShareTelegram}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.85rem",
              padding: "0.5rem 0.9rem",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#0369a1",
            }}
            title="ចែករំលែកតំណ Telegram"
          >
            <LuShare2 size={15} /> ចែករំលែកតំណ (Share Link)
          </button>
        </div>
      </div>

      {/* Detailed Cron Jobs Table */}
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <LuActivity style={{ color: "#0284c7" }} /> បញ្ជីការងារថែទាំ (Maintenance Jobs List)
          </h3>
          <span style={{ fontSize: "0.8rem", background: "#f1f5f9", padding: "0.2rem 0.6rem", borderRadius: "12px", color: "#475569", fontWeight: 600 }}>
            {cronState?.jobs?.length || 0} Jobs Logged
          </span>
        </div>

        {!cronState?.jobs?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            <LuServer size={36} style={{ color: "#cbd5e1", marginBottom: "0.5rem" }} />
            <p style={{ margin: 0, fontSize: "0.95rem" }}>
              មិនទាន់មានកំណត់ហេតុការងារ Cron ឡើយ។ ចុច <strong>«ដំណើរការ Cron ឥឡូវនេះ»</strong> ដើម្បីរត់ការងារថែទាំ។
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
                  <th style={{ padding: "0.85rem 1.25rem" }}>ការងារថែទាំ (Job)</th>
                  <th style={{ padding: "0.85rem 1rem" }}>ស្ថានភាព (Status)</th>
                  <th style={{ padding: "0.85rem 1rem" }}>កាលបរិច្ឆេទ & រយៈពេល (Executed / Duration)</th>
                  <th style={{ padding: "0.85rem 1rem" }}>ការរត់ (Attempts)</th>
                  <th style={{ padding: "0.85rem 1rem" }}>ព័ត៌មានលម្អិត & Audit (Details)</th>
                  <th style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>សកម្មភាព (Action)</th>
                </tr>
              </thead>
              <tbody>
                {cronState.jobs.map((job, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx < cronState.jobs.length - 1 ? "1px solid #f1f5f9" : "none",
                      verticalAlign: "top",
                    }}
                  >
                    {/* Job Name & Key */}
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.92rem" }}>{job.name}</div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", background: "#f1f5f9", padding: "0.15rem 0.45rem", borderRadius: "6px", fontFamily: "monospace" }}>
                        {job.key || "cron_job"}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "1rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.25rem 0.7rem",
                          borderRadius: "20px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          background: job.status === "success" ? "#d1fae5" : job.status === "partial_error" ? "#fef3c7" : "#fee2e2",
                          color: job.status === "success" ? "#065f46" : job.status === "partial_error" ? "#92400e" : "#991b1b",
                        }}
                      >
                        {job.status === "success" ? (
                          <>
                            <LuCheck size={14} /> ជោគជ័យ (Success)
                          </>
                        ) : (
                          <>
                            <LuTriangleAlert size={14} /> {job.status === "partial_error" ? "មានកំហុសខ្លះ" : "បរាជ័យ (Failed)"}
                          </>
                        )}
                      </span>
                    </td>

                    {/* Executed & Duration */}
                    <td style={{ padding: "1rem 1rem", color: "#334155" }}>
                      <div>{job.last_run ? new Date(job.last_run).toLocaleString("km-KH") : "—"}</div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                        រយៈពេល ៖ <strong style={{ color: "#0369a1" }}>{job.duration || "—"}</strong>
                      </div>
                    </td>

                    {/* Attempts */}
                    <td style={{ padding: "1rem 1rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "#475569", background: "#f8fafc", padding: "0.2rem 0.55rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontWeight: 600 }}>
                        {job.retry_count || 0}/{job.max_retries || 3}
                      </span>
                    </td>

                    {/* Details & Audit */}
                    <td style={{ padding: "1rem 1rem", maxWidth: "340px" }}>
                      {job.error && (
                        <div style={{ fontSize: "0.78rem", color: "#b91c1c", background: "#fef2f2", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #fecaca", marginBottom: "0.4rem" }}>
                          ⚠️ {job.error}
                        </div>
                      )}
                      {job.details?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                          {job.details.map((detail, dIdx) => (
                            <span
                              key={dIdx}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "6px",
                                background: detail.includes("ERROR") ? "#fef2f2" : "#f1f5f9",
                                color: detail.includes("ERROR") ? "#dc2626" : "#334155",
                                border: detail.includes("ERROR") ? "1px solid #fecaca" : "1px solid #e2e8f0",
                                fontWeight: 500,
                              }}
                            >
                              {detail}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Action Retry & View Details */}
                    <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setSelectedJob(job)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            fontSize: "0.8rem",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "8px",
                            border: "1px solid #bae6fd",
                            background: "#f0f9ff",
                            color: "#0369a1",
                            fontWeight: 600,
                          }}
                          title="មើលព័ត៌មានលម្អិត (View Details)"
                        >
                          <LuEye size={14} /> មើល
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleRetryJob(job.key || job.name, job.name)}
                          disabled={retryingJobs[job.key || job.name]}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.8rem",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            whiteSpace: "nowrap",
                          }}
                          title="ព្យាយាមរត់ការងារនេះឡើងវិញ"
                        >
                          <LuRotateCw size={14} className={retryingJobs[job.key || job.name] ? "spin" : ""} />
                          {retryingJobs[job.key || job.name] ? "កំពុងរត់..." : "រត់ឡើងវិញ"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cron Job Detail Popup Modal */}
      <FormModal
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.name || "ព័ត៌មានលម្អិតការងារ Cron"}
        subtitle="ព័ត៌មានលម្អិត & កំណត់ហេតុការងារថែទាំប្រព័ន្ធ (Execution Details & Audit Logs)"
        maxWidth="620px"
        showFooter={true}
        cancelText="បិទ"
        rightActions={
          selectedJob && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const key = selectedJob.key || selectedJob.name;
                const name = selectedJob.name;
                setSelectedJob(null);
                handleRetryJob(key, name);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px" }}
            >
              <LuRotateCw size={14} /> រត់ឡើងវិញ (Retry Job)
            </button>
          )
        }
      >
        {selectedJob && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Key Info Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>ស្ថានភាព (Status)</div>
                <div style={{ marginTop: "0.3rem" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "20px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      background: selectedJob.status === "success" ? "#d1fae5" : selectedJob.status === "partial_error" ? "#fef3c7" : "#fee2e2",
                      color: selectedJob.status === "success" ? "#065f46" : selectedJob.status === "partial_error" ? "#92400e" : "#991b1b",
                    }}
                  >
                    {selectedJob.status === "success" ? <LuCheck size={14} /> : <LuTriangleAlert size={14} />}
                    {selectedJob.status === "success" ? "ជោគជ័យ (Success)" : selectedJob.status === "partial_error" ? "មានកំហុសខ្លះ" : "បរាជ័យ (Failed)"}
                  </span>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>ព្យាយាមរត់ (Attempts)</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>
                  {selectedJob.retry_count || 0} / {selectedJob.max_retries || 3}
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>កាលបរិច្ឆេទ (Execution Time)</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#334155", marginTop: "0.2rem" }}>
                  {selectedJob.last_run ? new Date(selectedJob.last_run).toLocaleString("km-KH") : "—"}
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>រយៈពេលរត់ (Duration)</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0369a1", marginTop: "0.2rem" }}>
                  {selectedJob.duration || "—"}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {selectedJob.error && (
              <div className="alert alert-error" style={{ borderRadius: "10px" }}>
                <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>⚠️ កំហុស (Execution Error):</div>
                <div>{selectedJob.error}</div>
              </div>
            )}

            {/* Audit Details */}
            {selectedJob.details?.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.88rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <LuDatabase size={15} style={{ color: "#0284c7" }} /> ព័ត៌មានលម្អិតការពិនិត្យ (Audit Details):
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {selectedJob.details.map((detail, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "0.85rem",
                        padding: "0.55rem 0.85rem",
                        borderRadius: "8px",
                        background: detail.includes("ERROR") ? "#fef2f2" : "#f8fafc",
                        border: detail.includes("ERROR") ? "1px solid #fecaca" : "1px solid #e2e8f0",
                        color: detail.includes("ERROR") ? "#dc2626" : "#334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{detail}</span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                          background: detail.includes("ERROR") ? "#fee2e2" : "#dcfce7",
                          color: detail.includes("ERROR") ? "#991b1b" : "#15803d",
                        }}
                      >
                        {detail.includes("ERROR") ? "ERROR" : "OK"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </FormModal>
    </div>
  );
}
