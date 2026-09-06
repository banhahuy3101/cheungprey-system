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
  status: "",
  search: "",
};

export function SponsorshipProvider({ children }) {
  const toast = useToast();

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
        status: filters.status || undefined,
        search: filters.search || undefined,
        limit: 1000,
      };

      const listPromise = sponsorshipAPI.list(queryParams).catch((err) => {
        console.warn("Sponsorships list fetch warning:", err);
        return { data: { data: [] } };
      });
      const summaryPromise = sponsorshipAPI.getSummary(queryParams).catch((err) => {
        console.warn("Sponsorships summary fetch warning:", err);
        return { data: { data: null } };
      });

      const [listRes, summaryRes] = await Promise.all([listPromise, summaryPromise]);

      setRecords(listRes.data?.data || []);
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      console.error("fetchSponsorships error:", err);
      setRecords([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
      toast?.success?.(
        submitImmediately ? "បង្កើត និងដាក់ស្នើបានជោគជ័យ" : "រក្សាទុកជាសេចក្តីព្រាងបានជោគជ័យ"
      );
      const created = res.data?.data;
      if (created) {
        setRecords((prev) => [created, ...prev.filter((r) => String(r.id) !== String(created.id))]);
      }
      closeModal();
      fetchSponsorships();
      return created;
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការបង្កើតកំណត់ត្រា";
      toast?.error?.(msg);
      throw err;
    }
  }, [closeModal, toast, fetchSponsorships]);

  const updateRecord = useCallback(async (id, payload) => {
    try {
      const res = await sponsorshipAPI.update(id, payload);
      toast?.success?.("កែប្រែទិន្នន័យបានជោគជ័យ");
      const updated = res.data?.data;
      if (updated) {
        setRecords((prev) =>
          prev.map((r) => (String(r.id || r.ID) === String(id) ? { ...r, ...updated } : r))
        );
      }
      closeModal();
      fetchSponsorships();
      return updated;
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការកែប្រែទិន្នន័យ";
      toast?.error?.(msg);
      throw err;
    }
  }, [closeModal, toast, fetchSponsorships]);

  const deleteRecord = useCallback(async (id) => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបកំណត់ត្រានេះមែនទេ?")) return;
    try {
      await sponsorshipAPI.delete(id);
      toast?.success?.("បានលុបកំណត់ត្រាជោគជ័យ");
      setRecords((prev) => prev.filter((r) => String(r.id || r.ID) !== String(id)));
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចលុបកំណត់ត្រាបានទេ";
      toast?.error?.(msg);
      throw err;
    }
  }, [toast]);

  const submitRecord = useCallback(async (id) => {
    try {
      const res = await sponsorshipAPI.submit(id);
      toast?.success?.("បានដាក់ស្នើពិនិត្យជោគជ័យ");
      const updated = res.data?.data;
      setRecords((prev) =>
        prev.map((r) =>
          String(r.id || r.ID) === String(id) ? (updated ? { ...r, ...updated } : { ...r, status: "submitted" }) : r
        )
      );
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចដាក់ស្នើបានទេ";
      toast?.error?.(msg);
      throw err;
    }
  }, [toast]);

  const reviewRecord = useCallback(async (id, action, notes = "") => {
    try {
      const res = await sponsorshipAPI.review(id, { action, notes });
      toast?.success?.(
        action === "return" ? "បានបង្វែរកំណត់ត្រាទៅកែសម្រួលវិញ" : "បានពិនិត្យ និងយល់ព្រម"
      );
      const updated = res.data?.data;
      setRecords((prev) =>
        prev.map((r) =>
          String(r.id || r.ID) === String(id)
            ? (updated ? { ...r, ...updated } : { ...r, status: action === "return" ? "returned" : "reviewed" })
            : r
        )
      );
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការពិនិត្យ";
      toast?.error?.(msg);
      throw err;
    }
  }, [toast]);

  const approveRecord = useCallback(async (id, notes = "") => {
    try {
      const res = await sponsorshipAPI.approve(id, { notes });
      toast?.success?.("បានអនុម័ត និងចាក់សោរបាយការណ៍ជោគជ័យ");
      const updated = res.data?.data;
      setRecords((prev) =>
        prev.map((r) =>
          String(r.id || r.ID) === String(id) ? (updated ? { ...r, ...updated } : { ...r, status: "approved" }) : r
        )
      );
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចអនុម័តបានទេ";
      toast?.error?.(msg);
      throw err;
    }
  }, [toast]);

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
