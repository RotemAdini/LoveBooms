// יוצר קודי פתיחה לגרסה המלאה.
//   node tools/make-codes.mjs 100
// כותב את הקודים עצמם ל-private/codes.csv (לא עולה ל-git) ומוסיף את טביעות ה-SHA-256 שלהם ל-codes.js.
// קודים קיימים נשמרים; הרצה נוספת רק מוסיפה חדשים.
import { createHash, randomInt } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALT = "lovebooms-box-v1"; // חייב להיות זהה ל-config.js
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // בלי 0/O/1/I/L
const n = Math.max(1, Math.min(5000, parseInt(process.argv[2] || "50", 10) || 50));

const hash = (code) => createHash("sha256").update(SALT + ":" + code).digest("hex");
const block = () => Array.from({ length: 4 }, () => ALPHA[randomInt(ALPHA.length)]).join("");

const csvPath = join(root, "private", "codes.csv");
const jsPath = join(root, "codes.js");
mkdirSync(join(root, "private"), { recursive: true });

const existing = existsSync(csvPath)
  ? readFileSync(csvPath, "utf8").split(/\r?\n/).slice(1).map((l) => l.split(",")[0]).filter(Boolean)
  : [];
const all = new Set(existing);
const fresh = [];
while (fresh.length < n) {
  const c = `LOVE-${block()}-${block()}`;
  if (!all.has(c)) { all.add(c); fresh.push(c); }
}

const today = new Date().toISOString().slice(0, 10);
const oldRows = existsSync(csvPath) ? readFileSync(csvPath, "utf8").split(/\r?\n/).slice(1).filter(Boolean) : [];
const rows = [...oldRows, ...fresh.map((c) => `${c},${today},`)];
writeFileSync(csvPath, "code,created,sold_to\n" + rows.join("\n") + "\n");

const hashes = [...all].map(hash).sort();
writeFileSync(jsPath, "/* נוצר על ידי tools/make-codes.mjs. לא לערוך ידנית. */\nconst LB_CODE_HASHES = new Set(" + JSON.stringify(hashes) + ");\n");

console.log(`נוספו ${fresh.length} קודים. סה"כ ${all.size}.`);
console.log(`הקודים: ${csvPath}`);
