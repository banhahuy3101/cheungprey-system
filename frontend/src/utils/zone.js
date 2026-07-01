export function unwrapZone(res) {
  const payload = res?.data?.data ?? res?.data;
  if (Array.isArray(payload)) return payload[0] || null;
  return payload || null;
}

export function zoneCodeOf(zone) {
  return zone?.zone_code || zone?.code || "";
}
