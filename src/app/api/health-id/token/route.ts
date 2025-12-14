export async function POST(request: Request) {
  const upstreamUrl = "https://moph.id.th/api/v1/token";

  const contentType =
    request.headers.get("content-type") ?? "application/x-www-form-urlencoded";

  const bodyText = await request.text();

  const upstreamRes = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Accept: "application/json",
    },
    body: bodyText,
    cache: "no-store",
  });

  const upstreamText = await upstreamRes.text();

  let parsed: any;
  try {
    parsed = JSON.parse(upstreamText);
  } catch {
    return new Response(upstreamText, {
      status: upstreamRes.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  if (parsed?.access_token) {
    return Response.json(parsed, {
      status: upstreamRes.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  if (parsed?.data?.access_token) {
    return Response.json(
      {
        access_token: parsed.data.access_token,
        token_type: parsed.data.token_type ?? "Bearer",
        refresh_token: parsed.data.refresh_token,
        expires_in: parsed.data.expires_in ?? parsed.data.expires,
        scope: parsed.data.scope,
      },
      {
        status: upstreamRes.status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return Response.json(parsed, {
    status: upstreamRes.status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
