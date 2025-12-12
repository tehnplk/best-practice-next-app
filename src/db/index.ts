import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const dbFile = process.env.DATABASE_URL ?? "./data/app.db";

const sqlite = new Database(dbFile);

export const db = drizzle({ client: sqlite });
