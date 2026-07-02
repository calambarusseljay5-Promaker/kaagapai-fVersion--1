const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL;
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export async function generateText(prompt, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Missing Gemini environment variable. Add VITE_GEMINI_API_KEY to your .env file."
    );
  }

  const {
    model = GEMINI_MODEL || "gemini-2.0-flash",
    temperature = 0.2,
    maxOutputTokens = 700,
    systemInstruction = "",
  } = options;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result;
}
