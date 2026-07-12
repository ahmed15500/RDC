const ACTIVITY_TYPES = [
  "Waste Management", "Waste for Food", "Health / Physiotherapy Convoys", "Women Empowerment",
  "Youth Development", "Summer Schools", "Arts for Climate", "Football Academy", "Farmer Support",
  "Community Awareness", "Training / Workshop", "Research / Data Collection", "Other",
];

const VILLAGES = [
  "Galfina 1", "Galfina 2", "Galfina 3", "Basateen Barakat", "Ali Kamel Metwally",
  "El-Tahaweya", "Abu Shaier", "Karama", "El-Dahhar", "Maher", "Nabih", "Kamal Nakhla",
  "Salem Allam", "Multiple Villages", "Other",
];

const TARGET_GROUPS = [
  "Women", "Youth", "Children / Students", "Farmers", "Teachers", "Households",
  "Community members", "Volunteers", "People with health needs", "Mixed groups",
];

const PILLARS = ["Ecology", "Society", "Culture", "Economy"];
const SDGS = [1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 17];

let panelTimer = null;
let parsedPayload = null;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function installStyles() {
  if (document.getElementById("ai-assisted-entry-style")) return;
  const style = document.createElement("style");
  style.id = "ai-assisted-entry-style";
  style.textContent = `
    .ai-entry-panel { padding: 20px; border: 1px solid rgba(36,43,120,.14); border-radius: 22px; background: linear-gradient(135deg,#fff,#f8fafc); box-shadow: 0 14px 40px rgba(15,23,42,.07); }
    .ai-entry-head { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:14px; }
    .ai-entry-head h3 { margin:0 0 5px; color:#242b78; }
    .ai-entry-head p { margin:0; color:#64748b; line-height:1.5; }
    .ai-entry-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .ai-entry-grid label { display:grid; gap:6px; color:#334155; font-size:.84rem; font-weight:850; }
    .ai-entry-grid input,.ai-entry-grid select,.ai-entry-grid textarea { width:100%; padding:10px 12px; border:1px solid #d8dee8; border-radius:11px; background:#fff; color:#172033; font:inherit; }
    .ai-entry-grid textarea { min-height:180px; resize:vertical; }
    .ai-span-2 { grid-column:1 / -1; }
    .ai-entry-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
    .ai-entry-actions button { border:0; border-radius:999px; padding:9px 13px; font-weight:900; cursor:pointer; }
    .ai-primary { background:linear-gradient(90deg,#e6007e,#ff8500); color:white; }
    .ai-secondary { background:#eef2f7; color:#242b78; }
    .ai-entry-status { margin-top:10px; padding:10px 12px; border-radius:12px; background:#f8fafc; color:#475569; font-size:.84rem; font-weight:800; line-height:1.45; }
    .ai-entry-status.error { background:#fef2f2; color:#991b1b; }
    .ai-preview { margin-top:14px; display:grid; gap:10px; }
    .ai-preview-card { padding:12px 14px; border:1px solid #e5e8ed; border-radius:14px; background:#fff; }
    .ai-preview-card strong { display:block; color:#242b78; margin-bottom:4px; }
    .ai-preview-card span { color:#64748b; font-size:.82rem; line-height:1.45; }
    @media (max-width:760px){ .ai-entry-grid{grid-template-columns:1fr}.ai-span-2{grid-column:auto}.ai-entry-head{display:grid} }
  `;
  document.head.appendChild(style);
}

