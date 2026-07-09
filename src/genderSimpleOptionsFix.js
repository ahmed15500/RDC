function installGenderSimpleStyles() {
  if (document.getElementById("gender-simple-options-style")) return;
  const style = document.createElement("style");
  style.id = "gender-simple-options-style";
  style.textContent = `
    .gender-equality-section.simple-gender-section {
      border: 1px solid rgba(36, 43, 120, 0.1) !important;
      background: #ffffff !important;
    }

    .gender-equality-section.simple-gender-section legend {
      color: #242b78 !important;
    }

    .simple-gender-intro {
      padding: 12px 14px;
      border: 1px solid #e5e8ed;
      border-radius: 14px;
      background: #f8fafc;
      color: #64748b;
      line-height: 1.5;
      font-size: 0.88rem;
      font-weight: 750;
    }

    .simple-gender-section select,
    .simple-gender-section input,
    .simple-gender-section textarea {
      border-color: #d8dee8 !important;
      background: white !important;
    }

    .simple-gender-section textarea {
      min-height: 84px;
    }
  `;
  document.head.appendChild(style);
}

function number(value) {
  return Number(value || 0);
}

function getOldValue(section, fieldName) {
  return section.querySelector(`[data-gender-field="${fieldName}"]`)?.value || "";
}

function setSelected(select, value) {
  if (!select) return;
  const hasValue = [...select.options].some((option) => option.value === value);
  if (hasValue) select.value = value;
}

function simplifyGenderSection(section) {
  if (!section || section.dataset.simpleGenderApplied === "true") return;

  const oldLevel = getOldValue(section, "gender_equality_level") || "not_assessed";
  const oldFemale = getOldValue(section, "female_participants");
  const oldMale = getOldValue(section, "male_participants");
  const oldLeadership = getOldValue(section, "women_leadership_count");
  const oldActions = getOldValue(section, "gender_equality_actions");
  const oldOutcome = getOldValue(section, "gender_equality_outcome");

  section.dataset.simpleGenderApplied = "true";
  section.classList.add("simple-gender-section");
  section.innerHTML = `
    <legend>Women / Girls Participation</legend>
    <div class="form-grid">
      <div class="simple-gender-intro span-2">
        Keep it simple: choose whether women/girls were included, then add numbers if available. This section is optional but helps the reports.
        <span class="gender-save-status">Women participation details are saved after the activity is submitted.</span>
      </div>

      <label>Women / girls included?
        <select class="simple-women-included">
          <option value="not_assessed">Not sure / not recorded</option>
          <option value="not_applicable">Not applicable</option>
          <option value="low">No or very limited participation</option>
          <option value="moderate">Yes, participated</option>
          <option value="high">Yes, strong participation / leadership</option>
        </select>
      </label>

      <label>Female participants
        <input min="0" type="number" data-gender-field="female_participants" placeholder="0" value="${oldFemale || ""}" />
      </label>

      <label>Male participants
        <input min="0" type="number" data-gender-field="male_participants" placeholder="0" value="${oldMale || ""}" />
      </label>

      <label>Women active / leadership roles
        <select data-gender-field="women_leadership_count">
          <option value="0">No / not recorded</option>
          <option value="1">Yes, some women had active roles</option>
          <option value="2">Women helped organize or facilitate</option>
          <option value="3">Women led the activity or decision-making</option>
        </select>
      </label>

      <input type="hidden" data-gender-field="gender_equality_level" value="${oldLevel}" />
      <input type="hidden" data-gender-field="gender_equality_actions" value="${oldActions || ""}" />

      <label class="span-2">Optional note
        <textarea data-gender-field="gender_equality_outcome" placeholder="Example: women attended the training, mothers participated, girls joined the activity, or women helped organize.">${oldOutcome || ""}</textarea>
      </label>
    </div>
  `;

  const includedSelect = section.querySelector(".simple-women-included");
  const hiddenLevel = section.querySelector('[data-gender-field="gender_equality_level"]');
  const hiddenActions = section.querySelector('[data-gender-field="gender_equality_actions"]');
  const leadershipSelect = section.querySelector('[data-gender-field="women_leadership_count"]');
  const femaleInput = section.querySelector('[data-gender-field="female_participants"]');

  setSelected(includedSelect, oldLevel);
  setSelected(leadershipSelect, String(number(oldLeadership)));

  function syncHiddenFields() {
    hiddenLevel.value = includedSelect.value;
    const womenIncludedText = includedSelect.options[includedSelect.selectedIndex]?.textContent || "";
    const leadershipText = leadershipSelect.options[leadershipSelect.selectedIndex]?.textContent || "";
    hiddenActions.value = [womenIncludedText, leadershipText].filter(Boolean).join("; ");
  }

  function autoSetIncludedFromNumbers() {
    if (includedSelect.value !== "not_assessed") return;
    if (number(femaleInput.value) > 0) includedSelect.value = "moderate";
    syncHiddenFields();
  }

  includedSelect.addEventListener("change", syncHiddenFields);
  leadershipSelect.addEventListener("change", syncHiddenFields);
  femaleInput.addEventListener("input", autoSetIncludedFromNumbers);
  syncHiddenFields();
}

function applySimpleGenderSections() {
  document.querySelectorAll(".gender-equality-section").forEach((section) => simplifyGenderSection(section));
}

function startGenderSimpleOptionsFix() {
  installGenderSimpleStyles();
  applySimpleGenderSections();
  const observer = new MutationObserver(() => applySimpleGenderSections());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startGenderSimpleOptionsFix);
} else {
  startGenderSimpleOptionsFix();
}
