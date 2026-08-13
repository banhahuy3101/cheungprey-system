import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../settings/Modal";

const LOGIN_ERROR_KEY = "login_error";

function readStoredLoginError() {
  try {
    return sessionStorage.getItem(LOGIN_ERROR_KEY) || "";
  } catch {
    return "";
  }
}

function storeLoginError(message) {
  try {
    if (message) {
      sessionStorage.setItem(LOGIN_ERROR_KEY, message);
    } else {
      sessionStorage.removeItem(LOGIN_ERROR_KEY);
    }
  } catch {
    // ignore
  }
}

export default function Login() {
  const { login, loginWithQR } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [qrModalError, setQrModalError] = useState("");
  const qrStartedRef = useRef(false);

  useEffect(() => {
    const qrToken = searchParams.get("qr_token");
    if (!qrToken || qrStartedRef.current) return;
    qrStartedRef.current = true;

    setQrProcessing(true);
    setError("");
    setQrModalError("");

    loginWithQR(qrToken)
      .then((result) => {
        if (!result?.access_token) {
          throw new Error("QR login failed: no access token returned");
        }
        const next = searchParams.get("next") || "/";
        navigate(next, { replace: true });
      })
      .catch((err) => {
        const apiError = err.response?.data?.error || err.response?.data?.message;
        setQrModalError(apiError || err.message || "QR login failed. Please try again.");
        setQrProcessing(false);
      });
    // Run once on mount; loginWithQR is recreated on each AuthProvider render.
    // qrStartedRef guards against React StrictMode double-invoking this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const saved = readStoredLoginError();
    if (saved) {
      setError(saved);
      storeLoginError("");
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    storeLoginError("");
    setSubmitting(true);
    try {
      const result = await login({
        email: form.email.trim(),
        password: form.password,
      });
      if (!result?.access_token) {
        throw new Error("Login failed: no access token returned");
      }
      storeLoginError("");
      navigate("/");
    } catch (err) {
      const apiError = err.response?.data?.error || err.response?.data?.message;
      const msg =
        apiError === "Invalid credentials"
          ? "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ"
          : apiError || err.message || "Login failed. Please try again.";
      setError(msg);
      storeLoginError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ</h1>
          <h2>សម្រាប់ស្រុកជើងព្រៃ</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">អ៊ីមែល / Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="username"
              disabled={qrProcessing}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">ពាក្យសម្ងាត់ / Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              disabled={qrProcessing}
            />
          </div>
          {qrProcessing && (
            <div className="alert alert-info" role="status">
              កំពុងចូលប្រព័ន្ធដោយ QR Code... សូមរង់ចាំមួយភ្លែត។
            </div>
          )}
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting || qrProcessing}>
            {qrProcessing ? "កំពុងចូលដោយ QR..." : submitting ? "កំពុងចូល..." : "ចូលប្រព័ន្ធ / Login"}
          </button>
        </form>
      </div>

      {qrModalError && (
        <Modal
          open={!!qrModalError}
          onClose={() => setQrModalError("")}
          title="❌ បរាជ័យក្នុងការចូលដោយ QR Code"
          maxWidth="420px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.25rem 0", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>😕</div>
            <p style={{ margin: 0, fontSize: "0.95rem", color: "#334155", lineHeight: 1.6 }}>
              {qrModalError}
            </p>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5 }}>
              QR Code នេះអាចផុតកំណត់ហើយ។ សូមស្កេន QR Code ថ្មីពីអ្នកគ្រប់គ្រងប្រព័ន្ធ ឬចូលតាមអ៊ីមែល និងពាក្យសម្ងាត់។
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setQrModalError("")}
              style={{ borderRadius: "10px", marginTop: "0.5rem" }}
            >
              យល់ព្រម / OK
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
