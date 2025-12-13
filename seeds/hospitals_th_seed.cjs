require("dotenv").config({ path: ".env.local" });

const Database = require("better-sqlite3");

const dbFile = process.env.DATABASE_URL || "./data/app.db";
const sqlite = new Database(dbFile);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const hospitalPrefixes = [
  "Rongphayaban",
  "Hospital",
  "Medical Center",
  "Clinic",
  "Health Hub"
];

const hospitalNames = [
  "Bangkok",
  "Siriraj",
  "Ramathibodi",
  "Chulalongkorn",
  "Rajavithi",
  "Bumrungrad",
  "Phyathai",
  "Samitivej",
  "Vichaiyut",
  "Praram 9",
  "Saint Louis",
  "Camillian",
  "Ladprao",
  "Vibhavadi",
  "Kasemrad",
  "Thonburi",
  "Nakornthon",
  "Synphaet",
  "Paolo",
  "Sikarin",
  "Vejthani",
  "Chaophya",
  "Thainakarin",
  "Bangpo",
  "Yanhee",
  "Mission",
  "Mongkutwattana",
  "Navamin",
  "Seriruk",
  "Vibharam"
];

const locations = [
  "",
  "International",
  "General",
  "Memorial",
  "Chiang Mai",
  "Phuket",
  "Pattaya",
  "Hat Yai",
  "Khon Kaen",
  "Udon Thani",
  "Saraburi",
  "Rayong",
  "Hua Hin",
  "Samui",
  "Trang",
  "Yala",
  "Korat",
  "Rangsit",
  "Bangna",
  "Srinakarin"
];

function generateHospitalName() {
  const core = hospitalNames[randomInt(0, hospitalNames.length - 1)];
  const loc = locations[randomInt(0, locations.length - 1)];
  
  // Mix formats: "Bangkok Hospital", "Phyathai 2", "Samitivej Sukhumvit"
  const formats = [
    `${core} Hospital`,
    `${core} ${loc}`.trim(),
    `${core} Hospital ${loc}`.trim(),
    `Rongphayaban ${core}`,
  ];
  
  return formats[randomInt(0, formats.length - 1)];
}

const insert = sqlite.prepare(
  "INSERT INTO hospital (name, created_at) VALUES (@name, @createdAt)"
);

const insertMany = sqlite.transaction((rows) => {
  for (const r of rows) insert.run(r);
});

const nowTime = Date.now();
const rows = [];
const uniqueNames = new Set();

while (rows.length < 100) {
  let name = generateHospitalName();
  
  // Avoid literal duplicates if possible, though not strictly required by schema (unless unique constraint)
  if (!uniqueNames.has(name)) {
      uniqueNames.add(name);
      rows.push({
        name,
        createdAt: nowTime - randomInt(0, 1000000000) // Random time in past
      });
  } else {
     // Add a number to make it unique
     name = `${name} ${randomInt(1, 99)}`;
     if (!uniqueNames.has(name)) {
        uniqueNames.add(name);
        rows.push({
            name,
            createdAt: nowTime - randomInt(0, 1000000000)
        });
     }
  }
}

try {
  insertMany(rows);
  const count = sqlite.prepare("SELECT COUNT(*) as c FROM hospital").get().c;
  console.log(`Seeded ${rows.length} hospital rows into ${dbFile}. Total now: ${count}`);
} catch (error) {
    if (error.message.includes("no such table")) {
        console.error("Error: Table 'hospital' does not exist. Please run migrations first.");
    } else {
        console.error("Error seeding data:", error);
    }
} finally {
  sqlite.close();
}
