require("dotenv").config({ path: ".env.local" });

const Database = require("better-sqlite3");

const dbFile = process.env.DATABASE_URL || "./data/app.db";
const sqlite = new Database(dbFile);

function main() {
  const now = Date.now();

  const before = sqlite.prepare("SELECT COUNT(*) AS c FROM population WHERE created_at IS NULL").get().c;

  const res = sqlite
    .prepare("UPDATE population SET created_at = ? WHERE created_at IS NULL")
    .run(now);

  const after = sqlite.prepare("SELECT COUNT(*) AS c FROM population WHERE created_at IS NULL").get().c;

  console.log(`Backfilled population.created_at. Updated: ${res.changes}. NULL before: ${before}. NULL after: ${after}.`);
}

main();
