require("dotenv").config({ path: ".env.local" });

const Database = require("better-sqlite3");

const dbFile = process.env.DATABASE_URL || "./data/app.db";
const sqlite = new Database(dbFile);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n, len) {
  return String(n).padStart(len, "0");
}

function makeCitizenId(i) {
  // 13 digits, deterministic, unique for i in [1..9999999999999]
  return pad(i, 13);
}

const firstNames = [
  "Somchai",
  "Somsri",
  "Anan",
  "Kanya",
  "Niran",
  "Arisa",
  "Prasit",
  "Siriporn",
  "Thanakorn",
  "Pimchanok",
];

const lastNames = [
  "Srisuk",
  "Pattanakul",
  "Wongchai",
  "Jaroen",
  "Saelim",
  "Chantarangkul",
  "Rattanapong",
  "Kittisak",
  "Boonmee",
  "Srisawat",
];

const genders = ["M", "F", "O"];

const insert = sqlite.prepare(
  "INSERT INTO population (citizen_id, full_name, gender, birth_date) VALUES (@citizenId, @fullName, @gender, @birthDate)"
);

const insertMany = sqlite.transaction((rows) => {
  for (const r of rows) insert.run(r);
});

const now = new Date();
const baseYear = now.getFullYear() - 60;

const rows = [];
for (let idx = 1; idx <= 100; idx++) {
  const citizenId = makeCitizenId(idx);
  const fullName = `${firstNames[randomInt(0, firstNames.length - 1)]} ${lastNames[randomInt(0, lastNames.length - 1)]}`;
  const gender = genders[randomInt(0, genders.length - 1)];

  // random birth date between baseYear..baseYear+50
  const year = baseYear + randomInt(0, 50);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  rows.push({
    citizenId,
    fullName,
    gender,
    birthDate: birthDate.getTime(),
  });
}

try {
  insertMany(rows);
  const count = sqlite.prepare("SELECT COUNT(*) as c FROM population").get().c;
  console.log(`Seeded 100 population rows into ${dbFile}. Total now: ${count}`);
} finally {
  sqlite.close();
}