function buildPrompt(projectName, sourceType) {
  const projectLine = projectName.trim() || "[ENTER THE EXACT PROJECT NAME HERE]";
  const sourceInstruction = sourceType === "full_report"
    ? "The attached source is a full report containing multiple projects. Extract only the requested project and ignore all other projects."
    : "The attached source may contain notes, tables, files, or a short activity report. Extract only information relevant to the requested project.";

  return `You are an information extraction assistant for the RDC Impact Dashboard of the Rural Development Center at Heliopolis University.

${sourceInstruction}

REQUESTED PROJECT:
${projectLine}

Your task is to read the uploaded files and/or pasted text, identify the requested project, and convert only that project's activities into a valid RDC Import Code.

MANDATORY RULES:
1. Extract only the requested project. Do not include data from any other project.
2. Use the exact requested project name in every activity: \"projectName\": \"${projectLine}\".
3. If the project contains multiple workshops, visits, trainings, campaigns, research tasks, or other interventions, create one separate activity object for each distinct activity.
4. Do not invent names, numbers, dates, results, villages, participants, evidence, or outcomes.
5. Use null for unavailable numeric values, an empty string for unavailable text, and an empty array for unavailable lists.
6. Do not use 0 unless the source explicitly confirms zero.
7. Set every new activity to \"approvalStatus\": \"Pending\" and \"dataConfirmed\": \"Needs review\".
8. Include source page numbers and section names when available.
9. If the requested project cannot be found, return matchStatus \"project_not_found\" and no activities.
10. If more than one project may match, return matchStatus \"project_match_uncertain\", list projectCandidates, and return no activities.
11. Return JSON only. Do not use Markdown, code fences, explanations, or introductory text.

ALLOWED activityType VALUES:
${ACTIVITY_TYPES.map((x) => `- ${x}`).join("\n")}

ALLOWED village VALUES:
${VILLAGES.map((x) => `- ${x}`).join("\n")}
When more than one village is involved, use \"village\": \"Multiple Villages\" and place the exact village names in selectedVillages.

ALLOWED targetGroup VALUES:
${TARGET_GROUPS.map((x) => `- ${x}`).join("\n")}

ALLOWED pillars:
${PILLARS.map((x) => `- ${x}`).join("\n")}

ALLOWED SDG NUMBERS:
${SDGS.join(", ")}

Use this exact JSON structure:
{
  \"schema\": \"rdc_project_extract_v1\",
  \"extractionRequest\": {
    \"requestedProject\": \"${projectLine}\",
    \"matchStatus\": \"exact_match\",
    \"matchedProjectName\": \"${projectLine}\",
    \"projectCandidates\": [],
    \"sourceDocument\": \"\",
    \"sourcePages\": []
  },
  \"activities\": [
    {
      \"projectName\": \"${projectLine}\",
      \"activityName\": \"\",
      \"activityType\": \"Other\",
      \"responsiblePerson\": \"\",
      \"organization\": \"\",
      \"partners\": \"\",
      \"village\": \"Other\",
      \"selectedVillages\": [],
      \"datePeriod\": \"\",
      \"targetGroup\": \"Mixed groups\",
      \"womenGirlsIncluded\": \"not_assessed\",
      \"femaleParticipants\": null,
      \"maleParticipants\": null,
      \"womenLeadershipCount\": null,
      \"womenParticipationNote\": \"\",
      \"objective\": \"\",
      \"description\": \"\",
      \"metricGroups\": [],
      \"metrics\": {
        \"directBeneficiaries\": null,
        \"indirectBeneficiaries\": null,
        \"households\": null,
        \"women\": null,
        \"womenTrained\": null,
        \"youth\": null,
        \"childrenStudents\": null,
        \"farmers\": null,
        \"schools\": null,
        \"teachers\": null,
        \"volunteers\": null,
        \"communityEvents\": null,
        \"trainings\": null,
        \"healthCases\": null,
        \"wasteCollectedKg\": null,
        \"wasteRecycledKg\": null,
        \"wasteCompostedKg\": null,
        \"treesPlanted\": null,
        \"incomeGenerated\": null,
        \"jobsCreated\": null,
        \"productsSold\": null
      },
      \"otherResults\": \"\",
      \"pillars\": [],
      \"pillarDescriptions\": { \"Ecology\": \"\", \"Society\": \"\", \"Culture\": \"\", \"Economy\": \"\" },
      \"sdgs\": [],
      \"otherSdg\": \"\",
      \"qualitative\": {
        \"keyOutcome\": \"\",
        \"success\": \"\",
        \"challenge\": \"\",
        \"lessonsLearned\": \"\",
        \"testimonial\": \"\",
        \"beneficiaryQuote\": \"\",
        \"beforeAfter\": \"\",
        \"futureOpportunity\": \"\",
        \"supportNeeded\": \"\"
      },
      \"evidence\": {
        \"photos\": \"\",
        \"videos\": \"\",
        \"attendanceSheets\": \"\",
        \"reports\": \"\",
        \"beneficiaryLists\": \"\",
        \"trainingMaterials\": \"\",
        \"mediaCoverage\": \"\",
        \"driveLink\": \"\",
        \"otherEvidence\": \"\"
      },
      \"validation\": {
        \"dataConfirmed\": \"Needs review\",
        \"dataSource\": \"\",
        \"approvalStatus\": \"Pending\"
      },
      \"sourceReference\": {
        \"pages\": [],
        \"section\": \"\",
        \"sourceTextSummary\": \"\",
        \"confidence\": \"medium\"
      }
    }
  ],
  \"missingInformation\": [],
  \"warnings\": []
}`;
}

