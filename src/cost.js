/* Perplexity Cost Transparency | MIT License */
(function (root) {
  "use strict";

  // A user-supplied net purchase assumption, not an official pricing feed.
  const CREDIT_PACK = 50_000;
  const PACK_PRICE_USD = 600;
  const USD_PER_CREDIT = PACK_PRICE_USD / CREDIT_PACK;
  const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function parseNumber(text) {
    if (typeof text !== "string") return null;
    let amount = text
      .replace(/[\u00a0\u202f]/g, " ")
      .replace(/[\u2018\u2019]/g, "'")
      .trim();
    if (/^\d+(?:\.\d+)?$/.test(amount)) {
      // Plain English decimal.
    } else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(amount)) {
      amount = amount.replace(/,/g, "");
    } else if (/^\d{1,3}([' ])\d{3}(?:\1\d{3})*(?:[.,]\d+)?$/.test(amount)) {
      amount = amount.replace(/[' ]/g, "").replace(",", ".");
    } else if (/^\d+,\d{1,2}$/.test(amount)) {
      amount = amount.replace(",", ".");
    } else {
      // No guessing at compact counts, ranges, malformed grouping or other units.
      return null;
    }

    const value = Number(amount);
    return Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
      ? value
      : null;
  }

  function parseCredits(text) {
    if (typeof text !== "string") return null;
    const match = text.trim().match(/^(.+?)\s+credits?$/i);
    return match ? parseNumber(match[1]) : null;
  }

  function formatCost(credits) {
    if (!Number.isFinite(credits) || credits < 0) return "Unavailable";
    const equivalent = credits * USD_PER_CREDIT;
    if (!Number.isFinite(equivalent)) return "Unavailable";
    if (equivalent > 0 && equivalent < 0.01) return "<$0.01";
    return usd.format(equivalent);
  }

  const api = Object.freeze({
    CREDIT_PACK,
    PACK_PRICE_USD,
    USD_PER_CREDIT,
    parseNumber,
    parseCredits,
    formatCost,
  });

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PplxCostTransparency = api;
})(globalThis);
