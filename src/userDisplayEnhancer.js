import { supabase } from "./lib/supabaseClient";

function installUserEditorStyles() {
  if (document.getElementById("user-display-enhancer-style")) return;

  const style = document.createElement("style");
  style.id = "user-display-enhancer-style";
  style.textContent = `
    .profile-edit-button,
    .profile-save-button,
    .profile-cancel-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 8px;
      margin-right: 6px;
      padding: 7px 10px;
      border: 1px solid rgba(36, 43, 120, 0.16);
      border-radius: 999px;
      background: rgba(36, 43, 120, 0.08);
      color: var(--navy, #242b78);
      font-size: 0.78rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .profile-save-button {
      color: white;
      border-color: transparent;
      background: linear-gradient(90deg, var(--magenta, #e6007e), var(--orange, #ff8500));
    }

    .profile-cancel-button {
      background: white;
    }

    .profile-edit-input {
      width: 100%;
      min-width: 170px;
      margin-top: 6px;
      padding: 8px 10px;
      border: 1px solid var(--line, #dde3ef);
      border-radius: 10px;
      background: white;
      color: var(--ink, #172033);
      font: inherit;
    }

    .profile-edit-status {
      display: block;
      margin-top: 6px;
      color: var(--muted, #6a7188);
      font-size: 0.78rem;
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);
}

function replaceUnnamedUsers() {
  document.querySelectorAll("td strong").forEach((nameElement) => {
    if (nameElement.textContent.trim() !== "Unnamed user") return;

    const emailElement = nameElement.parentElement?.querySelector("small");
    const email = emailElement?.textContent?.trim();
    if (!email || !email.includes("@")) return;

    nameElement.textContent = email;
  });
}

function getUserRowParts(row) {
  const cells = row.querySelectorAll("td");
  const nameCell = cells[0];
  const departmentCell = cells[1];
  const actionCell = cells[3] || cells[cells.length - 1];
  const nameElement = nameCell?.querySelector("strong");
  const emailElement = nameCell?.querySelector("small");
  const email = emailElement?.textContent?.trim();

  if (!nameCell || !departmentCell || !actionCell || !nameElement || !email?.includes("@")) return null;

  return {
    nameCell,
    departmentCell,
    actionCell,
    nameElement,
    emailElement,
    email,
    currentName: nameElement.textContent.trim() === email ? "" : nameElement.textContent.trim(),
    currentDepartment: departmentCell.textContent.trim() === "Not provided" ? "" : departmentCell.textContent.trim(),
  };
}

function enhanceUserRows() {
  document.querySelectorAll("table tbody tr").forEach((row) => {
    if (row.dataset.profileEditorEnhanced === "true") return;

    const parts = getUserRowParts(row);
    if (!parts) return;

    row.dataset.profileEditorEnhanced = "true";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "profile-edit-button";
    editButton.textContent = "Edit name / department";
    editButton.addEventListener("click", () => openProfileEditor(row));

    parts.actionCell.appendChild(editButton);
  });
}

function openProfileEditor(row) {
  const parts = getUserRowParts(row);
  if (!parts || row.dataset.profileEditing === "true") return;

  row.dataset.profileEditing = "true";
  const originalNameHtml = parts.nameCell.innerHTML;
  const originalDepartmentHtml = parts.departmentCell.innerHTML;
  const originalActionHtml = parts.actionCell.innerHTML;

  parts.nameCell.innerHTML = `
    <strong>${escapeHtml(parts.email)}</strong>
    <small>${escapeHtml(parts.email)}</small>
    <input class="profile-edit-input profile-name-input" placeholder="Full name" value="${escapeHtml(parts.currentName)}" />
  `;

  parts.departmentCell.innerHTML = `
    <input class="profile-edit-input profile-department-input" placeholder="Department / organization" value="${escapeHtml(parts.currentDepartment)}" />
    <small class="profile-edit-status"></small>
  `;

  parts.actionCell.innerHTML = "";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "profile-save-button";
  saveButton.textContent = "Save profile";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "profile-cancel-button";
  cancelButton.textContent = "Cancel";

  parts.actionCell.appendChild(saveButton);
  parts.actionCell.appendChild(cancelButton);

  cancelButton.addEventListener("click", () => {
    parts.nameCell.innerHTML = originalNameHtml;
    parts.departmentCell.innerHTML = originalDepartmentHtml;
    parts.actionCell.innerHTML = originalActionHtml;
    delete row.dataset.profileEditing;
    delete row.dataset.profileEditorEnhanced;
    replaceUnnamedUsers();
    enhanceUserRows();
  });

  saveButton.addEventListener("click", async () => {
    const name = row.querySelector(".profile-name-input")?.value?.trim() || "";
    const department = row.querySelector(".profile-department-input")?.value?.trim() || "";
    const status = row.querySelector(".profile-edit-status");

    saveButton.disabled = true;
    cancelButton.disabled = true;
    if (status) status.textContent = "Saving...";

    const { error } = await supabase
      .from("profiles")
      .update({ name, department, updated_at: new Date().toISOString() })
      .eq("email", parts.email);

    if (error) {
      saveButton.disabled = false;
      cancelButton.disabled = false;
      if (status) status.textContent = error.message || "Could not save profile.";
      return;
    }

    parts.nameCell.innerHTML = `<strong>${escapeHtml(name || parts.email)}</strong><small>${escapeHtml(parts.email)}</small>`;
    parts.departmentCell.textContent = department || "Not provided";
    parts.actionCell.innerHTML = originalActionHtml;
    delete row.dataset.profileEditing;
    delete row.dataset.profileEditorEnhanced;
    enhanceUserRows();
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function startUserDisplayEnhancer() {
  installUserEditorStyles();
  replaceUnnamedUsers();
  enhanceUserRows();

  const observer = new MutationObserver(() => {
    replaceUnnamedUsers();
    enhanceUserRows();
  });

  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startUserDisplayEnhancer);
} else {
  startUserDisplayEnhancer();
}
