import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS headers ────────────────────────────────────────
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// ─── Types ───────────────────────────────────────────────
interface Profile {
  name?: string;
  state?: string;
  caste?: string;
  income?: number;
  marks_12th?: number;
  course?: string;
  profile_pct?: number;
}

interface Scholarship {
  name?: string;
  amount?: number;
  deadline?: string;
  eligibility_text?: string;
  eligible_states?: string[];
  eligible_categories?: string[];
  eligible_courses?: string[];
  income_limit?: number;
  apply_link?: string;
  description?: string;
  scholarship_status?: string;
  provider_name?: string;
  documents_needed?: string[];
  min_marks_12th?: number;
  [key: string]: unknown;
}

interface Application {
  scholarship_name?: string;
  status?: string;
  [key: string]: unknown;
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  message: string;
  userId: string;
  profile?: Profile;
  matches?: Scholarship[];
  applications?: Application[];
  history?: HistoryMessage[];
}

interface SakhiResponse {
  text: string;
  suggestions: string[];
}

// ─── Constants ───────────────────────────────────────────
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ─── Helpers ─────────────────────────────────────────────

/**
 * Fetch all scholarships from the database so Sakhi always
 * has the full knowledge base regardless of user login state.
 */
async function fetchAllScholarships(
  supabase: ReturnType<typeof createClient>
): Promise<Scholarship[]> {
  try {
    const { data, error } = await supabase
      .from("scholarships")
      .select(
        "name, amount, deadline, eligibility_text, eligible_states, eligible_categories, eligible_courses, income_limit, apply_link, description, scholarship_status, provider_name, documents_needed, min_marks_12th"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[sakhi] Failed to fetch scholarships:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("[sakhi] DB read error:", (err as Error).message);
    return [];
  }
}

/**
 * Fetch user profile from the DB if userId is valid.
 */
async function fetchUserProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Profile | null> {
  try {
    // Skip DB lookup for anonymous users
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) return null;

    const { data, error } = await supabase
      .from("users")
      .select("name, state, caste, income, marks_12th, course, profile_pct")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch user's matched scholarships from the DB.
 */
async function fetchUserMatches(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Scholarship[]> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) return [];

    const { data, error } = await supabase
      .from("matches")
      .select(`
        score,
        scholarship:scholarships (
          name, amount, deadline, eligibility_text, apply_link, documents_needed, scholarship_status
        )
      `)
      .eq("user_id", userId)
      .eq("is_dismissed", false)
      .order("score", { ascending: false })
      .limit(5);

    if (error || !data) return [];
    return data.map((m: any) => ({
      ...m.scholarship,
      match_score: m.score,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch user's applications from the DB.
 */
async function fetchUserApplications(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Application[]> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) return [];

    const { data, error } = await supabase
      .from("applications")
      .select(`status, scholarship:scholarships ( name )`)
      .eq("user_id", userId);

    if (error || !data) return [];
    return data.map((a: any) => ({
      scholarship_name: a.scholarship?.name,
      status: a.status,
    }));
  } catch {
    return [];
  }
}

/**
 * Convert a scholarship row to a concise text line for the LLM context.
 */
function scholarshipToText(s: Scholarship, index: number): string {
  const parts: string[] = [];
  parts.push(`${index}. **${s.name || "Unnamed"}**`);
  if (s.provider_name) parts.push(`Provider: ${s.provider_name}`);
  if (s.amount) parts.push(`Amount: ₹${Number(s.amount).toLocaleString("en-IN")}`);
  if (s.deadline) {
    const d = new Date(s.deadline);
    const now = new Date();
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    parts.push(`Deadline: ${dateStr}${daysLeft > 0 ? ` (${daysLeft} days left)` : " (EXPIRED)"}`);
  }
  if (s.scholarship_status) parts.push(`Status: ${s.scholarship_status}`);
  if (s.eligible_states && s.eligible_states.length > 0) {
    parts.push(`States: ${s.eligible_states.join(", ")}`);
  }
  if (s.eligible_categories && s.eligible_categories.length > 0) {
    parts.push(`Categories: ${s.eligible_categories.join(", ")}`);
  }
  if (s.eligible_courses && s.eligible_courses.length > 0) {
    parts.push(`Courses: ${s.eligible_courses.join(", ")}`);
  }
  if (s.income_limit) parts.push(`Income Limit: ₹${Number(s.income_limit).toLocaleString("en-IN")}`);
  if (s.min_marks_12th) parts.push(`Min 12th Marks: ${s.min_marks_12th}%`);
  if (s.eligibility_text) parts.push(`Eligibility: ${s.eligibility_text}`);
  if (s.description) parts.push(`About: ${s.description.substring(0, 150)}`);
  if (s.documents_needed && s.documents_needed.length > 0) {
    parts.push(`Documents: ${s.documents_needed.join(", ")}`);
  }
  if (s.apply_link) parts.push(`Apply: ${s.apply_link}`);
  return parts.join(" | ");
}

/**
 * Build the full system prompt with ALL available context:
 * - Complete scholarship database
 * - Student profile (if logged in)
 * - Matched scholarships (if available)
 * - Application status (if any)
 */
function buildSystemPrompt(
  allScholarships: Scholarship[],
  profile?: Profile | null,
  userMatches?: Scholarship[],
  applications?: Application[]
): string {
  const sections: string[] = [];

  // ── Student Profile ──
  if (profile && Object.values(profile).some((v) => v !== undefined && v !== null)) {
    const profileLines: string[] = [];
    if (profile.name) profileLines.push(`Name: ${profile.name}`);
    if (profile.state) profileLines.push(`State: ${profile.state}`);
    if (profile.caste) profileLines.push(`Category/Caste: ${profile.caste}`);
    if (profile.income) profileLines.push(`Family Income: ₹${profile.income.toLocaleString("en-IN")}`);
    if (profile.marks_12th) profileLines.push(`12th Marks: ${profile.marks_12th}%`);
    if (profile.course) profileLines.push(`Course: ${profile.course}`);
    if (profile.profile_pct !== undefined) profileLines.push(`Profile Completion: ${profile.profile_pct}%`);
    if (profileLines.length > 0) {
      sections.push(`📋 STUDENT PROFILE:\n${profileLines.join("\n")}`);
    }
  }

  // ── Personalized Matches ──
  if (userMatches && userMatches.length > 0) {
    const matchLines = userMatches.map((m, i) => scholarshipToText(m, i + 1));
    sections.push(`⭐ YOUR TOP MATCHED SCHOLARSHIPS (personalized for this student):\n${matchLines.join("\n")}`);
  }

  // ── Applications ──
  if (applications && applications.length > 0) {
    const appLines = applications.map(
      (a, i) => `${i + 1}. ${a.scholarship_name || "Unknown"} — Status: ${a.status || "unknown"}`
    );
    sections.push(`📝 YOUR CURRENT APPLICATIONS:\n${appLines.join("\n")}`);
  }

  // ── Full Scholarship Database ──
  if (allScholarships.length > 0) {
    const scholLines = allScholarships.map((s, i) => scholarshipToText(s, i + 1));
    sections.push(`📚 COMPLETE SCHOLARSHIP DATABASE (${allScholarships.length} scholarships available on ScholarMatch):\n${scholLines.join("\n")}`);
  }

  const contextBlock = sections.length > 0 ? sections.join("\n\n---\n\n") : "No scholarship data currently available.";

  return `You are **Sakhi**, a warm, friendly, and highly knowledgeable scholarship advisor built into the ScholarMatch platform for Indian students.

YOUR PERSONALITY:
- You are empathetic, encouraging, and speak in simple, clear language
- Use emojis sparingly but warmly (🎓 📝 ✅ 💡 🙏)
- Address the student by name if available
- Be proactive — if you see a good match, point it out

YOUR CAPABILITIES:
- Answer ANY question about scholarships available on ScholarMatch
- Provide specific details: amounts, deadlines, eligibility, documents needed, how to apply
- Compare scholarships when asked
- Guide students through application steps
- Help with deadline tracking
- Recommend scholarships based on student profile

RULES:
1. ALWAYS use the scholarship data provided below to answer — this is REAL data from our database
2. If a scholarship exists in the data below, share its full details confidently
3. If asked about a scholarship NOT in the database, say "I don't have that specific scholarship in our database yet, but here's what's available that might help you"
4. Keep responses under 150 words unless listing multiple scholarships or giving detailed breakdown
5. When listing scholarships, include: name, amount, deadline, and key eligibility in a clear format
6. For deadline questions, calculate days remaining and create urgency if close
7. If the student's profile is available, proactively mention which scholarships they're eligible for

CONTEXT DATA:
${contextBlock}

RESPONSE FORMAT:
- Answer the question thoroughly using the data above
- End EVERY response with exactly 3 relevant follow-up suggestions on a new line:
SUGGESTIONS: suggestion1 | suggestion2 | suggestion3
- Suggestions should be specific, actionable, and under 8 words each`;
}

/**
 * Parse SUGGESTIONS line from the Groq response.
 */
function parseSuggestions(rawText: string): { text: string; suggestions: string[] } {
  const lines = rawText.split("\n");
  let suggestionsLine = "";
  const textLines: string[] = [];

  for (const line of lines) {
    if (line.trim().toUpperCase().startsWith("SUGGESTIONS:")) {
      suggestionsLine = line.trim();
    } else {
      textLines.push(line);
    }
  }

  while (textLines.length > 0 && textLines[textLines.length - 1].trim() === "") {
    textLines.pop();
  }

  const text = textLines.join("\n").trim();

  let suggestions: string[] = [];
  if (suggestionsLine) {
    const afterColon = suggestionsLine.substring(suggestionsLine.indexOf(":") + 1).trim();
    suggestions = afterColon
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 3);
  }

  if (suggestions.length === 0) {
    suggestions = [
      "Show all available scholarships",
      "Which scholarship suits me best?",
      "What documents do I need?",
    ];
  }

  return { text: text || rawText, suggestions };
}

/**
 * Call Groq API with the full system prompt + history + user message.
 */
async function callGroq(
  systemPrompt: string,
  history: HistoryMessage[],
  userMessage: string
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in Supabase secrets");
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // Append conversation history (last 10)
  if (history && history.length > 0) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: userMessage });

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 1024,
      top_p: 0.9,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API returned ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const assistantContent = data?.choices?.[0]?.message?.content;

  if (!assistantContent) {
    throw new Error("Groq API returned empty response");
  }

  return assistantContent;
}