function nativeSet(element, value) {
  if (!element) return;
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value == null ? "" : String(value));
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function findControl(form, labelStart) {
  const label = [...form.querySelectorAll("label")].find((item) => {
    const firstText = item.childNodes[0]?.textContent?.trim()?.toLowerCase() || "";
    return firstText.startsWith(labelStart.toLowerCase());
  });
  return label?.querySelector("input,textarea,select") || null;
}

function setByLabel(form, label, value) {
  if (value == null) return;
  nativeSet(findControl(form, label), value);
}

function setCheckboxesByText(container, selectedValues) {
  const selected = new Set((selectedValues || []).map(String));
  container.querySelectorAll('label input[type="checkbox"]').forEach((input) => {
    const text = input.closest("label")?.textContent?.trim() || "";
    const short = text.split(":")[0].trim();
    const shouldCheck = selected.has(text) || selected.has(short);
    if (input.checked !== shouldCheck) input.click();
  });
}

function fillEvidence(form, evidence = {}) {
  const mapping = {
    photos: "Photos", videos: "Videos", attendanceSheets: "Attendance sheets", reports: "Reports",
    beneficiaryLists: "Beneficiary lists", trainingMaterials: "Training materials", mediaCoverage: "Media coverage",
    driveLink: "Google Drive folder link", otherEvidence: "Other evidence links",
  };
  Object.entries(mapping).forEach(([key, label]) => {
    const value = evidence[key];
    if (!value) return;
    const checkboxLabel = [...form.querySelectorAll("label")].find((item) => item.textContent.trim() === label && item.querySelector('input[type="checkbox"]'));
    const checkbox = checkboxLabel?.querySelector('input[type="checkbox"]');
    if (checkbox && !checkbox.checked) checkbox.click();
    window.setTimeout(() => setByLabel(form, label, value), 30);
  });
}

function fillGender(form, activity) {
  const included = form.querySelector(".integrated-women-included");
  nativeSet(included, activity.womenGirlsIncluded || "not_assessed");
  nativeSet(form.querySelector('[data-gender-field="female_participants"]'), activity.femaleParticipants ?? "");
  nativeSet(form.querySelector('[data-gender-field="male_participants"]'), activity.maleParticipants ?? "");
  nativeSet(form.querySelector('[data-gender-field="women_leadership_count"]'), activity.womenLeadershipCount ?? 0);
  nativeSet(form.querySelector('[data-gender-field="gender_equality_outcome"]'), activity.womenParticipationNote || "");
}

