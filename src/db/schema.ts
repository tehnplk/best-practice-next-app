import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const populationTable = sqliteTable("population", {
  citizenId: text("citizen_id", { length: 13 }).primaryKey(),
  fullName: text("full_name").notNull(),
  gender: text("gender", { enum: ["M", "F", "O"] }).notNull(),
  birthDate: integer("birth_date", { mode: "timestamp_ms" }).notNull(),
});

export type PopulationRow = typeof populationTable.$inferSelect;
