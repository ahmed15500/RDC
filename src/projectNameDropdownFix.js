import { supabase } from "./lib/supabaseClient";

let projectNamesCache = null;
let enhancementTimer = null;

function installStyles() {
  if (document.getElementById("project-name-dropdown-fix-style")) return;
  const style = document.createElement("style");
  style.id = "project-name-dropdown-fix-style";
  style.textContent = `
    .project-name-original-hidden {
      position: absolute !important;
      left: -99999px !important;
      width: 1px !important;
      height: 1px !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    .project-name-choice-box {
      display: grid;
      gap: 8px;
      margin-top: 6px;
    }

    .project-name-choice-box select,
    .project-name-choice-box input {
      width: 100%;
      padding: 10px 11px;
      border: 1px solid #d8dee8;
      border-radius: 10px;
      background: white;
      color: #26313d;
      font: inherit;
    }

    .project-name-choice-box small {
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 800;
      line-height: 1.35;
    }

    .project-name-choice-box .project-new-name-input[hidden] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeName(value) {
  return String(value || "").trim();
}

async function safeProjectNameQuery(table) {
  const { data, error } = await supabase
    .from(table)
    .select("project_name")
    .not("project_name", "is", null)
    .order("project_name", { ascending: true });
  if (error) return [];
  return data || [];
}

async function loadProjectNames(force = false) {
  if (projectNamesCache && !force) return projectNamesCache;
  const names = new Set();

  const activityRows = await safeProjectNameQuery("activities");
  activityRows.forEach((row) => {
    const name = normalizeName(row.project_name);
    if (name) names.add(name);
  });

  const financialRows = await safeProjectNameQuery("financial_projects");
  financialRows.forEach((row) => {
    const name = normalizeName(row.project_name);
    if (name) names.add(name);
  });

  projectNamesCache = [...names].sort((a, b) => a.localeCompare(b));
  return projectNamesCache;
}

function setNativeInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function findProjectNameInput() {
  return [...document.querySelectorAll("form.submission label")].find((label) => {
    const firstText = label.childNodes[0]?.textContent?.trim().toLowerCase() || "";
    const allText = label.textContent.trim().toLowerCase();
    return firstText.startsWith("project name") || allText.startsWith("project name");
  })?.querySelector("input");
}

function renderOptions(names, selectedValue) {
  return `
    <option value="">Select previous project or add new</option>
    ${names.map((name) => `<option value="${escapeHtml(name)}" ${name === selectedValue ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
    <option value="__new__">+ Add new project</option>
  `;
}

async function enhanceDropdown(force = false) {
  const originalInput = findProjectNameInput();
  if (!originalInput) return;

  const label = originalInput.closest("label");
  if (!label) return;

  const names = await loadProjectNames(force);
  const existingUi = label.querySelector(".project-name-choice-box");
  if (existingUi && !force) return;
  existingUi?.remove();

  const currentValue = normalizeName(originalInput.value);
  const selectedIsExisting = names.includes(currentValue);
  const shouldShowNewInput = currentValue && !selectedIsExisting;

  originalInput.classList.add("project-name-original-hidden");
  originalInput.removeAttribute("list");
  originalInput.setAttribute("aria-hidden", "true");
  originalInput.tabIndex = -1;

  const wrapper = document.createElement("div");
  wrapper.className = "project-name-choice-box";
  wrapper.innerHTML = `
    <select class="project-name-select">
      ${renderOptions(names, selectedIsExisting ? currentValue : shouldShowNewInput ? "__new__" : "")}
    </select>
    <input class="project-new-name-input" type="text" placeholder="Type new project name" value="${escapeHtml(shouldShowNewInput ? currentValue : "")}" ${shouldShowNewInput ? "" : "hidden"} />
    <small>${names.length ? "Select an existing project from the list, or choose Add new project." : "No previous projects found yet. Choose Add new project and type the project name."}</small>
  `;

  originalInput.after(wrapper);

  const select = wrapper.querySelector(".project-name-select");
  const newInput = wrapper.querySelector(".project-new-name-input");

  if (shouldShowNewInput) select.value = "__new__";

  select.addEventListener("change", () => {
    if (select.value === "__new__") {
      newInput.hidden = false;
      setNativeInputValue(originalInput, newInput.value.trim());
      window.setTimeout(() => newInput.focus(), 50);
      return;
    }
    newInput.hidden = true;
    newInput.value = "";
    setNativeInputValue(originalInput, select.value);
  });

  newInput.addEventListener("input", () => {
    if (select.value !== "__new__") select.value = "__new__";
    setNativeInputValue(originalInput, newInput.value.trim());
  });
}

function scheduleEnhancement(force = false) {
  if (enhancementTimer) window.clearTimeout(enhancementTimer);
  enhancementTimer = window.setTimeout(() => {
    enhancementTimer = null;
    enhanceDropdown(force).catch(() => null);
  }, 250);
}

function startProjectNameDropdownFix() {
  installStyles();
  scheduleEnhancement(true);

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".sidebar nav button, .submit-button, .ghost")) {
      projectNamesCache = null;
      window.setTimeout(() => scheduleEnhancement(true), 500);
    }
  }, true);

  const observer = new MutationObserver(() => scheduleEnhancement(false));
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startProjectNameDropdownFix);
} else {
  startProjectNameDropdownFix();
}
