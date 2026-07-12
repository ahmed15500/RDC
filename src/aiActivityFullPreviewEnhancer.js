let previewTimer = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function installStyles() {
  if (document.getElementById("ai-activity-full-preview-style")) return;

  const style = document.createElement("style");
  style.id = "ai-activity-full-preview-style";
  style.textContent = `
    .ai-preview-card.ai-full-preview-ready {
      position: relative;
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      padding-right: 128px;
    }

    .ai-preview-card.ai-full-preview-ready:hover,
    .ai-preview-card.ai-full-preview-ready:focus-visible {
      transform: translateY(-2px);
      border-color: rgba(230, 0, 126, 0.35);
      box-shadow: 0 12px 30px rgba(36, 43, 120, 0.1);
      outline: none;
    }

    .ai-preview-card.ai-full-preview-ready::after {
      content: "Preview full details";
      position: absolute;
      top: 50%;
      right: 13px;
      transform: translateY(-50%);
      padding: 7px 10px;
      border-radius: 999px;
      background: #eef2f7;
      color: #242b78;
      font-size: 0.72rem;
      font-weight: 900;
      white-space: nowrap;
    }

    .ai-full-preview-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(15, 23, 42, 0.62);
      backdrop-filter: blur(4px);
    }

    .ai-full-preview-modal {
      width: min(1080px, 100%);
      max-height: min(90vh, 980px);
      overflow: auto;
      border-radius: 24px;
      background: #fff;
      box-shadow: 0 30px 90px rgba(15, 23, 42, 0.34);
    }

    .ai-full-preview-header {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-start;
      padding: 20px 22px;
      border-bottom: 1px solid #e5e8ed;
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(10px);
    }

    .ai-full-preview-header h2 {
      margin: 0 0 5px;
      color: #242b78;
      font-size: 1.35rem;
    }

    .ai-full-preview-header p {
      margin: 0;
      color: #64748b;
      line-height: 1.45;
    }

    .ai-full-preview-close {
      flex: 0 0 auto;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 999px;
      background: #eef2f7;
      color: #242b78;
      font-size: 1.25rem;
      font-weight: 900;
      cursor: pointer;
    }

    .ai-full-preview-body {
      display: grid;
      gap: 14px;
      padding: 20px 22px;
    }

    .ai-full-preview-section {
      padding: 16px;
      border: 1px solid #e5e8ed;
      border-radius: 18px;
      background: #fbfcfe;
    }

    .ai-full-preview-section h3 {
      margin: 0 0 12px;
      color: #242b78;
      font-size: 1rem;
    }

    .ai-full-preview-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 16px;
    }

    .ai-full-preview-item {
      min-width: 0;
    }

    .ai-full-preview-item.full {
      grid-column: 1 / -1;
    }

    .ai-full-preview-item small {
      display: block;
      margin-bottom: 3px;
      color: #64748b;
      font-size: 0.74rem;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .ai-full-preview-item div {
      color: #172033;
      line-height: 1.5;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .ai-full-preview-empty {
      color: #94a3b8 !important;
      font-style: italic;
    }

    .ai-full-preview-footer {
      position: sticky;
      bottom: 0;
      display: flex;
      justify-content: flex-end;
      gap: 9px;
      padding: 16px 22px;
      border-top: 1px solid #e5e8ed;
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(10px);
    }

    .ai-full-preview-footer button {
      border: 0;
      border-radius: 999px;
      padding: 10px 15px;
      font-weight: 900;
      cursor: pointer;
    }

    .ai-full-preview-secondary {
      background: #eef2f7;
      color: #242b78;
    }

    .ai-full-preview-primary {
      background: linear-gradient(90deg, #e6007e, #ff8500);
      color: #fff;
    }

    @media (max-width: 760px) {
      .ai-preview-card.ai-full-preview-ready { padding-right: 14px; padding-bottom: 46px; }
      .ai-preview-card.ai-full-preview-ready::after { top: auto; right: 12px; bottom: 10px; transform: none; }
      .ai-full-preview-backdrop { padding: 10px; }
      .ai-full-preview-modal { max-height: 95vh; border-radius: 18px; }
      .ai-full-preview-grid { grid-template-columns: 1fr; }
      .ai-full-preview-item.full { grid-column: auto; }
      .ai-full-preview-header, .ai-full-preview-body, .ai-full-preview-footer { padding-left: 15px; padding-right: 15px; }
    }
  `;
  document.head.appendChild(style);
}

