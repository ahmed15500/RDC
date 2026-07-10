import { supabase } from "./lib/supabaseClient";

const ADMIN_EMAIL = "ahmed.bahrawy@hu.edu.eg";
let profileMapPromise = null;
let enhancementTimer = null;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function installStyles() {
  if (document.getElementById("user-deletion-enhancer-style")) return;
  const style = document.createElement("style");
  style.id = "user-deletion-enhancer-style";
  style.textContent = `
    .user-delete-action {
      min-width: 78px;
      padding: 7px 10px !important;
      border: 0 !important;
      border-radius: 8px !important;
      background: #fff1f2 !important;
      color: #b42318 !important;
      font-weight: 900 !important;
      cursor: pointer;
    }

    .user-delete-action:hover:not(:disabled) {
      background: #fee2e2 !important;
    }

    .user-delete-action:disabled {
      background: #f1f5f9 !important;
      color: #94a3b8 !important;
      cursor: not-allowed;
    }

    .user-delete-status {
      margin: 12px 0 0;
    }

    .user-delete-cell {
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

async function getProfiles(force = false) {
  if (profileMapPromise && !force) return profileMapPromise;
  profileMapPromise = (async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,role");
    if (error) throw error;
    return new Map((data || []).map((profile) => [normalize(profile.email), profile]));
  })();
  return profileMapPromise;
}

function getUserPermissionsPanel() {
  return [...document.querySelectorAll("article.panel")].find((panel) =>
    normalize(panel.querySelector("h3")?.textContent) === "user permissions",
  ) || null;
}

function setStatus(panel, message, type = "info") {
  let status = panel.querySelector(".user-delete-status");
  if (!status) {
    status = document.createElement("div");
    status.className = "user-delete-status";
    panel.appendChild(status);
  }
  status.className = `user-delete-status ${type === "error" ? "auth-error" : "auth-info"}`;
  status.textContent = message;
}

async function deleteUser(profile, row, button, panel) {
  const displayEmail = profile.email || "this user";
  const confirmed = window.confirm(
    `Delete ${displayEmail}?\n\nThe user will lose login access. Their submitted activities and financial records will be kept for reporting. This action cannot be undone.`,
  );
  if (!confirmed) return;

  button.disabled = true;
  button.textContent = "Deleting...";
  setStatus(panel, `Deleting ${displayEmail}...`);

  try {
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { userId: profile.id },
    });

    if (error) {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      const unreachable = normalize(error.message).includes("failed to send");
      throw new Error(unreachable
        ? `Delete function is not reachable. Deploy the Supabase Edge Function "delete-user" at ${functionUrl}.`
        : error.message);
    }
    if (data?.error) throw new Error(data.error);

    row.remove();
    profileMapPromise = null;
    setStatus(panel, `${displayEmail} was deleted. Their historical records were preserved.`);

    const refreshButton = [...document.querySelectorAll("button")].find((candidate) =>
      normalize(candidate.textContent) === "refresh users",
    );
    window.setTimeout(() => refreshButton?.click(), 350);
  } catch (error) {
    button.disabled = false;
    button.textContent = "Delete";
    setStatus(panel, error.message || "Could not delete the user.", "error");
  }
}

async function enhanceUserTable() {
  const panel = getUserPermissionsPanel();
  const table = panel?.querySelector("table");
  if (!panel || !table) return;

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const profiles = await getProfiles();

  const headerRow = table.querySelector("thead tr");
  if (headerRow && !headerRow.querySelector(".user-delete-header")) {
    const header = document.createElement("th");
    header.className = "user-delete-header";
    header.textContent = "Actions";
    headerRow.appendChild(header);
  }

  table.querySelectorAll("tbody tr").forEach((row) => {
    if (row.querySelector(".user-delete-cell")) return;

    const cells = row.querySelectorAll("td");
    const email = normalize(cells[0]?.querySelector("small")?.textContent);
    const profile = profiles.get(email);
    const actionCell = document.createElement("td");
    actionCell.className = "user-delete-cell";

    if (!profile) {
      actionCell.textContent = "—";
      row.appendChild(actionCell);
      return;
    }

    const protectedAccount = normalize(profile.email) === ADMIN_EMAIL || profile.role === "admin";
    const currentAccount = profile.id === currentUser?.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "user-delete-action";
    button.textContent = protectedAccount ? "Protected" : currentAccount ? "Current user" : "Delete";
    button.disabled = protectedAccount || currentAccount;
    button.title = protectedAccount
      ? "The RDC admin account cannot be deleted."
      : currentAccount
        ? "You cannot delete the account you are currently using."
        : `Delete ${profile.email}`;

    if (!button.disabled) {
      button.addEventListener("click", () => deleteUser(profile, row, button, panel));
    }

    actionCell.appendChild(button);
    row.appendChild(actionCell);
  });
}

function scheduleEnhancement(force = false) {
  if (force) profileMapPromise = null;
  if (enhancementTimer) window.clearTimeout(enhancementTimer);
  enhancementTimer = window.setTimeout(() => {
    enhancementTimer = null;
    enhanceUserTable().catch((error) => {
      const panel = getUserPermissionsPanel();
      if (panel) setStatus(panel, `Could not prepare user deletion: ${error.message}`, "error");
    });
  }, 250);
}

function startUserDeletionEnhancer() {
  installStyles();
  scheduleEnhancement(true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("button");
    const label = normalize(button?.textContent);
    if (label === "users" || label === "refresh users") {
      window.setTimeout(() => scheduleEnhancement(true), 450);
    }
  }, true);

  const observer = new MutationObserver(() => scheduleEnhancement(false));
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startUserDeletionEnhancer);
} else {
  startUserDeletionEnhancer();
}
