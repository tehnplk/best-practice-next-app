import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { createAuthEndpoint } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";

type ProviderProfile = {
  account_id?: string;
  hash_cid?: string;
  provider_id?: string;
  email?: string;
  name_th?: string;
  name_eng?: string;
  firstname_th?: string;
  lastname_th?: string;
  organization?: unknown[];
} & Record<string, unknown>;

const healthBaseUrl = "https://moph.id.th";
const providerBaseUrl = "https://provider.id.th";

const betterAuthUrl = process.env.BETTER_AUTH_URL;

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("Missing BETTER_AUTH_SECRET");
}

if (!betterAuthUrl) {
  throw new Error("Missing BETTER_AUTH_URL");
}

if (!process.env.HEALTH_CLIENT_ID || !process.env.HEALTH_CLIENT_SECRET) {
  throw new Error("Missing HEALTH_CLIENT_ID/HEALTH_CLIENT_SECRET");
}

if (!process.env.PROVIDER_CLIENT_ID || !process.env.PROVIDER_CLIENT_SECRET) {
  throw new Error("Missing PROVIDER_CLIENT_ID/PROVIDER_CLIENT_SECRET");
}

const healthRedirectUri =
  process.env.HEALTH_REDIRECT_URI ||
  `${betterAuthUrl}/api/auth/oauth2/callback/health-id`;

const providerProfileCookiePlugin = () => {
  return {
    id: "provider-profile-cookie",
    endpoints: {
      getProviderProfile: createAuthEndpoint(
        "/provider-profile",
        {
          method: "GET",
        },
        async (ctx: any) => {
          const raw = await ctx.getSignedCookie(
            "provider_profile",
            ctx.context.secret,
          );

          if (!raw) {
            return ctx.json({ profile: null });
          }

          try {
            return ctx.json({ profile: JSON.parse(raw) });
          } catch {
            return ctx.json({ profile: raw });
          }
        },
      ),
    },
  };
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: betterAuthUrl,
  disabledPaths: ["/sign-up/email", "/sign-in/email"],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  user: {
    additionalFields: {
      externalAccountId: {
        type: "string",
        required: false,
        input: false,
      },
      providerId: {
        type: "string",
        required: false,
        input: false,
      },
      hashCid: {
        type: "string",
        required: false,
        input: false,
      },
      organizationsJson: {
        type: "string",
        required: false,
        input: false,
      },
      providerProfileJson: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    account: {
      create: {
        before: async (account: any) => {
          return {
            data: {
              ...account,
              accessToken: null,
              refreshToken: null,
              idToken: null,
            },
          };
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx: any) => {
      if (ctx.path !== "/oauth2/callback/health-id") {
        return;
      }

      const newSession = ctx.context.newSession;
      if (!newSession) {
        return;
      }

      const providerProfileJson = (newSession.user as any)
        .providerProfileJson as string | undefined;

      if (!providerProfileJson) {
        return;
      }

      await ctx.setSignedCookie(
        "provider_profile",
        providerProfileJson,
        ctx.context.secret,
        {
          maxAge: 60 * 60 * 24,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
        },
      );

      await db
        .update(schema.user)
        .set({ providerProfileJson: null })
        .where(eq(schema.user.id, newSession.user.id));
    }),
  },
  plugins: [
    providerProfileCookiePlugin(),
    genericOAuth({
      config: [
        {
          providerId: "health-id",
          clientId: process.env.HEALTH_CLIENT_ID!,
          clientSecret: process.env.HEALTH_CLIENT_SECRET!,
          authorizationUrl: `${healthBaseUrl}/oauth/redirect`,
          tokenUrl: `${healthBaseUrl}/api/v1/token`,
          userInfoUrl: `${providerBaseUrl}/api/v1/services/profile`,
          redirectURI: healthRedirectUri,
          responseType: "code",
          scopes: [],
          getToken: async ({
            code,
            redirectURI,
          }: {
            code: string;
            redirectURI: string;
          }) => {
            const body = new URLSearchParams();
            body.set("grant_type", "authorization_code");
            body.set("code", code);
            body.set("redirect_uri", redirectURI);
            body.set("client_id", process.env.HEALTH_CLIENT_ID!);
            body.set("client_secret", process.env.HEALTH_CLIENT_SECRET!);

            const response = await fetch(`${healthBaseUrl}/api/v1/token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body,
            });

            const json = (await response.json()) as any;
            if (!response.ok) {
              throw new Error(
                json?.message ?? json?.error ?? "Health ID token request failed",
              );
            }

            const data = json?.data ?? {};
            const expiresIn = Number(data?.expires_in ?? 0);

            return {
              accessToken: data.access_token as string,
              accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
              scopes: [],
              raw: json,
            };
          },
          getUserInfo: async (tokens: any) => {
            const healthAccessToken = tokens.accessToken;

            const tokenResponse = await fetch(
              `${providerBaseUrl}/api/v1/services/token`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  client_id: process.env.PROVIDER_CLIENT_ID,
                  secret_key: process.env.PROVIDER_CLIENT_SECRET,
                  token_by: "Health ID",
                  token: healthAccessToken,
                }),
              },
            );

            const tokenJson = (await tokenResponse.json()) as any;
            if (!tokenResponse.ok) {
              const message =
                tokenJson?.message ??
                tokenJson?.error ??
                "Provider token request failed";

              if (
                tokenResponse.status === 400 &&
                typeof message === "string" &&
                message.toLowerCase().includes("not provider id")
              ) {
                throw new Error("This user has not provider id");
              }

              throw new Error(message);
            }

            const providerAccessToken = tokenJson?.data?.access_token as
              | string
              | undefined;

            if (!providerAccessToken) {
              throw new Error("Provider access token missing");
            }

            const profileResponse = await fetch(
              `${providerBaseUrl}/api/v1/services/profile?position_type=1`,
              {
                method: "GET",
                headers: {
                  "client-id": process.env.PROVIDER_CLIENT_ID!,
                  "secret-key": process.env.PROVIDER_CLIENT_SECRET!,
                  Authorization: `Bearer ${providerAccessToken}`,
                },
              },
            );

            const profileJson = (await profileResponse.json()) as any;
            if (!profileResponse.ok) {
              throw new Error(
                profileJson?.message ??
                  profileJson?.error ??
                  "Provider profile request failed",
              );
            }

            return (profileJson?.data ?? profileJson) as ProviderProfile;
          },
          mapProfileToUser: async (profile: ProviderProfile) => {
            const accountId = profile.account_id;

            const email =
              profile.email ??
              (accountId ? `${accountId}@provider.local` : undefined);

            if (!email) {
              throw new Error("Email missing from provider profile");
            }

            const name =
              profile.name_th ??
              [profile.firstname_th, profile.lastname_th].filter(Boolean).join(" ") ??
              profile.name_eng ??
              email;

            return {
              email,
              name,
              emailVerified: false,
              externalAccountId: accountId ?? null,
              providerId: profile.provider_id ?? null,
              hashCid: profile.hash_cid ?? null,
              organizationsJson: JSON.stringify(profile.organization ?? []),
              providerProfileJson: JSON.stringify(profile),
            };
          },
        },
      ],
    }),
  ],
});
