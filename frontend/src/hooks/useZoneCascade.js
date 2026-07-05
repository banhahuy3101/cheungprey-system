import { useState, useEffect, useCallback, useRef } from "react";
import { partyAPI } from "../api/party";
import { loadZoneHierarchy, resolveSelectedZone, resolveFinanceZone, zoneCodeOf, unwrapList } from "../utils/zone";

function zoneLockedForUser(userZone, level, isAdmin) {
  if (isAdmin) return false;
  if (!userZone) return false;
  if (level === "village") return userZone.length >= 8;
  if (level === "commune") return userZone.length >= 6;
  if (level === "district") return userZone.length >= 4;
  if (level === "province") return userZone.length >= 2;
  return false;
}

export function useZoneCascade({ userZone, isAdmin, initialZoneCode, showVillage = true }) {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [villages, setVillages] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [loading, setLoading] = useState(false);
  const skipFetch = useRef(false);

  const resolvedZone = showVillage
    ? resolveSelectedZone(selectedVillage, selectedCommune, selectedDistrict, selectedProvince)
    : resolveFinanceZone(selectedVillage, selectedCommune, selectedDistrict, selectedProvince);

  const isLocked = useCallback(
    (level) => zoneLockedForUser(userZone, level, isAdmin),
    [userZone, isAdmin]
  );

  const applyHierarchy = useCallback((h) => {
    if (!h) return;
    skipFetch.current = true;
    setProvinces(h.provinces);
    setDistricts(h.districts);
    setCommunes(h.communes);
    setVillages(h.villages);
    setSelectedProvince(h.province || "");
    setSelectedDistrict(h.district || "");
    setSelectedCommune(h.commune || "");
    setSelectedVillage(showVillage ? (h.village || "") : "");
    requestAnimationFrame(() => { skipFetch.current = false; });
  }, [showVillage]);

  useEffect(() => {
    partyAPI.getZones({ type: "Province" })
      .then((res) => setProvinces(unwrapList(res)))
      .catch(() => {});
  }, []);

  const loadFromZoneCode = useCallback(async (zoneCode) => {
    if (!zoneCode) return;
    setLoading(true);
    try {
      const h = await loadZoneHierarchy(partyAPI, zoneCode);
      applyHierarchy(h);
    } finally {
      setLoading(false);
    }
  }, [applyHierarchy]);

  useEffect(() => {
    if (initialZoneCode) {
      loadFromZoneCode(initialZoneCode);
    }
  }, [initialZoneCode, loadFromZoneCode]);

  useEffect(() => {
    if (skipFetch.current || !selectedProvince) return;
    partyAPI.getZones({ type: "District", parent_code: selectedProvince })
      .then((res) => setDistricts(unwrapList(res)))
      .catch(() => setDistricts([]));
  }, [selectedProvince]);

  useEffect(() => {
    if (skipFetch.current || !selectedDistrict) return;
    partyAPI.getZones({ type: "Commune", parent_code: selectedDistrict })
      .then((res) => setCommunes(unwrapList(res)))
      .catch(() => setCommunes([]));
  }, [selectedDistrict]);

  useEffect(() => {
    if (skipFetch.current || !selectedCommune || !showVillage) return;
    partyAPI.getZones({ type: "Village", parent_code: selectedCommune })
      .then((res) => setVillages(unwrapList(res)))
      .catch(() => setVillages([]));
  }, [selectedCommune]);

  const resetSelection = () => {
    setSelectedProvince("");
    setSelectedDistrict("");
    setSelectedCommune("");
    setSelectedVillage("");
    setDistricts([]);
    setCommunes([]);
    setVillages([]);
  };

  const setProvince = (code) => {
    setSelectedProvince(code);
    setSelectedDistrict("");
    setSelectedCommune("");
    setSelectedVillage("");
  };

  const setDistrict = (code) => {
    setSelectedDistrict(code);
    setSelectedCommune("");
    setSelectedVillage("");
  };

  const setCommune = (code) => {
    setSelectedCommune(code);
    setSelectedVillage("");
  };

  return {
    provinces,
    districts,
    communes,
    villages,
    selectedProvince,
    selectedDistrict,
    selectedCommune,
    selectedVillage,
    setProvince,
    setDistrict,
    setCommune,
    setSelectedVillage,
    resolvedZone,
    isLocked,
    loading,
    loadFromZoneCode,
    applyHierarchy,
    resetSelection,
    showVillage,
  };
}

export function zoneOptionLabel(z) {
  return z.name_kh || z.name_en || zoneCodeOf(z);
}
