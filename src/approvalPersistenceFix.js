import { supabase } from "./lib/supabaseClient";

let activityRowsPromise = null;
let attachTimer = null;
let saving = false;

const statusToDatabase = {
  Pending: "pending",
  Approved: "approved",
  "Needs revision": "needs_revision",
  Rejected: "rejected",
};

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function isApprovalSelect(select) {
  if (!(select instanceof HTMLSelectElement)) return false;
  const options = [...select.options].map((option) => option.textContent?.trim());
  return ["Pending", "Approved", "Needs revision", "Rejected"].every((status) => options.includes(status));
}

function installStyles() {
  if (document.getElementById("approval-persistence-fix-style")) return;
  const style = document.createElement("style");
  style.id = "approval-persistence-fix-style";
  style.textContent = `
    .approval-save-toast {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 2600;
      max-width: min(460px, calc(100vw - 36px));
      padding: 13px 16px;
      border-radius: 12px;
      background: #166534;
      color: #fff;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.24);
      font-size: 0.9rem;
      font-weight: 850;
      line-height: 1.4;
    }
    .approval-save-toast.error { background: #991b1b; }
    select[data-approval-activity-id][disabled] { opacity: 0.7; cursor: wait; }
  `;
  document.head.appendChild(style);
}

function showToast(message, type = "success") {
  document.querySelector(".approval-save-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `approval-save-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

async function loadActivityRows(force = false) {
  if (activityRowsPromise && !force) return activityRowsPromise;

  activityRowsPromise = (async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("id,activity_name,project_name,approval_status,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  })();

  return activityRowsPromise;
}

function chooseActivity(rows, usedIds, activityName, projectName = "") {
  const name = normalize(activityName);
  const project = normalize(projectName);
  const available = rows.filter((row) => !usedIds.has(row.id) && normalize(row.activity_name) === name);

  return available.find((row) => project && normalize(row.project_name) === project)
    || available[0]
    || null;
}

function attachTableSelects(rows, usedIds) {
  document.querySelectorAll("table tbody tr").forEach((row) => {
    const select = [...row.querySelectorAll("select")].find(isApprovalSelect);
    if (!select || select.dataset.approvalActivityId) return;

    const firstCell = row.querySelector("td");
    const activityName = firstCell?.querySelector("strong")?.textContent || "";
    const projectName = firstCell?.querySelector("small")?.textContent || "";
    if (!activityName) return;

    const activity = chooseActivity(rows, usedIds, activityName, projectName);
    if (!activity) return;

    usedIds.add(activity.id);
    select.dataset.approvalActivityId = activity.id;
    select.dataset.approvalActivityName = activity.activity_name || activityName;
    select.dataset.approvalSavedValue = select.value;
  });
}

function attachProjectActionSelects(rows, usedIds) {
  const projectHeading = document.querySelector(".project-detail h2, .smart-project-modal h3")?.textContent || "";

  document.querySelectorAll(".admin-action-row").forEach((row) => {
    const select = [...row.querySelectorAll("select")].find(isApprovalSelect);
    if (!select || select.dataset.approvalActivityId) return;

    const activityName = row.querySelector("strong")?.textContent || "";
    if (!activityName) return;

    const activity = chooseActivity(rows, usedIds, activityName, projectHeading);
    if (!activity) return;

    usedIds.add(activity.id);
    select.dataset.approvalActivityId = activity.id;
    select.dataset.approvalActivityName = activity.activity_name || activityName;
    select.dataset.approvalSavedValue = select.value;
  });
}

async function attachActivityIds(force = false) {
  const rows = await loadActivityRows(force);
  const usedIds = new Set();
  attachTableSelects(rows, usedIds);
  attachProjectActionSelects(rows, usedIds);
}

function scheduleAttach(force = false) {
  if (attachTimer) window.clearTimeout(attachTimer);
  attachTimer = window.setTimeout(() => {
    attachTimer = null;
    attachActivityIds(force).catch((error) => {
      console.error("Could not prepare approval persistence:", error);
    });
  }, 180);
}

function updateVisibleStatus(select, label) {
  const tableRow = select.closest("tr");
  const statusElement = tableRow?.querySelector("td .status") || select.closest(".admin-action-row")?.querySelector(".status");
  if (!statusElement) return;
  statusElement.textContent = label;
  statusElement.className = `status ${label.toLowerCase().replaceAll(" ", "-")}`;
}

async function persistApproval(select) {
  if (saving) return;

  if (!select.dataset.approvalActivityId) {
    await attachActivityIds(true).catch(() => null);
  }

  const activityId = select.dataset.approvalActivityId;
  const activityName = select.dataset.approvalActivityName || "Activity";
  const selectedLabel = select.value;
  const databaseStatus = statusToDatabase[selectedLabel];
  const previousValue = select.dataset.approvalSavedValue || "Pending";

  if (!activityId || !databaseStatus) {
    showToast("Could not identify this activity. Refresh the page and try again.", "error");
    return;
  }

  saving = true;
  select.disabled = true;

  try {
    const { data, error } = await supabase
      .from("activities")
      .update({ approval_status: databaseStatus })
      .eq("id", activityId)
      .select("id,approval_status")
      .single();

    if (error) throw error;
    if (!data?.id) throw new Error("Supabase did not return the updated activity.");

    select.dataset.approvalSavedValue = selectedLabel;
    updateVisibleStatus(select, selectedLabel);
    activityRowsPromise = null;
    showToast(`${activityName} status saved as ${selectedLabel}.`);
  } catch (error) {
    select.value = previousValue;
    updateVisibleStatus(select, previousValue);
    showToast(`Approval update failed: ${error.message}`, "error");
  } finally {
    select.disabled = false;
    saving = false;
  }
}

function handleApprovalChange(event) {
  const select = event.target;
  if (!isApprovalSelect(select)) return;
  if (!select.closest("table, .admin-action-row")) return;
  persistApproval(select);
}

function startApprovalPersistenceFix() {
  installStyles();
  document.addEventListener("change", handleApprovalChange, false);

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".sidebar nav button, .ghost")) {
      activityRowsPromise = null;
      window.setTimeout(() => scheduleAttach(true), 450);
    }
  }, true);

  const observer = new MutationObserver(() => scheduleAttach(false));
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });

  scheduleAttach(true);
  window.setTimeout(() => scheduleAttach(true), 800);
  window.setTimeout(() => scheduleAttach(true), 1800);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApprovalPersistenceFix);
} else {
  startApprovalPersistenceFix();
}
