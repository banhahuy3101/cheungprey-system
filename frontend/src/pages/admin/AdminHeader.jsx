import { LuArrowLeft, LuPlus, LuShield } from "react-icons/lu";
import RbacFlow from "../../components/RbacFlow";

export default function AdminHeader({ navigate, onCreate }) {
  return (
    <>
      <div className="rbac-topbar">
        <div className="rbac-title-row">
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់"><LuArrowLeft /></button>
          <div className="rbac-title-icon"><LuShield size={22} /></div>
          <div>
            <h2 className="rbac-title">គ្រប់គ្រងអ្នកប្រើប្រាស់ (User Management)</h2>
            <span className="rbac-subtitle">គ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ កំណត់តួនាទី និងពាក្យសម្ងាត់ប្រព័ន្ធស្រុកជើងព្រៃ</span>
          </div>
        </div>
        {onCreate && <button className="btn btn-primary" onClick={onCreate} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "10px", padding: "0.6rem 1.2rem", fontWeight: "600" }}>
          <LuPlus size={18} /> បន្ថែមអ្នកប្រើប្រាស់
        </button>}
      </div>
      <RbacFlow navigate={navigate} active="users" />
    </>
  );
}
