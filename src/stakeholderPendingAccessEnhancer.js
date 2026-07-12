import { supabase } from "./lib/supabaseClient";

const EDITABLE_STATUSES = ["pending", "needs_revision"];
const STAKEHOLDER_ROLES = new Set(["stakeholder", "full_stakeholder"]);
let currentUser = null;
let currentProfile = null;
let pendingRows = [];
let renderTimer = null;
let realtimeChannel = null;
let refreshingFromRealtime = false;

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusLabel(value) {
  const status = normalize(value).replaceAll(" ", "_");
  if (status === "needs_revision") return "Needs revision";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function isAdmin() {
  return currentProfile?.role === "admin" || normalize(currentUser?.email) === "ahmed.bahrawy@hu.edu.eg";
}

function isStakeholder() {
  return STAKEHOLDER_ROLES.has(currentProfile?.role);
}

function installStyles() {
  if (document.getElementById("stakeholder-pending-access-style")) return;
  const style = document.createElement("style");
  style.id = "stakeholder-pending-access-style";
  style.textContent = `
    body.rdc-non-admin .data-actions .data-card > button:not([disabled]) {
      display: none !important;
    }
    body.rdc-non-admin .data-actions .data-card > button.danger {
      display: none !important;
    }
    .my-pending-activities {
      display: grid;
      gap: 14px;
      padding: 18px;
      border: 1px solid rgba(36, 43, 120, 0.12);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 12px 35px rgba(15, 23, 42, 0.06);
    }
    .my-pending-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .my-pending-header h3 { margin: 0 0 5px; }
    .my-pending-header p { margin: 0; color: #64748b; line-height: 1.5; }
    .my-pending-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(255px, 1fr));
      gap: 10px;
    }
    .my-pending-card {
      display: grid;
      gap: 9px;
      padding: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #fff;
    }
    .my-pending-card h4 { margin: 0; color: #1e293b; }
    .my-pending-card p { margin: 0; color: #64748b; font-size: 0.86rem; line-height: 1.45; }
    .my-pending-meta { display: flex; flex-wrap: wrap; gap: 6px; }
    .my-pending-meta span {
      padding: 5px 8px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 800;
    }
    .my-pending-edit,
    .my-pending-refresh {
      width: fit-content;
      border: 0;
      border-radius: 999px;
      padding: 8px 12px;
      cursor: pointer;
      font-weight: 900;
    }
    .my-pending-edit { background: #242b78; color: white; }
    .my-pending-refresh { background: #eef2ff; color: #242b78; }
    .pending-edit-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2600;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.62);
    }
    .pending-edit-modal {
      width: min(980px, 100%);
      max-height: 92vh;
      overflow: auto;
      padding: 20px;
      border-radius: 20px;
      background: #fff;
      box-shadow: 0 30px 100px rgba(15, 23, 42, 0.3);
    }
    .pending-edit-modal h3 { margin: 0 0 5px; }
    .pending-edit-modal > p { margin: 0 0 14px; color: #64748b; }
    .pending-edit-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 11px;
    }
    .pending-edit-grid label {
      display: grid;
      gap: 5px;
      color: #475569;
      font-size: 0.8rem;
      font-weight: 850;
    }
    .pending-edit-grid input,
    .pending-edit-grid textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 11px;
      border: 1px solid #d8dee8;
      border-radius: 10px;
      background: #fff;
      color: #1e293b;
      font: inherit;
    }
    .pending-edit-grid textarea { min-height: 92px; resize: vertical; }
    .pending-edit-span-2 { grid-column: span 2; }
    .pending-edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .pending-edit-actions button {
      border: 0;
      border-radius: 999px;
      padding: 9px 14px;
      cursor: pointer;
      font-weight: 900;
    }
    .pending-edit-cancel { background: #eef2f7; color: #334155; }
    .pending-edit-save { background: #242b78; color: #fff; }
    .pending-edit-message { margin-top: 10px; color: #991b1b; font-weight: 800; }
    .stakeholder-access-note {
      padding: 11px 14px;
      border: 1px solid #dbeafe;
      border-radius: 12px;
      background: #eff6ff;
      color: #1e40af;
      line-height: 1.5;
      font-size: 0.86rem;
      font-weight: 800;
    }
    @media (max-width: 720px) {
      .pending-edit-grid { grid-template-columns: 1fr; }
      .pending-edit-span-2 { grid-column: span 1; }
    }
  `;
  document.head.appendChild(style);
}

async function loadIdentity() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  currentUser = user;
  if (!user) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,name,department,role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  currentProfile = data || { id: user.id, email: user.email, role: "viewer" };
  document.body.classList.toggle("rdc-non-admin", !isAdmin());
}

