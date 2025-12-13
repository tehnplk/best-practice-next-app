'use server';
import { redirect } from "next/navigation";

export const providerIdProcess = async () => {
    const url = new URL("https://moph.id.th/oauth/redirect");
    const clientId = process.env.HEALTH_CLIENT_ID;
    const redirectUri = process.env.HEALTH_REDIRECT_URI;

    url.searchParams.set("client_id", clientId ?? "");
    url.searchParams.set("redirect_uri", redirectUri ?? "");
    url.searchParams.set("response_type", "code");
      
     

    redirect(url.toString());
}