/**
 * Rule-based fallback using REAL DB data when Groq fails.
 */
function getFallbackResponse(
  userMessage: string,
  allScholarships: Scholarship[],
  profile?: Profile | null,
  userMatches?: Scholarship[]
): SakhiResponse {
  const lowerMsg = userMessage.toLowerCase();
  let text: string;
  const name = profile?.name ? ` ${profile.name}` : "";

  if (lowerMsg.includes("hello") || lowerMsg.includes("hi") || lowerMsg.includes("hey") || lowerMsg.includes("namaste")) {
    text = `Namaste${name}! 🙏 I'm Sakhi, your scholarship advisor. We have ${allScholarships.length} scholarships in our database. How can I help you today?`;
  } else if (lowerMsg.includes("list") || lowerMsg.includes("show") || lowerMsg.includes("all scholarship") || lowerMsg.includes("available")) {
    const open = allScholarships.filter((s) => s.scholarship_status === "open");
    if (open.length > 0) {
      const list = open
        .slice(0, 5)
        .map((s, i) => `${i + 1}. **${s.name}** — ₹${Number(s.amount || 0).toLocaleString("en-IN")}`)
        .join("\n");
      text = `Here are some scholarships available right now:\n\n${list}\n\nWe have ${open.length} open scholarships total. Want details on any of these?`;
    } else {
      text = `We have ${allScholarships.length} scholarships in our database. Would you like me to help you find the best ones for your profile?`;
    }
  } else if (lowerMsg.includes("deadline") || lowerMsg.includes("last date") || lowerMsg.includes("when")) {
    const withDeadlines = allScholarships
      .filter((s) => s.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 3);
    if (withDeadlines.length > 0) {
      const list = withDeadlines
        .map((s) => {
          const d = new Date(s.deadline!);
          return `• **${s.name}** — ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
        })
        .join("\n");
      text = `Here are upcoming deadlines:\n\n${list}\n\nDon't miss out — apply early! 📝`;
    } else {
      text = "I couldn't find specific deadline information right now. Please check the Scholarships tab on your dashboard for the latest deadlines.";
    }
  } else if (lowerMsg.includes("document") || lowerMsg.includes("upload") || lowerMsg.includes("paper")) {
    text = "Common documents needed for scholarships include:\n\n• Aadhaar Card\n• Income Certificate\n• Caste Certificate (if applicable)\n• 10th & 12th Marksheets\n• College Admission Letter\n• Bank Passbook (first page)\n• Passport-size Photo\n\nUpload them in the Documents section of your dashboard! 📁";
  } else if (lowerMsg.includes("apply") || lowerMsg.includes("application") || lowerMsg.includes("how to")) {
    text = "To apply for a scholarship on ScholarMatch:\n\n1️⃣ Complete your profile\n2️⃣ Check your matched scholarships\n3️⃣ Click on a scholarship for details\n4️⃣ Upload required documents\n5️⃣ Submit your application\n\nI can help you find the best scholarships for your profile!";
  } else if (lowerMsg.includes("eligible") || lowerMsg.includes("qualify") || lowerMsg.includes("match")) {
    if (userMatches && userMatches.length > 0) {
      const list = userMatches
        .slice(0, 3)
        .map((s, i) => `${i + 1}. **${s.name}** — ₹${Number(s.amount || 0).toLocaleString("en-IN")}`)
        .join("\n");
      text = `Based on your profile, here are your top matches:\n\n${list}\n\nWant more details on any of these? 🎓`;
    } else {
      text = `Complete your profile to get personalized scholarship matches! We have ${allScholarships.length} scholarships in our database waiting to be matched with you.`;
    }
  } else {
    // Generic helpful response
    text = `I'm having a brief connectivity issue, but I'm still here to help${name}! 🙏\n\nWe have **${allScholarships.length} scholarships** in our database. You can ask me about:\n• Available scholarships\n• Deadlines & eligibility\n• Required documents\n• How to apply`;
  }

  return {
    text,
    suggestions: [
      "List all scholarships",
      "Show upcoming deadlines",
      "What documents do I need?",
    ],
  };
}

/**
 * Save a message to the sakhi_conversations table.
 * Silently fails for anonymous users (FK constraint).
 */
async function saveConversation(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  role: "user" | "assistant",
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) return; // Skip for anonymous users

    const { error } = await supabase.from("sakhi_conversations").insert({
      user_id: userId,
      role,
      content,
      metadata,
    });

    if (error) {
      console.error(`[sakhi] Failed to save ${role} message:`, error.message);
    }
  } catch (err) {
    console.error(`[sakhi] DB write error (${role}):`, (err as Error).message);
  }
}

