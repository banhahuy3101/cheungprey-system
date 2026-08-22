import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../api/admin";
import { useAuth } from "../../hooks/useAuth";
import { useRoleOptions } from "../../hooks/useRoleOptions";
import { useZoneCascade } from "../../hooks/useZoneCascade";
import { canAccess, FEATURES } from "../../utils/permissions";
import UserForm from "./UserForm";
import { createUserFormDefaults } from "../../config/userSettings";

export default function UserCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roleOptions } = useRoleOptions();
  const isSuperAdmin = user?.roles?.includes("super_admin") || user?.role === "super_admin";
  const assignableRoles = roleOptions.filter((r) => isSuperAdmin || r.value !== "super_admin");

  const userZone = useZoneCascade({
    userZone: "",
    isAdmin: true,
    initialZoneCode: "",
    showVillage: true,
  });

  const [form, setForm] = useState(createUserFormDefaults());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const getZoneCode = () => {
    return userZone.selectedVillage || userZone.selectedCommune ||
      userZone.selectedDistrict || userZone.selectedProvince ||
      form.zone_code || "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const email = form.email?.trim();
    const phone = form.phone_number?.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("សូមបញ្ចូលអ៊ីមែលឲ្យបានត្រឹមត្រូវ (ឧ. name@example.com)");
      setSubmitting(false);
      return;
    }
    if (phone && !/^(?:0[0-9]{8,9}|\+855[0-9]{8,9})$/.test(phone)) {
      setError("លេខទូរស័ព្ទត្រូវមានទម្រង់ 0xx ឬ +855 (9-13 ខ្ទង់)");
      setSubmitting(false);
      return;
    }
    const selectedRoles = form.roles?.length ? form.roles : (form.role ? [form.role] : []);
    if (!selectedRoles.length) {
      setError("សូមជ្រើសរើសតួនាទីយ៉ាងហោចណាស់មួយ (Roles)");
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    try {
      await adminAPI.createUser({
        full_name: form.name,
        email,
        phone_number: phone || undefined,
        zone_code: getZoneCode() || undefined,
        date_of_birth: form.date_of_birth || undefined,
        password: form.password,
        roles: selectedRoles,
      });
      navigate("/settings/users");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "ប្រតិបត្តិការមិនបានសម្រេច");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccess(user, FEATURES.users, "create")) {
    return <div className="alert alert-error">អ្នកគ្មានសិទ្ធិចូលប្រើទំព័រនេះទេ។</div>;
  }

  return (
    <UserForm
      editing={null}
      form={form}
      setForm={setForm}
      error={error}
      submitting={submitting}
      onClose={() => navigate("/settings/users")}
      onSubmit={handleSubmit}
      roleOptions={assignableRoles}
      userZone={userZone}
    />
  );
}
