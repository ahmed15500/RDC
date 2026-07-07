import { supabase } from "./lib/supabaseClient";

let currentProfile = null;
let profilesCache = null;
let editRowsCache = null;
let enhancementTimer = null;
let isEnhancing = false;

const roleOptions = [
  ["viewer", "Full Viewer"],
  ["stakeholder", "Full Stakeholder"],
  ["financial", "Financial Viewer"],
  ["financial_stakeholder", "Financial Stakeholder"],
];

const roleLabels = {
  admin: "Admin",
  viewer: "Full Viewer",
  full_viewer: "Full Viewer",
  stakeholder: "Full Stakeholder",
  full_stakeholder: "Full Stakeholder",
  financial: "Financial Viewer",
  financial_stakeholder: "Financial Stakeholder",
};

const roleNotices = {
  admin: "Admin access: view, validate, edit, delete, export, manage users, and manage financial projects.",
  viewer: "Full Viewer access: view all dashboards and reports, including financial projects, without data entry permissions.",
  full_viewer: "Full Viewer access: view all dashboards and reports, including financial projects, without data entry permissions.",
  stakeholder: "Full Stakeholder access: submit activity data and manage financial project entries.",
  full_stakeholder: "Full Stakeholder access: submit activity data and manage financial project entries.",
  financial: "Financial Viewer access: financial projects tab only, without add or edit permissions.",
  financial_stakeholder: "Financial Stakeholder access: financial projects tab only, with add and edit permissions.",
};

const statusOptions = [
  ["running", "Running Project"],
  ["accepted_to_launch", "Accepted, to be launched"],
  ["ongoing", "Ongoing proposal"],
  ["phase_1", "Phase 1"],
  ["exploration", "Exploration"],
  ["postponed_cancelled", "Postponed / Cancelled"],
  ["not_accepted", "Not Accepted"],
  ["accepted", "Accepted"],
  ["phase_2", "Phase 2"],
];

const defaultSectors = [
  "Agriculture & Food Systems",
  "Community Development & Social Impact",
  "Education & Capacity Building",
  "Entrepreneurship & Innovation",
  "Environment & Natural Resources",
  "Policy & Ecosystem Development",
  "Health & Wellbeing",
  "Other",
];

const css = `
  body.financial-only-role .sidebar nav button:not(.financial-projects-nav-button) { display: none !important; }
  body.financial-only-role main.workspace > *:not(.topbar):not(.app-message):not(.financial-projects-page) { display: none !important; }
  body.financial-readonly .financial-add,
  body.financial-readonly .financial-edit,
  body.financial-readonly .financial-delete,
  body.financial-readonly .financial-row-actions { display: none !important; }
  .financial-row-actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .financial-row-actions button { border: 0; border-radius: 999px; padding: 6px 9px; font-size: 0.75rem; font-weight: 900; cursor: pointer; }
  .financial-edit { background: #eef2f7; color: #26313d; }
  .financial-delete { background: #fee2e2; color: #991b1b; }
  .role-access-note { display: inline-flex; margin-top: 6px; color: #6a7188; font-size: 0.8rem; font-weight: 800; }
`;

function installStyles() {
  if (document.getElementById("role-access-enhancer-style")) return;
  const style = document.createElement("style");
  style.id = "role-access-enhancer-style";
  style.textContent = css;
  document.head.appendChild(style);
}

function isFinancialOnly(role) {
  return role === "financial" || role === "financial_stakeholder";
}

function canEditFinancial(role) {
  return ["admin", "financial_stakeholder", "stakeholder", "full_stakeholder"].includes(role);
}

function roleLabel(role) {
  return roleLabels[role] || "Full Viewer";
}

async function loadCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  currentProfile = data || { id: user.id, email: user.email, role: "viewer" };
  return currentProfile;
}

async function loadProfiles(force = false) {
  if (profilesCache && !force) return profilesCache;
  const { data, error } = await supabase.from("profiles").select("id,email,name,department,role");
  if (error) throw error;
  profilesCache = data || [];
  return profilesCache;
}

function applyBodyAccessClasses(profile = currentProfile) {
  const role = profile?.role || "viewer";
  document.body.classList.toggle("financial-only-role", isFinancialOnly(role));
  document.body.classList.toggle("financial-readonly", !canEditFinancial(role));
  document.body.classList.toggle("financial-can-edit", canEditFinancial(role));
}

