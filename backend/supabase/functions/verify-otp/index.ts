const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  return new Response(
    JSON.stringify({
      error: "Phone OTP sign-in is no longer available. Please sign in with email and password.",
    }),
    {
      status: 410,
      headers: { ...cors, "Content-Type": "application/json" },
    },
  );
});
