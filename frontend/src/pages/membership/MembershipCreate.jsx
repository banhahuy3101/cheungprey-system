import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LuArrowLeft, LuBuilding2, LuCheck, LuEye, LuFileCheck2, LuFileText,
  LuIdCard, LuImage, LuMapPin, LuSave, LuSend, LuUser,
} from "react-icons/lu";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import Select from "../../components/Select";
import { membershipAPI } from "../../api/membership";
import { useZoneCascade } from "../../hooks/useZoneCascade";
import { useToast } from "../../components/Toast";

const DOCUMENTS = [
  { type: "portrait", label: "រូបថត 4x6", hint: "JPEG ឬ PNG, អតិបរមា 5 MB", icon: LuImage, accept: "image/jpeg,image/png" },
  { type: "national_id_front", label: "អត្តសញ្ញាណប័ណ្ណ ខាងមុខ", hint: "JPEG, PNG ឬ PDF", icon: LuIdCard, accept: "image/jpeg,image/png,application/pdf" },
  { type: "national_id_back", label: "អត្តសញ្ញាណប័ណ្ណ ខាងក្រោយ", hint: "JPEG, PNG ឬ PDF", icon: LuIdCard, accept: "image/jpeg,image/png,application/pdf" },
  { type: "application_form", label: "ពាក្យសុំចូលជាសមាជិក", hint: "JPEG, PNG ឬ PDF", icon: LuFileText, accept: "image/jpeg,image/png,application/pdf" },
];

const initialForm = {
  registration_pathway: "Geographical", institutional_unit: "", national_id: "",
  last_name_kh: "", first_name_kh: "", last_name_en: "", first_name_en: "",
  gender: "Male", date_of_birth: "", phone_number: "", email: "",
  current_address_details: "", registered_village_code: "", party_role: "Member",
  join_date: new Date().toISOString().slice(0, 10), membership_type: "Full",
  membership_tier: "Basic", exempt_from_dues: false, marital_status: "",
  occupation: "", education_level: "", ethnicity: "", religion: "", blood_type: "",
  emergency_contact_name: "", emergency_contact_phone: "",
};

const unwrap = (response) => response.data?.data || response.data;

