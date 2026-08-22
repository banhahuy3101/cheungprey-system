import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MembershipForm from "./MembershipForm";
import { partyAPI } from "../../api/party";
import { useZoneCascade } from "../../hooks/useZoneCascade";

const initialForm = {
  membership_card_no: "",
  national_id: "",
  last_name_kh: "",
  first_name_kh: "",
  last_name_en: "",
  first_name_en: "",
  gender: "Male",
  date_of_birth: "",
  phone_number: "",
  email: "",
  telegram_username: "",
  registered_village_code: "",
  current_address_details: "",
  structure_id: "",
  party_role: "Member",
  join_date: new Date().toISOString().slice(0, 10),
  membership_type: "Full",
  membership_tier: "Basic",
  exempt_from_dues: false,
  marital_status: "",
  occupation: "",
  education_level: "",
  ethnicity: "",
  religion: "",
  blood_type: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

export default function MembershipCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const memberZone = useZoneCascade({
    userZone: "",
    isAdmin: true,
    initialZoneCode: "",
    showVillage: true,
  });

  const getVillageCode = () => {
    return memberZone.selectedVillage || memberZone.selectedCommune ||
      memberZone.selectedDistrict || memberZone.selectedProvince ||
      form.registered_village_code || "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        registered_village_code: getVillageCode(),
      };
      await partyAPI.createMember(payload);
      navigate("/membership");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "ការបង្កើតសមាជិកបរាជ័យ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MembershipForm
      isFullPage={true}
      editing={null}
      form={form}
      setForm={setForm}
      error={error}
      submitting={submitting}
      onClose={() => navigate("/membership")}
      onSubmit={handleSubmit}
      memberZone={memberZone}
    />
  );
}
