import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface ScholarshipRow {
  name: string;
  provider_name: string | null;
  provider_type: string | null;
  amount: number | null;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  application_start: string | null;
  eligible_states: string[];
  eligible_categories: string[];
  eligible_gender: string;
  income_limit: number | null;
  max_family_income: number | null;
  min_marks_12th: number | null;
  eligible_courses: string[];
  documents_needed: string[] | null;
  description: string | null;
  apply_link: string | null;
  official_source: string | null;
  nsp_scheme_id: string | null;
  data_source: string;
  is_real_data: boolean;
  verified: boolean;
  scholarship_status: string;
  data_fetched_at: string;
  eligibility_text: string | null;
}

interface FetchResult {
  source: string;
  added: number;
  updated: number;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────
// Category normalization maps
// ─────────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  "schedule caste": "SC",
  "scheduled caste": "SC",
  "sc": "SC",
  "schedule tribe": "ST",
  "scheduled tribe": "ST",
  "st": "ST",
  "other backward class": "OBC",
  "other backward classes": "OBC",
  "obc": "OBC",
  "general": "ALL",
  "gen": "ALL",
  "economically weaker section": "EWS",
  "ews": "EWS",
};

const STATE_CODE_MAP: Record<string, string> = {
  "andhra pradesh": "AP", "arunachal pradesh": "AR", "assam": "AS",
  "bihar": "BR", "chhattisgarh": "CG", "goa": "GA", "gujarat": "GJ",
  "haryana": "HR", "himachal pradesh": "HP", "jharkhand": "JH",
  "karnataka": "KA", "kerala": "KL", "madhya pradesh": "MP",
  "maharashtra": "MH", "manipur": "MN", "meghalaya": "ML",
  "mizoram": "MZ", "nagaland": "NL", "odisha": "OD", "punjab": "PB",
  "rajasthan": "RJ", "sikkim": "SK", "tamil nadu": "TN",
  "telangana": "TG", "tripura": "TR", "uttar pradesh": "UP",
  "uttarakhand": "UK", "west bengal": "WB", "delhi": "DL",
  "jammu and kashmir": "JK", "ladakh": "LA",
  "chandigarh": "CH", "puducherry": "PY",
  "andaman and nicobar islands": "AN", "dadra and nagar haveli": "DN",
  "daman and diu": "DD", "lakshadweep": "LD",
  "all india": "ALL", "all": "ALL", "all states": "ALL",
};

function normalizeCategory(raw: string): string {
  const key = raw.trim().toLowerCase();
  return CATEGORY_MAP[key] || raw.trim();
}

function normalizeState(raw: string): string {
  const key = raw.trim().toLowerCase();
  return STATE_CODE_MAP[key] || raw.trim();
}

