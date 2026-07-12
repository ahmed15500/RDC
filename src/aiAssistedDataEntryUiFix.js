import { supabase } from "./lib/supabaseClient";

let projectNamesPromise = null;
let enhanceTimer = null;
let promptRefreshTimer = null;

function installStyles() {
  if (document.getElementById("ai-assisted-entry-ui-fix-style")) return;

  const style = document.createElement("style");
  style.id = "ai-assisted-entry-ui-fix-style";
  style.textContent = `
    .ai-entry-launcher-wrap {
      margin-bottom: 14px;
    }

    .ai-entry-launcher {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 10px 16px;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(90deg, #e6007e, #ff8500);
      color: #fff;
      font: inherit;
      font-weight: 950;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(230, 0, 126, 0.2);
    }

    .ai-entry-launcher:hover {
      transform: translateY(-1px);
    }

    .ai-entry-panel.ai-entry-collapsed {
      display: none !important;
    }

    .ai-project-choice-help,
    .ai-prompt-auto-help {
      display: block;
      margin-top: 5px;
      color: #64748b;
      font-size: 0.76rem;
      font-weight: 720;
      line-height: 1.4;
    }
  `;
  document.head.appendChild(style);
}

function normalizeProjectName(value) {
  return String(value || "").trim();
}

async function loadProjectNames(force = false) {
  if (projectNamesPromise && !force) return projectNamesPromise;

  projectNamesPromise = (async () => {
    const names = new Set();

    const { data: activityRows, error: activityError } = await supabase
      .from("activities")
      .select("project_name")
      .order("project_name", { ascending: true });

    if (!activityError) {
      (activityRows || []).forEach((row) => {
        const name = normalizeProjectName(row.project_name);
        if (name) names.add(name);
      });
    }

    const { data: financialRows, error: financialError } = await supabase
      .from("financial_projects")
      .select("project_name")
      .order("project_name", { ascending: true });

    if (!financialError) {
      (financialRows || []).forEach((row) => {
        const name = normalizeProjectName(row.project_name);
        if (name) names.add(name);
      });
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  })();

  return projectNamesPromise;
}

function refreshGeneratedPrompt(panel, force = false) {
  const promptArea = panel.querySelector(".ai-generated-prompt");
  const generateButton = panel.querySelector(".ai-generate-prompt");
  if (!promptArea || !generateButton) return;

  if (force || !promptArea.value.trim()) {
    generateButton.click();
  }
}

function schedulePromptRefresh(panel) {
  if (promptRefreshTimer) window.clearTimeout(promptRefreshTimer);
  promptRefreshTimer = window.setTimeout(() => {
    promptRefreshTimer = null;
    refreshGeneratedPrompt(panel, true);
  }, 180);
}

function enhancePromptArea(panel) {
  const promptArea = panel.querySelector(".ai-generated-prompt");
  if (!promptArea || promptArea.dataset.autoPromptEnhanced === "true") return;

  promptArea.dataset.autoPromptEnhanced = "true";
  const label = promptArea.closest("label");
  if (label) {
    const firstTextNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (firstTextNode) firstTextNode.textContent = "Generated English prompt — created automatically";

    if (!label.querySelector(".ai-prompt-auto-help")) {
      const help = document.createElement("small");
      help.className = "ai-prompt-auto-help";
      help.textContent = "The prompt updates automatically when you choose the source type or change the project name.";
      label.appendChild(help);
    }
  }

  const projectInput = panel.querySelector(".ai-project-name");
  const sourceType = panel.querySelector(".ai-source-type");

  projectInput?.addEventListener("input", () => schedulePromptRefresh(panel));
  projectInput?.addEventListener("change", () => schedulePromptRefresh(panel));
  sourceType?.addEventListener("change", () => schedulePromptRefresh(panel));

  window.setTimeout(() => refreshGeneratedPrompt(panel, false), 50);
}

async function enhanceProjectInput(panel) {
  const input = panel.querySelector(".ai-project-name");
  if (!input || input.dataset.projectChoiceEnhanced === "true") return;

  input.dataset.projectChoiceEnhanced = "true";
  input.setAttribute("list", "ai-rdc-project-name-options");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("placeholder", "Choose an existing project or type a new project name");

  const label = input.closest("label");
  if (label) {
    const firstTextNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (firstTextNode) firstTextNode.textContent = "Project to extract — choose or type";

    if (!label.querySelector(".ai-project-choice-help")) {
      const help = document.createElement("small");
      help.className = "ai-project-choice-help";
      help.textContent = "Select a project already used in RDC, or type the exact name of a new project.";
      label.appendChild(help);
    }
  }

  let datalist = document.getElementById("ai-rdc-project-name-options");
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "ai-rdc-project-name-options";
    document.body.appendChild(datalist);
  }

  const names = await loadProjectNames();
  datalist.innerHTML = names
    .map((name) => {
      const option = document.createElement("option");
      option.value = name;
      return option.outerHTML;
    })
    .join("");
}

function enhancePanel(panel) {
  if (!panel || panel.dataset.collapsibleEnhanced === "true") return;
  panel.dataset.collapsibleEnhanced = "true";
  panel.classList.add("ai-entry-collapsed");

  const wrapper = document.createElement("div");
  wrapper.className = "ai-entry-launcher-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ai-entry-launcher";
  button.setAttribute("aria-expanded", "false");
  button.textContent = "✨ AI-Assisted Data Entry";

  wrapper.appendChild(button);
  panel.before(wrapper);

  button.addEventListener("click", () => {
    const opening = panel.classList.contains("ai-entry-collapsed");
    panel.classList.toggle("ai-entry-collapsed", !opening);
    button.setAttribute("aria-expanded", String(opening));
    button.textContent = opening ? "Close AI-Assisted Data Entry" : "✨ AI-Assisted Data Entry";

    if (opening) {
      enhanceProjectInput(panel).catch(() => null);
      enhancePromptArea(panel);
      window.setTimeout(() => {
        refreshGeneratedPrompt(panel, false);
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  });

  enhanceProjectInput(panel).catch(() => null);
  enhancePromptArea(panel);
}

function applyEnhancements() {
  document.querySelectorAll(".ai-entry-panel").forEach(enhancePanel);
}

function scheduleEnhancements() {
  if (enhanceTimer) window.clearTimeout(enhanceTimer);
  enhanceTimer = window.setTimeout(() => {
    enhanceTimer = null;
    applyEnhancements();
  }, 120);
}

function start() {
  installStyles();
  scheduleEnhancements();

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".sidebar nav button, .ghost")) {
      projectNamesPromise = null;
      window.setTimeout(scheduleEnhancements, 350);
    }
  }, true);

  const observer = new MutationObserver(scheduleEnhancements);
  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
