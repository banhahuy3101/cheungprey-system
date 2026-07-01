import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuX } from "react-icons/lu";
import { partyAPI } from "../api/party";
import Select from "../components/Select";

const initialForm = {
  name: "",
  sex: "ប្រុស",
  dob: "",
  phone: "",
  village: "",
  commune: "",
  district: "",
  province: "",
  zone_id: "",
  position: "",
};

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [zones, setZones] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partyAPI.getMembers({
        search,
        page,
        limit: 20,
      });
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

  useEffect(() => {
    partyAPI.getZones().then((res) => {
      const raw = res.data?.data || res.data;
      setZones(raw?.zones || raw || []);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      name: member.name || "",
      sex: member.sex || "ប្រុស",
      dob: member.dob || "",
      phone: member.phone || "",
      village: member.village || "",
      commune: member.commune || "",
      district: member.district || "",
      province: member.province || "",
      zone_id: member.zone_id || "",
      position: member.position || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (editing) {
        await partyAPI.updateMember(editing.id, form);
      } else {
        await partyAPI.createMember(form);
      }
      setShowModal(false);
      fetchMembers();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបឬ?")) return;
    try {
      await partyAPI.deleteMember(id);
      fetchMembers();
    } catch {
      //
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">បញ្ជីសមាជិក</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          <LuPlus /> បន្ថែមសមាជិក
        </button>
      </div>

      <div className="search-bar">
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរកតាមឈ្មោះ..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ឈ្មោះ</th>
                  <th>ភេទ</th>
                  <th>ថ្ងៃខែឆ្នាំកំណើត</th>
                  <th>ទូរស័ព្ទ</th>
                  <th>ភូមិ</th>
                  <th>ឃុំ</th>
                  <th>ស្រុក</th>
                  <th>ខេត្ត</th>
                  <th>តួនាទី</th>
                  <th>សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr><td colSpan={10} className="text-center">គ្មានទិន្នន័យ</td></tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.sex}</td>
                      <td>{m.dob}</td>
                      <td>{m.phone}</td>
                      <td>{m.village}</td>
                      <td>{m.commune}</td>
                      <td>{m.district}</td>
                      <td>{m.province}</td>
                      <td>{m.position}</td>
                      <td>
                        <div className="actions">
                          <button className="btn-icon" onClick={() => openEdit(m)} title="កែប្រែ">
                            <LuPencil />
                          </button>
                          <button className="btn-icon btn-danger" onClick={() => handleDelete(m.id)} title="លុប">
                            <LuTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>មុន</button>
              <span>ទំព័រ {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>បន្ទាប់</button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? "កែប្រែសមាជិក" : "បន្ថែមសមាជិកថ្មី"}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><LuX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>ឈ្មោះ *</label>
                    <input name="name" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>ភេទ</label>
                    <Select name="sex" value={form.sex} onChange={handleChange}>
                      <option value="ប្រុស">ប្រុស</option>
                      <option value="ស្រី">ស្រី</option>
                    </Select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>ថ្ងៃខែឆ្នាំកំណើត</label>
                    <input name="dob" type="date" value={form.dob} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>ទូរស័ព្ទ</label>
                    <input name="phone" value={form.phone} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>ភូមិ</label>
                    <input name="village" value={form.village} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>ឃុំ</label>
                    <input name="commune" value={form.commune} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>ស្រុក</label>
                    <input name="district" value={form.district} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>ខេត្ត</label>
                    <input name="province" value={form.province} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>តំបន់</label>
                    <Select name="zone_id" value={form.zone_id} onChange={handleChange}>
                      <option value="">-- ជ្រើសរើស --</option>
                      {zones.map((z) => (
                        <option key={z.id || z.zone_id} value={z.id || z.zone_id}>
                          {z.name || z.zone_name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="form-group">
                    <label>តួនាទី</label>
                    <input name="position" value={form.position} onChange={handleChange} />
                  </div>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>បោះបង់</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "រក្សាទុក..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "រក្សាទុក"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}