import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// check-deadlines Edge Function
//
// Runs daily via pg_cron at 03:30 UTC (9:00 AM IST).
// 1. Finds all scholarships where deadline < NOW() but status = 'open'
// 2. Updates them to status = 'closed'
// 3. Notifies affected users who had those in their matches
// ─────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // ─────────────────────────────────────────────────────────
    // Step 1: Find expired scholarships that are still 'open'
    // ─────────────────────────────────────────────────────────
    const { data: expiredScholarships, error: fetchError } = await supabase
      .from("scholarships")
      .select("id, name, deadline")
      .eq("scholarship_status", "open")
      .not("deadline", "is", null)
      .lt("deadline", now);

    if (fetchError) {
      console.error("[check-deadlines] Failed to fetch expired scholarships:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { headers: { "Content-Type": "application/json" }, status: 500 },
      );
    }

    if (!expiredScholarships || expiredScholarships.length === 0) {
      console.log("[check-deadlines] No expired scholarships found.");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No expired scholarships to close.",
          closed_count: 0,
          notifications_sent: 0,
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    console.log(`[check-deadlines] Found ${expiredScholarships.length} expired scholarships to close.`);

    // ─────────────────────────────────────────────────────────
    // Step 2: Batch-update all expired scholarships to 'closed'
    // ─────────────────────────────────────────────────────────
    const expiredIds = expiredScholarships.map((s) => s.id);

    const { error: updateError } = await supabase
      .from("scholarships")
      .update({
        scholarship_status: "closed",
        closed_reason: "deadline_passed",
        updated_at: now,
      })
      .in("id", expiredIds);

    if (updateError) {
      console.error("[check-deadlines] Failed to update scholarships:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { headers: { "Content-Type": "application/json" }, status: 500 },
      );
    }

    console.log(`[check-deadlines] Closed ${expiredIds.length} scholarships.`);

    // ─────────────────────────────────────────────────────────
    // Step 3: Find users who had these scholarships in matches
    //         and create notifications for them
    // ─────────────────────────────────────────────────────────
    let notificationsSent = 0;

    for (const scholarship of expiredScholarships) {
      try {
        // Find users who had this scholarship matched
        const { data: matchedUsers } = await supabase
          .from("matches")
          .select("user_id")
          .eq("scholarship_id", scholarship.id)
          .eq("is_dismissed", false);

        if (!matchedUsers || matchedUsers.length === 0) continue;

        // Find 3 alternative open scholarships
        const { data: alternatives } = await supabase
          .from("scholarships")
          .select("id, name")
          .eq("scholarship_status", "open")
          .neq("id", scholarship.id)
          .not("deadline", "is", null)
          .gt("deadline", now)
          .order("deadline", { ascending: true })
          .limit(3);

        const altNames = alternatives && alternatives.length > 0
          ? alternatives.map((a) => a.name).join(", ")
          : "new opportunities";

        const notificationBody = `The deadline for "${scholarship.name}" has passed. Check out these alternatives: ${altNames}`;

        // Deduplicate user_ids
        const uniqueUserIds = [...new Set(matchedUsers.map((m) => m.user_id))];

        // Create notifications for each affected user
        const notifications = uniqueUserIds.map((userId) => ({
          user_id: userId,
          type: "deadline_expired",
          title: `${scholarship.name} — Deadline Closed`,
          body: notificationBody,
          action_url: "/dashboard",
          is_read: false,
          priority: "high",
        }));

        if (notifications.length > 0) {
          const { error: notifError } = await supabase
            .from("notifications")
            .insert(notifications);

          if (notifError) {
            console.warn(`[check-deadlines] Failed to create notifications for "${scholarship.name}":`, notifError);
          } else {
            notificationsSent += notifications.length;
          }
        }
      } catch (err) {
        // Don't crash the entire function if one notification fails
        console.warn(`[check-deadlines] Error processing notifications for "${scholarship.name}":`, err);
      }
    }

    // ─────────────────────────────────────────────────────────
    // Step 4: Log the run
    // ─────────────────────────────────────────────────────────
    await supabase.from("fetch_logs").insert({
      source: "deadline-checker",
      status: "success",
      scholarships_updated: expiredIds.length,
      scholarships_added: 0,
      error_message: null,
    });

    const summary = {
      success: true,
      timestamp: now,
      closed_count: expiredIds.length,
      closed_scholarships: expiredScholarships.map((s) => ({
        id: s.id,
        name: s.name,
        deadline: s.deadline,
      })),
      notifications_sent: notificationsSent,
    };

    console.log("[check-deadlines] Completed:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[check-deadlines] Fatal error:", err);

    // Best-effort log
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabase.from("fetch_logs").insert({
        source: "deadline-checker",
        status: "failed",
        error_message: (err as Error).message,
      });
    } catch { /* best effort */ }

    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    );
  }
});
