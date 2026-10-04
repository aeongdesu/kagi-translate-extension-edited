// Standalone on purpose: it does not depend on the upstream bundles.
const ext = globalThis.browser ?? globalThis.chrome;
const KEY = "kagi_api_key";
const MODE = "kagi_auth_mode"; // "api_key" = use the key only; anything else = Kagi session (default)

const t = {
  title: "Kagi Translate – extra settings",
  apiTitle: "API key",
  intro: "By default the extension signs in with your Kagi session (cookie). Enable API key mode to authenticate with a key instead; the Kagi session cookie is then not used.",
  enabled: "Use API key instead of the Kagi session",
  keyLabel: "API key",
  placeholder: "Paste your API key",
  saved: (last4) => `A key is saved (ends with ${last4}). Leave the field empty to keep it.`,
  none: "No key saved.",
  save: "Save", check: "Check connection", clear: "Remove key",
  savedOk: "Saved.", cleared: "Key removed.", needKey: "Enter an API key first.",
  checking: "Checking…", ok: "Connected with the API key.", rejected: "The server rejected this key.",
  unknown: "No session returned. Check the key and try again.",
  note: "In API key mode the dictionary and proofreading pop-ups may not work, because they authenticate with a session token.",
};
const $ = (id) => document.getElementById(id);

document.title = t.title;
$("title").textContent = t.title;
$("apiTitle").textContent = t.apiTitle;
$("intro").textContent = `${t.intro} ${t.note}`;
$("enabledLabel").textContent = t.enabled;
$("keyLabel").textContent = t.keyLabel;
$("key").placeholder = t.placeholder;
$("save").textContent = t.save;
$("check").textContent = t.check;
$("clear").textContent = t.clear;

function status(text, kind = "", id = "status") {
  const el = $(id);
  el.textContent = text;
  el.className = `status ${kind}`;
}

async function load() {
  const s = await ext.storage.local.get([KEY, MODE]);
  $("enabled").checked = s[MODE] === "api_key";
  $("saved").textContent = s[KEY] ? t.saved(String(s[KEY]).slice(-4)) : t.none;
  return s;
}

async function save() {
  const typed = $("key").value.trim();
  const current = (await ext.storage.local.get(KEY))[KEY];
  const key = typed || current || "";
  if ($("enabled").checked && !key) return status(t.needKey, "err");
  const items = { [MODE]: $("enabled").checked ? "api_key" : "session" };
  if (typed) items[KEY] = typed;
  await ext.storage.local.set(items);
  $("key").value = "";
  await load();
  status(t.savedOk, "ok");
}

async function check() {
  status(t.checking);
  await ext.runtime.sendMessage({ type: "CLEAR_SESSION_CACHE" });
  const res = await ext.runtime.sendMessage({ type: "GET_CACHED_SESSION" });
  if (res?.session?.loggedIn) status(t.ok, "ok");
  else if (res?.error) status(res.error, "err");
  else {
    const apiMode = (await ext.storage.local.get(MODE))[MODE] === "api_key";
    status(apiMode ? t.rejected : t.unknown, "err");
  }
}

$("save").addEventListener("click", () => save().catch((e) => status(String(e), "err")));
$("check").addEventListener("click", () => check().catch((e) => status(String(e), "err")));
$("clear").addEventListener("click", async () => {
  await ext.storage.local.remove([KEY]);
  await ext.storage.local.set({ [MODE]: "session" });
  await load();
  status(t.cleared, "ok");
});
load();

const REDLIB = "kagi_redlib_domains";
const r = {
  title: "Redlib instances",
  intro: "Redlib is self-hosted, so enter the domains of the instances you use. The Reddit integration then also runs on those sites. Reload open Redlib tabs after saving.",
  label: "Domains (separated by commas)",
  placeholder: "redlib.example.com, rd.example.org",
  save: "Save",
  saved: (n) => (n ? `Saved ${n} domain${n === 1 ? "" : "s"}.` : "Saved. No Redlib domains are set."),
};
$("redlibTitle").textContent = r.title;
$("redlibIntro").textContent = r.intro;
$("redlibLabel").textContent = r.label;
$("redlib").placeholder = r.placeholder;
$("redlibSave").textContent = r.save;

function parseDomains(text) {
  const hosts = [];
  for (const part of text.split(/[\s,]+/)) {
    if (!part) continue;
    let host = "";
    try {
      host = new URL(part.includes("://") ? part : `https://${part}`).hostname;
    } catch {}
    host = host.toLowerCase().replace(/\.+$/, "");
    if (host && !hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}

async function loadRedlib() {
  const saved = (await ext.storage.local.get(REDLIB))[REDLIB];
  $("redlib").value = Array.isArray(saved) ? saved.join(", ") : "";
}

async function saveRedlib() {
  const hosts = parseDomains($("redlib").value);
  await ext.storage.local.set({ [REDLIB]: hosts });
  $("redlib").value = hosts.join(", ");
  status(r.saved(hosts.length), "ok", "redlibStatus");
}

$("redlibSave").addEventListener("click", () => saveRedlib().catch((e) => status(String(e), "err", "redlibStatus")));
$("redlib").addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveRedlib().catch((err) => status(String(err), "err", "redlibStatus"));
});
loadRedlib();
