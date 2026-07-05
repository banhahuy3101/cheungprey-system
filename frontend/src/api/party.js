import client from "./client";

export const partyAPI = {
  // Zones
  getZones: (params) => client.get("/party/zones", { params }),
  getZoneTree: () => client.get("/party/zones/tree"),
  getStructures: () => client.get("/party/structures"),

  // Members
  createMember: (data) => client.post("/party/members", data),
  getMembers: (params) => client.get("/party/members", { params }),
  getMemberById: (id) => client.get(`/party/members/${id}`),
  updateMember: (id, data) => client.put(`/party/members/${id}`, data),
  deleteMember: (id) => client.delete(`/party/members/${id}`),

  // Voters
  createVoter: (data) => client.post("/party/voters", data),
  getVoters: (params) => client.get("/party/voters", { params }),

  // Files (JSON + base64, same pattern as report templates)
  uploadFile: (payload) => client.post("/party/files", payload),
  getFiles: (params) => client.get("/party/files", { params }),
  getFileById: (id, config) => client.get(`/party/files/${id}`, config),
  deleteFile: (id) => client.delete(`/party/files/${id}`),
};