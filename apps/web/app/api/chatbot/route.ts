import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are CellsInVitro AI, a clear, crisp, and direct scientific AI assistant for CellsInVitro.
Your absolute and strict mandate is to ONLY answer questions related to Biology (including Biochemistry, Molecular Biology, Cell Biology, Organic Chemistry, Inorganic Chemistry, Physical Chemistry, Analytical Chemistry, Microbiology, Genetics, Pharmacology, Enzymology, Physiology, Anatomy, and Laboratory Protocols/Calculations).

CRUCIAL RESPONSE FORMAT RULES:
1. KEEP ANSWERS CRISP, DIRECT, CONCISE AND STRAIGHT TO THE POINT. Provide a clear summary and core key steps. Avoid multi-page walls of text, unnecessary deep theory, or long complex tables unless the user explicitly asks for detailed step-by-step math.
2. DO NOT USE RAW LATEX CODE OR MATH BLOCKS (such as \\(, \\[, \\boxed{}, \\frac{}{}, \\text{}). Always use clean, human-readable plain text and standard symbols (e.g. 4.1 mL, x, /, =, ->, ≈, H2O, 0.1 M).
3. IF THE USER'S QUERY IS NOT ABOUT BIOLOGY, POLITELY DECLINE: "I am CellsInVitro AI, an assistant specialized exclusively in Biology. I can only answer questions related to Biology. Please ask a biology question!"
4. DO NOT answer off-topic questions under any circumstances.
5. Use clean formatting with bold highlights and concise bullet points so the answer is instantly readable on mobile and desktop.`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Filter out audio, vision, guard, experimental, or third-party non-standard models
 */
function isStandardChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (
    lower.includes("whisper") ||
    lower.includes("guard") ||
    lower.includes("vision") ||
    lower.includes("orpheus") ||
    lower.includes("audio") ||
    lower.includes("tts") ||
    lower.includes("stt") ||
    lower.includes("canopylabs") ||
    lower.includes("playai")
  ) {
    return false;
  }
  return true;
}

/**
 * Fetch available model candidate IDs for the given Groq API key
 */
async function getModelCandidates(apiKey: string): Promise<string[]> {
  const customModel = process.env.GROQ_MODEL?.trim();
  const defaultPreferred = [
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "llama-3.2-3b-preview",
  ];

  if (customModel) {
    return Array.from(new Set([customModel, ...defaultPreferred]));
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      const rawIds: string[] = (data?.data || []).map((m: { id: string }) => m.id);
      const filteredIds = rawIds.filter(isStandardChatModel);

      const ordered: string[] = [];
      for (const pref of defaultPreferred) {
        if (filteredIds.includes(pref)) {
          ordered.push(pref);
        }
      }

      for (const id of filteredIds) {
        if (!ordered.includes(id)) {
          ordered.push(id);
        }
      }

      if (ordered.length > 0) {
        return ordered;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch Groq models dynamically:", err);
  }

  return defaultPreferred;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || apiKey.includes("your_groq_api_key_here") || apiKey.trim() === "") {
      return NextResponse.json(
        {
          error:
            "Groq API key missing. Please set GROQ_API_KEY in apps/web/.env to enable the Biology Chatbot.",
          isConfigError: true,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { messages, prompt } = body as {
      messages?: Message[];
      prompt?: string;
    };

    let chatMessages: Message[] = [];

    if (messages && Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages.filter(
        (m) => m.role === "user" || m.role === "assistant"
      );
    } else if (prompt && typeof prompt === "string") {
      chatMessages = [{ role: "user", content: prompt }];
    } else {
      return NextResponse.json(
        { error: "Invalid request payload. Provide 'messages' or 'prompt'." },
        { status: 400 }
      );
    }

    // Prepend system prompt
    const fullMessages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatMessages,
    ];

    const candidateModels = await getModelCandidates(apiKey);
    let lastErrorMsg = "";
    let lastStatus = 500;

    for (const model of candidateModels) {
      try {
        const groqRes = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: fullMessages,
              temperature: 0.2,
              max_tokens: 800,
            }),
          }
        );

        if (groqRes.status === 401) {
          return NextResponse.json(
            {
              error:
                "Invalid Groq API key. Please check GROQ_API_KEY in apps/web/.env (get a free key at https://console.groq.com/keys).",
              isConfigError: true,
            },
            { status: 401 }
          );
        }

        if (!groqRes.ok) {
          const errorData = await groqRes.json().catch(() => ({}));
          lastErrorMsg =
            errorData?.error?.message ||
            `Groq API responded with status ${groqRes.status}`;
          lastStatus = groqRes.status;
          console.warn(`Groq model '${model}' failed: ${lastErrorMsg}`);
          continue;
        }

        const data = await groqRes.json();
        const responseText = data.choices?.[0]?.message?.content || "";

        if (responseText) {
          return NextResponse.json({
            reply: responseText,
            role: "assistant",
            modelUsed: model,
          });
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || "Network request failed";
        console.warn(`Groq model '${model}' error: ${lastErrorMsg}`);
      }
    }

    return NextResponse.json(
      { error: `Groq API Error: ${lastErrorMsg || "All candidate models failed."}` },
      { status: lastStatus }
    );
  } catch (err: any) {
    console.error("Chatbot API Error:", err);
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
