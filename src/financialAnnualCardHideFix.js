function removeAnnualAmountCard() {
  document.querySelectorAll(".financial-number-card").forEach((card) => {
    const label = card.querySelector(".financial-number-label")?.textContent?.trim().toLowerCase() || "";
    if (label.startsWith("annual amount")) card.remove();
  });
}

function startAnnualCardHideFix() {
  removeAnnualAmountCard();
  const observer = new MutationObserver(() => removeAnnualAmountCard());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAnnualCardHideFix);
} else {
  startAnnualCardHideFix();
}
