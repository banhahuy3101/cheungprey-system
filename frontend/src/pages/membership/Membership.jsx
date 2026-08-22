import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { LuClipboardList, LuList, LuPlus, LuUsers } from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import { membershipAPI } from "../../api/membership";
import { partyAPI } from "../../api/party";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES } from "../../utils/permissions";
import MembershipList from "./MembershipList";
import RegistrationQueue from "./RegistrationQueue";
import MembershipProfile from "./MembershipProfile";
import MembershipForm from "./MembershipForm";
import MembershipDemographics from "./MembershipDemographics";
import MembershipDues from "./MembershipDues";
import MembershipActivity from "./MembershipActivity";
import MembershipPositions from "./MembershipPositions";
import MembershipCards from "./MembershipCards";
import MembershipImport from "./MembershipImport";
import MembershipStats from "./MembershipStats";
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
  party_role: "",
  join_date: "",
  membership_type: "Full",
  membership_tier: "Basic",
  exempt_from_dues: false,
};

export default function Membership() {
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const mode = pathname.includes("/import") ? "import"
    : pathname.includes("/stats") ? "stats"
    : pathname.includes("/demographics") && params.id ? "demos"
    : pathname.includes("/dues") && params.id ? "dues"
    : pathname.includes("/activity") && params.id ? "activity"
    : pathname.includes("/positions") && params.id ? "pos"
    : pathname.includes("/cards") && params.id ? "cards"
    : pathname.includes("/edit") && params.id ? "edit"
    : params.id ? "profile"
    : "list";

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);

  const canApprove = canAccess(user, FEATURES.membership_admin) || canAccess(user, FEATURES.members, "update");
  const canReviewRegistration = canAccess(user, FEATURES.membership_admin);
  const canCreateMember = canAccess(user, FEATURES.members, "create");
  const canUpdateMember = canAccess(user, FEATURES.members, "update");

  const memberZone = useZoneCascade({
    userZone: "",
    isAdmin: true,
    initialZoneCode: "",
    showVillage: true,
  });

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (zoneFilter) params.zone_code = zoneFilter;
      if (roleFilter) params.party_role = roleFilter;
      if (genderFilter) params.gender = genderFilter;
      const res = await membershipAPI.search(params);
      const data = res.data?.data || res.data;
      setMembers(data.members || data || []);
      setTotal(data.total || 0);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [search, page, statusFilter, zoneFilter, roleFilter, genderFilter]);

  useEffect(() => {
    if (mode === "list") fetchMembers();
  }, [fetchMembers, mode]);

  useEffect(() => {
    if (mode === "profile" && params.id) {
      membershipAPI.getProfile(params.id).then((res) => {
        setProfile(res.data?.data || res.data);
      }).catch(() => {});
    } else {
      setProfile(null);
    }
  }, [mode, params.id]);

  useEffect(() => {
    if (mode === "edit" && params.id) {
      membershipAPI.getProfile(params.id).then((res) => {
        const m = (res.data?.data || res.data)?.member;
        const d = (res.data?.data || res.data)?.demographics;
        if (m) {
          setEditing(m);
          setForm({
            membership_card_no: m.membership_card_no || "",
            national_id: m.national_id || "",
            last_name_kh: m.last_name_kh || "",
            first_name_kh: m.first_name_kh || "",
            last_name_en: m.last_name_en || "",
            first_name_en: m.first_name_en || "",
            gender: m.gender || "Male",
            date_of_birth: m.date_of_birth || "",
            phone_number: m.phone_number || "",
            email: m.email || "",
            telegram_username: m.telegram_username || "",
            registered_village_code: m.registered_village_code || "",
            current_address_details: m.current_address_details || "",
            structure_id: m.structure_id || "",
            party_role: m.party_role || "",
            join_date: m.join_date || "",
            membership_type: m.membership_type || "Full",
            membership_tier: m.membership_tier || "Basic",
            exempt_from_dues: m.exempt_from_dues || false,
            // demographics
            marital_status: d?.marital_status || "",
            occupation: d?.occupation || "",
            education_level: d?.education_level || "",
            ethnicity: d?.ethnicity || "",
            religion: d?.religion || "",
            blood_type: d?.blood_type || "",
            emergency_contact_name: d?.emergency_contact_name || "",
            emergency_contact_phone: d?.emergency_contact_phone || "",
          });
          setError("");
          setShowModal(true);
          if (m.registered_village_code) {
            memberZone.loadFromZoneCode(m.registered_village_code);
          }
        }
      }).catch(() => {});
    } else {
      setShowModal(false);
    }
  }, [mode, params.id]);

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
      if (editing) {
        await membershipAPI.getProfile(editing.id);
        const updatePayload = {};
        Object.keys(payload).forEach((k) => {
          if (payload[k] !== initialForm[k] && k !== "registered_village_code") {
            updatePayload[k] = payload[k];
          }
        });
        updatePayload.registered_village_code = getVillageCode();
        await partyAPI.updateMember(editing.id, updatePayload);

        const demoFields = ["marital_status", "occupation", "education_level", "ethnicity", "religion", "blood_type", "emergency_contact_name", "emergency_contact_phone"];
        const demoPayload = {};
        demoFields.forEach((k) => { demoPayload[k] = payload[k] || ""; });
        try {
          await membershipAPI.updateDemographics(editing.id, demoPayload);
        } catch {
          // demographics save is optional
        }
      } else {
        await partyAPI.createMember(payload);
      }
      setShowModal(false);
      if (editing) {
        navigate(`/membership/${editing.id}`);
      } else {
        navigate("/membership");
      }
      fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "edit" && params.id) {
    return (
      <MembershipForm
        isFullPage={true}
        editing={editing}
        form={form}
        setForm={setForm}
        error={error}
        submitting={submitting}
        onClose={() => navigate(`/membership/${params.id}`)}
        onSubmit={handleSubmit}
        memberZone={memberZone}
      />
    );
  }
  if (mode === "profile" && profile) {
    return <MembershipProfile profile={profile} onBack={() => navigate("/membership")} onEdit={() => navigate(`/membership/${params.id}/edit`)} />;
  }
  if (mode === "demos" && params.id) {
    return <MembershipDemographics memberId={params.id} onBack={() => navigate(`/membership/${params.id}`)} />;
  }
  if (mode === "dues" && params.id) {
    return <MembershipDues memberId={params.id} onBack={() => navigate(`/membership/${params.id}`)} />;
  }
  if (mode === "activity" && params.id) {
    return <MembershipActivity memberId={params.id} onBack={() => navigate(`/membership/${params.id}`)} />;
  }
  if (mode === "pos" && params.id) {
    return <MembershipPositions memberId={params.id} onBack={() => navigate(`/membership/${params.id}`)} />;
  }
  if (mode === "cards" && params.id) {
    return <MembershipCards memberId={params.id} onBack={() => navigate(`/membership/${params.id}`)} />;
  }
  if (mode === "import") {
    return <MembershipImport onBack={() => navigate("/membership")} onDone={() => { navigate("/membership"); fetchMembers(); }} />;
  }
  if (mode === "stats") {
    return <MembershipStats onBack={() => navigate("/membership")} />;
  }

  return (
    <div className="page">
      <PageHeader
        title="បញ្ជីសមាជិក"
        subtitle="គ្រប់គ្រងសមាជិក ពិនិត្យពាក្យសុំ និងមើលស្ថិតិទិន្នន័យ"
        icon={<LuUsers size={20} />}
        breadcrumbs={[
          { label: "សមាជិក" },
        ]}
        actions={
          <>
            <div className="membership-view-switch">
              <button
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "active" : ""}
              ><LuList size={14} /> បញ្ជី</button>
              <button
                onClick={() => setViewMode("registrations")}
                className={viewMode === "registrations" ? "active" : ""}
              ><LuClipboardList size={14} /> ពាក្យសុំ</button>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate("/membership/stats")}>ស្ថិតិ</button>
            <button className="btn btn-secondary" onClick={() => navigate("/membership/import")}>នាំចូល</button>
            {canCreateMember && (
              <button className="btn btn-primary" onClick={() => navigate("/membership/create")}>
                <LuPlus /> ចុះឈ្មោះថ្មី
              </button>
            )}
          </>
        }
      />

      {viewMode === "registrations" ? (
        <RegistrationQueue canReview={canReviewRegistration} />
      ) : (
        <>
          {loading ? (
            <div className="loading">កំពុងផ្ទុក...</div>
          ) : (
            <MembershipList
              members={members}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              zoneFilter={zoneFilter}
              setZoneFilter={setZoneFilter}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              genderFilter={genderFilter}
              setGenderFilter={setGenderFilter}
              page={page}
              setPage={setPage}
              total={total}
              loading={loading}
              canApprove={canApprove}
              canUpdate={canUpdateMember}
              onRefresh={fetchMembers}
            />
          )}
        </>
      )}
    </div>
  );
}
