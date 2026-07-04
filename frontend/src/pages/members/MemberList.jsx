import { LuSearch, LuPencil, LuTrash2, LuEye } from "react-icons/lu";

export default function MemberList({
  members,
  search,
  setSearch,
  page,
  setPage,
  total,
  onView,
  onEdit,
  onDelete,
}) {
  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <div className="search-bar">
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរកតាមឈ្មោះ..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

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
              <th>កាលបរិច្ឆេទចូល</th>
              <th>សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center">
                  គ្មានទិន្នន័យ
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id}>
                  <td>
                    {[m.last_name_kh, m.first_name_kh].filter(Boolean).join(" ") || m.name}
                  </td>
                  <td>{m.gender === "Male" ? "ប្រុស" : m.gender === "Female" ? "ស្រី" : m.gender}</td>
                  <td>{m.date_of_birth}</td>
                  <td>{m.phone_number}</td>
                  <td>{m.village_name || m.village}</td>
                  <td>{m.commune_name || m.commune}</td>
                  <td>{m.district_name || m.district}</td>
                  <td>{m.province_name || m.province}</td>
                  <td>{m.party_role}</td>
                  <td>{m.join_date}</td>
                  <td>
                    <div className="actions">
                      <button className="btn-icon" onClick={() => onView(m)} title="មើល">
                        <LuEye />
                      </button>
                      <button className="btn-icon" onClick={() => onEdit(m)} title="កែប្រែ">
                        <LuPencil />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => onDelete(m.id)}
                        title="លុប"
                      >
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
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            មុន
          </button>
          <span>
            ទំព័រ {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            បន្ទាប់
          </button>
        </div>
      )}
    </>
  );
}
