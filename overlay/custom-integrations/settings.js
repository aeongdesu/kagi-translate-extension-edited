(() => {
  const ext = globalThis.browser ?? globalThis.chrome;
  const KEY = "kagi_translate_custom_integrations";
  const PREFIX = "kx-"; // marks the entries this page owns
  const $ = (id) => document.getElementById(id);

  const t = {
    title: "Custom integrations",
    intro: "Translation for more sites, built on the extension's own integration engine. Reload open tabs of a site after changing its toggle.",
    enable: (title) => `Enable ${title}`,
    on: (title) => `${title} enabled.`,
    off: (title) => `${title} disabled.`,
  };
  $("customTitle").textContent = t.title;
  $("customIntro").textContent = t.intro;

  function status(text, kind = "") {
    const el = $("customStatus");
    el.textContent = text;
    el.className = `status ${kind}`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.append(s);
    });
  }

  async function readStored() {
    const stored = (await ext.storage.local.get(KEY))[KEY];
    return stored && typeof stored === "object" ? stored : {};
  }

  async function updateList(update) {
    const stored = await readStored();
    const list = Array.isArray(stored.customIntegrations) ? stored.customIntegrations : [];
    const next = update(list);
    await ext.storage.local.set({ [KEY]: { ...stored, customIntegrations: next } });
    return next;
  }

  const isOurs = (item) => typeof item?.id === "string" && item.id.startsWith(PREFIX);

  const canonical = (v) =>
    JSON.stringify(v, (_, x) =>
      x && typeof x === "object" && !Array.isArray(x)
        ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1)))
        : x,
    );

  // Refreshes copies that differ from index.js and drops integrations removed from it.
  async function sync(entries) {
    const byId = new Map(entries.map((e) => [e.definition.id, e.definition]));
    const stored = await readStored();
    const list = Array.isArray(stored.customIntegrations) ? stored.customIntegrations : [];
    const stale = list.some((i) => isOurs(i) && (!byId.has(i.id) || canonical(byId.get(i.id)) !== canonical(i)));
    const current = stale
      ? await updateList((l) => l.filter((i) => !isOurs(i) || byId.has(i.id)).map((i) => (isOurs(i) ? byId.get(i.id) : i)))
      : list;
    return new Set(current.filter(isOurs).map((i) => i.id));
  }

  function render(entries, enabled) {
    const root = $("customList");
    for (const entry of entries) {
      const { id } = entry.definition;
      const box = document.createElement("div");
      box.className = "integration";
      const label = document.createElement("label");
      label.className = "row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = enabled.has(id);
      const name = document.createElement("span");
      name.textContent = t.enable(entry.title);
      label.append(input, name);
      const desc = document.createElement("p");
      desc.className = "muted";
      desc.textContent = entry.description ?? "";
      box.append(label, desc);
      root.append(box);

      input.addEventListener("change", async () => {
        try {
          await updateList((l) => {
            const rest = l.filter((i) => i?.id !== id);
            return input.checked ? [...rest, entry.definition] : rest;
          });
          status((input.checked ? t.on : t.off)(entry.title), "ok");
        } catch (err) {
          status(String(err), "err");
        }
      });
    }
  }

  async function main() {
    await loadScript("custom-integrations/index.js");
    for (const file of globalThis.kxIntegrationFiles ?? []) await loadScript(`custom-integrations/${file}`);
    const entries = (globalThis.kxIntegrations ?? []).filter((e) => {
      const ok = typeof e?.title === "string" && isOurs(e.definition) && Array.isArray(e.definition.urlPatterns);
      if (!ok) console.warn("Skipping invalid custom integration", e);
      return ok;
    });
    render(entries, await sync(entries));
  }

  main().catch((e) => status(String(e), "err"));
})();
