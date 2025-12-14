import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbFile = process.env.DATABASE_URL ?? "./data/app.db";

const findProjectRoot = (startDir: string): string | undefined => {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
};

const runtimeDir = typeof __dirname !== "undefined" ? __dirname : undefined;

const projectRoot =
  findProjectRoot(process.cwd()) ??
  (runtimeDir ? findProjectRoot(runtimeDir) : undefined) ??
  process.cwd();

const resolveSqliteFilePath = (value: string): string => {
  if (value === ":memory:") {
    return value;
  }
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.resolve(projectRoot, value);
};

const sqlite = new Database(resolveSqliteFilePath(dbFile));

export const db = drizzle({ client: sqlite });
