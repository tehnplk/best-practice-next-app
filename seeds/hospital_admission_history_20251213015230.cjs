require("dotenv").config({ path: ".env.local" });

const Database = require("better-sqlite3");

const dbFile = process.env.DATABASE_URL || "./data/app.db";
const sqlite = new Database(dbFile);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDateMsWithinYearsBack(yearsBack) {
  const now = Date.now();
  const daysBack = yearsBack * 365;
  const backMs = randomInt(0, daysBack) * 24 * 60 * 60 * 1000;
  // random time-of-day
  const timeMs = randomInt(0, 24 * 60 * 60 * 1000 - 1);
  return now - backMs - timeMs;
}

const HOSPITALS = [
  "โรงพยาบาลศิริราช",
  "โรงพยาบาลจุฬาลงกรณ์",
  "โรงพยาบาลรามาธิบดี",
  "โรงพยาบาลมหาราชนครเชียงใหม่",
  "โรงพยาบาลสงขลานครินทร์",
  "โรงพยาบาลขอนแก่น",
  "โรงพยาบาลศูนย์อุดรธานี",
  "โรงพยาบาลหาดใหญ่",
  "โรงพยาบาลภูมิพลอดุลยเดช",
  "โรงพยาบาลพระมงกุฎเกล้า",
];

function main() {
  const cids = sqlite
    .prepare("SELECT citizen_id AS cid FROM population")
    .all()
    .map((r) => r.cid)
    .filter(Boolean);

  if (cids.length === 0) {
    console.log("No population rows found. Seed population first.");
    return;
  }

  const insert = sqlite.prepare(
    "INSERT INTO hospital_admission_history (cid, admission_date, hospital_name) VALUES (?, ?, ?)"
  );

  const tx = sqlite.transaction(() => {
    for (const cid of cids) {
      const n = randomInt(0, 10);
      for (let i = 0; i < n; i++) {
        const admissionDate = randomDateMsWithinYearsBack(5);
        const hospitalName = randomPick(HOSPITALS);
        insert.run(cid, admissionDate, hospitalName);
      }
    }
  });

  tx();

  const total = sqlite
    .prepare("SELECT COUNT(*) AS c FROM hospital_admission_history")
    .get().c;

  console.log(`Seeded hospital_admission_history for ${cids.length} people. Total rows now: ${total}`);
}

main();
