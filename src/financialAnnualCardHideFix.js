function removeAnnualAmountText() {
  document.querySelectorAll(".financial-number-card").forEach((card) => {
    const label = card.querySelector(".financial-number-label")?.textContent?.trim().toLowerCase() || "";
    if (label.startsWith("annual amount")) card.remove();
  });

  document.querySelectorAll(".financial-entity-meta span").forEach((span) => {
    const text = span.textContent?.trim().toLowerCase() || "";
    if (text.startsWith("annual €") || text.startsWith("annual eur") || text.startsWith("annual amount")) {
      span.remove();
    }
  });
}

function startAnnualCardHideFix() {
  removeAnnualAmountText();
  const observer = new MutationObserver(() => removeAnnualAmountText());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAnnualCardHideFix);
} else {
  startAnnualCardHideFix();
}
