import client from "./client";

export const zoneChiefAPI = {
  list: () => client.get("/admin/zone-chiefs"),
  get: (zoneCode) => client.get(`/admin/zone-chiefs/${zoneCode}`),
  assign: (data) => client.post("/admin/zone-chiefs", data),
  remove: (zoneCode) => client.delete("/admin/zone-chiefs", { data: { zone_code: zoneCode } }),
};