function fillActivity(activity) {
  const form = document.querySelector("form.submission");
  if (!form) throw new Error("The activity form is not available.");

  setByLabel(form, "Project name", activity.projectName || "");
  setByLabel(form, "Activity name", activity.activityName || "");
  setByLabel(form, "Activity type", ACTIVITY_TYPES.includes(activity.activityType) ? activity.activityType : "Other");
  setByLabel(form, "Responsible person", activity.responsiblePerson || "");
  setByLabel(form, "Organization / department", activity.organization || "");
  setByLabel(form, "Implementing partners", activity.partners || "");
  setByLabel(form, "Village", VILLAGES.includes(activity.village) ? activity.village : "Other");
  setByLabel(form, "Date or implementation period", activity.datePeriod || "");
  setByLabel(form, "Target group", TARGET_GROUPS.includes(activity.targetGroup) ? activity.targetGroup : "Mixed groups");
  setByLabel(form, "Main objective", activity.objective || "");
  setByLabel(form, "Short activity description", activity.description || "");

  window.setTimeout(() => {
    if (activity.village === "Multiple Villages") {
      const section = [...form.querySelectorAll("fieldset")].find((f) => f.querySelector("legend")?.textContent?.startsWith("A."));
      const selected = new Set(activity.selectedVillages || []);
      section?.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        const text = input.closest("label")?.textContent?.trim();
        if (selected.has(text) !== input.checked) input.click();
      });
    }
  }, 50);

  fillGender(form, activity);

  const metrics = activity.metrics || {};
  const metricLabels = {
    directBeneficiaries: "Direct beneficiaries", indirectBeneficiaries: "Indirect beneficiaries",
    households: "Households reached", women: "Women", womenTrained: "Women trained", youth: "Youth",
    childrenStudents: "Children / students", farmers: "Farmers", schools: "Schools", teachers: "Teachers",
    volunteers: "Volunteers involved", communityEvents: "Community events conducted",
    trainings: "Training sessions conducted", healthCases: "Health cases", wasteCollectedKg: "Waste collected",
    wasteRecycledKg: "Waste recycled", wasteCompostedKg: "Waste composted", treesPlanted: "Trees planted",
    incomeGenerated: "Income generated", jobsCreated: "Jobs created", productsSold: "Products sold",
  };

  const adminManual = [...form.querySelectorAll("label")].find((l) => l.textContent.includes("Admin manual mode"))?.querySelector('input[type="checkbox"]');
  if (adminManual && !adminManual.checked) adminManual.click();
  window.setTimeout(() => {
    Object.entries(metricLabels).forEach(([key, label]) => {
      if (metrics[key] != null) setByLabel(form, label, metrics[key]);
    });
    setByLabel(form, "Other measurable results", activity.otherResults || "");
  }, 80);

  const pillarSection = [...form.querySelectorAll("fieldset")].find((f) => f.querySelector("legend")?.textContent?.startsWith("C."));
  if (pillarSection) setCheckboxesByText(pillarSection, activity.pillars || []);
  window.setTimeout(() => {
    const descriptions = activity.pillarDescriptions || {};
    Object.entries(descriptions).forEach(([pillar, value]) => {
      if (value) setByLabel(form, `${pillar} impact description`, value);
    });
  }, 60);

  const sdgSection = [...form.querySelectorAll("fieldset")].find((f) => f.querySelector("legend")?.textContent?.startsWith("D."));
  if (sdgSection) setCheckboxesByText(sdgSection, activity.sdgs || []);
  setByLabel(form, "Other SDG", activity.otherSdg || "");

  const q = activity.qualitative || {};
  setByLabel(form, "Key outcome", q.keyOutcome || "");
  setByLabel(form, "Most important success", q.success || "");
  setByLabel(form, "Main challenge", q.challenge || "");
  setByLabel(form, "Lessons learned", q.lessonsLearned || "");
  setByLabel(form, "Human story / testimonial", q.testimonial || "");
  setByLabel(form, "Quote from beneficiary", q.beneficiaryQuote || "");
  setByLabel(form, "Before and after change", q.beforeAfter || "");
  setByLabel(form, "Future opportunity", q.futureOpportunity || "");
  setByLabel(form, "Support needed for scaling", q.supportNeeded || "");

  fillEvidence(form, activity.evidence || {});

  const validation = activity.validation || {};
  setByLabel(form, "Data confirmed?", "Needs review");
  setByLabel(form, "Source of data", validation.dataSource || activity.sourceReference?.sourceTextSummary || "");
  setByLabel(form, "Approval status", "Pending");

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function validatePayload(payload) {
  if (!payload || !Array.isArray(payload.activities)) throw new Error("The code must contain an activities array.");
  const status = payload.extractionRequest?.matchStatus;
  if (["project_not_found", "project_match_uncertain"].includes(status)) {
    const candidates = payload.extractionRequest?.projectCandidates || [];
    throw new Error(status === "project_not_found"
      ? "The requested project was not found in the source."
      : `The project match is uncertain. Candidates: ${candidates.join(", ") || "not provided"}`);
  }
  if (!payload.activities.length) throw new Error("No activities were found in the imported code.");
  return payload;
}