// ─── Main Handler ────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ text: "Method not allowed. Use POST.", suggestions: [] }),
      { status: 200, headers: CORS_HEADERS }
    );
  }

  try {
    // ── Parse request body ──────────────────────────────
    const body: RequestBody = await req.json();
    const { message, userId, profile: clientProfile, matches: clientMatches, applications: clientApps, history } = body;

    if (!message) {
      return new Response(
        JSON.stringify({
          text: "Please send a message so I can help you! 🙏",
          suggestions: [
            "What scholarships are available?",
            "Help me with my application",
            "Show me upcoming deadlines",
          ],
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // ── Initialize Supabase client (service role) ───────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Fetch ALL context server-side (the key improvement) ──
    const [allScholarships, dbProfile, dbMatches, dbApps] = await Promise.all([
      fetchAllScholarships(supabase),
      fetchUserProfile(supabase, userId || ""),
      fetchUserMatches(supabase, userId || ""),
      fetchUserApplications(supabase, userId || ""),
    ]);

    // Merge: prefer server-side data, fall back to client-sent data
    const profile = dbProfile || clientProfile || null;
    const userMatches = dbMatches.length > 0 ? dbMatches : clientMatches || [];
    const applications = dbApps.length > 0 ? dbApps : clientApps || [];

    console.log(`[sakhi] Context: ${allScholarships.length} scholarships, profile: ${!!profile}, matches: ${userMatches.length}, apps: ${applications.length}`);

    // ── Save user message ───────────────────────────────
    await saveConversation(supabase, userId || "", "user", message, {
      profile_pct: profile?.profile_pct,
      matches_count: userMatches.length,
    });

    // ── Try Groq API ────────────────────────────────────
    let response: SakhiResponse;

    try {
      const systemPrompt = buildSystemPrompt(allScholarships, profile, userMatches, applications);
      const rawReply = await callGroq(systemPrompt, history || [], message);
      response = parseSuggestions(rawReply);
    } catch (groqError) {
      console.error("[sakhi] Groq API error:", (groqError as Error).message);
      // Fall back to rule-based response with real DB data
      response = getFallbackResponse(message, allScholarships, profile, userMatches);
    }

    // ── Save assistant response ─────────────────────────
    await saveConversation(supabase, userId || "", "assistant", response.text, {
      suggestions: response.suggestions,
      model: GROQ_MODEL,
    });

    // ── Return response ─────────────────────────────────
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    // Top-level catch — never return non-200
    console.error("[sakhi] Unexpected error:", (err as Error).message);
    return new Response(
      JSON.stringify({
        text: "I'm sorry, something went wrong on my end. Please try again in a moment! 🙏",
        suggestions: [
          "List all scholarships",
          "What documents do I need?",
          "Check upcoming deadlines",
        ],
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  }
});