function dataManagementRoot() {
  const heading = normalize(document.querySelector(".topbar h1")?.textContent);
  const pathMatches = window.location.pathname === "/activities" || window.location.pathname === "/data-management";
  if (!pathMatches && heading !== "data management" && heading !== "activities") return null;
  return document.querySelector("main.workspace > section.stack");
}

function protectApprovedDataControls() {
  if (isAdmin()) return;

  document.querySelectorAll(".data-actions .data-card").forEach((card) => {
    const buttons = [...card.querySelectorAll(":scope > button")];
    buttons.forEach((button) => {
      button.disabled = true;
      button.title = "Approved/shared data is read-only. You can edit only your own pending submissions below.";
      button.style.display = "none";
    });
  });

  document.querySelectorAll("select").forEach((select) => {
    const table = select.closest("table");
    const headers = table ? [...table.querySelectorAll("thead th")].map((th) => normalize(th.textContent)) : [];
    if (headers.includes("action") && headers.includes("status") && headers.includes("submitted by")) {
      select.disabled = true;
      select.title = "Only RDC administrators can approve or change status.";
    }
  });
}

async function loadMyPendingRows() {
  if (!currentUser || !isStakeholder()) {
    pendingRows = [];
    return [];
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("submitted_by", currentUser.id)
    .in("approval_status", EDITABLE_STATUSES)
    .order("created_at", { ascending: false });
  if (error) throw error;
  pendingRows = data || [];
  return pendingRows;
}

function renderPendingCard(row) {
  return `
    <article class="my-pending-card" data-pending-activity-id="${escapeHtml(row.id)}">
      <div>
        <h4>${escapeHtml(row.activity_name || "Untitled activity")}</h4>
        <p>${escapeHtml(row.project_name || "Untitled project")}</p>
      </div>
      <div class="my-pending-meta">
        <span>${escapeHtml(statusLabel(row.approval_status))}</span>
        <span>${escapeHtml(row.village || "No village")}</span>
        <span>${escapeHtml(row.date_period || "No date")}</span>
      </div>
      <p>${escapeHtml(row.description || row.objective || "No description recorded yet.")}</p>
      <button type="button" class="my-pending-edit" data-edit-pending-id="${escapeHtml(row.id)}">Edit my submission</button>
    </article>
  `;
}

async function renderPendingSection() {
  const root = dataManagementRoot();
  if (!root || isAdmin()) return;

  protectApprovedDataControls();
  root.querySelector(".my-pending-activities")?.remove();

  const section = document.createElement("article");
  section.className = "my-pending-activities";

  if (!isStakeholder()) {
    section.innerHTML = `
      <div class="stakeholder-access-note">
        Approved RDC data is visible to you and stays read-only. Only Stakeholder accounts can submit data or edit their own pending submissions.
      </div>
    `;
  } else {
    const rows = await loadMyPendingRows();
    section.innerHTML = `
      <div class="my-pending-header">
        <div>
          <h3>My pending submissions</h3>
          <p>You can edit only activities that you submitted and that are still Pending or Needs revision. Approved data is read-only.</p>
        </div>
        <button type="button" class="my-pending-refresh">Refresh my submissions</button>
      </div>
      <div class="my-pending-grid">
        ${rows.map(renderPendingCard).join("") || `<div class="stakeholder-access-note">You do not currently have any pending submissions to edit.</div>`}
      </div>
    `;
  }

  const dataActions = root.querySelector(".data-actions");
  if (dataActions) dataActions.before(section);
  else root.appendChild(section);

  section.querySelector(".my-pending-refresh")?.addEventListener("click", () => renderPendingSection().catch(showError));
  section.querySelectorAll("[data-edit-pending-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = pendingRows.find((item) => item.id === button.dataset.editPendingId);
      if (row) openPendingEditModal(row);
    });
  });
}

