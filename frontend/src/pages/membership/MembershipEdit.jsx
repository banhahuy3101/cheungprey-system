import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { membershipAPI } from "../../api/membership";
import { partyAPI } from "../../api/party";
import { useZoneCascade } from "../../hooks/useZoneCascade";
import MembershipForm from "./MembershipForm";
import { SkeletonGrid } from "../../components/Skeleton";

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
  party_role: "",
  join_date: "",
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

export default function MembershipEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const memberZone = useZoneCascade({
    userZone: "",
    isAdmin: true,
    initialZoneCode: "",
    showVillage: true,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    membershipAPI.getProfile(id)
      .then((res) => {
        const data = res.data?.data || res.data;
        const m = data?.member;
        const d = data?.demographics;
        if (m) {
          setMember(m);
          setForm({
            membership_card_no: m.membership_card_no || "",
            national_id: m.national_id || "",
            last_name_kh: m.last_name_kh || "",
            first_name_kh: m.first_name_kh || "",
            last_name_en: m.last_name_en || "",
            first_name_en: m.first_name_en || "",
            gender: m.gender || "Male",
            date_of_birth: m.date_of_birth ? m.date_of_birth.slice(0, 10) : "",
            phone_number: m.phone_number || "",
            email: m.email || "",
            telegram_username: m.telegram_username || "",
            registered_village_code: m.registered_village_code || "",
            current_address_details: m.current_address_details || "",
            structure_id: m.structure_id || "",
            party_role: m.party_role || "",
            join_date: m.join_date ? m.join_date.slice(0, 10) : "",
            membership_type: m.membership_type || "Full",
            membership_tier: m.membership_tier || "Basic",
            exempt_from_dues: m.exempt_from_dues || false,
            marital_status: d?.marital_status || "",
            occupation: d?.occupation || "",
            education_level: d?.education_level || "",
            ethnicity: d?.ethnicity || "",
            religion: d?.religion || "",
            blood_type: d?.blood_type || "",
            emergency_contact_name: d?.emergency_contact_name || "",
            emergency_contact_phone: d?.emergency_contact_phone || "",
          });
          if (m.registered_village_code) {
            memberZone.loadFromZoneCode(m.registered_village_code);
          }
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "មិនអាចទាញយកទិន្នន័យសមាជិកបានទេ");
      })
      .finally(() => setLoading(false));
  }, [id]);

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
      const payload = { ...form, registered_village_code: getVillageCode() };
      
      const updatePayload = {
        membership_card_no: payload.membership_card_no,
        national_id: payload.national_id,
        first_name_kh: payload.first_name_kh,
        last_name_kh: payload.last_name_kh,
        first_name_en: payload.first_name_en,
        last_name_en: payload.last_name_en,
        gender: payload.gender,
        date_of_birth: payload.date_of_birth,
        phone_number: payload.phone_number,
        email: payload.email,
        telegram_username: payload.telegram_username,
        party_role: payload.party_role,
        join_date: payload.join_date,
        membership_type: payload.membership_type,
        membership_tier: payload.membership_tier,
        exempt_from_dues: payload.exempt_from_dues,
        current_address_details: payload.current_address_details,
        registered_village_code: getVillageCode(),
      };

      await partyAPI.updateMember(id, updatePayload);

      const demoFields = ["marital_status", "occupation", "education_level", "ethnicity", "religion", "blood_type", "emergency_contact_name", "emergency_contact_phone"];
      const demoPayload = {};
      demoFields.forEach((k) => { demoPayload[k] = payload[k] || ""; });
      try {
        await membershipAPI.updateDemographics(id, demoPayload);
      } catch {
        // Demographics update is optional
      }

      navigate(`/membership/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "ការធ្វើបច្ចុប្បន្នភាពបានបរាជ័យ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: "840px", margin: "0 auto" }}>
        <SkeletonGrid count={3} />
      </div>
    );
  }

  return (
    <MembershipForm
      isFullPage={true}
      editing={member}
      form={form}
      setForm={setForm}
      error={error}
      submitting={submitting}
      onClose={() => navigate(`/membership/${id}`)}
      onSubmit={handleSubmit}
      memberZone={memberZone}
    />
  );
}
