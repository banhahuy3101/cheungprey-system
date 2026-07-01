import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuCopy, LuSave, LuSettings } from "react-icons/lu";
import { adminAPI } from "../../api/admin";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin } from "../../utils/permissions";
import {
  getDefaultUserPassword,
  setDefaultUserPassword,
} from "../../config/userSettings";

export default function SettingsSystem() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [defaultPassword, setDefaultPassword] = useState(getDefaultUserPassword());
  const [serverDefault, setServerDefault] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    adminAPI.getSettings().then((res) => {
      const value = res.data?.data?.default_user_password;
      if (value) {
        setServerDefault(value);
        if (!localStorage.getItem("default_user_password")) {
          setDefaultPassword(value);
          setDefaultUserPassword(value);
        }
      }
    }).catch(() => {});
  }, []);

  if (!isAdmin(user)) {
    return <div className="alert alert-error">អ្នកគ្មានសិទ្ធិចូលប្រើទំព័រនេះទេ។</div>;
  }

  const saveDefaultPassword = () => {
    if (defaultPassword.length < 6) {
      setError("ពាក្យសម្ងាត់ដើមត្រូវតែមានយ៉ាងហោចណាស់ ៦ តួ");
      setMessage("");
      return;
    }
    setDefaultUserPassword(defaultPassword);
    setError("");
    setMessage("បានរក្សាទុកពាក្យសម្ងាត់ដើម");
    setTimeout(() => setMessage(""), 2500);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(defaultPassword);
      setMessage("បាន copy ពាក្យសម្ងាត់ដើម");
      setTimeout(() => setMessage(""), 2000);
    } catch {
      setError("Copy failed");
    }
  };

  const useServerDefault = () => {
    if (!serverDefault) return;
    setDefaultPassword(serverDefault);
    setDefaultUserPassword(serverDefault);
    setMessage("បានប្រើពាក្យសម្ងាត់ដើមពី server");
    setTimeout(() => setMessage(""), 2500);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings/technical")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">System Settings</h2>
        </div>
      </div>

      <div className="card user-settings-card">
        <div className="user-settings-header">
          <div className="user-settings-title">
            <LuSettings />
            <span>ពាក្យសម្ងាត់ដើម (Default Password)</span>
          </div>
          {message && <span className="user-settings-saved">{message}</span>}
        </div>

        <p className="user-settings-help">
          ពាក្យសម្ងាត់ដើមសម្រាប់អ្នកប្រើប្រាស់ថ្មី និងប៊ូតុង reset ក្នុងគ្រប់គ្រងអ្នកប្រើប្រាស់។
          តម្លៃនេះត្រូវបានរក្សាទុកក្នុង browser របស់អ្នក។
        </p>

        {serverDefault && (
          <div className="system-setting-meta">
            <span>Server default:</span>
            <code>{serverDefault}</code>
            <button type="button" className="btn btn-secondary btn-sm" onClick={useServerDefault}>
              ប្រើ server default
            </button>
          </div>
        )}

        <div className="user-settings-row">
          <div className="form-group user-settings-field">
            <label>ពាក្យសម្ងាត់ដើម</label>
            <input
              type="text"
              value={defaultPassword}
              onChange={(e) => {
                setDefaultPassword(e.target.value);
                setError("");
              }}
              minLength={6}
            />
          </div>
          <button type="button" className="btn btn-secondary" onClick={copyPassword}>
            <LuCopy /> Copy
          </button>
          <button type="button" className="btn btn-primary" onClick={saveDefaultPassword}>
            <LuSave /> រក្សាទុក
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="system-setting-preview">
          <div className="system-setting-preview-label">Preview in user list</div>
          <code className="default-password-tag">{defaultPassword}</code>
        </div>
      </div>
    </div>
  );
}