function parseAmount(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  // Remove commas, ₹, "Rs.", "INR", handle lakhs
  let cleaned = raw.replace(/[₹,Rs.INR\s]/gi, "").trim();
  if (/lakh/i.test(raw)) {
    const num = parseFloat(cleaned.replace(/lakh.*/i, "").trim());
    return isNaN(num) ? null : Math.round(num * 100000);
  }
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function parseDeadline(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Source 1: NSP (National Scholarship Portal)
//
// Strategy:
//   1. Try primary API: /fresh/newstandardlistschemes
//   2. If 404 or failure → fallback scrape: /public/schemeDetails
//      using cheerio for robust HTML parsing
// ─────────────────────────────────────────────────────────────

const NSP_PRIMARY_URL = "https://scholarships.gov.in/fresh/newstandardlistschemes";
const NSP_FALLBACK_URL = "https://scholarships.gov.in/public/schemeDetails";

async function fetchNSP(): Promise<{ scholarships: ScholarshipRow[]; error: string | null }> {
  const now = new Date().toISOString();

  // ── Attempt 1: Primary API endpoint ──
  try {
    console.log(`[NSP] Trying primary endpoint: ${NSP_PRIMARY_URL}`);
    const resp = await fetch(NSP_PRIMARY_URL, {
      headers: {
        "User-Agent": "ScholarMatch-DataPipeline/1.0",
        "Accept": "application/json, text/html",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (resp.status === 404) {
      console.warn("[NSP] Primary endpoint returned 404. Falling back to /public/schemeDetails...");
      return await scrapeNSPFallback(now);
    }

    if (!resp.ok) {
      console.warn(`[NSP] Primary endpoint returned ${resp.status}. Falling back...`);
      return await scrapeNSPFallback(now);
    }

    const contentType = resp.headers.get("content-type") || "";
    let schemes: any[] = [];

    if (contentType.includes("application/json")) {
      const data = await resp.json();
      schemes = Array.isArray(data) ? data : (data.schemes || data.data || []);
    } else {
      // HTML response — parse it with cheerio
      const html = await resp.text();
      schemes = parseNSPHtmlWithCheerio(html);
    }

    if (schemes.length === 0) {
      console.warn("[NSP] Primary endpoint returned 0 schemes. Falling back...");
      return await scrapeNSPFallback(now);
    }

    const scholarships = schemes.map((scheme) => schemeToRow(scheme, now)).filter(Boolean) as ScholarshipRow[];
    console.log(`[NSP] Primary endpoint: parsed ${scholarships.length} scholarships`);
    return { scholarships, error: null };
  } catch (primaryErr) {
    console.warn(`[NSP] Primary fetch failed: ${(primaryErr as Error).message}. Falling back...`);
    return await scrapeNSPFallback(now);
  }
}

// ── Fallback: Scrape /public/schemeDetails with cheerio ──
async function scrapeNSPFallback(now: string): Promise<{ scholarships: ScholarshipRow[]; error: string | null }> {
  try {
    console.log(`[NSP] Scraping fallback: ${NSP_FALLBACK_URL}`);
    const resp = await fetch(NSP_FALLBACK_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      return { scholarships: [], error: `NSP fallback returned ${resp.status}` };
    }

    const html = await resp.text();
    const schemes = parseNSPHtmlWithCheerio(html);

    if (schemes.length === 0) {
      return { scholarships: [], error: "NSP fallback: cheerio extracted 0 schemes from HTML" };
    }

    const scholarships = schemes.map((scheme) => schemeToRow(scheme, now)).filter(Boolean) as ScholarshipRow[];
    console.log(`[NSP] Fallback scrape: parsed ${scholarships.length} scholarships`);
    return { scholarships, error: null };
  } catch (err) {
    return { scholarships: [], error: `NSP fallback scrape error: ${(err as Error).message}` };
  }
}

// ── Cheerio-based HTML parser for NSP pages ──
function parseNSPHtmlWithCheerio(html: string): any[] {
  const $ = cheerio.load(html);
  const schemes: any[] = [];

  // Strategy 1: Parse <table> rows (NSP scheme list pages use tables)
  $("table tbody tr, table tr").each((_i, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) return;

    // Typical NSP table: [S.No, Scheme Name, Ministry/Dept, ...]
    const firstCell = $(cells[0]).text().trim();
    // Skip header rows and serial-number-only rows
    if (/^(sl|s\.\s*no|#|sr)/i.test(firstCell) && cells.length <= 2) return;

    let nameIdx = 0;
    let ministryIdx = 1;
    // If first column is a serial number, name is in column 2
    if (/^\d+$/.test(firstCell) && cells.length >= 3) {
      nameIdx = 1;
      ministryIdx = 2;
    }

    const name = $(cells[nameIdx]).text().trim();
    const ministry = cells.length > ministryIdx ? $(cells[ministryIdx]).text().trim() : null;

    if (!name || name.length < 5) return;
    if (/^(sl|s\.\s*no|scheme\s*name|#|sr\.?\s*no)/i.test(name)) return;

    // Try to extract a link from the name cell
    const link = $(cells[nameIdx]).find("a").attr("href") || null;
    const schemeId = link ? extractSchemeId(link) : null;

    // Try to extract deadline/amount from subsequent columns
    let deadline: string | null = null;
    let amount: string | null = null;

    cells.each((_j, cell) => {
      const text = $(cell).text().trim();
      // Look for date patterns (DD/MM/YYYY, DD-MM-YYYY, Month DD YYYY)
      if (!deadline && /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(text)) {
        deadline = text;
      }
      if (!deadline && /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}/i.test(text)) {
        deadline = text;
      }
      // Look for amount patterns (₹, Rs, numbers with commas)
      if (!amount && /(?:₹|Rs|INR)[\s.]*[\d,]+/i.test(text)) {
        amount = text;
      }
    });

    schemes.push({
      schemeName: name,
      ministryName: ministry,
      schemeId,
      lastDate: deadline,
      amount,
    });
  });

  // Strategy 2: If no table rows found, try scheme cards / divs
  if (schemes.length === 0) {
    $(".scheme-card, .scholarship-item, .scheme-box, [class*='scheme'], [class*='scholarship']").each((_i, el) => {
      const name = $(el).find("h2, h3, h4, .scheme-name, .title, a").first().text().trim();
      if (!name || name.length < 5) return;

      const link = $(el).find("a").attr("href") || null;
      const ministry = $(el).find(".ministry, .department, .provider").text().trim() || null;
      const deadlineText = $(el).find(".deadline, .last-date, [class*='date']").text().trim() || null;
      const amountText = $(el).find(".amount, .award, [class*='amount']").text().trim() || null;

      schemes.push({
        schemeName: name,
        ministryName: ministry,
        schemeId: link ? extractSchemeId(link) : null,
        lastDate: deadlineText,
        amount: amountText,
      });
    });
  }

  // Strategy 3: Last resort — grab any <a> tags with scholarship-like hrefs
  if (schemes.length === 0) {
    $("a[href*='scheme'], a[href*='scholarship']").each((_i, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      if (name && name.length > 8 && !/login|register|home|about/i.test(name)) {
        schemes.push({
          schemeName: name,
          ministryName: null,
          schemeId: extractSchemeId(href),
          lastDate: null,
          amount: null,
        });
      }
    });
  }

  return schemes;
}

function extractSchemeId(url: string): string | null {
  // Extract scheme ID from NSP URLs like ?id=123 or /scheme/123
  const idMatch = url.match(/[?&](?:id|schemeId|scheme_id)=(\d+)/i);
  if (idMatch) return idMatch[1];
  const pathMatch = url.match(/\/(?:scheme|scholarship)\/(\d+)/i);
  if (pathMatch) return pathMatch[1];
  return null;
}

// ── Convert parsed scheme object → ScholarshipRow ──
function schemeToRow(scheme: any, now: string): ScholarshipRow | null {
  const name = scheme.schemeName || scheme.scheme_name || scheme.name || "";
  if (!name || name.length < 5) return null;

  const schemeId = scheme.schemeId || scheme.scheme_id || scheme.id || null;
  const ministry = scheme.ministryName || scheme.ministry || scheme.provider || null;

  const categories = (scheme.category || scheme.social_category || "")
    .split(",")
    .map((c: string) => normalizeCategory(c))
    .filter((c: string) => c.length > 0);

  const states = (scheme.state || scheme.eligible_state || "ALL")
    .split(",")
    .map((s: string) => normalizeState(s))
    .filter((s: string) => s.length > 0);

  const amount = parseAmount(scheme.amount || scheme.scholarship_amount || null);
  const deadline = parseDeadline(scheme.lastDate || scheme.deadline || scheme.last_date || null);

  return {
    name: name.trim(),
    provider_name: ministry,
    provider_type: "central_govt",
    amount,
    amount_min: parseAmount(scheme.amount_min || null),
    amount_max: parseAmount(scheme.amount_max || null),
    deadline,
    application_start: parseDeadline(scheme.startDate || scheme.start_date || null),
    eligible_states: states.length > 0 ? states : ["ALL"],
    eligible_categories: categories.length > 0 ? categories : ["ALL"],
    eligible_gender: scheme.gender?.toLowerCase() || "all",
    income_limit: parseAmount(scheme.income_limit || scheme.incomeLimit || null),
    max_family_income: parseAmount(scheme.maxFamilyIncome || null),
    min_marks_12th: scheme.min_marks_12th ? parseFloat(scheme.min_marks_12th) : null,
    eligible_courses: scheme.course
      ? scheme.course.split(",").map((c: string) => c.trim())
      : ["ALL"],
    documents_needed: scheme.documents
      ? scheme.documents.split(",").map((d: string) => d.trim())
      : null,
    description: scheme.description || scheme.objective || null,
    apply_link: scheme.applyLink || "https://scholarships.gov.in",
    official_source: "https://scholarships.gov.in",
    nsp_scheme_id: schemeId ? String(schemeId) : null,
    data_source: "nsp",
    is_real_data: true,
    verified: true,
    scholarship_status: deadline && new Date(deadline) < new Date() ? "closed" : "open",
    data_fetched_at: now,
    eligibility_text: scheme.eligibility || scheme.eligibility_text || null,
  };
}

// ─────────────────────────────────────────────────────────────
// Source 2: Buddy4Study
// ─────────────────────────────────────────────────────────────
async function fetchBuddy4Study(): Promise<{ scholarships: ScholarshipRow[]; error: string | null }> {
  const now = new Date().toISOString();
  const scholarships: ScholarshipRow[] = [];

  try {
    const resp = await fetch("https://www.buddy4study.com/scholarships", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      throw new Error(`Buddy4Study returned ${resp.status}`);
    }

    const html = await resp.text();

    // Parse scholarship cards from the HTML
    // Buddy4Study uses structured card elements
    const cardRegex = /<div[^>]*class="[^"]*scholarship[_-]?card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    const nameRegex = /<h[2-4][^>]*>(.*?)<\/h[2-4]>/i;
    const amountRegex = /(?:Award|Amount|Value|Worth)[:\s]*(?:(?:Up\s*to|Upto)\s*)?(?:₹|Rs\.?\s*|INR\s*)([\d,\.]+(?:\s*(?:lakh|lac|L))?)/i;
    const deadlineRegex = /(?:Deadline|Last Date|Apply Before)[:\s]*([\w\s,]+\d{4})/i;
    const linkRegex = /href="(\/scholarship[^"]+)"/i;

    let cardMatch;
    while ((cardMatch = cardRegex.exec(html)) !== null) {
      const cardHtml = cardMatch[1];
      const nameMatch = nameRegex.exec(cardHtml);
      if (!nameMatch) continue;

      const name = nameMatch[1].replace(/<[^>]+>/g, "").trim();
      if (!name || name.length < 5) continue;

      const amountMatch = amountRegex.exec(cardHtml);
      const deadlineMatch = deadlineRegex.exec(cardHtml);
      const linkMatch = linkRegex.exec(cardHtml);

      const amount = amountMatch ? parseAmount(amountMatch[1]) : null;
      const deadline = deadlineMatch ? parseDeadline(deadlineMatch[1]) : null;
      const applyLink = linkMatch ? `https://www.buddy4study.com${linkMatch[1]}` : "https://www.buddy4study.com/scholarships";

      // Determine provider type from keywords
      let providerType = "private";
      const lowerCard = cardHtml.toLowerCase();
      if (lowerCard.includes("central government") || lowerCard.includes("ministry")) providerType = "central_govt";
      else if (lowerCard.includes("state government")) providerType = "state_govt";

      scholarships.push({
        name,
        provider_name: "Buddy4Study",
        provider_type: providerType,
        amount,
        amount_min: null,
        amount_max: null,
        deadline,
        application_start: null,
        eligible_states: ["ALL"],
        eligible_categories: ["ALL"],
        eligible_gender: "all",
        income_limit: null,
        max_family_income: null,
        min_marks_12th: null,
        eligible_courses: ["ALL"],
        documents_needed: null,
        description: null,
        apply_link: applyLink,
        official_source: "https://www.buddy4study.com",
        nsp_scheme_id: null,
        data_source: "buddy4study",
        is_real_data: true,
        verified: false,
        scholarship_status: deadline && new Date(deadline) < new Date() ? "closed" : "open",
        data_fetched_at: now,
        eligibility_text: null,
      });
    }

    // If card parsing captures nothing, try a simpler list approach
    if (scholarships.length === 0) {
      const simpleRegex = /<a[^>]*href="(\/scholarship\/[^"]+)"[^>]*>\s*<[^>]+>\s*(.*?)\s*</gi;
      let simpleMatch;
      while ((simpleMatch = simpleRegex.exec(html)) !== null) {
        const name = simpleMatch[2].replace(/<[^>]+>/g, "").trim();
        if (name && name.length > 5) {
          scholarships.push({
            name,
            provider_name: "Buddy4Study",
            provider_type: "private",
            amount: null, amount_min: null, amount_max: null,
            deadline: null, application_start: null,
            eligible_states: ["ALL"], eligible_categories: ["ALL"],
            eligible_gender: "all",
            income_limit: null, max_family_income: null, min_marks_12th: null,
            eligible_courses: ["ALL"], documents_needed: null,
            description: null,
            apply_link: `https://www.buddy4study.com${simpleMatch[1]}`,
            official_source: "https://www.buddy4study.com",
            nsp_scheme_id: null,
            data_source: "buddy4study",
            is_real_data: true, verified: false,
            scholarship_status: "open",
            data_fetched_at: now,
            eligibility_text: null,
          });
        }
      }
    }

    return { scholarships, error: null };
  } catch (err) {
    return { scholarships: [], error: `Buddy4Study fetch error: ${(err as Error).message}` };
  }
}

// ─────────────────────────────────────────────────────────────
// Source 3: Vidyasaarathi
// ─────────────────────────────────────────────────────────────
async function fetchVidyasaarathi(): Promise<{ scholarships: ScholarshipRow[]; error: string | null }> {
  const now = new Date().toISOString();
  const scholarships: ScholarshipRow[] = [];

  try {
    const resp = await fetch("https://www.vidyasaarathi.co.in/Ede/api/Logins/GetScholarshipList", {
      method: "POST",
      headers: {
        "User-Agent": "ScholarMatch-DataPipeline/1.0",
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ pageNo: 1, pageSize: 100 }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      // Fallback: try scraping the main page
      throw new Error(`Vidyasaarathi API returned ${resp.status}`);
    }

    const data = await resp.json();
    const items = data.data || data.scholarships || data.result || [];

    for (const item of items) {
      const name = item.scholarshipName || item.name || "";
      if (!name) continue;

      scholarships.push({
        name: name.trim(),
        provider_name: item.companyName || item.provider || "Vidyasaarathi",
        provider_type: "private",
        amount: parseAmount(item.amount || item.scholarshipAmount || null),
        amount_min: parseAmount(item.minAmount || null),
        amount_max: parseAmount(item.maxAmount || null),
        deadline: parseDeadline(item.lastDate || item.deadline || null),
        application_start: parseDeadline(item.startDate || null),
        eligible_states: ["ALL"],
        eligible_categories: ["ALL"],
        eligible_gender: item.gender?.toLowerCase() || "all",
        income_limit: parseAmount(item.incomeLimit || null),
        max_family_income: parseAmount(item.familyIncome || null),
        min_marks_12th: item.minMarks ? parseFloat(item.minMarks) : null,
        eligible_courses: item.courses
          ? item.courses.split(",").map((c: string) => c.trim())
          : ["ALL"],
        documents_needed: null,
        description: item.description || item.details || null,
        apply_link: item.applyUrl || "https://www.vidyasaarathi.co.in",
        official_source: "https://www.vidyasaarathi.co.in",
        nsp_scheme_id: null,
        data_source: "vidyasaarathi",
        is_real_data: true,
        verified: false,
        scholarship_status: "open",
        data_fetched_at: now,
        eligibility_text: item.eligibility || null,
      });
    }

    return { scholarships, error: null };
  } catch (fetchErr) {
    // Fallback: try scraping the homepage
    try {
      const pageResp = await fetch("https://www.vidyasaarathi.co.in/Ede/Scholarships", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!pageResp.ok) throw new Error(`Page returned ${pageResp.status}`);

      const html = await pageResp.text();
      const titleRegex = /<h[2-5][^>]*class="[^"]*scholarship[^"]*"[^>]*>(.*?)<\/h[2-5]>/gi;
      let m;
      while ((m = titleRegex.exec(html)) !== null) {
        const name = m[1].replace(/<[^>]+>/g, "").trim();
        if (name && name.length > 5) {
          scholarships.push({
            name,
            provider_name: "Vidyasaarathi",
            provider_type: "private",
            amount: null, amount_min: null, amount_max: null,
            deadline: null, application_start: null,
            eligible_states: ["ALL"], eligible_categories: ["ALL"],
            eligible_gender: "all",
            income_limit: null, max_family_income: null, min_marks_12th: null,
            eligible_courses: ["ALL"], documents_needed: null,
            description: null,
            apply_link: "https://www.vidyasaarathi.co.in",
            official_source: "https://www.vidyasaarathi.co.in",
            nsp_scheme_id: null,
            data_source: "vidyasaarathi",
            is_real_data: true, verified: false,
            scholarship_status: "open",
            data_fetched_at: now,
            eligibility_text: null,
          });
        }
      }
      return { scholarships, error: scholarships.length === 0 ? "Vidyasaarathi: scraped 0 results" : null };
    } catch (scrapeErr) {
      return { scholarships: [], error: `Vidyasaarathi error: ${(fetchErr as Error).message} / ${(scrapeErr as Error).message}` };
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Upsert engine
// ─────────────────────────────────────────────────────────────
async function upsertScholarships(
  supabase: any,
  items: ScholarshipRow[],
  source: string,
): Promise<FetchResult> {
  let added = 0;
  let updated = 0;

  for (const item of items) {
    try {
      // Check if scholarship already exists
      let existing = null;

      if (item.nsp_scheme_id) {
        const { data } = await supabase
          .from("scholarships")
          .select("id, flag_count, data_fetched_at")
          .eq("nsp_scheme_id", item.nsp_scheme_id)
          .maybeSingle();
        existing = data;
      }

      if (!existing && item.name) {
        const { data } = await supabase
          .from("scholarships")
          .select("id, flag_count, data_fetched_at")
          .eq("name", item.name)
          .eq("data_source", source)
          .maybeSingle();
        existing = data;
      }

      if (existing) {
        // Update existing record
        const updatePayload: any = { ...item, updated_at: new Date().toISOString() };
        delete updatePayload.nsp_scheme_id; // Don't overwrite the dedup key

        // If data conflicts (was fetched recently but now differs), increment flag
        if (existing.data_fetched_at) {
          const lastFetch = new Date(existing.data_fetched_at);
          const hoursSince = (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            updatePayload.flag_count = (existing.flag_count || 0) + 1;
          }
        }

        await supabase
          .from("scholarships")
          .update(updatePayload)
          .eq("id", existing.id);
        updated++;
      } else {
        // Insert new record
        await supabase
          .from("scholarships")
          .insert(item);
        added++;
      }
    } catch (err) {
      console.error(`Failed to upsert scholarship "${item.name}":`, err);
    }
  }

  return { source, added, updated, error: null };
}

// ─────────────────────────────────────────────────────────────
// Rate-limit check: don't run same source more than once/day
// ─────────────────────────────────────────────────────────────
async function wasRecentlyFetched(supabase: any, source: string): Promise<boolean> {
  const { data } = await supabase
    .from("fetch_logs")
    .select("fetched_at")
    .eq("source", source)
    .eq("status", "success")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;

  const hoursSinceLastFetch = (Date.now() - new Date(data.fetched_at).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastFetch < 20; // 20 hour cooldown
}

// ─────────────────────────────────────────────────────────────
// Check for consecutive failures (for admin alerting)
// ─────────────────────────────────────────────────────────────
async function checkConsecutiveFailures(supabase: any, source: string): Promise<number> {
  const { data } = await supabase
    .from("fetch_logs")
    .select("status")
    .eq("source", source)
    .order("fetched_at", { ascending: false })
    .limit(3);

  if (!data) return 0;
  let count = 0;
  for (const log of data) {
    if (log.status === "failed") count++;
    else break;
  }
  return count;
}

// ─────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse request to determine which sources to fetch
    let targetSource = "all";
    try {
      const body = await req.json();
      if (body.source) targetSource = body.source;
    } catch {
      // No body or invalid JSON — fetch all
    }

    const results: FetchResult[] = [];
    const errors: string[] = [];

    const sources: { name: string; fetcher: () => Promise<{ scholarships: ScholarshipRow[]; error: string | null }> }[] = [
      { name: "nsp", fetcher: fetchNSP },
      { name: "buddy4study", fetcher: fetchBuddy4Study },
      { name: "vidyasaarathi", fetcher: fetchVidyasaarathi },
    ];

    for (const src of sources) {
      if (targetSource !== "all" && targetSource !== src.name) continue;

      // Rate limit check
      const recentlyDone = await wasRecentlyFetched(supabase, src.name);
      if (recentlyDone) {
        results.push({ source: src.name, added: 0, updated: 0, error: "Skipped: fetched within last 20 hours" });
        continue;
      }

      console.log(`[fetch-scholarships] Fetching from ${src.name}...`);

      const { scholarships, error } = await src.fetcher();

      if (error) {
        errors.push(error);
        // Log failure
        await supabase.from("fetch_logs").insert({
          source: src.name,
          status: "failed",
          scholarships_added: 0,
          scholarships_updated: 0,
          error_message: error,
        });

        // Check consecutive failures for admin alert
        const consecutiveFails = await checkConsecutiveFailures(supabase, src.name);
        if (consecutiveFails >= 2) {
          console.error(`[ALERT] ${src.name} has failed ${consecutiveFails + 1} times consecutively!`);
          // Insert a notification for admin awareness
          try {
            await supabase.from("fetch_logs").insert({
              source: `ALERT:${src.name}`,
              status: "failed",
              error_message: `ADMIN ALERT: ${src.name} has failed ${consecutiveFails + 1} consecutive fetches. Manual intervention may be needed.`,
            });
          } catch { /* best effort */ }
        }

        results.push({ source: src.name, added: 0, updated: 0, error });
        continue; // Don't crash, move to next source
      }

      if (scholarships.length === 0) {
        await supabase.from("fetch_logs").insert({
          source: src.name,
          status: "partial",
          scholarships_added: 0,
          scholarships_updated: 0,
          error_message: "Source returned 0 scholarships",
        });
        results.push({ source: src.name, added: 0, updated: 0, error: "0 results from source" });
        continue;
      }

      // Upsert into database
      const result = await upsertScholarships(supabase, scholarships, src.name);
      results.push(result);

      // Log success
      await supabase.from("fetch_logs").insert({
        source: src.name,
        status: "success",
        scholarships_added: result.added,
        scholarships_updated: result.updated,
        error_message: null,
      });

      console.log(`[fetch-scholarships] ${src.name}: +${result.added} added, ~${result.updated} updated`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("[fetch-scholarships] Fatal error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    );
  }
});
