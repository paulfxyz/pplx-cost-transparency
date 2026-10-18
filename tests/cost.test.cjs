const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseCredits, formatCost, USD_PER_CREDIT } = require("../src/cost.js");

test("the fixed purchase assumption is $0.012 per credit", () => {
  assert.equal(USD_PER_CREDIT, 0.012);
});

for (const [input, expected] of [
  ["0 credits", 0], ["1 credit", 1], ["218.77 credits", 218.77],
  ["1,234.56 credits", 1234.56], ["50,000 credits", 50000],
  ["50'000 credits", 50000], ["50’000 credits", 50000],
  ["50 000 credits", 50000], ["50\u00a0000 credits", 50000],
  ["50\u202f000 credits", 50000], ["218,77 credits", 218.77],
  ["1 234,56 credits", 1234.56], ["  218.77 credits  ", 218.77],
  ["1,234,567.89 credits", 1234567.89], ["1'234'567.89 credits", 1234567.89],
]) {
  test(`parses ${JSON.stringify(input)}`, () => assert.equal(parseCredits(input), expected));
}

for (const input of [
  "", null, undefined, "Loading…", "-", "∞", "-5 credits", "$600",
  "50,000 credits remaining", "Session usage 218.77 credits", "1.2k credits",
  "218.77", "1,23,456 credits", "12 34 credits", "1 234'567 credits",
  "1..2 credits", "1e3 credits", "NaN credits", "2 / 50,000 credits",
  "9007199254740992 credits", "<10 credits", "50,000 tokens",
]) {
  test(`rejects ${JSON.stringify(input)}`, () => assert.equal(parseCredits(input), null));
}

for (const [input, expected] of [
  [0, "$0.00"], [0.01, "<$0.01"], [0.5, "<$0.01"], [1, "$0.01"],
  [1.25, "$0.02"], [218.77, "$2.63"], [1234.56, "$14.81"],
  [50000, "$600.00"], [1000000, "$12,000.00"],
  [null, "Unavailable"], [NaN, "Unavailable"], [Infinity, "Unavailable"],
  [-1, "Unavailable"],
]) {
  test(`formats ${input} as ${expected}`, () => assert.equal(formatCost(input), expected));
}