function renderPreview(panel, payload) {
  const preview = panel.querySelector(".ai-preview");
  const selector = panel.querySelector(".ai-activity-selector");
  selector.innerHTML = payload.activities.map((a, i) => `<option value="${i}">${i + 1}. ${esc(a.activityName || "Untitled activity")}</option>`).join("");
  selector.closest("label").hidden = payload.activities.length < 2;
  preview.innerHTML = payload.activities.map((a, i) => `
    <div class="ai-preview-card">
      <strong>${i + 1}. ${esc(a.activityName || "Untitled activity")}</strong>
      <span>${esc(a.projectName || "No project")} · ${esc(a.activityType || "Other")} · ${esc(a.village || "No village")}</span>
    </div>`).join("");
}

function createPanel(form) {
  if (document.querySelector(".ai-entry-panel")) return;
  const panel = document.createElement("section");
  panel.className = "ai-entry-panel";
  panel.innerHTML = `
    <div class="ai-entry-head">
      <div><h3>AI-Assisted Data Entry</h3><p>Generate an English ChatGPT prompt, extract one project from a report, then paste the RDC Import Code to fill this form.</p></div>
    </div>
    <div class="ai-entry-grid">
      <label>Source type
        <select class="ai-source-type"><option value="general">General notes / activity report</option><option value="full_report">Full report containing multiple projects</option></select>
      </label>
      <label>Project to extract<input class="ai-project-name" placeholder="Example: GWS-SENCE" /></label>
      <label class="ai-span-2">Generated English prompt<textarea class="ai-generated-prompt" readonly></textarea></label>
      <label class="ai-span-2">Paste RDC Import Code<textarea class="ai-import-code" placeholder='Paste the JSON returned by ChatGPT here'></textarea></label>
      <label hidden>Choose activity<select class="ai-activity-selector"></select></label>
    </div>
    <div class="ai-entry-actions">
      <button type="button" class="ai-primary ai-generate-prompt">Generate English Prompt</button>
      <button type="button" class="ai-secondary ai-copy-prompt">Copy Prompt</button>
      <button type="button" class="ai-secondary ai-preview-code">Preview Import Code</button>
      <button type="button" class="ai-primary ai-fill-form">Fill Activity Form</button>
    </div>
    <div class="ai-entry-status">Enter the project name, generate the prompt, and use it with ChatGPT together with the source file.</div>
    <div class="ai-preview"></div>
  `;

  form.before(panel);
  const sourceType = panel.querySelector(".ai-source-type");
  const projectName = panel.querySelector(".ai-project-name");
  const promptArea = panel.querySelector(".ai-generated-prompt");
  const codeArea = panel.querySelector(".ai-import-code");
  const status = panel.querySelector(".ai-entry-status");

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("error", error);
  }

  panel.querySelector(".ai-generate-prompt").addEventListener("click", () => {
    promptArea.value = buildPrompt(projectName.value, sourceType.value);
    setStatus("English project-extraction prompt generated.");
  });

  panel.querySelector(".ai-copy-prompt").addEventListener("click", async () => {
    if (!promptArea.value) promptArea.value = buildPrompt(projectName.value, sourceType.value);
    await navigator.clipboard.writeText(promptArea.value);
    setStatus("Prompt copied. Paste it into ChatGPT and attach the source report.");
  });

  panel.querySelector(".ai-preview-code").addEventListener("click", () => {
    try {
      parsedPayload = validatePayload(JSON.parse(codeArea.value.trim()));
      renderPreview(panel, parsedPayload);
      setStatus(`${parsedPayload.activities.length} activity record(s) found. Review the preview, then fill the selected activity.`);
    } catch (error) {
      parsedPayload = null;
      setStatus(error.message || "Invalid import code.", true);
    }
  });

  panel.querySelector(".ai-fill-form").addEventListener("click", () => {
    try {
      if (!parsedPayload) parsedPayload = validatePayload(JSON.parse(codeArea.value.trim()));
      const index = Number(panel.querySelector(".ai-activity-selector").value || 0);
      fillActivity(parsedPayload.activities[index]);
      setStatus("The selected activity was inserted into the form. Review all fields before submitting.");
    } catch (error) {
      setStatus(error.message || "Could not fill the activity form.", true);
    }
  });
}

function schedulePanel() {
  if (panelTimer) clearTimeout(panelTimer);
  panelTimer = setTimeout(() => {
    const form = document.querySelector("form.submission");
    if (form) createPanel(form);
  }, 150);
}

function start() {
  installStyles();
  schedulePanel();
  const observer = new MutationObserver(schedulePanel);
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
