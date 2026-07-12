function installGenderIntegrationStyles() {
  if (document.getElementById("gender-activity-integration-style")) return;

  const style = document.createElement("style");
  style.id = "gender-activity-integration-style";
  style.textContent = `
    .gender-entry-intro {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid rgba(36, 43, 120, 0.12);
      border-radius: 16px;
      background: #f8fafc;
    }

    .gender-entry-intro strong {
      color: #242b78;
      font-size: 0.94rem;
      font-weight: 950;
    }

    .gender-entry-intro p {
      margin: 0;
      color: #64748b;
      font-size: 0.84rem;
      font-weight: 720;
      line-height: 1.5;
    }

    .gender-entry-question {
      display: grid;
      gap: 7px;
      color: #334155;
      font-weight: 850;
    }

    .gender-entry-question select,
    .gender-detail-field input,
    .gender-detail-field select,
    .gender-detail-note textarea {
      width: 100%;
      border-color: #d8dee8 !important;
      background: #fff !important;
    }

    .gender-detail-field,
    .gender-detail-note {
      transition: opacity 160ms ease;
    }

    .gender-detail-hidden {
      display: none !important;
    }

    .gender-context-note {
      display: block;
      margin-top: 5px;
      color: #64748b;
      font-size: 0.76rem;
      font-weight: 720;
      line-height: 1.4;
    }

    .gender-save-status {
      display: block;
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 800;
    }
  `;
  document.head.appendChild(style);
}

function number(value) {
  return Number(value || 0);
}

function findSection(form, titleStart) {
  return [...form.querySelectorAll("fieldset.form-section")].find((fieldset) =>
    fieldset.querySelector("legend")?.textContent?.trim()?.startsWith(titleStart),
  );
}

function findLabelByText(section, textStart) {
  return [...(section?.querySelectorAll("label") || [])].find((label) =>
    label.childNodes[0]?.textContent?.trim()?.toLowerCase().startsWith(textStart.toLowerCase())
      || label.textContent.trim().toLowerCase().startsWith(textStart.toLowerCase()),
  );
}

function readExistingValues(form) {
  const section = form.querySelector(".gender-equality-section");
  const value = (name, fallback = "") =>
    section?.querySelector(`[data-gender-field="${name}"]`)?.value
      || form.querySelector(`.gender-entry-integrated [data-gender-field="${name}"]`)?.value
      || fallback;

  return {
    level: value("gender_equality_level", "not_assessed"),
    female: value("female_participants", ""),
    male: value("male_participants", ""),
    leadership: value("women_leadership_count", "0"),
    actions: value("gender_equality_actions", ""),
    note: value("gender_equality_outcome", ""),
  };
}

function removeStandaloneGenderSection(form) {
  form.querySelectorAll(".gender-equality-section").forEach((section) => section.remove());
}

function createGeneralQuestion(values) {
  const container = document.createElement("div");
  container.className = "gender-entry-intro gender-entry-integrated span-2";
  container.innerHTML = `
    <strong>Women / Girls Participation</strong>
    <p>Only complete the extra details when they are relevant to this activity.</p>
    <label class="gender-entry-question">Women / girls included?
      <select class="integrated-women-included">
        <option value="not_assessed">Not sure / not recorded</option>
        <option value="not_applicable">Not applicable to this activity</option>
        <option value="low">No or very limited participation</option>
        <option value="moderate">Yes, women / girls participated</option>
        <option value="high">Yes, strong participation / leadership</option>
      </select>
    </label>
    <input type="hidden" data-gender-field="gender_equality_level" value="${escapeHtml(values.level)}" />
    <input type="hidden" data-gender-field="gender_equality_actions" value="${escapeHtml(values.actions)}" />
    <span class="gender-save-status">Women participation details are saved with the activity.</span>
  `;
  return container;
}

function createCountField(label, fieldName, value, helper) {
  const element = document.createElement("label");
  element.className = "gender-detail-field gender-entry-integrated";
  element.innerHTML = `${escapeHtml(label)}
    <input min="0" type="number" data-gender-field="${fieldName}" value="${escapeHtml(value)}" placeholder="0" />
    <small class="gender-context-note">${escapeHtml(helper)}</small>`;
  return element;
}

