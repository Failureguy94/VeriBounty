import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreScreenResult {
  riskScore: number;           // 0–100
  reason: string;
  isWorthFactChecking: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a misinformation detector. 
Given a claim, respond with JSON only: 
{ riskScore: number (0-100), reason: string, isWorthFactChecking: boolean }`;

const MODEL_NAME = "gemini-1.5-flash";

const VAGUE_RISK_THRESHOLD = 20;

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Strips Markdown code fences (```json ... ```) that Gemini sometimes wraps
 * around its JSON response so that JSON.parse doesn't choke.
 */
function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Pre-screens a claim using Google Gemini to decide whether it is worth
 * sending for full fact-checking.
 *
 * @param claimText - The raw claim string to evaluate.
 * @returns A {@link PreScreenResult} with a risk score, reasoning, and a
 *          boolean indicating whether the claim warrants fact-checking.
 *
 * @throws Will throw if the Gemini API key is missing or if the API call
 *         itself fails with an unrecoverable error.
 */
export async function preScreenClaim(claimText: string): Promise<PreScreenResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  const client = new GoogleGenerativeAI(apiKey);

  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    // Keep safety settings permissive so legitimate fact-checking topics
    // (violence, health misinformation, etc.) are not blocked.
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT,         threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });

  let rawText: string;

  try {
    const result = await model.generateContent({
      systemInstruction: SYSTEM_PROMPT,
      contents: [
        {
          role: "user",
          parts: [{ text: claimText }],
        },
      ],
    });

    rawText = result.response.text();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini API request failed: ${message}`);
  }

  // ── Parse JSON ─────────────────────────────────────────────────────────────

  let parsed: PreScreenResult;

  try {
    parsed = JSON.parse(stripCodeFence(rawText)) as PreScreenResult;
  } catch {
    throw new Error(
      `Failed to parse Gemini response as JSON. Raw response: ${rawText}`
    );
  }

  // ── Validate shape ─────────────────────────────────────────────────────────

  if (
    typeof parsed.riskScore !== "number" ||
    typeof parsed.reason !== "string" ||
    typeof parsed.isWorthFactChecking !== "boolean"
  ) {
    throw new Error(
      `Gemini returned an unexpected JSON shape: ${JSON.stringify(parsed)}`
    );
  }

  // ── Business rule: vague/low-risk claims skip full fact-checking ───────────

  if (parsed.riskScore < VAGUE_RISK_THRESHOLD) {
    parsed.isWorthFactChecking = false;
  }

  return parsed;
}
