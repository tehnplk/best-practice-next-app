import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

import { betterAuth } from "better-auth";
import { createAuthEndpoint, createAuthMiddleware, sessionMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createFieldAttribute } from "better-auth/db";
import { genericOAuth } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  user: {
    additionalFields: {
      providerProfileJson: createFieldAttribute("string", {
        required: false,
      }),
      organizationJson: createFieldAttribute("string", {
        required: false,
      }),
    },
  },
  plugins: [
    nextCookies(),
    genericOAuth({
      config: [
        {
          providerId: "health-id",
          clientId: process.env.HEALTH_CLIENT_ID ?? "",
          clientSecret: process.env.HEALTH_CLIENT_SECRET ?? "",
          authorizationUrl: "https://moph.id.th/oauth/redirect",
          redirectURI: process.env.HEALTH_REDIRECT_URI,
          tokenUrl: `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/health-id/token`,
          authentication: "post",
          getUserInfo: async (tokens) => {
            const providerBaseUrl = "https://provider.id.th";

            const providerClientId = process.env.PROVIDER_CLIENT_ID ?? "";
            const providerClientSecret = process.env.PROVIDER_CLIENT_SECRET ?? "";

            const healthAccessToken = tokens.accessToken;
            if (!healthAccessToken) {
              return null;
            }

            const providerTokenRes = await fetch(
              `${providerBaseUrl}/api/v1/services/token`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  client_id: providerClientId,
                  secret_key: providerClientSecret,
                  token_by: "Health ID",
                  token: healthAccessToken,
                }),
                cache: "no-store",
              },
            );

            const providerTokenJson = await providerTokenRes.json().catch(() => null);
            const providerAccessToken = providerTokenJson?.data?.access_token;
            if (!providerAccessToken) {
              return null;
            }

            const providerProfileRes = await fetch(
              `${providerBaseUrl}/api/v1/services/profile?position_type=1`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${providerAccessToken}`,
                  "client-id": providerClientId,
                  "secret-key": providerClientSecret,
                },
                cache: "no-store",
              },
            );

            const providerProfileJson = await providerProfileRes.json().catch(() => null);

            const providerId = providerProfileJson?.data?.provider_id;
            if (typeof providerId !== "string" || providerId.length === 0) {
              return null;
            }

            const organization = providerProfileJson?.data?.organization;
            const organizationJson = Array.isArray(organization)
              ? JSON.stringify(organization)
              : null;

            const email = `provider_${providerId.toLowerCase()}@provider.local`;
            const name =
              providerProfileJson?.data?.name_th ??
              providerProfileJson?.data?.name_eng ??
              providerId;

            return {
              id: providerId,
              email,
              name,
              emailVerified: true,
              providerProfileJson: JSON.stringify(providerProfileJson),
              organizationJson,
            } as any;
          },
        },
      ],
    }),
    (() => {
      return {
        id: "provider-profile",
        endpoints: {
          meProviderProfile: createAuthEndpoint(
            "/me/provider-profile",
            {
              method: "GET",
              use: [sessionMiddleware],
            },
            async (ctx) => {
              const cookieName = ctx.context.createAuthCookie("provider_profile").name;
              const raw = await ctx.getSignedCookie(cookieName, ctx.context.secret);
              if (!raw) {
                return ctx.json(null);
              }
              try {
                return ctx.json(JSON.parse(raw));
              } catch {
                return ctx.json({ raw });
              }
            },
          ),
        },
      };
    })(),
  ],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Next.js handler mounts Better Auth under `/api/auth/*`
      if (!ctx.path.includes("/oauth2/callback/health-id")) {
        return;
      }

      const newSession = ctx.context.newSession;
      if (!newSession) {
        return;
      }

      const rows = await db
        .select({ providerProfileJson: schema.user.providerProfileJson })
        .from(schema.user)
        .where(eq(schema.user.id, newSession.user.id))
        .limit(1);

      const profileJson = rows[0]?.providerProfileJson;
      if (!profileJson) {
        return;
      }

      const cookie = ctx.context.createAuthCookie("provider_profile");
      await ctx.setSignedCookie(cookie.name, profileJson, ctx.context.secret, {
        ...cookie.attributes,
        path: "/",
        maxAge: ctx.context.sessionConfig.expiresIn,
      });
    }),
  },
});
