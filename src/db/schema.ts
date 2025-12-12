import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const populationTable = sqliteTable("population", {
  cid: text("citizen_id", { length: 13 }).primaryKey(),
  fullName: text("full_name").notNull(),
  gender: text("gender", { enum: ["M", "F", "O"] }).notNull(),
  birthDate: integer("birth_date", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
});

export const hospitalAdmissionHistoryTable = sqliteTable(
  "hospital_admission_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cid: text("cid", { length: 13 }).notNull(),
    admissionDate: integer("admission_date", { mode: "timestamp_ms" }).notNull(),
    hospitalName: text("hospital_name").notNull(),
  },
);

export type PopulationRow = typeof populationTable.$inferSelect;

export type HospitalAdmissionHistoryRow =
  typeof hospitalAdmissionHistoryTable.$inferSelect;