export default function MembershipCreate() {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const showLoadError = toast.error;
  const [form, setForm] = useState(initialForm);
  const [saved, setSaved] = useState(null);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(registrationId));

  const zone = useZoneCascade({ userZone: "", isAdmin: true, initialZoneCode: "", showVillage: true });
  const loadZoneFromCode = zone.loadFromZoneCode;
  const editable = !saved || saved.status === "DRAFT" || saved.status === "REJECTED";
  const documentTypes = useMemo(() => new Set(existingDocuments.map((document) => document.document_type)), [existingDocuments]);

  useEffect(() => {
    if (!registrationId) return;
    membershipAPI.getRegistration(registrationId).then((response) => {
      const detail = unwrap(response);
      const registration = detail.registration;
      setSaved(registration);
      setExistingDocuments(detail.documents || []);
      setForm({ ...initialForm, ...registration });
      if (registration.registered_village_code) loadZoneFromCode(registration.registered_village_code);
    }).catch(() => showLoadError("មិនអាចផ្ទុកពាក្យសុំបានទេ")).finally(() => setLoading(false));
  }, [loadZoneFromCode, registrationId, showLoadError]);

  const onChange = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const payload = () => ({
    ...form,
    registered_village_code: zone.resolvedZone || form.registered_village_code,
  });

  const validateForSubmit = () => {
    const next = {};
    const required = ["national_id", "last_name_kh", "first_name_kh", "last_name_en", "first_name_en", "date_of_birth", "phone_number"];
    required.forEach((key) => { if (!String(form[key] || "").trim()) next[key] = "ត្រូវបំពេញ"; });
    if (!/^\d{9,10}$/.test(form.national_id)) next.national_id = "ត្រូវមាន 9 ឬ 10 ខ្ទង់";
    if (form.date_of_birth) {
      const adultDate = new Date(form.date_of_birth);
      adultDate.setFullYear(adultDate.getFullYear() + 18);
      if (adultDate > new Date()) next.date_of_birth = "បេក្ខជនត្រូវមានអាយុយ៉ាងតិច 18 ឆ្នាំ";
    }
    if (!(zone.resolvedZone || form.registered_village_code)) next.registered_village_code = "សូមជ្រើសរើសទីតាំង";
    if (form.registration_pathway === "Institutional" && !form.institutional_unit.trim()) next.institutional_unit = "សូមបញ្ចូលអង្គភាព";
    DOCUMENTS.forEach(({ type }) => {
      if (!files[type] && !documentTypes.has(type)) next[type] = "ត្រូវភ្ជាប់ឯកសារ";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = async () => {
    const response = saved
      ? await membershipAPI.updateRegistration(saved.id, payload())
      : await membershipAPI.createRegistration(payload());
    const registration = unwrap(response);
    setSaved(registration);
    const uploaded = [...existingDocuments];
    for (const definition of DOCUMENTS) {
      const file = files[definition.type];
      if (!file) continue;
      const document = unwrap(await membershipAPI.uploadRegistrationDocument(registration.id, {
        document_type: definition.type,
        file_name: file.name,
        mime_type: file.type,
        base64_data: await readFile(file),
      }));
      const index = uploaded.findIndex((item) => item.document_type === definition.type);
      if (index >= 0) uploaded[index] = document;
      else uploaded.push(document);
    }
    setExistingDocuments(uploaded);
    setFiles({});
    return registration;
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      const registration = await persist();
      toast.success(`បានរក្សាទុកព្រាង ${registration.registration_no}`);
      if (!registrationId) navigate(`/membership/registrations/${registration.id}/edit`, { replace: true });
    } catch (error) {
      toast.error(apiError(error, "ការរក្សាទុកព្រាងបរាជ័យ"));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!validateForSubmit()) {
      toast.error("សូមបំពេញព័ត៌មាន និងឯកសារដែលត្រូវការ");
      return;
    }
    setBusy(true);
    try {
      const registration = await persist();
      await membershipAPI.submitRegistration(registration.id);
      toast.success("បានដាក់ពាក្យសុំសម្រាប់ការផ្ទៀងផ្ទាត់");
      navigate("/membership");
    } catch (error) {
      toast.error(apiError(error, "ការដាក់ពាក្យសុំបរាជ័យ"));
    } finally {
      setBusy(false);
    }
  };

  const viewDocument = async (documentType) => {
    try {
      const file = unwrap(await membershipAPI.getRegistrationDocument(saved.id, documentType));
      const bytes = Uint8Array.from(atob(file.base64_content), (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: file.mime_type }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error("មិនអាចបើកឯកសារបានទេ");
    }
  };

  if (loading) return <div className="loading">កំពុងផ្ទុក...</div>;

  return (
    <div className="page registration-page">
      <header className="registration-header">
        <div>
          <button className="registration-back" type="button" onClick={() => navigate("/membership")}>
            <LuArrowLeft /> ត្រឡប់ទៅបញ្ជីសមាជិក
          </button>
          <h2>{saved ? "កែសម្រួលពាក្យសុំ" : "ចុះឈ្មោះសមាជិកថ្មី"}</h2>
          <p>{saved?.registration_no || "បញ្ចូលព័ត៌មាន ផ្ទៀងផ្ទាត់ឯកសារ និងដាក់ស្នើ"}</p>
        </div>
        {saved && <StatusBadge status={saved.status} />}
      </header>

      {saved?.rejection_reason && <div className="registration-rejection"><strong>មូលហេតុបដិសេធ:</strong> {saved.rejection_reason}</div>}
      {!editable && <div className="registration-notice">ពាក្យសុំនេះត្រូវបានដាក់ស្នើរួច ហើយមិនអាចកែប្រែបានទេ។</div>}

      <div className="registration-layout">
        <main className="registration-form-stack">
          <FormSection icon={LuUser} title="ព័ត៌មានអត្តសញ្ញាណ" description="ព័ត៌មានផ្ទាល់ខ្លួនត្រូវតែត្រូវគ្នានឹងអត្តសញ្ញាណប័ណ្ណ">
            <div className="registration-fields two-column">
              <Field label="នាមត្រកូល (ខ្មែរ)" error={errors.last_name_kh}><input name="last_name_kh" value={form.last_name_kh} onChange={onChange} disabled={!editable} /></Field>
              <Field label="នាម (ខ្មែរ)" error={errors.first_name_kh}><input name="first_name_kh" value={form.first_name_kh} onChange={onChange} disabled={!editable} /></Field>
              <Field label="Last name (Latin)" error={errors.last_name_en}><input name="last_name_en" value={form.last_name_en} onChange={onChange} disabled={!editable} style={{ textTransform: "uppercase" }} /></Field>
              <Field label="First name (Latin)" error={errors.first_name_en}><input name="first_name_en" value={form.first_name_en} onChange={onChange} disabled={!editable} style={{ textTransform: "uppercase" }} /></Field>
              <Field label="លេខអត្តសញ្ញាណប័ណ្ណ" error={errors.national_id}><input inputMode="numeric" name="national_id" maxLength={10} value={form.national_id} onChange={onChange} disabled={!editable} /></Field>
              <Field label="ភេទ"><Select name="gender" value={form.gender} onChange={onChange} disabled={!editable}><option value="Male">ប្រុស</option><option value="Female">ស្រី</option><option value="Other">ផ្សេងៗ</option></Select></Field>
              <Field label="ថ្ងៃខែឆ្នាំកំណើត" error={errors.date_of_birth}><input type="date" name="date_of_birth" value={form.date_of_birth} onChange={onChange} disabled={!editable} /></Field>
              <Field label="លេខទូរសព្ទ" error={errors.phone_number}><input name="phone_number" value={form.phone_number} onChange={onChange} disabled={!editable} placeholder="0xx xxx xxx" /></Field>
              <Field label="អ៊ីមែល"><input type="email" name="email" value={form.email} onChange={onChange} disabled={!editable} /></Field>
              <Field label="ថ្ងៃចុះឈ្មោះ"><input type="date" name="join_date" value={form.join_date} onChange={onChange} disabled={!editable} /></Field>
            </div>
          </FormSection>

          <FormSection icon={LuMapPin} title="ខ្សែចុះឈ្មោះ និងទីតាំង" description="ជ្រើសរើសតាមភូមិសាស្ត្រ ឬតាមស្ថាប័ន">
            <div className="pathway-control">
              <button type="button" className={form.registration_pathway === "Geographical" ? "active" : ""} onClick={() => editable && setForm({ ...form, registration_pathway: "Geographical" })}><LuMapPin /> ភូមិសាស្ត្រ</button>
              <button type="button" className={form.registration_pathway === "Institutional" ? "active" : ""} onClick={() => editable && setForm({ ...form, registration_pathway: "Institutional" })}><LuBuilding2 /> ស្ថាប័ន</button>
            </div>
            {form.registration_pathway === "Institutional" && <Field label="ក្រសួង សាកលវិទ្យាល័យ ឬអង្គភាព" error={errors.institutional_unit}><input name="institutional_unit" value={form.institutional_unit} onChange={onChange} disabled={!editable} /></Field>}
            <Field label="ទីតាំងចុះឈ្មោះ" error={errors.registered_village_code}><ZoneCascadeSelect hook={zone} disabled={!editable} /></Field>
            <Field label="អាសយដ្ឋានបច្ចុប្បន្ន"><textarea name="current_address_details" rows={3} value={form.current_address_details} onChange={onChange} disabled={!editable} /></Field>
          </FormSection>

          <FormSection icon={LuFileCheck2} title="ឯកសារភ្ជាប់" description="ឯកសារទាំងបួនត្រូវបានទាមទារនៅពេលដាក់ស្នើ">
            <div className="document-grid">
              {DOCUMENTS.map((definition) => <DocumentField key={definition.type} definition={definition} file={files[definition.type]} existing={existingDocuments.find((item) => item.document_type === definition.type)} error={errors[definition.type]} disabled={!editable} onView={() => viewDocument(definition.type)} onChange={(file) => setFiles((current) => ({ ...current, [definition.type]: file }))} />)}
            </div>
          </FormSection>
        </main>

        <aside className="registration-summary">
          <h3>សេចក្តីសង្ខេប</h3>
          <SummaryRow label="ឈ្មោះខ្មែរ" value={`${form.last_name_kh} ${form.first_name_kh}`.trim()} />
          <SummaryRow label="ឈ្មោះឡាតាំង" value={`${form.last_name_en} ${form.first_name_en}`.trim().toUpperCase()} />
          <SummaryRow label="អត្តសញ្ញាណប័ណ្ណ" value={form.national_id} />
          <SummaryRow label="ខ្សែចុះឈ្មោះ" value={form.registration_pathway === "Institutional" ? "ស្ថាប័ន" : "ភូមិសាស្ត្រ"} />
          <SummaryRow label="ឯកសាររួចរាល់" value={`${DOCUMENTS.filter(({ type }) => files[type] || documentTypes.has(type)).length}/4`} />
          <div className="registration-flow-mini">
            <span className="done">ព្រាង</span><i /><span>ផ្ទៀងផ្ទាត់</span><i /><span>អនុម័ត</span><i /><span>ចេញកាត</span>
          </div>
          {editable && <div className="registration-actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={saveDraft}><LuSave /> រក្សាទុកព្រាង</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "កំពុងដំណើរការ..." : <><LuSend /> ដាក់ស្នើ</>}</button>
          </div>}
        </aside>
      </div>
    </div>
  );
}

function FormSection({ icon: Icon, title, description, children }) {
  return <section className="registration-section"><header><span><Icon /></span><div><h3>{title}</h3><p>{description}</p></div></header><div className="registration-section-body">{children}</div></section>;
}

function Field({ label, error, children }) {
  return <label className={`registration-field ${error ? "has-error" : ""}`}><span>{label}</span>{children}{error && <small>{error}</small>}</label>;
}

function DocumentField({ definition, file, existing, error, disabled, onChange, onView }) {
  const Icon = definition.icon;
  return <label className={`document-upload ${error ? "has-error" : ""} ${file || existing ? "complete" : ""}`}>
    <input type="file" accept={definition.accept} disabled={disabled} onChange={(event) => onChange(event.target.files?.[0] || null)} />
    <Icon />
    <strong>{definition.label}</strong>
    <span>{file?.name || existing?.file_name || definition.hint}</span>
    {(file || existing) && <b><LuCheck /> រួចរាល់</b>}
    {error && <small>{error}</small>}
    {existing && <button type="button" className="document-view" title="មើលឯកសារ" onClick={(event) => { event.preventDefault(); onView(); }}><LuEye /> មើល</button>}
  </label>;
}

function SummaryRow({ label, value }) {
  return <div className="summary-row"><span>{label}</span><strong>{value || "-"}</strong></div>;
}

function StatusBadge({ status }) {
  const labels = { DRAFT: "ព្រាង", PENDING_VERIFICATION: "រង់ចាំផ្ទៀងផ្ទាត់", VERIFIED: "បានផ្ទៀងផ្ទាត់", APPROVED: "បានអនុម័ត", REJECTED: "បានបដិសេធ" };
  return <span className={`registration-status status-${status.toLowerCase()}`}>{labels[status] || status}</span>;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function apiError(error, fallback) {
  return error.response?.data?.error || error.response?.data?.message || fallback;
}
