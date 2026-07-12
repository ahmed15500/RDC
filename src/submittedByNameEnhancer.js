import { supabase } from "./lib/supabaseClient";

let directoryPromise = null;
let enhanceTimer = null;

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function installStyles() {
  if (document.getElementById("submitted-by-name-style")) return;
  const style = document.createElement("style");
  style.id = "submitted-by-name-style";
  style.textContent = `
    .submitted-by-person {
      display: grid;
      gap: 2px;
      min-width: 145px;
    }

    .submitted-by-person strong {
      color: #26313d;
      font-size: 0.88rem;
      font-weight: 950;
      line-height: 1.25;
    }

    .submitted-by-person small {
      display: block;
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 750;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }
  `;
  document.head.appendChild(style);
}

function readableNameFromEmail(email) {
  const local = String(email || "").split("@")[0] || "";
  if (!local) return "Unknown user";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function loadDirectory(force = false) {
  if (directoryPromise && !force) return directoryPromise;

  directoryPromise = (async () => {
    const [profilesResult, activitiesResult] = await Promise.all([
      supabase.from("profiles").select("id,email,name,department"),
      supabase
        .from("activities")
        .select("id,activity_name,project_name,submitted_by,submitted_by_email,created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (activitiesResult.error) throw activitiesResult.error;

    const profiles = profilesResult.data || [];
    const activities = activitiesResult.data || [];
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

    return { profiles, profilesById, activities };
  })();

  return directoryPromise;
}

function headerIndex(table, label) {
  const headers = [...table.querySelectorAll("thead th")];
  return headers.findIndex((header) => normalize(header.textContent) === normalize(label));
}

function findActivity(directory, tableRow, usedIds) {
  const cells = [...tableRow.querySelectorAll("td")];
  const firstCell = cells[0];
  const activityName = firstCell?.querySelector("strong")?.textContent || firstCell?.textContent || "";
  const projectName = firstCell?.querySelector("small")?.textContent || "";
  const activity = normalize(activityName);
  const project = normalize(projectName);

  const available = directory.activities.filter((row) => !usedIds.has(row.id) && normalize(row.activity_name) === activity);
  const matched = available.find((row) => project && normalize(row.project_name) === project)
    || available[0]
    || null;

  if (matched) usedIds.add(matched.id);
  return matched;
}

function profileFromCurrentCell(directory, cell) {
  const value = String(cell?.textContent || "").trim();
  if (!value) return null;
  return directory.profilesById.get(value) || directory.profiles.find((profile) => normalize(profile.email) === normalize(value)) || null;
}

function renderPerson(cell, activity, profile) {
  const email = profile?.email || activity?.submitted_by_email || "";
  const name = String(profile?.name || "").trim() || readableNameFromEmail(email);
  const department = String(profile?.department || "").trim();
  const secondary = [email, department].filter(Boolean).join(" · ") || "User details unavailable";

  cell.innerHTML = `
    <span class="submitted-by-person">
      <strong>${escapeHtml(name)}</strong>
      <small>${escapeHtml(secondary)}</small>
    </span>
  `;
  cell.dataset.submittedByNameEnhanced = "true";
}

function enhanceTables(directory) {
  document.querySelectorAll("table").forEach((table) => {
    const submittedByIndex = headerIndex(table, "Submitted by");
    if (submittedByIndex < 0) return;

    const usedIds = new Set();
    table.querySelectorAll("tbody tr").forEach((row) => {
      const cells = [...row.querySelectorAll("td")];
      const cell = cells[submittedByIndex];
      if (!cell) return;

      const activity = findActivity(directory, row, usedIds);
      const profile = activity?.submitted_by
        ? directory.profilesById.get(activity.submitted_by)
        : profileFromCurrentCell(directory, cell);

      if (!activity && !profile) return;
      renderPerson(cell, activity, profile);
    });
  });
}

async function enhanceSubmittedByNames(force = false) {
  const directory = await loadDirectory(force);
  enhanceTables(directory);
}

function scheduleEnhancement(force = false) {
  if (enhanceTimer) window.clearTimeout(enhanceTimer);
  enhanceTimer = window.setTimeout(() => {
    enhanceTimer = null;
    enhanceSubmittedByNames(force).catch((error) => {
      console.error("Could not display submitted-by names:", error);
    });
  }, 220);
}

function startSubmittedByNameEnhancer() {
  installStyles();
  scheduleEnhancement(true);

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".sidebar nav button, .ghost, .submit-button, .department-generate-button")) {
      directoryPromise = null;
      window.setTimeout(() => scheduleEnhancement(true), 500);
    }
  }, true);

  const observer = new MutationObserver(() => scheduleEnhancement(false));
  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });

  window.setTimeout(() => scheduleEnhancement(true), 900);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startSubmittedByNameEnhancer);
} else {
  startSubmittedByNameEnhancer();
}