function parsePayload(panel) {
  const raw = panel.querySelector(".ai-import-code")?.value?.trim();
  if (!raw) throw new Error("Paste and preview the RDC Import Code first.");

  const payload = JSON.parse(raw);
  if (!Array.isArray(payload.activities) || !payload.activities.length) {
    throw new Error("No activities were found in the RDC Import Code.");
  }
  return payload;
}

function displayValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not provided";
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function item(label, value, full = false) {
  const shown = displayValue(value);
  const empty = shown === "Not provided";
  return `<div class="ai-full-preview-item${full ? " full" : ""}">
    <small>${escapeHtml(label)}</small>
    <div class="${empty ? "ai-full-preview-empty" : ""}">${escapeHtml(shown)}</div>
  </div>`;
}

function nonEmptyEntries(object = {}) {
  return Object.entries(object).filter(([, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return true;
    return Boolean(value);
  });
}

function section(title, content) {
  return `<section class="ai-full-preview-section"><h3>${escapeHtml(title)}</h3><div class="ai-full-preview-grid">${content}</div></section>`;
}

function buildActivityDetails(activity, payload) {
  const metrics = activity.metrics || {};
  const qualitative = activity.qualitative || {};
  const evidence = activity.evidence || {};
  const validation = activity.validation || {};
  const sourceReference = activity.sourceReference || {};
  const pillars = activity.pillars || [];
  const pillarDescriptions = activity.pillarDescriptions || {};

  const metricContent = nonEmptyEntries(metrics).length
    ? nonEmptyEntries(metrics).map(([key, value]) => item(key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), value)).join("")
    : item("Metrics", "Not provided", true);

  const evidenceContent = nonEmptyEntries(evidence).length
    ? nonEmptyEntries(evidence).map(([key, value]) => item(key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), value, true)).join("")
    : item("Evidence", "Not provided", true);

  return [
    section("A. General Information", [
      item("Project name", activity.projectName),
      item("Activity name", activity.activityName),
      item("Activity type", activity.activityType),
      item("Responsible person", activity.responsiblePerson),
      item("Organization / department", activity.organization),
      item("Implementing partners", activity.partners),
      item("Village", activity.village),
      item("Selected villages", activity.selectedVillages),
      item("Date or implementation period", activity.datePeriod),
      item("Target group", activity.targetGroup),
      item("Main objective", activity.objective, true),
      item("Short activity description", activity.description, true),
    ].join("")),

    section("Women / Girls Participation", [
      item("Women / girls included", activity.womenGirlsIncluded),
      item("Female participants", activity.femaleParticipants),
      item("Male participants", activity.maleParticipants),
      item("Women leadership count", activity.womenLeadershipCount),
      item("Participation note", activity.womenParticipationNote, true),
    ].join("")),

    section("B. Quantitative Impact Data", metricContent + item("Metric groups", activity.metricGroups, true) + item("Other measurable results", activity.otherResults, true)),

    section("C. Sustainability Pillars", [
      item("Selected pillars", pillars, true),
      ...pillars.map((pillar) => item(`${pillar} impact description`, pillarDescriptions[pillar], true)),
    ].join("")),

    section("D. SDG Mapping", item("SDGs", activity.sdgs, true) + item("Other SDG", activity.otherSdg, true)),

    section("E. Qualitative Impact", [
      item("Key outcome", qualitative.keyOutcome, true),
      item("Most important success", qualitative.success, true),
      item("Main challenge", qualitative.challenge, true),
      item("Lessons learned", qualitative.lessonsLearned, true),
      item("Human story / testimonial", qualitative.testimonial, true),
      item("Quote from beneficiary", qualitative.beneficiaryQuote, true),
      item("Before and after change", qualitative.beforeAfter, true),
      item("Future opportunity", qualitative.futureOpportunity, true),
      item("Support needed for scaling", qualitative.supportNeeded, true),
    ].join("")),

    section("F. Evidence and Documentation", evidenceContent),

    section("G. Data Validation", [
      item("Data confirmed", validation.dataConfirmed),
      item("Approval status", validation.approvalStatus),
      item("Source of data", validation.dataSource, true),
      item("Source document", payload.extractionRequest?.sourceDocument, true),
      item("Source pages", sourceReference.pages || payload.extractionRequest?.sourcePages, true),
      item("Source section", sourceReference.section, true),
      item("Source summary", sourceReference.sourceTextSummary, true),
      item("Extraction confidence", sourceReference.confidence),
    ].join("")),
  ].join("");
}