function rewriteRoleNotice(profile = currentProfile) {
  const role = profile?.role || "viewer";
  const label = roleLabel(role);
  const rolePill = document.querySelector(".role-pill");
  if (rolePill && rolePill.textContent !== label) rolePill.textContent = label;

  const notice = document.querySelector(".role-notice");
  const noticeText = roleNotices[role] || roleNotices.viewer;
  if (notice && !notice.textContent.includes(noticeText)) {
    const icon = notice.querySelector("svg")?.cloneNode(true);
    notice.textContent = noticeText;
    if (icon) notice.prepend(icon);
  }
}

function ensureFinancialOnlyView(profile = currentProfile) {
  if (!isFinancialOnly(profile?.role)) return;
  const financialButton = document.querySelector(".financial-projects-nav-button");
  if (financialButton && !document.querySelector(".financial-projects-page")) financialButton.click();
}

function enhanceUserRoleSelectors() {
  const userTable = [...document.querySelectorAll("h3")].find((heading) => heading.textContent.includes("User permissions"));
  if (!userTable) return;

  loadProfiles().then((profiles) => {
    const byEmail = new Map(profiles.map((profile) => [String(profile.email || "").toLowerCase(), profile]));
    document.querySelectorAll("table tbody tr").forEach((row) => {
      const email = row.querySelector("td small")?.textContent?.trim()?.toLowerCase();
      const profile = byEmail.get(email);
      if (!profile) return;

      const status = row.querySelector(".status");
      const label = roleLabel(profile.role);
      if (status && status.textContent !== label) status.textContent = label;

      const select = row.querySelector("select");
      if (!select) return;

      const optionHtml = roleOptions.map(([value, optionLabel]) => `<option value="${value}">${optionLabel}</option>`).join("");
      if (select.dataset.roleOptionsEnhanced !== "true") {
        select.innerHTML = optionHtml;
        select.dataset.roleOptionsEnhanced = "true";
        select.addEventListener("change", () => {
          profilesCache = null;
          window.setTimeout(() => scheduleEnhancements(true), 900);
        });
      }

      const nextValue = roleOptions.some(([value]) => value === profile.role) ? profile.role : "viewer";
      if (select.value !== nextValue) select.value = nextValue;

      if (!row.querySelector(".role-access-note")) {
        const note = document.createElement("small");
        note.className = "role-access-note";
        note.textContent = "Choose financial-only, financial editor, full editor, or full viewer access.";
        select.closest("td")?.appendChild(note);
      }
    });
  }).catch(() => null);
}

function getFinancialYear() {
  const title = document.querySelector(".financial-title-block h2")?.textContent || "";
  const match = title.match(/(20\d{2})/);
  return Number(match?.[1] || 2026);
}

async function loadFinancialRowsForEdit(force = false) {
  if (editRowsCache && !force) return editRowsCache;
  const { data, error } = await supabase
    .from("financial_projects")
    .select("*")
    .eq("project_year", getFinancialYear())
    .order("created_at", { ascending: false });
  if (error) throw error;
  editRowsCache = data || [];
  return editRowsCache;
}

function enhanceFinancialTableActions() {
  if (!canEditFinancial(currentProfile?.role)) return;
  const table = document.querySelector(".financial-table");
  if (!table || table.dataset.actionsEnhanced === "true") return;

  loadFinancialRowsForEdit().then((rows) => {
    if (!table.isConnected || table.dataset.actionsEnhanced === "true") return;
    table.dataset.actionsEnhanced = "true";

    const headerRow = table.querySelector("thead tr");
    if (headerRow && ![...headerRow.children].some((th) => th.textContent === "Actions")) {
      const th = document.createElement("th");
      th.textContent = "Actions";
      headerRow.appendChild(th);
    }

    table.querySelectorAll("tbody tr").forEach((tr, index) => {
      if (tr.querySelector(".financial-row-actions")) return;
      const row = rows[index];
      const td = document.createElement("td");
      if (row?.id) {
        td.innerHTML = `<div class="financial-row-actions"><button type="button" class="financial-edit">Edit</button><button type="button" class="financial-delete">Delete</button></div>`;
        td.querySelector(".financial-edit")?.addEventListener("click", () => openEditFinancialModal(row));
        td.querySelector(".financial-delete")?.addEventListener("click", () => deleteFinancialRow(row));
      }
      tr.appendChild(td);
    });
  }).catch(() => null);
}

