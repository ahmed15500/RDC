const PROJECT_NAMING_MARKER = "PROJECT-NAME OPTIONS — REQUIRED";
let enhancementTimer = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function installStyles() {
  if (document.getElementById("ai-project-name-selection-style")) return;

  const style = document.createElement("style");
  style.id = "ai-project-name-selection-style";
  style.textContent = `
    .ai-project-name-selection {
      margin-top: 14px;
      padding: 16px;
      border: 1px solid rgba(36, 43, 120, 0.14);
      border-radius: 18px;
      background: linear-gradient(135deg, #fff, #f8fafc);
    }

    .ai-project-name-selection h4 {
      margin: 0 0 5px;
      color: #242b78;
      font-size: 1rem;
    }

    .ai-project-name-selection > p {
      margin: 0 0 12px;
      color: #64748b;
      font-size: 0.84rem;
      line-height: 1.5;
    }

    .ai-project-name-candidates {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
      margin-bottom: 12px;
    }

    .ai-project-name-candidate {
      display: grid;
      gap: 4px;
      width: 100%;
      padding: 11px 12px;
      border: 1px solid #dfe4ec;
      border-radius: 13px;
      background: #fff;
      color: #172033;
      text-align: left;
      cursor: pointer;
      transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
    }

    .ai-project-name-candidate:hover,
    .ai-project-name-candidate.selected {
      border-color: rgba(230, 0, 126, 0.42);
      box-shadow: 0 8px 22px rgba(36, 43, 120, 0.09);
      transform: translateY(-1px);
    }

    .ai-project-name-candidate strong {
      color: #242b78;
      font-size: 0.88rem;
    }

    .ai-project-name-candidate span {
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1.4;
    }

    .ai-final-project-name-label {
      display: grid;
      gap: 6px;
      color: #334155;
      font-size: 0.84rem;
      font-weight: 850;
    }

    .ai-final-project-name-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
    }

    .ai-final-project-name {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d8dee8;
      border-radius: 11px;
      background: #fff;
      color: #172033;
      font: inherit;
    }

    .ai-apply-project-name {
      min-height: 42px;
      padding: 9px 13px;
      border: 0;
      border-radius: 999px;
      background: #242b78;
      color: #fff;
      font-weight: 900;
      cursor: pointer;
      white-space: nowrap;
    }

    .ai-project-name-selection-status {
      display: block;
      margin-top: 8px;
      color: #64748b;
      font-size: 0.77rem;
      font-weight: 780;
      line-height: 1.45;
    }

    @media (max-width: 760px) {
      .ai-project-name-candidates { grid-template-columns: 1fr; }
      .ai-final-project-name-row { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}

function projectNamingInstructions() {
  return `

${PROJECT_NAMING_MARKER}
This section overrides any earlier instruction that forces the requested search term to become the final project name.

The requested project name is a search clue used to locate the relevant content in the files. After reading the source, propose 3 to 6 credible project-name options grounded in the project's purpose, official wording, acronym, activities, and intended impact.

Naming rules:
1. Include the official project name from the source when one is clearly stated.
2. Include a concise formal version when appropriate.
3. Include an impact-oriented version only when it is directly supported by the source.
4. Include an acronym with its expanded wording when the files support both.
5. Do not invent unrelated branding, partners, locations, or claims.
6. Keep every option distinct, professional, and suitable for RDC reporting.
7. Select one option as recommendedProjectName.
8. Set every activities[].projectName to recommendedProjectName so the imported activities never have an empty project name. The RDC website will allow the user to replace it before filling the form.

Add these REQUIRED top-level fields to the returned JSON object immediately after extractionRequest:
"recommendedProjectName": "The strongest source-grounded option",
"projectNameOptions": [
  {
    "name": "First suggested project name",
    "reason": "Brief explanation of why this name matches the source",
    "confidence": "high"
  },
  {
    "name": "Second suggested project name",
    "reason": "Brief explanation of why this name matches the source",
    "confidence": "medium"
  }
]

confidence must be exactly one of: "high", "medium", or "low".
Return at least 3 projectNameOptions whenever the source provides enough information. Return JSON only.`;
}

function ensurePromptHasNamingInstructions(panel) {
  const promptArea = panel?.querySelector(".ai-generated-prompt");
  if (!promptArea?.value?.trim()) return;
  if (promptArea.value.includes(PROJECT_NAMING_MARKER)) return;

  promptArea.value = `${promptArea.value.trim()}${projectNamingInstructions()}`;
  promptArea.dispatchEvent(new Event("input", { bubbles: true }));
}

function normalizeCandidate(candidate) {
  if (typeof candidate === "string") {
    const name = candidate.trim();
    return name ? { name, reason: "Suggested from the source", confidence: "" } : null;
  }

  if (!candidate || typeof candidate !== "object") return null;
  const name = String(candidate.name || candidate.projectName || candidate.title || "").trim();
  if (!name) return null;

  return {
    name,
    reason: String(candidate.reason || candidate.rationale || candidate.basis || "Suggested from the source").trim(),
    confidence: String(candidate.confidence || "").trim().toLowerCase(),
  };
}

function addCandidate(list, seen, candidate) {
  const normalized = normalizeCandidate(candidate);
  if (!normalized) return;
  const key = normalized.name.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  list.push(normalized);
}

function collectProjectCandidates(payload, panel) {
  const candidates = [];
  const seen = new Set();
  const extraction = payload.extractionRequest || {};

  [
    ...(Array.isArray(payload.projectNameOptions) ? payload.projectNameOptions : []),
    ...(Array.isArray(payload.projectNameCandidates) ? payload.projectNameCandidates : []),
    ...(Array.isArray(extraction.projectNameOptions) ? extraction.projectNameOptions : []),
    ...(Array.isArray(extraction.projectCandidates) ? extraction.projectCandidates : []),
  ].forEach((candidate) => addCandidate(candidates, seen, candidate));

  [
    payload.recommendedProjectName,
    payload.selectedProjectName,
    extraction.matchedProjectName,
    extraction.requestedProject,
    panel?.querySelector(".ai-project-name")?.value,
    ...(payload.activities || []).map((activity) => activity?.projectName),
  ].forEach((candidate) => addCandidate(candidates, seen, candidate));

  return candidates;
}

function parseImportPayload(panel) {
  const codeArea = panel.querySelector(".ai-import-code");
  const raw = codeArea?.value?.trim();
  if (!raw) throw new Error("Paste the RDC Import Code first.");
  const payload = JSON.parse(raw);
  if (!Array.isArray(payload.activities) || !payload.activities.length) {
    throw new Error("No activity records were found in the import code.");
  }
  return payload;
}

function setSelectionStatus(section, message) {
  const status = section?.querySelector(".ai-project-name-selection-status");
  if (status) status.textContent = message;
}

function updateVisiblePreviewCards(panel, payload, projectName) {
  panel.querySelectorAll(".ai-preview-card").forEach((card, index) => {
    const activity = payload.activities[index] || {};
    const summary = card.querySelector("span");
    if (summary) {
      summary.textContent = `${projectName} · ${activity.activityType || "Other"} · ${activity.village || "No village"}`;
    }
  });
}

function updateCandidateSelection(section, projectName) {
  section?.querySelectorAll(".ai-project-name-candidate").forEach((button) => {
    button.classList.toggle("selected", button.dataset.projectName === projectName);
  });
}

function applyProjectName(panel, projectName, options = {}) {
  const name = String(projectName || "").trim();
  if (!name) throw new Error("Choose or type a project name first.");

  const payload = parseImportPayload(panel);
  payload.selectedProjectName = name;
  payload.recommendedProjectName = payload.recommendedProjectName || name;
  payload.extractionRequest = {
    ...(payload.extractionRequest || {}),
    selectedProjectName: name,
  };
  payload.activities = payload.activities.map((activity) => ({
    ...activity,
    projectName: name,
  }));

  const codeArea = panel.querySelector(".ai-import-code");
  codeArea.value = JSON.stringify(payload, null, 2);
  codeArea.dispatchEvent(new Event("input", { bubbles: true }));
  panel.dataset.selectedImportedProjectName = name;

  const section = panel.querySelector(".ai-project-name-selection");
  const input = section?.querySelector(".ai-final-project-name");
  if (input && input.value !== name) input.value = name;
  updateCandidateSelection(section, name);
  updateVisiblePreviewCards(panel, payload, name);
  setSelectionStatus(section, `Selected project name: ${name}. It will be used for every imported activity.`);

  if (options.refreshParsedPayload !== false) {
    const previewButton = panel.querySelector(".ai-preview-code");
    if (previewButton) {
      panel.dataset.projectNameSyncing = "true";
      previewButton.click();
      window.setTimeout(() => {
        delete panel.dataset.projectNameSyncing;
        updateVisiblePreviewCards(panel, payload, name);
      }, 80);
    }
  }

  return payload;
}

function buildCandidateButton(candidate, index) {
  const confidence = candidate.confidence ? ` · ${candidate.confidence} confidence` : "";
  return `<button type="button" class="ai-project-name-candidate" data-candidate-index="${index}" data-project-name="${escapeHtml(candidate.name)}">
    <strong>${escapeHtml(candidate.name)}</strong>
    <span>${escapeHtml(candidate.reason || "Suggested from the source")}${escapeHtml(confidence)}</span>
  </button>`;
}

function renderProjectNameSelection(panel) {
  let payload;
  try {
    payload = parseImportPayload(panel);
  } catch {
    return;
  }

  const candidates = collectProjectCandidates(payload, panel);
  const preview = panel.querySelector(".ai-preview");
  if (!preview) return;

  let section = panel.querySelector(".ai-project-name-selection");
  if (!section) {
    section = document.createElement("section");
    section.className = "ai-project-name-selection";
    preview.before(section);
  }

  const recommended = String(
    panel.dataset.selectedImportedProjectName
      || payload.selectedProjectName
      || payload.recommendedProjectName
      || candidates[0]?.name
      || "",
  ).trim();

  section.innerHTML = `
    <h4>Choose the final project name</h4>
    <p>ChatGPT suggested project names based on the uploaded files. Select one, or type a different name. The selected name will be applied to every imported activity.</p>
    <div class="ai-project-name-candidates">
      ${candidates.length
        ? candidates.map(buildCandidateButton).join("")
        : `<div class="ai-entry-status">No project-name options were included. Type the correct project name below.</div>`}
    </div>
    <label class="ai-final-project-name-label">Selected project name
      <div class="ai-final-project-name-row">
        <input class="ai-final-project-name" list="ai-import-project-name-options" placeholder="Choose a suggestion or type the correct project name" value="${escapeHtml(recommended)}" />
        <button type="button" class="ai-apply-project-name">Apply project name</button>
      </div>
    </label>
    <small class="ai-project-name-selection-status">Choose a name before filling the activity form.</small>
  `;

  let datalist = document.getElementById("ai-import-project-name-options");
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "ai-import-project-name-options";
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = candidates.map((candidate) => `<option value="${escapeHtml(candidate.name)}"></option>`).join("");

  const input = section.querySelector(".ai-final-project-name");
  const apply = () => {
    try {
      applyProjectName(panel, input.value);
    } catch (error) {
      setSelectionStatus(section, error.message || "Could not apply the project name.");
    }
  };

  section.querySelectorAll(".ai-project-name-candidate").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.projectName || "";
      apply();
    });
  });

  section.querySelector(".ai-apply-project-name")?.addEventListener("click", apply);
  input.addEventListener("change", apply);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    }
  });

  if (recommended) {
    try {
      applyProjectName(panel, recommended);
    } catch {
      // Keep the picker available even if the imported code needs manual correction.
    }
  }
}

function enhancePanel(panel) {
  if (!panel) return;
  ensurePromptHasNamingInstructions(panel);
}

function applyEnhancements() {
  document.querySelectorAll(".ai-entry-panel").forEach(enhancePanel);
}

function scheduleEnhancements() {
  if (enhancementTimer) window.clearTimeout(enhancementTimer);
  enhancementTimer = window.setTimeout(() => {
    enhancementTimer = null;
    applyEnhancements();
  }, 100);
}

function start() {
  installStyles();
  scheduleEnhancements();

  document.addEventListener("click", (event) => {
    const panel = event.target.closest?.(".ai-entry-panel");
    if (!panel) return;

    if (event.target.closest(".ai-generate-prompt")) {
      window.setTimeout(() => ensurePromptHasNamingInstructions(panel), 0);
    }

    if (event.target.closest(".ai-preview-code")) {
      if (panel.dataset.projectNameSyncing === "true") return;
      window.setTimeout(() => renderProjectNameSelection(panel), 30);
    }
  });

  document.addEventListener("click", (event) => {
    const copyButton = event.target.closest?.(".ai-copy-prompt");
    if (!copyButton) return;
    const panel = copyButton.closest(".ai-entry-panel");
    ensurePromptHasNamingInstructions(panel);
  }, true);

  document.addEventListener("click", (event) => {
    const fillButton = event.target.closest?.(".ai-fill-form");
    if (!fillButton) return;
    const panel = fillButton.closest(".ai-entry-panel");
    if (!panel || panel.dataset.replayingProjectNameFill === "true") return;

    const input = panel.querySelector(".ai-final-project-name");
    const selectedName = input?.value?.trim();
    if (!selectedName) return;

    let payload;
    try {
      payload = parseImportPayload(panel);
    } catch {
      return;
    }

    const selectedIndex = Number(panel.querySelector(".ai-activity-selector")?.value || 0);
    if (payload.activities[selectedIndex]?.projectName === selectedName) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      applyProjectName(panel, selectedName);
      window.setTimeout(() => {
        panel.dataset.replayingProjectNameFill = "true";
        fillButton.click();
        window.setTimeout(() => delete panel.dataset.replayingProjectNameFill, 0);
      }, 120);
    } catch {
      delete panel.dataset.replayingProjectNameFill;
    }
  }, true);

  document.addEventListener("input", (event) => {
    if (!event.target.matches?.(".ai-project-name")) return;
    const panel = event.target.closest(".ai-entry-panel");
    window.setTimeout(() => ensurePromptHasNamingInstructions(panel), 240);
  });

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