function openPreview(panel, activityIndex) {
  let payload;
  try {
    payload = parsePayload(panel);
  } catch (error) {
    window.alert(error.message || "Could not read the RDC Import Code.");
    return;
  }

  const activity = payload.activities[activityIndex];
  if (!activity) return;

  panel.querySelector(".ai-activity-selector")?.value = String(activityIndex);

  document.querySelector(".ai-full-preview-backdrop")?.remove();
  const backdrop = document.createElement("div");
  backdrop.className = "ai-full-preview-backdrop";
  backdrop.innerHTML = `
    <article class="ai-full-preview-modal" role="dialog" aria-modal="true" aria-label="Activity full preview">
      <header class="ai-full-preview-header">
        <div>
          <h2>${escapeHtml(activity.activityName || `Activity ${activityIndex + 1}`)}</h2>
          <p>${escapeHtml(activity.projectName || "No project")} · ${escapeHtml(activity.activityType || "Other")} · ${escapeHtml(activity.village || "No village")}</p>
        </div>
        <button type="button" class="ai-full-preview-close" aria-label="Close">×</button>
      </header>
      <div class="ai-full-preview-body">${buildActivityDetails(activity, payload)}</div>
      <footer class="ai-full-preview-footer">
        <button type="button" class="ai-full-preview-secondary ai-full-preview-cancel">Close</button>
        <button type="button" class="ai-full-preview-primary ai-full-preview-use">Use this activity</button>
      </footer>
    </article>`;

  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";

  const close = () => {
    backdrop.remove();
    document.body.style.overflow = "";
  };

  backdrop.querySelector(".ai-full-preview-close")?.addEventListener("click", close);
  backdrop.querySelector(".ai-full-preview-cancel")?.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
  backdrop.querySelector(".ai-full-preview-use")?.addEventListener("click", () => {
    const selector = panel.querySelector(".ai-activity-selector");
    if (selector) selector.value = String(activityIndex);
    close();
    panel.querySelector(".ai-fill-form")?.click();
  });

  const keyHandler = (event) => {
    if (event.key === "Escape") {
      document.removeEventListener("keydown", keyHandler);
      close();
    }
  };
  document.addEventListener("keydown", keyHandler);
  backdrop.querySelector(".ai-full-preview-close")?.focus();
}

function enhancePreviewCards(panel) {
  const cards = panel.querySelectorAll(".ai-preview-card");
  cards.forEach((card, index) => {
    if (card.dataset.fullPreviewEnhanced === "true") return;
    card.dataset.fullPreviewEnhanced = "true";
    card.dataset.activityIndex = String(index);
    card.classList.add("ai-full-preview-ready");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Preview full details for activity ${index + 1}`);

    const activate = () => openPreview(panel, Number(card.dataset.activityIndex || 0));
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

function applyEnhancements() {
  document.querySelectorAll(".ai-entry-panel").forEach((panel) => enhancePreviewCards(panel));
}

function scheduleEnhancements() {
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    previewTimer = null;
    applyEnhancements();
  }, 80);
}

function start() {
  installStyles();
  scheduleEnhancements();

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".ai-preview-code")) {
      window.setTimeout(scheduleEnhancements, 80);
      window.setTimeout(scheduleEnhancements, 240);
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
