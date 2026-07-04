import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuX, LuArrowLeft } from "react-icons/lu";
import { partyAPI } from "../../api/party";
import MemberForm from "./MemberForm";
import MemberView from "./MemberView";
import MemberList from "./MemberList";
import MemberOrgChartFull from "./MemberOrgChartFull";
import { useZoneCascade } from "../../hooks/useZoneCascade";
import { unwrapList } from "../../utils/zone";

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
  status: "active",
};

export default function Members() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewMember, setViewMember] = useState(null);

  const memberZone = useZoneCascade({
    userZone: "",
    isAdmin: true,
    initialZoneCode: "",
    showVillage: true,
  });

  const pathname = location.pathname;

  const mode = pathname.includes("/create") ? "create"
    : pathname.includes("/org") ? "org"
    : pathname.includes("/edit") && params.id ? "edit"
    : params.id ? "view"
    : "list";

  const totalPages = Math.ceil(total / 20);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partyAPI.getMembers({ search, page, limit: 20 });
      const inner = res.data?.data || res.data;
      setMembers(inner.members || inner || []);
      setTotal(inner.total || 0);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Preload provinces for ZoneCascadeSelect (fix empty dropdown on create)
  useEffect(() => {
    partyAPI.getZones({ type: "Province" })
      .then((res) => {
        const list = unwrapList(res);
        if (list.length) {
          memberZone.applyHierarchy({
            provinces: list,
            province: "",
            district: "",
            commune: "",
            village: "",
            districts: [],
            communes: [],
            villages: [],
          });
        }
      })
      .catch(() => {});
  }, []);

  const openCreate = () => navigate("/members/create");
  const openEdit = (member) => navigate(`/members/${member.id}/edit`);
  const openView = (member) => navigate(`/members/${member.id}`);

  const handleDelete = async (id) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបឬ?")) return;
    try {
      await partyAPI.deleteMember(id);
      if (mode !== "list") navigate("/members");
      fetchMembers();
    } catch {
      //
    }
  };

  // Handle route-based mode changes
  useEffect(() => {
    if (mode === "create") {
      setEditing(null);
      setForm(initialForm);
      setError("");
      setShowModal(true);
      memberZone.resetSelection();
    } else if (mode === "edit" && params.id) {
      partyAPI.getMemberById?.(params.id).then(res => {
        const m = res.data?.data || res.data;
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
            status: m.status || "active",
          });
          setError("");
          setShowModal(true);
          if (m.registered_village_code) {
            memberZone.loadFromZoneCode(m.registered_village_code);
          } else {
            memberZone.resetSelection();
          }
        }
      }).catch(() => {});
    } else if (mode === "view" && params.id) {
      partyAPI.getMemberById?.(params.id).then(res => {
        const m = res.data?.data || res.data;
        setViewMember(m);
      }).catch(() => {});
      setShowModal(false);
    } else {
      setShowModal(false);
      setViewMember(null);
    }
  }, [mode, params.id]);

  const getRegisteredVillageCode = () => {
    return memberZone.selectedVillage || memberZone.selectedCommune || memberZone.selectedDistrict || memberZone.selectedProvince || form.registered_village_code || "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = { ...form, registered_village_code: getRegisteredVillageCode() };
      if (editing) {
        await partyAPI.updateMember(editing.id, payload);
      } else {
        await partyAPI.createMember(payload);
      }
      setShowModal(false);
      navigate("/members");
      fetchMembers();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // View mode
  if (mode === "view" && viewMember) {
    return <MemberView member={viewMember} onBack={() => navigate("/members")} onEdit={() => navigate(`/members/${params.id}/edit`)} onDelete={() => handleDelete(params.id)} />;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">បញ្ជីសមាជិក</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          <LuPlus /> បន្ថែមសមាជិក
        </button>
        <button className="btn btn-secondary" onClick={() => navigate("/members/org")}>
          មើល Org Chart
        </button>
      </div>

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <>
          <MemberList
            members={members}
            search={search}
            setSearch={setSearch}
            page={page}
            setPage={setPage}
            total={total}
            onView={openView}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </>
      )}

      {/* Modal Form */}
      {showModal && (
        <MemberForm
          editing={editing}
          form={form}
          setForm={setForm}
          error={error}
          submitting={submitting}
          onClose={() => { setShowModal(false); navigate("/members"); }}
          onSubmit={handleSubmit}
          memberZone={memberZone}
        />
      )}

      {/* Org Chart View */}
      {mode === "org" && (
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-secondary mb-2" onClick={() => navigate("/members")}>
            ← Back to List
          </button>
          <MemberOrgChartFull members={members} />
        </div>
      )}
    </div>
  );
}
