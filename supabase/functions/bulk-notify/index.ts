import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    // Verify the caller is a dil_admin
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "dil_admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, body, deadline } = await req.json();

    // Get all students who haven't submitted
    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name");
    const { data: allSubmissions } = await supabaseAdmin
      .from("cv_submissions")
      .select("student_id, status");

    const submittedIds = new Set(
      (allSubmissions || [])
        .filter((s: any) => s.status !== "not_submitted")
        .map((s: any) => s.student_id)
    );

    const studentsToNotify = (allProfiles || []).filter(
      (p: any) => !submittedIds.has(p.id)
    );

    if (studentsToNotify.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "All students have submitted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email body with optional deadline
    let emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a56db;">${subject}</h2>
      <div style="white-space: pre-wrap; line-height: 1.6;">${body}</div>`;

    if (deadline) {
      emailHtml += `<div style="margin-top: 20px; padding: 12px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <strong>⚠️ Deadline:</strong> ${deadline}
      </div>`;
    }

    emailHtml += `</div>`;

    // Send emails via Resend (batch up to 100 at a time)
    let sent = 0;
    const batchSize = 50;
    for (let i = 0; i < studentsToNotify.length; i += batchSize) {
      const batch = studentsToNotify.slice(i, i + batchSize);
      const promises = batch.map((student: any) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CV System <onboarding@resend.dev>",
            to: student.email,
            subject: subject,
            html: emailHtml.replace(
              "Dear Student",
              `Dear ${student.full_name || "Student"}`
            ),
          }),
        })
      );
      const results = await Promise.allSettled(promises);
      sent += results.filter((r) => r.status === "fulfilled").length;
    }

    return new Response(JSON.stringify({ sent, total: studentsToNotify.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