function input(name, label, value = "", type = "text", className = "") {
  return `<label class="${className}">${escapeHtml(label)}<input name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" /></label>`;
}

function textarea(name, label, value = "", className = "pending-edit-span-2") {
  return `<label class="${className}">${escapeHtml(label)}<textarea name="${escapeHtml(name)}">${escapeHtml(value)}</textarea></label>`;
}

function openPendingEditModal(row) {
  if (!isStakeholder() || row.submitted_by !== currentUser?.id || !EDITABLE_STATUSES.includes(normalize(row.approval_status).replaceAll(" ", "_"))) {
    window.alert("This activity is not editable.");
    return;
  }

  const backdrop = document.createElement("div");
  backdrop.className = "pending-edit-backdrop";
  backdrop.innerHTML = `
    <form class="pending-edit-modal">
      <h3>Edit pending activity</h3>
      <p>The submission will remain pending after you save it. Approval status cannot be changed here.</p>
      <div class="pending-edit-grid">
        ${input("project_name", "Project", row.project_name)}
        ${input("activity_name", "Activity name", row.activity_name)}
        ${input("activity_type", "Activity type", row.activity_type)}
        ${input("village", "Village(s)", row.village)}
        ${input("date_period", "Date / implementation period", row.date_period)}
        ${input("responsible_person", "Responsible person", row.responsible_person)}
        ${input("partner", "Implementing partners", row.partner)}
        ${input("target_group", "Target group", row.target_group)}
        ${textarea("objective", "Main objective", row.objective)}
        ${textarea("description", "Activity description", row.description)}
        ${input("direct_beneficiaries", "Direct beneficiaries", row.direct_beneficiaries, "number")}
        ${input("indirect_beneficiaries", "Indirect beneficiaries", row.indirect_beneficiaries, "number")}
        ${input("households", "Households", row.households, "number")}
        ${input("women", "Women", row.women, "number")}
        ${input("women_trained", "Women trained", row.women_trained, "number")}
        ${input("youth", "Youth", row.youth, "number")}
        ${input("children_students", "Children / students", row.children_students, "number")}
        ${input("farmers", "Farmers", row.farmers, "number")}
        ${input("schools", "Schools", row.schools, "number")}
        ${input("teachers", "Teachers", row.teachers, "number")}
        ${input("volunteers", "Volunteers", row.volunteers, "number")}
        ${input("community_events", "Community events", row.community_events, "number")}
        ${input("trainings", "Trainings", row.trainings, "number")}
        ${input("health_cases", "Health cases", row.health_cases, "number")}
        ${input("waste_collected_kg", "Waste collected (kg)", row.waste_collected_kg, "number")}
        ${input("waste_recycled_kg", "Waste recycled (kg)", row.waste_recycled_kg, "number")}
        ${input("waste_composted_kg", "Waste composted (kg)", row.waste_composted_kg, "number")}
        ${input("trees_planted", "Trees planted", row.trees_planted, "number")}
        ${input("income_generated", "Income generated", row.income_generated, "number")}
        ${input("jobs_created", "Jobs created", row.jobs_created, "number")}
        ${textarea("ecology_impact", "Ecology impact", row.ecology_impact)}
        ${textarea("society_impact", "Society impact", row.society_impact)}
        ${textarea("culture_impact", "Culture impact", row.culture_impact)}
        ${textarea("economy_impact", "Economy impact", row.economy_impact)}
        ${input("sdgs", "SDGs (comma separated)", Array.isArray(row.sdgs) ? row.sdgs.join(", ") : row.sdgs || "", "text", "pending-edit-span-2")}
        ${textarea("key_outcome", "Key outcome", row.key_outcome)}
        ${textarea("challenge", "Challenge", row.challenge)}
        ${textarea("success_story", "Success story", row.success_story)}
        ${input("evidence_link", "Evidence link", row.evidence_link, "url", "pending-edit-span-2")}
        ${textarea("future_opportunity", "Future opportunity", row.future_opportunity)}
      </div>
      <div class="pending-edit-message"></div>
      <div class="pending-edit-actions">
        <button type="button" class="pending-edit-cancel">Cancel</button>
        <button type="submit" class="pending-edit-save">Save pending activity</button>
      </div>
    </form>
  `;

  document.body.appendChild(backdrop);
  backdrop.querySelector(".pending-edit-cancel")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) backdrop.remove();
  });
  backdrop.querySelector("form")?.addEventListener("submit", (event) => savePendingActivity(event, row));
}