function openEditFinancialModal(row) {
  const backdrop = document.createElement("div");
  backdrop.className = "financial-modal-backdrop";
  backdrop.innerHTML = `
    <form class="financial-modal">
      <h3>Edit financial project data</h3>
      <p class="financial-empty">Update this financial project record.</p>
      <div class="financial-form-grid">
        <label class="financial-span-2">Project name<input name="project_name" required value="${escapeHtml(row.project_name)}" /></label>
        <label>Status<select name="status">${statusOptions.map(([value, text]) => `<option value="${value}" ${row.status === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>
        <label>Sector<select name="sector">${defaultSectors.map((sector) => `<option ${row.sector === sector ? "selected" : ""}>${sector}</option>`).join("")}</select></label>
        <label>Entity<select name="entity">${["HU", "SEKEM", "EBDA", "All entities", "Other"].map((entity) => `<option ${row.entity === entity ? "selected" : ""}>${entity}</option>`).join("")}</select></label>
        <label>Amount EUR<input name="amount_eur" type="number" min="0" step="0.01" value="${Number(row.amount_eur || 0)}" /></label>
        <label>Year<input name="project_year" type="number" min="2020" max="2100" value="${Number(row.project_year || getFinancialYear())}" /></label>
        <label class="financial-span-2">Notes<textarea name="notes">${escapeHtml(row.notes || "")}</textarea></label>
      </div>
      <div class="financial-modal-actions">
        <button type="button" class="financial-secondary financial-cancel">Cancel</button>
        <button type="submit" class="financial-primary">Save changes</button>
      </div>
    </form>`;

  document.body.appendChild(backdrop);
  backdrop.querySelector(".financial-cancel")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) backdrop.remove(); });
  backdrop.querySelector("form")?.addEventListener("submit", (event) => updateFinancialRow(event, row.id));
}

async function updateFinancialRow(event, id) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Saving...";

  const formData = new FormData(form);
  const payload = {
    project_name: String(formData.get("project_name") || "").trim(),
    status: String(formData.get("status") || "running"),
    sector: String(formData.get("sector") || "Other"),
    entity: String(formData.get("entity") || "HU"),
    amount_eur: Number(formData.get("amount_eur") || 0),
    project_year: Number(formData.get("project_year") || getFinancialYear()),
    notes: String(formData.get("notes") || "").trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("financial_projects").update(payload).eq("id", id);
  if (error) {
    button.disabled = false;
    button.textContent = "Save changes";
    form.querySelector(".financial-empty").textContent = `Could not update data: ${error.message}`;
    return;
  }

  form.closest(".financial-modal-backdrop")?.remove();
  refreshFinancialDashboard();
}

async function deleteFinancialRow(row) {
  if (!window.confirm(`Delete financial project "${row.project_name}"?`)) return;
  const { error } = await supabase.from("financial_projects").delete().eq("id", row.id);
  if (error) {
    window.alert(error.message || "Could not delete this record.");
    return;
  }
  refreshFinancialDashboard();
}

function refreshFinancialDashboard() {
  editRowsCache = null;
  document.querySelector(".financial-refresh")?.click();
  window.setTimeout(() => {
    editRowsCache = null;
    scheduleEnhancements(true);
  }, 1000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function runEnhancements(forceProfiles = false) {
  if (isEnhancing) return;
  isEnhancing = true;
  try {
    if (forceProfiles) profilesCache = null;
    applyBodyAccessClasses();
    rewriteRoleNotice();
    ensureFinancialOnlyView();
    enhanceUserRoleSelectors();
    enhanceFinancialTableActions();
  } finally {
    isEnhancing = false;
  }
}

function scheduleEnhancements(forceProfiles = false) {
  if (enhancementTimer) window.clearTimeout(enhancementTimer);
  enhancementTimer = window.setTimeout(() => {
    enhancementTimer = null;
    runEnhancements(forceProfiles);
  }, 250);
}

function startAccessEnhancer() {
  installStyles();
  loadCurrentProfile().then(() => scheduleEnhancements(true)).catch(() => null);

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest?.(".financial-add");
    if (addButton && !canEditFinancial(currentProfile?.role)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.alert("Your role can view financial projects but cannot add or edit financial data.");
      return;
    }
    if (event.target.closest?.(".sidebar nav button, .financial-refresh")) scheduleEnhancements(false);
  }, true);

  const observer = new MutationObserver(() => scheduleEnhancements(false));
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAccessEnhancer);
} else {
  startAccessEnhancer();
}
