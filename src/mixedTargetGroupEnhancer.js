const categories = [
  { label: "Women", metricLabel: "Women reached" },
  { label: "Youth", metricLabel: "Youth reached" },
  { label: "Children / Students", metricLabel: "Children / students reached" },
  { label: "Farmers", metricLabel: "Farmers reached" },
  { label: "Teachers", metricLabel: "Teachers involved" },
  { label: "Households", metricLabel: "Households reached" },
  { label: "Community members", metricLabel: "Direct beneficiaries" },
  { label: "Volunteers", metricLabel: "Volunteers involved" },
  { label: "People with health needs", metricLabel: "Health cases served" },
];

let mixedTimer = null;

function installMixedTargetStyles() {
  if (document.getElementById("mixed-target-group-style")) return;
  const style = document.createElement("style");
  style.id = "mixed-target-group-style";
  style.textContent = `
    .mixed-target-panel {
      grid-column: 1 / -1;
      display: grid;
      gap: 12px;
      margin-top: -2px;
      padding: 14px;
      border: 1px solid #e5e8ed;
      border-radius: 14px;
      background: #f8fafc;
    }

    .mixed-target-panel h4 {
      margin: 0;
      color: #26313d;
      font-size: 0.98rem;
      font-weight: 950;
    }

    .mixed-target-panel p,
    .mixed-target-panel small {
      margin: 0;
      color: #64748b;
      line-height: 1.45;
      font-weight: 750;
    }

    .mixed-target-checkboxes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 8px;
    }

    .mixed-target-checkboxes label,
    .mixed-target-numbers label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      border: 1px solid #e5e8ed;
      border-radius: 10px;
      background: #ffffff;
      color: #26313d;
      font-size: 0.84rem;
      font-weight: 850;
    }

    .mixed-target-question {
      display: grid;
      gap: 6px;
      max-width: 360px;
      color: #26313d;
      font-size: 0.86rem;
      font-weight: 900;
    }

    .mixed-target-question select {
      width: 100%;
      padding: 10px 11px;
      border: 1px solid #d8dee8;
      border-radius: 10px;
      background: #fff;
      color: #26313d;
      font: inherit;
    }

    .mixed-target-numbers {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 8px;
    }

    .mixed-target-numbers[hidden] {
      display: none !important;
    }

    .mixed-target-numbers label {
      display: grid;
      align-items: stretch;
    }

    .mixed-target-numbers input {
      width: 100%;
      padding: 9px 10px;
      border: 1px solid #d8dee8;
      border-radius: 9px;
      background: #fff;
      color: #26313d;
      font: inherit;
    }
  `;
  document.head.appendChild(style);
}

function normalize(value) {
  return String(value || "").trim();
}

function isMixedValue(value) {
  return normalize(value).toLowerCase().startsWith("mixed groups");
}

