/**
 * Shared printing helpers for the demo source documents: figures, words,
 * deterministic identifiers. Nothing here is random — the same mock data always
 * prints the same document, so regenerating never moves a highlight box.
 */

const inr = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const qty = (n) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 });

const ONES =
  "Zero One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve Thirteen Fourteen Fifteen Sixteen Seventeen Eighteen Nineteen".split(
    " "
  );
const TENS = "  Twenty Thirty Forty Fifty Sixty Seventy Eighty Ninety".split(" ");

const twoDigits = (n) =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;

const threeDigits = (n) => {
  const h = Math.floor(n / 100),
    r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? twoDigits(r) : ""]
    .filter(Boolean)
    .join(" ");
};

/** Indian-system amount in words: "Rupees One Lakh … and Forty Paise Only". */
const words = (amount) => {
  const rupees = Math.floor(amount + 1e-6);
  const paise = Math.round((amount - rupees) * 100);
  const parts = [];
  let n = rupees;
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  const head = `Indian Rupees ${parts.join(" ") || "Zero"}`;
  return `${head}${paise ? ` and ${twoDigits(paise)} Paise` : ""} Only`;
};

/** A stable 32-bit hash of a string, for identifiers that never change. */
const hash = (text) => {
  let h = 2166136261;
  for (const c of String(text)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** n decimal digits drawn from a seed string. */
const digits = (seed, n) => {
  let out = "",
    i = 0;
  while (out.length < n) out += String(hash(`${seed}:${i++}`)).padStart(10, "0");
  return out.slice(0, n);
};

const hex = (seed, n) => {
  let out = "",
    i = 0;
  while (out.length < n) out += hash(`${seed}#${i++}`).toString(16).padStart(8, "0");
  return out.slice(0, n);
};

const BANKS = [
  ["HDFC Bank", "HDFC"],
  ["ICICI Bank", "ICIC"],
  ["State Bank of India", "SBIN"],
  ["Axis Bank", "UTIB"],
  ["Canara Bank", "CNRB"],
  ["Kotak Mahindra Bank", "KKBK"],
];

const bankFor = (name) => {
  const [bank, code] = BANKS[hash(name) % BANKS.length];
  return {
    bank,
    account: digits(`${name}/ac`, 14),
    ifsc: `${code}0${digits(`${name}/ifsc`, 6)}`,
  };
};

const STATES = {
  "06": "Haryana",
  24: "Gujarat",
  27: "Maharashtra",
  29: "Karnataka",
  32: "Kerala",
  33: "Tamil Nadu",
  36: "Telangana",
};

const stateOf = (gstin) => STATES[String(gstin).slice(0, 2)] || "Karnataka";

/** "04 Sep 2026" / "27 August 2026" → "04-Sep-2026" (Tally prints dates so). */
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const parseDate = (value) => {
  const m = String(value)
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (!m) return null;
  return { d: m[1].padStart(2, "0"), m: m[2][0].toUpperCase() + m[2].slice(1, 3).toLowerCase(), y: m[3] };
};
const tallyDate = (value) => {
  const p = parseDate(value);
  return p ? `${+p.d}-${p.m}-${p.y.slice(2)}` : value;
};
const longDate = (value) => {
  const p = parseDate(value);
  return p ? `${p.d} ${p.m} ${p.y}` : value;
};
const slashDate = (value) => {
  const p = parseDate(value);
  return p
    ? `${p.d}/${String(MONTHS.indexOf(p.m) + 1).padStart(2, "0")}/${p.y}`
    : value;
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * A QR-looking block for the e-invoice "Signed QR Code" slot. Drawn from the
 * IRN so every invoice has its own; it does not decode to anything.
 */
const qr = (seed, size = 96) => {
  const n = 25,
    cell = size / n;
  const on = (x, y) => {
    // A finder square: solid ring, blank ring, solid 3×3 centre.
    const finder = (fx, fy) => {
      if (x < fx || x >= fx + 7 || y < fy || y >= fy + 7) return null;
      const ring = Math.min(x - fx, y - fy, fx + 6 - x, fy + 6 - y);
      return ring !== 1;
    };
    for (const [fx, fy] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ]) {
      const f = finder(fx, fy);
      if (f !== null) return f;
    }
    if ((x === 7 || y === 7) && (x < 8 || x > n - 9) && (y < 8 || y > n - 9))
      return false;
    return hash(`${seed}${x},${y}`) % 2 === 0;
  };
  let rects = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (on(x, y))
        rects += `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="#111">${rects}</svg>`;
};

module.exports = {
  inr,
  qty,
  words,
  hash,
  digits,
  hex,
  bankFor,
  stateOf,
  tallyDate,
  longDate,
  slashDate,
  esc,
  qr,
};
