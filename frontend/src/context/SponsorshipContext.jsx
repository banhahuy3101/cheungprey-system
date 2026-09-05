import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { sponsorshipAPI } from "../api/sponsorship";
import { useToast } from "../components/Toast";

export const SponsorshipContext = createContext(null);

export function useSponsorships() {
  const context = useContext(SponsorshipContext);
  if (!context) {
    throw new Error("useSponsorships must be used within a SponsorshipProvider");
  }
  return context;
}

const DEFAULT_FILTERS = {
  section_group: "",
  record_period: "",
  target_location: "",
  status: "",
  search: "",
};

export function SponsorshipProvider({ children }) {
  const { showToast } = useToast();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Modal / Selection state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchSponsorships = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = {
        section_group: filters.section_group && filters.section_group !== "ទាំងអស់ (All)" ? filters.section_group : undefined,
        record_period: filters.record_period && filters.record_period !== "ទាំងអស់ (All)" ? filters.record_period : undefined,
        target_location: filters.target_location && filters.target_location !== "ទាំងអស់ (All)" ? filters.target_location : undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        limit: 1000,
      };

      const [listRes, summaryRes] = await Promise.all([
        sponsorshipAPI.list(queryParams),
        sponsorshipAPI.getSummary(queryParams),
      ]);

      setRecords(listRes.data?.data || []);
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការទាញយកទិន្នន័យឧបត្ថម្ភ";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchSponsorships();
  }, [fetchSponsorships]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const openCreateModal = useCallback(() => {
    setSelectedRecord(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((record) => {
    setSelectedRecord(record);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedRecord(null);
    setModalOpen(false);
  }, []);

  const createRecord = useCallback(async (payload, submitImmediately = false) => {
    try {
      const res = await sponsorshipAPI.create({
        ...payload,
        submit_immediately: submitImmediately,
      });
      showToast(
        submitImmediately ? "បង្កើត និងដាក់ស្នើបានជោគជ័យ" : "រក្សាទុកជាសេចក្តីព្រាងបានជោគជ័យ",
        "success"
      );
      closeModal();
      fetchSponsorships();
      return res.data?.data;
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការបង្កើតកំណត់ត្រា";
      showToast(msg, "error");
      throw err;
    }
  }, [closeModal, fetchSponsorships, showToast]);

  const updateRecord = useCallback(async (id, payload) => {
    try {
      const res = await sponsorshipAPI.update(id, payload);
      showToast("កែប្រែទិន្នន័យបានជោគជ័យ", "success");
      closeModal();
      fetchSponsorships();
      return res.data?.data;
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការកែប្រែទិន្នន័យ";
      showToast(msg, "error");
      throw err;
    }
  }, [closeModal, fetchSponsorships, showToast]);

  const deleteRecord = useCallback(async (id) => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបកំណត់ត្រានេះមែនទេ?")) return;
    try {
      await sponsorshipAPI.delete(id);
      showToast("បានលុបកំណត់ត្រាជោគជ័យ", "success");
      fetchSponsorships();
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចលុបកំណត់ត្រាបានទេ";
      showToast(msg, "error");
      throw err;
    }
  }, [fetchSponsorships, showToast]);

  const submitRecord = useCallback(async (id) => {
    try {
      await sponsorshipAPI.submit(id);
      showToast("បានដាក់ស្នើពិនិត្យជោគជ័យ", "success");
      fetchSponsorships();
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចដាក់ស្នើបានទេ";
      showToast(msg, "error");
      throw err;
    }
  }, [fetchSponsorships, showToast]);

  const reviewRecord = useCallback(async (id, action, notes = "") => {
    try {
      await sponsorshipAPI.review(id, { action, notes });
      showToast(
        action === "return" ? "បានបង្វែរកំណត់ត្រាទៅកែសម្រួលវិញ" : "បានពិនិត្យ និងយល់ព្រម",
        "success"
      );
      fetchSponsorships();
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការពិនិត្យ";
      showToast(msg, "error");
      throw err;
    }
  }, [fetchSponsorships, showToast]);

  const approveRecord = useCallback(async (id, notes = "") => {
    try {
      await sponsorshipAPI.approve(id, { notes });
      showToast("បានអនុម័ត និងចាក់សោរបាយការណ៍ជោគជ័យ", "success");
      fetchSponsorships();
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចអនុម័តបានទេ";
      showToast(msg, "error");
      throw err;
    }
  }, [fetchSponsorships, showToast]);

  const value = useMemo(
    () => ({
      records,
      summary,
      loading,
      filters,
      setFilters,
      resetFilters,
      refresh: fetchSponsorships,
      modalOpen,
      selectedRecord,
      openCreateModal,
      openEditModal,
      closeModal,
      createRecord,
      updateRecord,
      deleteRecord,
      submitRecord,
      reviewRecord,
      approveRecord,
    }),
    [
      records,
      summary,
      loading,
      filters,
      resetFilters,
      fetchSponsorships,
      modalOpen,
      selectedRecord,
      openCreateModal,
      openEditModal,
      closeModal,
      createRecord,
      updateRecord,
      deleteRecord,
      submitRecord,
      reviewRecord,
      approveRecord,
    ]
  );

  return (
    <SponsorshipContext.Provider value={value}>
      {children}
    </SponsorshipContext.Provider>
  );
}
