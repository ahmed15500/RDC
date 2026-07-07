function installDonutCountStyles() {
  if (document.getElementById("financial-donut-count-fix-style")) return;
  const style = document.createElement("style");
  style.id = "financial-donut-count-fix-style";
  style.textContent = `
    .financial-number-card.financial-circle-count-card {
      display: grid;
      justify-items: center;
      align-content: start;
      gap: 10px;
      min-height: 210px;
      border-left: 1px solid #e5e8ed;
      text-align: center;
    }

    .financial-circle-count-card .financial-number-label {
      justify-self: start;
      width: 100%;
      text-align: left;
    }

    .financial-count-donut {
      width: min(142px, 44vw);
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: conic-gradient(var(--accent, #68c934) 0 360deg);
    }

    .financial-count-donut-inner {
      width: 48%;
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: white;
      box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
    }

    .financial-count-donut-inner strong {
      color: #26313d;
      font-size: 1.45rem;
      line-height: 1;
      font-weight: 950;
      letter-spacing: -0.04em;
    }

    .financial-circle-count-card .financial-number-note {
      max-width: 180px;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

function makeDonutCard(card) {
  if (!card || card.dataset.donutCountFixed === "true") return;

  const label = card.querySelector(".financial-number-label")?.textContent?.trim() || "";
  if (label !== "Running Projects" && label !== "Accepted, to be launched") return;

  const value = card.querySelector(".financial-number-value")?.textContent?.trim() || "0";
  const note = card.querySelector(".financial-number-note")?.textContent?.trim() || "";

  card.classList.add("financial-circle-count-card");
  card.dataset.donutCountFixed = "true";
  card.innerHTML = `
    <span class="financial-number-label">${label}</span>
    <div class="financial-count-donut">
      <div class="financial-count-donut-inner"><strong>${value}</strong></div>
    </div>
    <span class="financial-number-note">${note}</span>
  `;
}

function applyDonutCountFix() {
  document
    .querySelectorAll(".financial-entity-section .financial-number-card")
    .forEach((card) => makeDonutCard(card));
}

function startDonutCountFix() {
  installDonutCountStyles();
  applyDonutCountFix();

  const observer = new MutationObserver(() => applyDonutCountFix());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startDonutCountFix);
} else {
  startDonutCountFix();
}
