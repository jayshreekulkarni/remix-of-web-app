const API_BASE_URL = "http://187.127.128.34:5000"; // VPS backend ka base URL

// Get all leads
export async function getLeads() {
  const response = await fetch(`${API_BASE_URL}/api/leads`);
  if (!response.ok) throw new Error("API request failed");
  return response.json();
}

// Get single lead by ID
export async function getLead(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/leads/${id}`);
  if (!response.ok) throw new Error("API request failed");
  return response.json();
}

// Add a new lead
export async function addLead(payload: any) {
  const response = await fetch(`${API_BASE_URL}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("API request failed");
  return response.json();
}

// Update a lead
export async function updateLead(id: string, payload: any) {
  const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("API request failed");
  return response.json();
}

// Delete a lead
export async function deleteLead(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("API request failed");
  return response.json();
}

// ─── Team Members ─────────────────────────────────────────────────────────────
 
export async function getTeamMembers() {
  const res = await fetch(`${API_BASE_URL}/api/team_members`);
  if (!res.ok) throw new Error("Failed to fetch team members");
  return res.json();
}
 
export async function createTeamMember(payload: { name: string; email: string; role?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/team_members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create team member");
  return res.json();
}
 