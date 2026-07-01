import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuSearch, LuX } from "react-icons/lu";
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
  voter_status: "មានឈ្មោះ",
};

export default function Voters() {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchVoters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partyAPI.getVoters({ search, page, limit: 20 });
      const inner = res.data?.data || res.data;
      setVoters(inner.voters || inner || []);
      setTotal(inner.total || 0);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    let cancelled = false;
    fetchVoters().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchVoters]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openCreate = () => {
    setForm(initialForm);
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await partyAPI.createVoter(form);
      setShowModal(false);
      setPage(1);
      await fetchVoters();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">បញ្ជីអ្នកបោះឆ្នោត</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          <LuPlus /> បន្ថែមអ្នកបោះឆ្នោត
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
                  <th>ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody>
                {voters.length === 0 ? (
                  <tr><td colSpan={9} className="text-center">គ្មានទិន្នន័យ</td></tr>
                ) : (
                  voters.map((v) => (
                    <tr key={v.id}>
                      <td>{v.name}</td>
                      <td>{v.sex}</td>
                      <td>{v.dob}</td>
                      <td>{v.phone}</td>
                      <td>{v.village}</td>
                      <td>{v.commune}</td>
                      <td>{v.district}</td>
                      <td>{v.province}</td>
                      <td><span className="badge">{v.voter_status}</span></td>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>បន្ថែមអ្នកបោះឆ្នោតថ្មី</h3>
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
                <div className="form-group">
                  <label>ស្ថានភាព</label>
                  <Select name="voter_status" value={form.voter_status} onChange={handleChange}>
                    <option value="មានឈ្មោះ">មានឈ្មោះ</option>
                    <option value="គ្មានឈ្មោះ">គ្មានឈ្មោះ</option>
                    <option value="រង់ចាំពិនិត្យ">រង់ចាំពិនិត្យ</option>
                  </Select>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>បោះបង់</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "រក្សាទុក..." : "រក្សាទុក"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}