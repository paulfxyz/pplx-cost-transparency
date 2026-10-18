/* Perplexity Cost Transparency | MIT License */
(() => {
  "use strict";

  // Content scripts run in Chrome's isolated world, not the website's JS world.
  if (globalThis.__pplxCostTransparencyStarted) return;
  const money = globalThis.PplxCostTransparency;
  if (!money) return;
  globalThis.__pplxCostTransparencyStarted = true;

  const ANCHOR = 'button[aria-label="About session usage"]';
  const OWN_ROW = "[data-pct-row], [data-pct-org]";
  const ORG_LABEL = /^Available\s+(?:org|organization|organisation)\s+credits$/i;
  const RATE = `$${money.PACK_PRICE_USD.toLocaleString("en-US")} gross / ${money.CREDIT_PACK.toLocaleString("en-US")} credits = $${money.USD_PER_CREDIT} per credit`;
  const mounts = new Map();
  const orgMounts = new Map();
  let queued = false;
  let suspended = false;
  let lastPath = "";

  const isSession = () => /^\/computer\/tasks\/[^/]+\/?$/.test(location.pathname);
  const isOrgUsage = () => /^\/account\/org\/credits-usage\/?$/.test(location.pathname);
  const isOwned = (node) =>
    (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest(OWN_ROW);

  function findSource(anchor) {
    // Prefer the native semantic row class. Never select a whole usage card:
    // it can contain balances and other unrelated credit totals.
    const nativeRow = anchor.closest(".group\\/context-pane-row");
    if (nativeRow && nativeRow.lastElementChild && !nativeRow.lastElementChild.contains(anchor)) {
      return nativeRow;
    }

    // Bounded fallback for modest markup changes, still anchored to the info button.
    let node = anchor.parentElement;
    for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
      const last = node.lastElementChild;
      if (
        node.children.length >= 2 &&
        node.children.length <= 4 &&
        last &&
        !last.contains(anchor) &&
        !last.querySelector("a, button, input") &&
        node.querySelectorAll(ANCHOR).length === 1 &&
        /Session\s+usage/i.test(node.textContent) &&
        node.textContent.length < 160 &&
        money.parseCredits(last.textContent) !== null
      ) return node;
    }
    return null;
  }

  function createMount(source) {
    const row = document.createElement("div");
    row.className = source.className;
    row.setAttribute("data-pct-row", "");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Estimated session cost in US dollars");

    const sourceValue = source.lastElementChild;
    const sourceLabel = Array.from(source.children).find((child) => child.querySelector(ANCHOR));
    const icon = document.createElement("span");
    icon.className = `${sourceValue.className} pct-icon`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "$";

    const label = document.createElement("div");
    label.className = `${sourceLabel?.className || ""} pct-label`;
    label.textContent = "Cost equi.";

    const value = document.createElement("div");
    value.className = `${sourceValue.className} pct-value`;
    value.setAttribute("data-pct-value", "");
    value.setAttribute("aria-live", "polite");
    value.setAttribute("aria-atomic", "true");
    value.setAttribute("dir", "ltr");
    row.append(icon, label, value);
    return { row, value };
  }

  function rawText(source) {
    // Exclude our inline suffix so an org balance never reads back its own USD.
    const collect = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
      if (node.nodeType !== Node.ELEMENT_NODE || node.matches(OWN_ROW)) return "";
      return Array.from(node.childNodes, collect).join("");
    };
    return collect(source).trim();
  }

  function orgSources() {
    const results = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      if (!ORG_LABEL.test(text.nodeValue.trim()) || isOwned(text)) continue;
      const label = text.parentElement;
      // Known layout: label in a wrapper, then a sibling amount wrapper.
      // Also allow label and amount to be direct siblings. Never climb to
      // the whole settings page or infer a pool from refill/grant amounts.
      for (const block of [label.nextElementSibling, label.parentElement?.nextElementSibling]) {
        if (!block || block.matches("a,button,input,select,table") || block.querySelector("a,button,input,select,table")) continue;
        let amount = block;
        while (true) {
          const nativeChildren = Array.from(amount.children).filter((child) => !child.matches(OWN_ROW));
          if (nativeChildren.length !== 1 || !/^(DIV|SPAN|P)$/.test(nativeChildren[0].tagName)) break;
          amount = nativeChildren[0];
        }
        const raw = rawText(amount);
        if (raw.length > 80 || amount === label || amount.contains(label)) continue;
        if (money.parseNumber(raw) === null && !/^(?:Loading[.…]*|[-…]|\s*)$/i.test(raw)) continue;
        results.set(amount, label);
        break;
      }
    }
    return results;
  }

  function syncOrg() {
    const sources = isOrgUsage() ? orgSources() : new Map();
    for (const [source, { row }] of orgMounts) {
      if (!sources.has(source) || !source.isConnected) {
        row.remove();
        orgMounts.delete(source);
      }
    }
    for (const [source, label] of sources) {
      let mount = orgMounts.get(source);
      if (!mount) {
        const row = document.createElement("span");
        row.setAttribute("data-pct-org", "");
        row.setAttribute("aria-live", "polite");
        row.setAttribute("aria-atomic", "true");
        row.setAttribute("dir", "ltr");
        mount = { row, label };
        orgMounts.set(source, mount);
      }
      const credits = money.parseNumber(rawText(source));
      const nextValue = credits === null ? "(Unavailable)" : `(${money.formatCost(credits)})`;
      const nextTitle =
        credits === null
          ? "USD equivalent unavailable: the available organization credit balance could not be read."
          : `Estimated USD equivalent of the available organization credit pool, not credits spent or cash redeemable. Rate: ${RATE}. Not an invoice.`;
      if (mount.row.textContent !== nextValue) mount.row.textContent = nextValue;
      if (mount.row.title !== nextTitle) {
        mount.row.title = nextTitle;
      }
      const nextLabel = `Available organization credit equivalent: ${nextValue}`;
      if (mount.row.getAttribute("aria-label") !== nextLabel) mount.row.setAttribute("aria-label", nextLabel);
      if (mount.row.parentElement !== source) source.append(mount.row);
    }
  }

  function sync() {
    queued = false;
    if (suspended) return;
    lastPath = location.pathname;
    syncOrg();

    if (!isSession()) {
      for (const { row } of mounts.values()) row.remove();
      mounts.clear();
      return;
    }

    const sources = new Set();
    for (const anchor of document.querySelectorAll(ANCHOR)) {
      const source = findSource(anchor);
      if (source && !isOwned(source)) sources.add(source);
    }

    for (const [source, mount] of mounts) {
      if (!sources.has(source) || !source.isConnected) {
        mount.row.remove();
        mounts.delete(source);
      }
    }

    for (const source of sources) {
      let mount = mounts.get(source);
      if (!mount) {
        mount = createMount(source);
        mounts.set(source, mount);
      }
      // React can replace a subtree or remove an unknown sibling. Reattach
      // immediately below the source without mutating React-owned elements.
      if (source.nextElementSibling !== mount.row) source.after(mount.row);

      const raw = source.lastElementChild.textContent.trim();
      const credits = money.parseCredits(raw);
      const nextValue = credits === null ? "Unavailable" : money.formatCost(credits);
      const nextTitle =
        credits === null
          ? "USD estimate unavailable: the displayed session credits could not be read. No value is assumed."
          : `Estimated USD equivalent of ${raw}. Rate: ${RATE}. Based only on the displayed count, including any rounding or reporting delay. Not an invoice.`;

      // Idempotent writes prevent observer feedback and needless announcements.
      if (mount.value.textContent !== nextValue) mount.value.textContent = nextValue;
      if (mount.row.title !== nextTitle) {
        mount.row.title = nextTitle;
        mount.row.setAttribute("aria-description", nextTitle);
      }
    }
  }

  function schedule() {
    if (queued || suspended) return;
    queued = true;
    queueMicrotask(sync);
  }

  function changed(records) {
    if (suspended) return;
    if (location.pathname !== lastPath) {
      schedule();
      return;
    }
    for (const record of records) {
      if (isOwned(record.target)) continue;
      for (const [source, { row }] of mounts) {
        if (!source.isConnected || !row.isConnected || source.contains(record.target)) {
          schedule();
          return;
        }
      }
      for (const [source, { row, label }] of orgMounts) {
        if (!source.isConnected || !row.isConnected || !label.isConnected ||
            source.contains(record.target) || label.contains(record.target)) {
          schedule();
          return;
        }
      }
      // The settings page has no streamed conversation. Recheck its bounded
      // labeled card when values mount, become unreadable, or recover.
      if (isOrgUsage() && (record.type === "characterData" || record.type === "childList")) {
        schedule();
        return;
      }
      // A streaming conversation can mutate constantly. Search only newly
      // added subtrees, never rescan the whole page for every streamed token.
      if (record.type === "attributes" && record.target.matches?.(ANCHOR)) {
        schedule();
        return;
      }
      if (isOrgUsage() && record.type === "characterData" && ORG_LABEL.test(record.target.nodeValue.trim())) {
        schedule();
        return;
      }
      for (const node of record.addedNodes) {
        if (isOwned(node)) continue;
        if (isOrgUsage() && /Available\s+(?:org|organization|organisation)\s+credits/i.test(node.textContent)) {
          schedule();
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE && (node.matches(ANCHOR) || node.querySelector(ANCHOR))) {
          schedule();
          return;
        }
      }
    }
  }

  const observer = new MutationObserver(changed);
  function observe() {
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label"],
    });
  }
  observe();
  window.addEventListener("popstate", schedule);
  window.addEventListener("pagehide", () => {
    suspended = true;
    observer.disconnect();
  });
  window.addEventListener("pageshow", () => {
    suspended = false;
    observe();
    schedule();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule();
  });
  schedule();
})();
