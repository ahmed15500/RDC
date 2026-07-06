function replaceUnnamedUsers() {
  document.querySelectorAll("td strong").forEach((nameElement) => {
    if (nameElement.textContent.trim() !== "Unnamed user") return;

    const emailElement = nameElement.parentElement?.querySelector("small");
    const email = emailElement?.textContent?.trim();
    if (!email || !email.includes("@")) return;

    nameElement.textContent = email;
  });
}

function startUserDisplayEnhancer() {
  replaceUnnamedUsers();

  const observer = new MutationObserver(() => replaceUnnamedUsers());
  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startUserDisplayEnhancer);
} else {
  startUserDisplayEnhancer();
}
