import { useNavigate } from "react-router-dom";
import { LuShieldAlert, LuHouse, LuArrowLeft } from "react-icons/lu";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 140px)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "88px",
          height: "88px",
          borderRadius: "50%",
          background: "#fee2e2",
          color: "#dc2626",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
          boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.2)",
        }}
      >
        <LuShieldAlert size={46} />
      </div>

      <h1
        style={{
          fontSize: "2.1rem",
          fontWeight: "800",
          color: "#0f172a",
          marginBottom: "0.75rem",
          letterSpacing: "-0.02em",
        }}
      >
        403 - គ្មានសិទ្ធិចូលប្រើប្រាស់
      </h1>

      <p
        style={{
          fontSize: "1.05rem",
          color: "#64748b",
          maxWidth: "480px",
          lineHeight: "1.6",
          marginBottom: "2rem",
        }}
      >
        គណនីរបស់អ្នកមិនមានសិទ្ធិចូលមើលទំព័រ ឬប្រើប្រាស់មុខងារនេះទេ។ សូមទាក់ទង <strong>Super Admin</strong> ឬ <strong>អ្នកគ្រប់គ្រងប្រព័ន្ធ</strong> ប្រសិនបើអ្នកត្រូវការចូលប្រើប្រាស់។
      </p>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.65rem 1.35rem",
            borderRadius: "10px",
            fontWeight: "600",
          }}
        >
          <LuArrowLeft size={18} /> ត្រឡប់ក្រោយ
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.65rem 1.5rem",
            borderRadius: "10px",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
          }}
        >
          <LuHouse size={18} /> ទៅកាន់ទំព័រដើម
        </button>
      </div>
    </div>
  );
}
