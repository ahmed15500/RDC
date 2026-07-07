import { supabase } from "./lib/supabaseClient";

const validPermissionRoles = new Set([
  "viewer",
  "stakeholder",
  "financial",
  "financial_stakeholder",
  "full_viewer",
  "full_stakeholder",
]);

function findPermissionRow(element) {
  return element.closest?.("tr");
}

function getRowEmail(row) {
  return row?.querySelector("td small")?.textContent?.trim()?.toLowerCase() || "";
}

function showPermissionMessage(message, isError = false) {
  let messageBox = document.querySelector(".permission-update-message");
  const usersPanel = [...document.querySelectorAll(".panel")].find((panel) => panel.textContent.includes("User permissions"));

  if (!messageBox) {
    messageBox = document.createElement("div");
    messageBox.className = "permission-update-message";
    usersPanel?.prepend(messageBox);
  }

  messageBox.className = `permission-update-message ${isError ? "auth-error" : "auth-info"}`;
  messageBox.textContent = message;
}

async function updatePermissionFromSelect(select) {
  const nextRole = select.value;
  if (!validPermissionRoles.has(nextRole)) return;

  const row = findPermissionRow(select);
  const email = getRowEmail(row);
  if (!email) return;

  select.disabled = true;
  const previousStatus = row.querySelector(".status")?.textContent || "";
  if (row.querySelector(".status")) row.querySelector(".status").textContent = "Saving...";

  try {
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id,email,role")
      .eq("email", email)
      .maybeSingle();

    if (findError) throw findError;
    if (!profile?.id) throw new Error("Could not find this user profile.");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: nextRole, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (updateError) throw updateError;

    const label = select.options[select.selectedIndex]?.textContent?.split("—")?.[0]?.trim() || nextRole;
    if (row.querySelector(".status")) row.querySelector(".status").textContent = label;
    showPermissionMessage(`Permission updated for ${email}.`);
  } catch (error) {
    if (row.querySelector(".status")) row.querySelector(".status").textContent = previousStatus;
    showPermissionMessage(`Permission update failed: ${error.message}`, true);
  } finally {
    select.disabled = false;
  }
}

function startPermissionUpdateFix() {
  document.addEventListener(
    "change",
    (event) => {
      const select = event.target.closest?.("table select");
      if (!select) return;
      const row = findPermissionRow(select);
      if (!getRowEmail(row)) return;
      updatePermissionFromSelect(select);
    },
    true,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startPermissionUpdateFix);
} else {
  startPermissionUpdateFix();
}
