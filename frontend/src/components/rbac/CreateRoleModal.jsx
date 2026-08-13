import Modal from "../../pages/settings/Modal";

export default function CreateRoleModal({
  show,
  onClose,
  newRole,
  setNewRole,
  creating,
  createError,
  onSubmit,
}) {
  if (!show) return null;

  return (
    <Modal title="បន្ថែមតួនាទីថ្មី (Create New Role)" onClose={onClose}>
      <form onSubmit={onSubmit}>
        {createError && (
          <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
            {createError}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <label style={{ fontWeight: 600, fontSize: "0.88rem", display: "block", marginBottom: "0.35rem" }}>
            កូដតួនាទី (Role Key - e.g. commune_accountant) *
          </label>
          <input
            type="text"
            className="input"
            placeholder="ឧ. commune_accountant"
            value={newRole.role}
            onChange={(e) => setNewRole((prev) => ({ ...prev, role: e.target.value }))}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontWeight: 600, fontSize: "0.88rem", display: "block", marginBottom: "0.35rem" }}>
            ឈ្មោះបង្ហាញ (Role Label - e.g. គណនេយ្យករឃុំ) *
          </label>
          <input
            type="text"
            className="input"
            placeholder="ឧ. គណនេយ្យករឃុំ"
            value={newRole.label}
            onChange={(e) => setNewRole((prev) => ({ ...prev, label: e.target.value }))}
            required
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            បោះបង់
          </button>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "កំពុងបង្កើត..." : "បង្កើតតួនាទី"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