function createLeadershipField(value) {
  const element = document.createElement("label");
  element.className = "gender-detail-field gender-entry-integrated";
  element.innerHTML = `Women active / leadership roles
    <select data-gender-field="women_leadership_count">
      <option value="0">No / not recorded</option>
      <option value="1">Some women had active roles</option>
      <option value="2">Women helped organize or facilitate</option>
      <option value="3">Women led the activity or decision-making</option>
    </select>
    <small class="gender-context-note">Use this only when women had a role beyond attendance.</small>`;
  element.querySelector("select").value = String(number(value));
  return element;
}

function createNoteField(value) {
  const element = document.createElement("label");
  element.className = "gender-detail-note gender-entry-integrated span-2";
  element.innerHTML = `Women / girls participation note (optional)
    <textarea data-gender-field="gender_equality_outcome" placeholder="Example: mothers participated, girls joined the activity, or women helped organize.">${escapeHtml(value)}</textarea>`;
  return element;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function integrateGenderFields(form) {
  const standalone = form.querySelector(".gender-equality-section");
  const alreadyIntegrated = form.querySelector(".gender-entry-intro");
  if (!standalone && alreadyIntegrated) return;

  const values = readExistingValues(form);
  form.querySelectorAll(".gender-entry-integrated").forEach((element) => element.remove());
  removeStandaloneGenderSection(form);

  const generalSection = findSection(form, "A. General Information");
  const quantitativeSection = findSection(form, "B. Quantitative Impact Data");
  const qualitativeSection = findSection(form, "E. Qualitative Impact");
  const generalGrid = generalSection?.querySelector(".form-grid");
  const quantitativeGrid = quantitativeSection?.querySelector(".form-grid");
  const qualitativeGrid = qualitativeSection?.querySelector(".form-grid");

  if (!generalGrid || !quantitativeGrid || !qualitativeGrid) return;

  const generalQuestion = createGeneralQuestion(values);
  const targetGroupLabel = findLabelByText(generalSection, "Target group");
  if (targetGroupLabel) targetGroupLabel.after(generalQuestion);
  else generalGrid.appendChild(generalQuestion);

  const femaleField = createCountField(
    "Female participants",
    "female_participants",
    values.female,
    "Count women and girls reached by this activity when available.",
  );
  const maleField = createCountField(
    "Male participants",
    "male_participants",
    values.male,
    "Add this when a gender participation breakdown is available.",
  );

  const metricGroups = quantitativeGrid.querySelector(".metric-groups");
  if (metricGroups) {
    metricGroups.after(femaleField);
    femaleField.after(maleField);
  } else {
    quantitativeGrid.append(femaleField, maleField);
  }

  const leadershipField = createLeadershipField(values.leadership);
  const noteField = createNoteField(values.note);
  qualitativeGrid.append(leadershipField, noteField);

  const includedSelect = generalQuestion.querySelector(".integrated-women-included");
  const hiddenLevel = generalQuestion.querySelector('[data-gender-field="gender_equality_level"]');
  const hiddenActions = generalQuestion.querySelector('[data-gender-field="gender_equality_actions"]');
  const femaleInput = femaleField.querySelector("input");
  const leadershipSelect = leadershipField.querySelector("select");

  if ([...includedSelect.options].some((option) => option.value === values.level)) {
    includedSelect.value = values.level;
  }

  const detailElements = [femaleField, maleField, leadershipField, noteField];

  function syncVisibilityAndValues() {
    const relevant = ["low", "moderate", "high"].includes(includedSelect.value);
    detailElements.forEach((element) => element.classList.toggle("gender-detail-hidden", !relevant));
    hiddenLevel.value = includedSelect.value;

    const includedText = includedSelect.options[includedSelect.selectedIndex]?.textContent || "";
    const leadershipText = leadershipSelect.options[leadershipSelect.selectedIndex]?.textContent || "";
    hiddenActions.value = relevant ? `${includedText}; ${leadershipText}` : includedText;
  }

  includedSelect.addEventListener("change", syncVisibilityAndValues);
  leadershipSelect.addEventListener("change", syncVisibilityAndValues);
  femaleInput.addEventListener("input", () => {
    if (number(femaleInput.value) > 0 && ["not_assessed", "not_applicable"].includes(includedSelect.value)) {
      includedSelect.value = "moderate";
    }
    syncVisibilityAndValues();
  });

  syncVisibilityAndValues();
}

function applyGenderIntegration() {
  document.querySelectorAll("form.submission").forEach((form) => integrateGenderFields(form));
}

function startGenderActivityIntegration() {
  installGenderIntegrationStyles();
  applyGenderIntegration();

  const observer = new MutationObserver(() => applyGenderIntegration());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startGenderActivityIntegration);
} else {
  startGenderActivityIntegration();
}
