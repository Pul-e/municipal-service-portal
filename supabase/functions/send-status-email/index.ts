import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, full_name, request_id, category, location, status } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Municipal Portal <onboarding@resend.dev>",
        to: [to],
        subject: `Update on your request #${request_id}`,
        html: `
          <p>Hi ${full_name},</p>
          <p>Your request (<strong>${category}</strong>) has been updated:</p>
          <h2>${status}</h2>
          <p><strong>Location:</strong> ${location || "Not provided"}</p>
          <p>Thank you,<br/>Municipal Team</p>
        `,
      }),
    });

    const data = await resendRes.json();

    return new Response(JSON.stringify(data), {
      status: resendRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});