import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "admin@cheungprey.org.kh",
    password: "Demo123!",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please try again.";
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
          <h1>គណបក្សប្រជាជនកម្ពុជា</h1>
          <h2>ឃុំជាំងព្រៀង</h2>
          <p>ប្រព័ន្ធគ្រប់គ្រងទិន្នន័យ</p>
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
            />
          </div>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "កំពុងចូល..." : "ចូលប្រព័ន្ធ / Login"}
          </button>
        </form>
        <p className="login-footer">
          មិនទាន់មានគណនី? <Link to="/register">បង្កើតគណនីថ្មី</Link>
        </p>
        <p className="login-footer" style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.5rem" }}>
          Default password for all users: <strong>Demo123!</strong>
        </p>
      </div>
    </div>
  );
}
