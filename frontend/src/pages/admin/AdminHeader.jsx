import { LuPlus, LuUsers } from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import RbacFlow from "../../components/RbacFlow";

export default function AdminHeader({ navigate, onCreate }) {
  return (
    <>
      <PageHeader
        showBack={() => navigate("/settings")}
        title="គ្រប់គ្រងអ្នកប្រើប្រាស់ (User Management)"
        subtitle="គ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ កំណត់តួនាទី និងពាក្យសម្ងាត់ប្រព័ន្ធ"
        icon={<LuUsers size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់", path: "/settings" },
          { label: "គ្រប់គ្រងអ្នកប្រើប្រាស់" },
        ]}
        actions={
          onCreate && (
            <button
              className="btn btn-primary"
              onClick={onCreate}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                borderRadius: "8px",
                padding: "0.55rem 1.1rem",
                fontWeight: "600",
              }}
            >
              <LuPlus size={18} /> បន្ថែមអ្នកប្រើប្រាស់
            </button>
          )
        }
      />
      <RbacFlow navigate={navigate} active="users" />
    </>
  );
}
