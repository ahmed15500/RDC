const JSON_VALIDATION_MARKER = "STRICT JSON VALIDATION — REQUIRED";
let repairTimer = null;

function installStyles() {
  if (document.getElementById("ai-import-json-repair-style")) return;
  const style = document.createElement("style");
  style.id = "ai-import-json-repair-style";
  style.textContent = `
    .ai-json-error-location {
      display: block;
      margin-top: 8px;
      padding: 10px 12px;
      border: 1px solid #fecaca;
      border-radius: 12px;
      background: #fff;
      color: #7f1d1d;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .76rem;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `;
  document.head.appendChild(style);
}

function validationInstructions() {
  return `

${JSON_VALIDATION_MARKER}
Before returning the RDC Import Code, validate the full response as strict JSON.

Rules:
1. Return one complete JSON object only, beginning with { and ending with }.
2. Use a comma between every object property and every array element.
3. Do not use trailing commas before } or ].
4. Use double quotes for every property name and string value.
5. Escape quotation marks inside text values as \\".
6. Do not include Markdown fences, comments, ellipses, or text outside the JSON object.
7. Do not truncate the response.
8. Parse-check the final JSON internally before sending it and correct every syntax error.
9. Ensure warnings, missingInformation, projectNameOptions, and activities are valid JSON arrays.
10. Ensure every activity object in activities is separated from the next one by a comma.

Return JSON only.`;
}

function ensurePromptValidation(panel) {
  const promptArea = panel?.querySelector(".ai-generated-prompt");
  if (!promptArea?.value?.trim()) return;
  if (promptArea.value.includes(JSON_VALIDATION_MARKER)) return;
  promptArea.value = `${promptArea.value.trim()}${validationInstructions()}`;
  promptArea.dispatchEvent(new Event("input", { bubbles: true }));
}

function stripEnvelope(raw) {
  let text = String(raw || "").replace(/^\uFEFF/, "").trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  return text.replace(/\u00a0/g, " ");
}

function escapeUnescapedQuotesInsideStrings(text) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (!inString) {
      output += char;
      if (char === '"') inString = true;
      continue;
    }

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      escaped = true;
      continue;
    }

    if (char === "\n") {
      output += "\\n";
      continue;
    }

    if (char === "\r") continue;
    if (char === "\t") {
      output += "\\t";
      continue;
    }

    if (char === '"') {
      let nextIndex = index + 1;
      while (nextIndex < text.length && /\s/.test(text[nextIndex])) nextIndex += 1;
      const next = text[nextIndex];
      const closesString = next === ":" || next === "," || next === "}" || next === "]" || next === undefined;

      if (closesString) {
        output += char;
        inString = false;
      } else {
        output += '\\"';
      }
      continue;
    }

    output += char;
  }

  return output;
}

function repairJson(raw) {
  let text = stripEnvelope(raw);
  text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  text = escapeUnescapedQuotesInsideStrings(text);
  text = text.replace(/,\s*([}\]])/g, "$1");
  return text;
}

function getErrorPosition(error) {
  const message = String(error?.message || "");
  const match = message.match(/position\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function buildErrorContext(text, error) {
  const position = getErrorPosition(error);
  if (!Number.isFinite(position)) return "";
  const start = Math.max(0, position - 90);
  const end = Math.min(text.length, position + 90);
  const before = text.slice(start, position);
  const after = text.slice(position, end);
  return `${before}⟶ ERROR HERE ⟵${after}`;
}

function setPanelStatus(panel, message, isError = false, context = "") {
  const status = panel.querySelector(".ai-entry-status");
  if (status) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  panel.querySelector(".ai-json-error-location")?.remove();
  if (context) {
    const detail = document.createElement("code");
    detail.className = "ai-json-error-location";
    detail.textContent = context;
    status?.after(detail);
  }
}

function validateAndRepairBeforePreview(panel, event) {
  const codeArea = panel.querySelector(".ai-import-code");
  const raw = codeArea?.value || "";
  if (!raw.trim()) return;

  let repaired = repairJson(raw);

  try {
    const parsed = JSON.parse(repaired);
    repaired = JSON.stringify(parsed, null, 2);
    if (codeArea.value !== repaired) {
      codeArea.value = repaired;
      codeArea.dispatchEvent(new Event("input", { bubbles: true }));
      setPanelStatus(panel, "The RDC Import Code was repaired automatically and validated. Previewing the activities now.");
    }
  } catch (error) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setPanelStatus(
      panel,
      `Invalid RDC Import Code: ${error.message}`,
      true,
      buildErrorContext(repaired, error),
    );
  }
}

function enhancePanel(panel) {
  ensurePromptValidation(panel);
}

function applyEnhancements() {
  document.querySelectorAll(".ai-entry-panel").forEach(enhancePanel);
}

function scheduleEnhancements() {
  if (repairTimer) window.clearTimeout(repairTimer);
  repairTimer = window.setTimeout(() => {
    repairTimer = null;
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
      window.setTimeout(() => ensurePromptValidation(panel), 0);
    }

    if (event.target.closest(".ai-preview-code")) {
      validateAndRepairBeforePreview(panel, event);
    }
  }, true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".ai-copy-prompt");
    if (!button) return;
    ensurePromptValidation(button.closest(".ai-entry-panel"));
  }, true);

  const observer = new MutationObserver(scheduleEnhancements);
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