async function savePendingActivity(event, row) {
  event.preventDefault();
  const form = event.currentTarget;
  const saveButton = form.querySelector(".pending-edit-save");
  const message = form.querySelector(".pending-edit-message");
  const formData = new FormData(form);

  const required = ["project_name", "activity_name", "responsible_person"];
  for (const field of required) {
    if (!String(formData.get(field) || "").trim()) {
      message.textContent = "Project, activity name, and responsible person are required.";
      return;
    }
  }

  const numberFields = [
    "direct_beneficiaries", "indirect_beneficiaries", "households", "women", "women_trained",
    "youth", "children_students", "farmers", "schools", "teachers", "volunteers", "community_events",
    "trainings", "health_cases", "waste_collected_kg", "waste_recycled_kg", "waste_composted_kg",
    "trees_planted", "income_generated", "jobs_created",
  ];
  const textFields = [
    "project_name", "activity_name", "activity_type", "village", "date_period", "responsible_person",
    "partner", "target_group", "objective", "description", "ecology_impact", "society_impact",
    "culture_impact", "economy_impact", "key_outcome", "challenge", "success_story", "evidence_link",
    "future_opportunity",
  ];

  const payload = {};
  textFields.forEach((field) => { payload[field] = String(formData.get(field) || "").trim(); });
  numberFields.forEach((field) => { payload[field] = number(formData.get(field)); });
  payload.sdgs = String(formData.get("sdgs") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  message.textContent = "";

  try {
    const { data, error } = await supabase
      .from("activities")
      .update(payload)
      .eq("id", row.id)
      .eq("submitted_by", currentUser.id)
      .in("approval_status", EDITABLE_STATUSES)
      .select("id,approval_status");
    if (error) throw error;
    if (!data?.length) throw new Error("This activity is no longer editable. It may already have been approved or changed by an administrator.");

    form.closest(".pending-edit-backdrop")?.remove();
    await renderPendingSection();
    showSuccess("Your pending activity was updated successfully.");
  } catch (error) {
    message.textContent = error.message || "Could not update this activity.";
    saveButton.disabled = false;
    saveButton.textContent = "Save pending activity";
  }
}

function showSuccess(text) {
  document.querySelector(".stakeholder-save-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "activity-delete-toast stakeholder-save-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3800);
}

function showError(error) {
  console.error("Stakeholder access enhancer:", error);
}

function refreshApprovedData() {
  if (refreshingFromRealtime) return;
  const button = [...document.querySelectorAll(".top-actions button, button.ghost")]
    .find((item) => normalize(item.textContent) === "refresh");
  if (!button) return;
  refreshingFromRealtime = true;
  button.click();
  window.setTimeout(() => {
    refreshingFromRealtime = false;
    scheduleRender(true);
  }, 1200);
}

function startRealtimeUpdates() {
  if (realtimeChannel || !currentUser) return;
  realtimeChannel = supabase
    .channel(`rdc-activities-live-${currentUser.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => {
      refreshApprovedData();
      window.setTimeout(() => renderPendingSection().catch(showError), 700);
    })
    .subscribe();
}

function scheduleRender(forceIdentity = false) {
  if (renderTimer) window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(async () => {
    renderTimer = null;
    try {
      if (forceIdentity || !currentProfile) await loadIdentity();
      protectApprovedDataControls();
      await renderPendingSection();
      startRealtimeUpdates();
    } catch (error) {
      showError(error);
    }
  }, 220);
}

function startStakeholderPendingAccess() {
  installStyles();
  scheduleRender(true);

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".sidebar nav button, .ghost")) {
      window.setTimeout(() => scheduleRender(false), 500);
    }
  }, true);

  const observer = new MutationObserver(() => scheduleRender(false));
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });

  window.setInterval(() => {
    if (dataManagementRoot()) scheduleRender(false);
  }, 45000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startStakeholderPendingAccess);
} else {
  startStakeholderPendingAccess();
}
