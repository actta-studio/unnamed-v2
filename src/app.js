document.addEventListener("DOMContentLoaded", () => {
  console.log("global app loaded");

  initGlobalStuff();

  const dynamicLoadMap = {
    preloader: () => import("./snippets/Preloader.js"),
  };

  document.querySelectorAll("[data-label]").forEach((el) => {
    const label = el.dataset.label;

    if (dynamicLoadMap[label]) {
      dynamicLoadMap[label]()
        .then(({ default: Module }) => {
          if (typeof Module === "function") {
            new Module({ el });
          }
        })
        .catch((err) => {
          console.warn(`Error loading snippet: ${label}`, err);
        });
    }
  });
});
