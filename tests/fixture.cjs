// Synthetic account-free fixture based on the observed native row structure.
const nativeRow = (amount = "218.77 credits") => `
  <div class="group/context-pane-row flex items-center gap-2 pl-2 py-2 pr-2" data-native-row>
    <span class="text-primary native-icon" aria-hidden="true">▤</span>
    <div class="min-w-0 flex-1 font-sans text-primary text-sm text-start">
      <span class="inline-flex items-center gap-1">Session usage<span class="inline-flex">
        <button aria-label="About session usage" type="button" title="About session usage" class="info">i</button>
      </span></span>
    </div>
    <div class="shrink-0 font-sans text-primary text-sm" data-native-value>${amount}</div>
  </div>`;

const panel = (amount = "218.77 credits") => `
  <aside class="panel" aria-label="Computer usage preview">
    <div class="panel-heading">Sources <span>4 <span aria-hidden="true">+</span></span></div>
    <button class="usage-toggle" aria-expanded="true">Usage <span aria-hidden="true">⌄</span></button>
    <div class="usage-content">
      ${nativeRow(amount)}
      <div class="manage-wrap"><a href="#settings/usage" class="manage">Manage usage and credits</a></div>
    </div>
  </aside>`;

const orgPanel = (amount = "50,000", label = "Available org credits") => `
  <section class="org-panel" aria-label="Organization credit preview">
    <div class="org-top">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1"><div class="font-sans text-sm text-secondary">${label}</div></div>
        <div class="pt-0.5"><div class="font-sans text-primary text-xl" data-org-value>${amount}</div></div>
      </div>
      <button class="add-more" type="button">Add more</button>
    </div>
    <div class="org-refill"><span class="check" aria-hidden="true">✓</span><div><strong>Auto-refill enabled.</strong> <span class="text-secondary"><span data-refill>20,000</span> will be added when org balance is low</span></div></div>
  </section>`;

const css = `
  :root { color-scheme:light; --bg:#f7f7f5; --surface:#fff; --ink:#233238; --muted:#5c676c; --line:#e5e7e6; --soft:#f1f2f0; }
  :root[data-theme=dark] { color-scheme:dark; --bg:#171b1c; --surface:#202526; --ink:#e4e8e6; --muted:#b1b9b6; --line:#343b3b; --soft:#2c3233; }
  * { box-sizing:border-box }
  body { margin:0; padding:32px; background:var(--bg); color:var(--ink); font:14px/20px system-ui,sans-serif; }
  button,a { font:inherit;color:inherit }
  button { cursor:pointer }
  .panel { width:340px; max-width:100%; padding:0 8px 4px; border:1px solid var(--line); border-radius:16px; background:var(--surface); box-shadow:0 2px 6px #10201806; }
  .panel-heading { display:flex;align-items:center;justify-content:space-between; padding:14px 4px; margin:0 4px; border-bottom:1px solid var(--line); color:var(--muted); }
  .panel-heading>span { display:flex;gap:12px }
  .usage-toggle { display:flex;align-items:center;justify-content:space-between;width:100%; padding:14px 4px 8px; background:none;border:0;color:var(--muted);text-align:left; }
  .usage-content { padding:0 4px }
  .flex,.inline-flex { display:flex }.inline-flex { display:inline-flex }.items-center { align-items:center }
  .gap-2 { gap:8px }.gap-1 { gap:4px }.pl-2 { padding-left:8px }.pr-2 { padding-right:8px }.py-2 { padding-block:8px }
  .min-w-0 { min-width:0 }.flex-1 { flex:1 }.shrink-0 { flex-shrink:0 }.text-primary { color:var(--ink) }
  .text-sm { font-size:14px;line-height:20px }.font-sans { font-family:inherit }.text-start { text-align:start }
  .text-secondary { color:var(--muted) }.text-xl { font-size:20px;line-height:28px }.flex-col { flex-direction:column }
  .native-icon { width:16px;flex-shrink:0;font-size:18px;text-align:center }
  .info { display:flex;align-items:center;justify-content:center;margin:0;padding:0;width:16px;height:20px;border:0;background:none;color:var(--muted);font-size:11px; }
  .info::first-letter { border:1px solid currentColor;border-radius:50%; }
  .manage-wrap { padding:8px }.manage { display:flex;justify-content:center;align-items:center;height:32px;border-radius:8px;background:var(--soft);text-decoration:none;font-weight:500;white-space:nowrap; }
  .usage-content[hidden] { display:none }
  .controls { margin-top:24px;display:flex;gap:8px;flex-wrap:wrap;max-width:340px }
  .controls button { border:1px solid var(--line);border-radius:6px;padding:8px 12px;background:var(--surface); }
  .org-panel { max-width:640px; width:100%; border:1px solid var(--line);border-radius:12px;background:var(--surface);overflow:hidden; }
  .org-top { display:flex;justify-content:space-between;gap:24px;align-items:center;padding:24px;flex-wrap:wrap }
  .add-more { background:var(--ink);color:var(--surface);border:0;border-radius:8px;padding:8px 16px;white-space:nowrap;font-weight:500 }
  .org-refill { display:flex;align-items:center;gap:12px;border-top:1px solid var(--line);padding:16px 24px;font-size:13px;line-height:20px;background:var(--soft) }
  .check { font-size:16px }.org-controls { max-width:640px }
  button:focus-visible,a:focus-visible { outline:2px solid currentColor;outline-offset:3px }
  @media(max-width:400px) { body { padding:16px }.panel { width:100% } }
`;

