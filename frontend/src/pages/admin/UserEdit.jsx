import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminAPI } from "../../api/admin";
import { useAuth } from "../../hooks/useAuth";
import { useRoleOptions } from "../../hooks/useRoleOptions";
import { useZoneCascade } from "../../hooks/useZoneCascade";
import { canAccess, FEATURES } from "../../utils/permissions";
import UserForm from "./UserForm";
import { SkeletonGrid } from "../../components/Skeleton";

const emptyForm = {
  name: "",
  email: "",
  phone_number: "",
  zone_code: "",
  date_of_birth: "",
  password: "",
  role: "",
  roles: [],
};

export default function UserEdit() {
  const { id } = useParams();
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

  const [target, setTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminAPI
      .getUserById(id)
      .then((res) => {
        const u = res.data?.data || res.data;
        if (!u) {
          setError("រកអ្នកប្រើប្រាស់មិនឃើញ");
          return;
        }
        const roles = u.roles?.length ? u.roles : (u.role ? [u.role] : []);
        setTarget(u);
        setForm({
          name: u.full_name || u.name || "",
          email: u.email || "",
          phone_number: u.phone_number || "",
          zone_code: u.zone_code || "",
          date_of_birth: u.date_of_birth ? u.date_of_birth.slice(0, 10) : "",
          password: "",
          role: roles[0] || "",
          roles,
        });
        if (u.zone_code) {
          userZone.loadFromZoneCode(u.zone_code);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.response?.data?.message || "មិនអាចទាញយកទិន្នន័យអ្នកប្រើប្រាស់បានទេ");
      })
      .finally(() => setLoading(false));
  }, [id]);

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
      const payload = {
        full_name: form.name,
        email,
        phone_number: phone || undefined,
        zone_code: getZoneCode() || undefined,
        date_of_birth: form.date_of_birth || undefined,
        roles: selectedRoles,
      };
      await adminAPI.updateUser(id, payload);
      navigate("/settings/users");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "ការធ្វើបច្ចុប្បន្នភាពបានបរាជ័យ");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccess(user, FEATURES.users, "update")) {
    return <div className="alert alert-error">អ្នកគ្មានសិទ្ធិចូលប្រើទំព័រនេះទេ។</div>;
  }

  if (loading) {
    return (
      <div className="page">
        <SkeletonGrid count={3} />
      </div>
    );
  }

  return (
    <UserForm
      editing={target}
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
