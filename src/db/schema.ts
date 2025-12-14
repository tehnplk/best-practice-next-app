import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const populationTable = sqliteTable("population", {
  cid: text("citizen_id", { length: 13 }).primaryKey(),
  fullName: text("full_name").notNull(),
  gender: text("gender", { enum: ["M", "F", "O"] }).notNull(),
  birthDate: integer("birth_date", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
});

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .$defaultFn(() => false)
      .notNull(),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    providerProfileJson: text("provider_profile_json"),
    organizationJson: text("organization_json"),
  },
  (t) => [uniqueIndex("user_email_unique").on(t.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("session_token_unique").on(t.token)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("account_provider_account_unique").on(t.providerId, t.accountId),
  ],
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(
    () => new Date(),
  ),
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

export const hospitalTable = sqliteTable("hospital", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  city: text("city"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type HospitalRow = typeof hospitalTable.$inferSelect;
