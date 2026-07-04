export function unwrapZone(res) {
  const payload = res?.data?.data ?? res?.data;
  if (Array.isArray(payload)) return payload[0] || null;
  return payload || null;
}

export function zoneCodeOf(zone) {
  return zone?.zone_code || zone?.code || "";
}

export function unwrapList(res) {
  const payload = res?.data?.data ?? res?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.zones && Array.isArray(payload.zones)) return payload.zones;
  return [];
}

export function resolveSelectedZone(village, commune, district, province) {
  return village || commune || district || province || "";
}

/** Finance is scoped to commune level and above (no village). */
export function resolveFinanceZone(_village, commune, district, province) {
  return commune || district || province || "";
}

/** Load province → district → commune → village lists for a zone code. */
export async function loadZoneHierarchy(partyAPI, zoneCode) {
  if (!zoneCode) return null;
  const zone = unwrapZone(await partyAPI.getZones({ code: zoneCode }));
  if (!zone) return null;

  const type = zone.zone_type || "";
  let province = "";
  let district = "";
  let commune = "";
  let village = "";

  if (type === "Village") {
    village = zoneCode;
    commune = zone.parent_code || "";
  } else if (type === "Commune") {
    commune = zoneCode;
  } else if (type === "District") {
    district = zoneCode;
  } else if (type === "Province") {
    province = zoneCode;
  }

  if (commune && !district) {
    const c = unwrapZone(await partyAPI.getZones({ code: commune }));
    district = c?.parent_code || "";
  }
  if (district && !province) {
    const d = unwrapZone(await partyAPI.getZones({ code: district }));
    province = d?.parent_code || "";
  }
  if (village && !commune) {
    const v = unwrapZone(await partyAPI.getZones({ code: village }));
    commune = v?.parent_code || "";
  }

  const [provinces, districts, communes, villages] = await Promise.all([
    partyAPI.getZones({ type: "Province" }),
    province ? partyAPI.getZones({ type: "District", parent_code: province }) : Promise.resolve({ data: [] }),
    district ? partyAPI.getZones({ type: "Commune", parent_code: district }) : Promise.resolve({ data: [] }),
    commune ? partyAPI.getZones({ type: "Village", parent_code: commune }) : Promise.resolve({ data: [] }),
  ]);

  return {
    province,
    district,
    commune,
    village,
    provinces: unwrapList(provinces),
    districts: unwrapList(districts),
    communes: unwrapList(communes),
    villages: unwrapList(villages),
  };
}
