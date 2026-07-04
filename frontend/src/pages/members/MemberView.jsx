import { LuArrowLeft, LuPencil, LuTrash2 } from "react-icons/lu";

export default function MemberView({ member, onBack, onEdit, onDelete }) {
  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={onBack} title="ត្រឡប់ក្រោយ">
            <LuArrowLeft />
          </button>
          <h2 className="section-title">ព័ត៌មានសមាជិក</h2>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" onClick={onEdit}>
            <LuPencil /> កែប្រែ
          </button>
          <button className="btn btn-danger" onClick={onDelete}>
            <LuTrash2 /> លុប
          </button>
        </div>
      </div>
      <div className="card">
        <div className="profile-detail-grid">
          <div className="profile-detail-item"><span className="profile-detail-label">លេខសមាជិក</span><span className="profile-detail-value">{member.membership_card_no}</span></div>
          <div className="profile-detail-item"><span className="profile-detail-label">ឈ្មោះខ្មែរ</span><span className="profile-detail-value">{member.last_name_kh} {member.first_name_kh}</span></div>
          <div className="profile-detail-item"><span className="profile-detail-label">ឈ្មោះឡាតាំង</span><span className="profile-detail-value">{member.last_name_en} {member.first_name_en}</span></div>
          <div className="profile-detail-item"><span className="profile-detail-label">ភេទ</span><span className="profile-detail-value">{member.gender}</span></div>
          <div className="profile-detail-item"><span className="profile-detail-label">ថ្ងៃខែឆ្នាំកំណើត</span><span className="profile-detail-value">{member.date_of_birth}</span></div>
          <div className="profile-detail-item"><span className="profile-detail-label">ទូរស័ព្ទ</span><span className="profile-detail-value">{member.phone_number}</span></div>
          <div className="profile-detail-item"><span className="profile-detail-label">តួនាទី</span><span className="profile-detail-value">{member.party_role}</span></div>
          <div className="profile-detail-item"><span className="profile-detail-label">កាលបរិច្ឆេទចូល</span><span className="profile-detail-value">{member.join_date}</span></div>
          <div className="profile-detail-item"><span className="profile-detail-label">តំបន់</span><span className="profile-detail-value">{member.registered_village_code}</span></div>
        </div>
      </div>
    </div>
  );
}
