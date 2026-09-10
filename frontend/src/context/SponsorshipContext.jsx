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
  period_id: "",
  section_group: "",
  record_period: "",
  status: "",
  search: "",
};

export function SponsorshipProvider({ children }) {
  const toast = useToast();

  // Level 1: Periods State
  const [periods, setPeriods] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState(null);

  // Level 2 & 3: Records & Items State
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Modal / Selection state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // -------------------------------------------------------------
  // LEVEL 1: PERIODS CRUD
  // -------------------------------------------------------------
  const fetchPeriods = useCallback(async () => {
    try {
      setPeriodsLoading(true);
      const res = await sponsorshipAPI.listPeriods();
      const list = res.data?.data || [];
      setPeriods(list);
      return list;
    } catch (err) {
      console.error("fetchPeriods error:", err);
      setPeriods([]);
      return [];
    } finally {
      setPeriodsLoading(false);
    }
  }, []);

  const createPeriod = useCallback(async (payload) => {
    try {
      const res = await sponsorshipAPI.createPeriod(payload);
      toast?.success?.("បានបង្កើតតារាងឧបត្ថម្ភមេជោគជ័យ");
      const created = res.data?.data;
      if (created) {
        setPeriods((prev) => [created, ...prev.filter((p) => String(p.id) !== String(created.id))]);
      }
      fetchPeriods();
      return created;
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចបង្កើតតារាងឧបត្ថម្ភមេបានទេ";
      toast?.error?.(msg);
      throw err;
    }
  }, [toast, fetchPeriods]);

  const updatePeriod = useCallback(async (id, payload) => {
    try {
      const res = await sponsorshipAPI.updatePeriod(id, payload);
      toast?.success?.("បានកែប្រែតារាងឧបត្ថម្ភមេជោគជ័យ");
      const updated = res.data?.data;
      if (updated) {
        setPeriods((prev) =>
          prev.map((p) => (String(p.id) === String(id) ? { ...p, ...updated } : p))
        );
        if (activePeriod && String(activePeriod.id) === String(id)) {
          setActivePeriod((prev) => ({ ...prev, ...updated }));
        }
      }
      fetchPeriods();
      return updated;
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចកែប្រែបានទេ";
      toast?.error?.(msg);
      throw err;
    }
  }, [toast, activePeriod, fetchPeriods]);

  const deletePeriod = useCallback(async (id) => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបតារាងឧបត្ថម្ភមេនេះ និងកំណត់ត្រាទាំងអស់ខាងក្នុងមែនទេ?")) return;
    try {
      await sponsorshipAPI.deletePeriod(id);
      toast?.success?.("បានលុបតារាងឧបត្ថម្ភមេជោគជ័យ");
      setPeriods((prev) => prev.filter((p) => String(p.id) !== String(id)));
      if (activePeriod && String(activePeriod.id) === String(id)) {
        setActivePeriod(null);
      }
      fetchPeriods();
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចលុបបានទេ";
      toast?.error?.(msg);
      throw err;
    }
  }, [toast, activePeriod, fetchPeriods]);

  // -------------------------------------------------------------
  // LEVEL 2 & 3: RECORDS CRUD
  // -------------------------------------------------------------
  const fetchSponsorships = useCallback(async (customParams = {}) => {
    try {
      setLoading(true);
      const activePId = customParams.period_id || filters.period_id || (activePeriod?.id ? String(activePeriod.id) : undefined);

      const queryParams = {
        period_id: activePId && activePId !== "all" ? activePId : undefined,
        section_group: filters.section_group && filters.section_group !== "ទាំងអស់ (All)" ? filters.section_group : undefined,
        record_period: filters.record_period && filters.record_period !== "ទាំងអស់ (All)" ? filters.record_period : undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        limit: 1000,
        ...customParams,
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
  }, [filters, activePeriod]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

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
      // Auto-assign activePeriod id and name if available
      const finalPayload = {
        ...payload,
        period_id: payload.period_id || activePeriod?.id || undefined,
        record_period: payload.record_period || activePeriod?.period_name || payload.record_period,
        fiscal_year: payload.fiscal_year || activePeriod?.fiscal_year || new Date().getFullYear(),
        submit_immediately: submitImmediately,
      };

      const res = await sponsorshipAPI.create(finalPayload);
      toast?.success?.(
        submitImmediately ? "បង្កើត និងដាក់ស្នើបានជោគជ័យ" : "រក្សាទុកជាសេចក្តីព្រាងបានជោគជ័យ"
      );
      const created = res.data?.data;
      if (created) {
        setRecords((prev) => [created, ...prev.filter((r) => String(r.id) !== String(created.id))]);
      }
      closeModal();
      fetchSponsorships();
      fetchPeriods(); // refresh period totals
      return created;
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការបង្កើតកំណត់ត្រា";
      toast?.error?.(msg);
      throw err;
    }
  }, [closeModal, toast, fetchSponsorships, fetchPeriods, activePeriod]);

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
      fetchPeriods();
      return updated;
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការកែប្រែទិន្នន័យ";
      toast?.error?.(msg);
      throw err;
    }
  }, [closeModal, toast, fetchSponsorships, fetchPeriods]);

  const deleteRecord = useCallback(async (id) => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបកំណត់ត្រានេះមែនទេ?")) return;
    try {
      await sponsorshipAPI.delete(id);
      toast?.success?.("បានលុបកំណត់ត្រាជោគជ័យ");
      setRecords((prev) => prev.filter((r) => String(r.id || r.ID) !== String(id)));
      fetchPeriods();
    } catch (err) {
      const msg = err.response?.data?.error || "មិនអាចលុបកំណត់ត្រាបានទេ";
      toast?.error?.(msg);
      throw err;
    }
  }, [toast, fetchPeriods]);

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
      // Periods (Level 1)
      periods,
      periodsLoading,
      activePeriod,
      setActivePeriod,
      fetchPeriods,
      createPeriod,
      updatePeriod,
      deletePeriod,

      // Records & Items (Level 2 & 3)
      records,
      summary,
      loading,
      filters,
      setFilters,
      resetFilters,
      refresh: fetchSponsorships,
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
    }),
    [
      periods,
      periodsLoading,
      activePeriod,
      fetchPeriods,
      createPeriod,
      updatePeriod,
      deletePeriod,
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