function setNativeSelectValue(select, value) {
  if (!select) return;
  let option = [...select.options].find((item) => item.value === value);
  if (!option) {
    option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function setNativeInputValue(input, value) {
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function findTargetGroupSelect() {
  return [...document.querySelectorAll("form.submission label")].find((label) => {
    const text = label.childNodes[0]?.textContent?.trim().toLowerCase() || label.textContent.trim().toLowerCase();
    return text.startsWith("target group");
  })?.querySelector("select");
}

function findInputByLabel(labelText) {
  const wanted = labelText.toLowerCase();
  return [...document.querySelectorAll("form.submission label")].find((label) => {
    const text = label.childNodes[0]?.textContent?.trim().toLowerCase() || label.textContent.trim().toLowerCase();
    return text.startsWith(wanted);
  })?.querySelector("input");
}

function parseCategoriesFromValue(value) {
  const text = normalize(value);
  if (!text.includes(":")) return [];
  return text
    .split(":")
    .slice(1)
    .join(":")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedCategories(panel) {
  return [...panel.querySelectorAll(".mixed-target-category:checked")].map((input) => input.value);
}

function syncTargetGroupValue(select, panel) {
  const selected = selectedCategories(panel);
  const nextValue = selected.length ? `Mixed groups: ${selected.join("; ")}` : "Mixed groups";
  setNativeSelectValue(select, nextValue);
}

function syncNumberFields(panel) {
  const hasNumbers = panel.querySelector(".mixed-target-has-numbers")?.value === "yes";
  if (!hasNumbers) return;

  panel.querySelectorAll(".mixed-target-number-input").forEach((input) => {
    const metricLabel = input.dataset.metricLabel;
    if (!metricLabel) return;
    const originalInput = findInputByLabel(metricLabel);
    if (originalInput) setNativeInputValue(originalInput, input.value || 0);
  });
}

function paintNumberInputs(panel) {
  const selected = selectedCategories(panel);
  const numbersWrap = panel.querySelector(".mixed-target-numbers");
  const hasNumbers = panel.querySelector(".mixed-target-has-numbers")?.value === "yes";

  numbersWrap.hidden = !hasNumbers;
  if (!hasNumbers) {
    numbersWrap.innerHTML = "";
    return;
  }

  numbersWrap.innerHTML = selected.map((categoryLabel) => {
    const category = categories.find((item) => item.label === categoryLabel);
    return `
      <label>${categoryLabel}
        <input class="mixed-target-number-input" min="0" type="number" data-metric-label="${category?.metricLabel || "Direct beneficiaries"}" placeholder="Number" />
      </label>
    `;
  }).join("") || `<small>Select at least one category first.</small>`;

  numbersWrap.querySelectorAll(".mixed-target-number-input").forEach((input) => {
    input.addEventListener("input", () => syncNumberFields(panel));
  });
}

function makePanel(select) {
  const currentSelected = parseCategoriesFromValue(select.value);
  const panel = document.createElement("div");
  panel.className = "mixed-target-panel";
  panel.innerHTML = `
    <div>
      <h4>Mixed target group details</h4>
      <p>Select all categories included in this activity.</p>
    </div>
    <div class="mixed-target-checkboxes">
      ${categories.map((category) => `
        <label>
          <input class="mixed-target-category" type="checkbox" value="${category.label}" ${currentSelected.includes(category.label) ? "checked" : ""} />
          ${category.label}
        </label>
      `).join("")}
    </div>
    <label class="mixed-target-question">Do you have the number for each category?
      <select class="mixed-target-has-numbers">
        <option value="no">No, only total number</option>
        <option value="yes">Yes, I have numbers by category</option>
      </select>
    </label>
    <div class="mixed-target-numbers" hidden></div>
    <small>If you choose Yes, the numbers will also update the matching quantitative fields when available.</small>
  `;

  panel.querySelectorAll(".mixed-target-category").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      syncTargetGroupValue(select, panel);
      paintNumberInputs(panel);
    });
  });

  panel.querySelector(".mixed-target-has-numbers")?.addEventListener("change", () => {
    paintNumberInputs(panel);
    syncNumberFields(panel);
  });

  return panel;
}

function applyMixedTargetGroupUi() {
  const select = findTargetGroupSelect();
  if (!select) return;

  if (![...select.options].some((option) => option.value === "Mixed groups")) {
    const option = document.createElement("option");
    option.value = "Mixed groups";
    option.textContent = "Mixed groups";
    select.appendChild(option);
  }

  const label = select.closest("label");
  const existingPanel = document.querySelector(".mixed-target-panel");

  if (!isMixedValue(select.value)) {
    existingPanel?.remove();
    return;
  }

  if (existingPanel) return;

  const panel = makePanel(select);
  label.after(panel);

  select.addEventListener("change", () => window.setTimeout(applyMixedTargetGroupUi, 50), { once: true });
}

function scheduleMixedTargetUi() {
  if (mixedTimer) window.clearTimeout(mixedTimer);
  mixedTimer = window.setTimeout(() => {
    mixedTimer = null;
    applyMixedTargetGroupUi();
  }, 200);
}

function startMixedTargetGroupEnhancer() {
  installMixedTargetStyles();

  document.addEventListener("change", (event) => {
    if (event.target === findTargetGroupSelect()) scheduleMixedTargetUi();
  }, true);

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".sidebar nav button, .submit-button")) {
      window.setTimeout(scheduleMixedTargetUi, 500);
    }
  }, true);

  scheduleMixedTargetUi();
  const observer = new MutationObserver(() => scheduleMixedTargetUi());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startMixedTargetGroupEnhancer);
} else {
  startMixedTargetGroupEnhancer();
}
