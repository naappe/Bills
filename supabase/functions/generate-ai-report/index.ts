import { createClient } from "jsr:@supabase/supabase-js@2";

type AiQuestion = {
  id: string;
  question: string;
  answer: string | null;
  matched_key: string | null;
  matched_path: string | null;
  risk_level: "low" | "review" | "high";
  is_weak: boolean;
  response_time_ms: number;
  created_at: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function topCounts(items: string[], limit = 5) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item || "Unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function buildRecommendations(questions: AiQuestion[]) {
  const weak = questions.filter((q) => q.is_weak);
  const review = questions.filter((q) => q.risk_level === "review");
  const high = questions.filter((q) => q.risk_level === "high");
  const repeated = topCounts(questions.map((q) => q.question.toLowerCase().trim())).filter((x) => x.count > 1);
  const recommendations = [
    "Keep this-year default unless user asks otherwise.",
    "Never place service-role or AI provider keys in browser code.",
  ];
  if (weak.length) recommendations.push("Add weak questions to PROJECT_KNOWLEDGE.json or a learning patch file.");
  if (repeated.length) recommendations.push("Turn repeated questions into quick chips or common_requests entries.");
  if (review.length) recommendations.push("Review admin-control questions for RLS, delete recovery, and permission behavior.");
  if (high.length) recommendations.push("Manually review high-risk questions before changing security-sensitive code.");
  return recommendations;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY function secret" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("ai_questions")
    .select("id, question, answer, matched_key, matched_path, risk_level, is_weak, response_time_ms, created_at")
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", now.toISOString())
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);

  const questions = (data || []) as AiQuestion[];
  const weakQuestions = questions.filter((q) => q.is_weak).slice(0, 20);
  const riskyQuestions = questions.filter((q) => q.risk_level !== "low").slice(0, 20);
  const repeatedQuestions = topCounts(questions.map((q) => q.question.toLowerCase().trim())).filter((x) => x.count > 1);
  const topCodeAreas = topCounts(questions.map((q) => q.matched_key || q.matched_path || "Unknown"));
  const avgResponse = questions.length
    ? Math.round(questions.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / questions.length)
    : 0;

  const report = {
    report_date: now.toISOString().slice(0, 10),
    window_start: windowStart.toISOString(),
    window_end: now.toISOString(),
    query_count: questions.length,
    avg_response_ms: avgResponse,
    summary: {
      top_code_areas: topCodeAreas,
      review_count: riskyQuestions.filter((q) => q.risk_level === "review").length,
      high_risk_count: riskyQuestions.filter((q) => q.risk_level === "high").length,
    },
    risky_questions: riskyQuestions.map((q) => ({
      question: q.question,
      risk_level: q.risk_level,
      matched_key: q.matched_key,
      created_at: q.created_at,
    })),
    weak_questions: weakQuestions.map((q) => ({
      question: q.question,
      matched_key: q.matched_key,
      created_at: q.created_at,
    })),
    repeated_questions: repeatedQuestions,
    recommendations: buildRecommendations(questions),
    metrics: {
      total_questions: questions.length,
      average_response_ms: avgResponse,
      generated_by: "generate-ai-report",
      this_year_default_warning: true,
    },
  };

  const { data: saved, error: saveError } = await supabase
    .from("ai_reports")
    .upsert(report, { onConflict: "report_date" })
    .select("id, report_date, query_count, avg_response_ms")
    .single();

  if (saveError) return json({ error: saveError.message }, 500);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const reportEmailTo = Deno.env.get("AI_REPORT_EMAIL_TO");
  if (resendKey && reportEmailTo) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("AI_REPORT_EMAIL_FROM") || "AI Librarian <onboarding@resend.dev>",
        to: reportEmailTo,
        subject: `AI Librarian 24-Hour Report - ${report.report_date}`,
        text: [
          "AI Librarian 24-Hour Evolution Report",
          `Date: ${report.report_date}`,
          `Queries reviewed: ${report.query_count}`,
          `Average response: ${report.avg_response_ms}ms`,
          "",
          "Recommendations:",
          ...report.recommendations.map((item) => `- ${item}`),
          "",
          "Weak questions:",
          ...report.weak_questions.map((item: { question: string }) => `- ${item.question}`),
        ].join("\n"),
      }),
    }).catch((emailError) => console.error("Email send failed", emailError));
  }

  return json({ success: true, report: saved });
});
