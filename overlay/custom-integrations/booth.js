(() => {
  // Shop pages keep a desktop and a mobile copy of the description and switch between them with
  // CSS when the window is resized. Each copy gets its own button, so the visible one always has one.
  const descriptions = ".summary .description, .main-info-column > .description";

  (globalThis.kxIntegrations ??= []).push({
    title: "BOOTH",
    description:
      "Adds a translate button above the description of BOOTH product pages. It translates the title, variation names and description in place; click it again to restore the original.",
    definition: {
      id: "kx-booth",
      name: "BOOTH",
      urlPatterns: ["https://booth.pm/items/*", "https://booth.pm/*/items/*", "https://*.booth.pm/items/*"],
      options: { defaultEnabled: true, mobileSupported: true },
      init: { retryAttempts: 5, retryDelay: 1000 },
      detection: { requireSelectors: [".item-info-detail .summary header h2"] },
      content: { containerSelector: ".item-info-detail", textSelector: ".summary header h2" },
      button: {
        mode: "inject",
        style: "icon-text",
        position: { relativeTo: "selector", selector: ".main-info-column > .description", placement: "prepend" },
        inlineStyles: {
          margin: "0 0 8px", display: "inline-flex", alignItems: "center", gap: "4px",
          padding: "0", border: "0", background: "none", color: "inherit",
          font: "inherit", fontSize: "14px", cursor: "pointer",
        },
        additionalButtons: [
          {
            id: "mobile",
            style: "icon-text",
            position: { relativeTo: "selector", selector: ".summary .for_mobile", placement: "prepend" },
            showWhen: ".summary .for_mobile",
          },
        ],
      },
      display: {
        containerSelector: descriptions,
        position: "prepend",
        // Needs patch 0004.
        colorScheme: "light",
        components: {
          sourceLanguageSelector: { container: { styles: { width: "180px" } } },
          targetLanguageSelector: { container: { styles: { width: "180px" } } },
        },
      },
      translation: {
        mode: "batch",
        autoStart: true,
        contextTemplate:
          "You are translating a product page from BOOTH, a marketplace for creator goods such as VRChat avatars and 3D assets. There are {elementCount} items: the product title, variation names, the description and its sections. Keep product names, avatar names and file names as they are.",
        batch: {
          elements: [
            { selector: ".summary header h2", type: "title" },
            { selector: ".variation-name", type: "variation name" },
            { selector: ".autolink.whitespace-pre-line", type: "description", onlyVisible: true },
            { selector: "section.shop__text > h2", type: "section heading", onlyVisible: true },
            { selector: "section.shop__text > p", type: "section text", onlyVisible: true },
          ],
        },
      },
    },
  });
})();