function html(amount = "218.77 credits", controls = true) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Perplexity Cost Transparency test fixture</title><style>${css}</style></head>
  <body>${panel(amount)}
  ${controls ? `<div class="controls">
    <button id="increase">Update credits</button><button id="replace">Replace panel</button>
    <button id="switch">Switch session</button><button id="theme">Switch theme</button>
    <button id="invalid">Unreadable count</button><button id="restore">Restore count</button>
    <button id="leave">Leave session</button><button id="return">Return to session</button>
  </div>` : ""}
  <script>
  const original = document.querySelector(".panel").outerHTML;
  function on(id, fn) { document.getElementById(id)?.addEventListener("click", fn); }
  document.addEventListener("click", e => {
    if(e.target.closest(".usage-toggle")) {
      const body = document.querySelector(".usage-content");
      body.hidden = !body.hidden;
      document.querySelector(".usage-toggle").setAttribute("aria-expanded", String(!body.hidden));
    }
  });
  on("increase", () => document.querySelector("[data-native-value]").textContent="1,234.56 credits");
  on("replace", () => document.querySelector(".panel").outerHTML=original.replace("218.77", "500"));
  on("switch", () => { history.pushState({}, "", "/computer/tasks/another-example"); document.querySelector("[data-native-value]").textContent="50,000 credits"; });
  on("theme", () => document.documentElement.dataset.theme=document.documentElement.dataset.theme==="dark"?"light":"dark");
  on("invalid", () => document.querySelector("[data-native-value]").textContent="Loading…");
  on("restore", () => document.querySelector("[data-native-value]").textContent="218.77 credits");
  on("leave", () => { history.pushState({}, "", "/search"); document.querySelector(".panel").setAttribute("aria-label", "Non-session page"); });
  on("return", () => { history.pushState({}, "", "/computer/tasks/synthetic-example"); document.querySelector(".panel").setAttribute("aria-label", "Computer usage preview"); });
  </script></body></html>`;
}

function orgHtml(amount = "50,000", controls = true) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Organization credit equivalent fixture</title><style>${css}</style></head>
  <body>${orgPanel(amount)}
  ${controls ? `<div class="controls org-controls">
    <button id="decrease">Update org credits</button><button id="replace">Replace org card</button>
    <button id="invalid">Unreadable balance</button><button id="restore">Restore balance</button>
    <button id="theme">Switch theme</button></div>` : ""}
  <script>
  const original=document.querySelector(".org-panel").outerHTML;
  function on(id,fn){document.getElementById(id)?.addEventListener("click",fn)}
  on("decrease",()=>document.querySelector("[data-org-value]").firstChild.data="25,000");
  on("replace",()=>document.querySelector(".org-panel").outerHTML=original.replace("50,000","100,000"));
  on("invalid",()=>document.querySelector("[data-org-value]").textContent="Loading…");
  on("restore",()=>document.querySelector("[data-org-value]").textContent="50,000");
  on("theme",()=>document.documentElement.dataset.theme=document.documentElement.dataset.theme==="dark"?"light":"dark");
  </script></body></html>`;
}

module.exports = { nativeRow, panel, orgPanel, html, orgHtml, css };
