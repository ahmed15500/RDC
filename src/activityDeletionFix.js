import { supabase } from "./lib/supabaseClient";

let activityRowsPromise = null;
let attachTimer = null;
let deleting = false;

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function showToast(message, type = "success") {
  document.querySelector(".activity-delete-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `activity-delete-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function installStyles() {
  if (document.getElementById("activity-deletion-fix-style")) return;
  const style = document.createElement("style");
  style.id = "activity-deletion-fix-style";
  style.textContent = `
    .activity-delete-toast {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 2500;
      max-width: min(430px, calc(100vw - 36px));
      padding: 13px 16px;
      border-radius: 12px;
      background: #166534;
      color: #fff;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.24);
      font-size: 0.9rem;
      font-weight: 850;
      line-height: 1.4;
    }
    .activity-delete-toast.error { background: #991b1b; }
    button[data-activity-delete-id][disabled] { opacity: 0.65; cursor: wait; }
  `;
  document.head.appendChild(style);
}

async function loadActivityRows(force = false) {
  if (activityRowsPromise && !force) return activityRowsPromise;
  activityRowsPromise = (async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("id,activity_name,project_name,description,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  })();
  return activityRowsPromise;
}

function chooseRow(rows, usedIds, activityName, description = "", projectName = "") {
  const name = normalize(activityName);
  const desc = normalize(description);
  const project = normalize(projectName);
  const available = rows.filter((row) => !usedIds.has(row.id) && normalize(row.activity_name) === name);

  return available.find((row) => desc && normalize(row.description) === desc && (!project || normalize(row.project_name) === project))
    || available.find((row) => project && normalize(row.project_name) === project)
    || available.find((row) => desc && normalize(row.description) === desc)
    || available[0]
    || null;
}

function attachToDataCards(rows, usedIds) {
  document.querySelectorAll(".data-card").forEach((card) => {
    const button = card.querySelector("button.danger");
    if (!button || button.dataset.activityDeleteId) return;

    const activityName = card.querySelector("h3")?.textContent || "";
    const paragraphs = [...card.querySelectorAll("p")];
    const description = paragraphs[0]?.textContent || "";
    const row = chooseRow(rows, usedIds, activityName, description);
    if (!row) return;

    usedIds.add(row.id);
    button.dataset.activityDeleteId = row.id;
    button.dataset.activityDeleteName = row.activity_name || activityName;
  });
}

function attachToProjectRows(rows, usedIds) {
  const projectHeading = document.querySelector(".project-detail h2, .smart-project-modal h3")?.textContent || "";
  document.querySelectorAll(".admin-action-row").forEach((actionRow) => {
    const button = actionRow.querySelector("button.danger");
    if (!button || button.dataset.activityDeleteId) return;

    const activityName = actionRow.querySelector("strong")?.textContent || "";
    const row = chooseRow(rows, usedIds, activityName, "", projectHeading);
    if (!row) return;

    usedIds.add(row.id);
    button.dataset.activityDeleteId = row.id;
    button.dataset.activityDeleteName = row.activity_name || activityName;
  });
}

async function attachActivityIds(force = false) {
  const rows = await loadActivityRows(force);
  const usedIds = new Set();
  attachToDataCards(rows, usedIds);
  attachToProjectRows(rows, usedIds);
}

function scheduleAttach(force = false) {
  if (attachTimer) window.clearTimeout(attachTimer);
  attachTimer = window.setTimeout(() => {
    attachTimer = null;
    attachActivityIds(force).catch((error) => {
      console.error("Could not prepare activity deletion:", error);
    });
  }, 180);
}

function findRefreshButton() {
  return [...document.querySelectorAll(".top-actions button, button.ghost")]
    .find((button) => normalize(button.textContent) === "refresh");
}

async function deleteActivity(activityId) {
  const { data, error } = await supabase
    .from("activities")
    .delete()
    .eq("id", activityId)
    .select("id");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("The activity was not deleted. Your account may not have permission, or the record no longer exists.");
  }
  return data[0];
}

async function handleDeleteClick(event) {
  const button = event.target.closest?.(".data-card button.danger, .admin-action-row button.danger");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  if (deleting) return;

  if (!button.dataset.activityDeleteId) {
    await attachActivityIds(true).catch(() => null);
  }

  const activityId = button.dataset.activityDeleteId;
  const activityName = button.dataset.activityDeleteName || "this activity";
  if (!activityId) {
    showToast("Could not identify this activity. Refresh the page and try again.", "error");
    return;
  }

  const confirmed = window.confirm(`Delete “${activityName}” permanently? This cannot be undone.`);
  if (!confirmed) return;

  deleting = true;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Deleting...";

  try {
    await deleteActivity(activityId);
    activityRowsPromise = null;
    button.closest(".data-card, .admin-action-row")?.remove();
    showToast(`Activity “${activityName}” was deleted from Supabase.`);
    const refreshButton = findRefreshButton();
    if (refreshButton) window.setTimeout(() => refreshButton.click(), 250);
    else window.setTimeout(() => window.location.reload(), 450);
  } catch (error) {
    button.disabled = false;
    button.textContent = originalText;
    showToast(`Delete failed: ${error.message}`, "error");
  } finally {
    deleting = false;
  }
}

function startActivityDeletionFix() {
  installStyles();
  document.addEventListener("click", handleDeleteClick, true);

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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startActivityDeletionFix);
} else {
  startActivityDeletionFix();
}
