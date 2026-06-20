import { Agent, CursorAgentError } from "@cursor/sdk";

type OpenAiErrorPayload = {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
};

export type LlmProvider = "cursor" | "openai";

export type LlmChatJsonResult<T> =
  | { ok: true; data: T; model: string }
  | { ok: false; error: string; status?: number };

export function resolveLlmProvider(): LlmProvider {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "cursor") {
    return "cursor";
  }
  if (explicit === "openai") {
    return "openai";
  }

  if (process.env.CURSOR_API_KEY?.trim()) {
    return "cursor";
  }

  return "openai";
}

export function readLlmConfig() {
  const provider = resolveLlmProvider();
  const cursorApiKey = process.env.CURSOR_API_KEY?.trim();
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

  if (provider === "cursor") {
    const model = process.env.CURSOR_MODEL?.trim() || "composer-2.5";
    return {
      provider,
      configured: Boolean(cursorApiKey),
      apiKey: cursorApiKey,
      model,
      baseUrl: "cursor-sdk",
    };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  return {
    provider,
    configured: Boolean(openaiApiKey),
    apiKey: openaiApiKey,
    model,
    baseUrl,
  };
}

function parseJsonFromText<T>(text: string): T | null {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\{][\s\S]*[\}])\s*```/);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]) as T;
    } catch {
      // continue
    }
  }

  const objectMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (objectMatch?.[1]) {
    try {
      return JSON.parse(objectMatch[1]) as T;
    } catch {
      return null;
    }
  }

  return null;
}

function parseOpenAiErrorMessage(status: number, body: string) {
  try {
    const payload = JSON.parse(body) as OpenAiErrorPayload;
    if (payload.error?.message) {
      return payload.error.message;
    }
  } catch {
    // ignore JSON parse errors
  }

  return `OpenAI request failed with status ${status}.`;
}

function missingKeyMessage(provider: LlmProvider) {
  if (provider === "cursor") {
    return "CURSOR_API_KEY is not set. Add it to .env and restart the dev server.";
  }

  return "OPENAI_API_KEY is not set. Add it to .env and restart the dev server.";
}

async function fetchOpenAiJsonChat<T>({
  system,
  user,
  temperature = 0.3,
  apiKey,
  baseUrl,
  model,
}: {
  system: string;
  user: string;
  temperature?: number;
  apiKey: string;
  baseUrl: string;
  model: string;
}): Promise<LlmChatJsonResult<T>> {
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        ok: false,
        error: parseOpenAiErrorMessage(response.status, body),
        status: response.status,
      };
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "OpenAI returned an empty completion." };
    }

    const parsed = parseJsonFromText<T>(content);
    if (!parsed) {
      return { ok: false, error: "OpenAI returned invalid JSON." };
    }

    return { ok: true, data: parsed, model };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown OpenAI error.",
    };
  }
}

async function callCursorJsonChat<T>({
  system,
  user,
  apiKey,
  model,
}: {
  system: string;
  user: string;
  apiKey: string;
  model: string;
}): Promise<LlmChatJsonResult<T>> {
  const cwd = process.env.CURSOR_CWD?.trim() || process.cwd();
  const prompt = `${system}\n\n${user}`;

  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: model },
      local: { cwd },
    });

    if (result.status !== "finished") {
      return { ok: false, error: `Cursor agent run ${result.status}.` };
    }

    if (!result.result?.trim()) {
      return { ok: false, error: "Cursor returned an empty completion." };
    }

    const parsed = parseJsonFromText<T>(result.result);
    if (!parsed) {
      return { ok: false, error: "Cursor returned invalid JSON." };
    }

    return { ok: true, data: parsed, model: result.model?.id ?? model };
  } catch (error) {
    if (error instanceof CursorAgentError) {
      return { ok: false, error: error.message };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Cursor error.",
    };
  }
}

export async function callLlmJsonChat<T>({
  system,
  user,
  temperature = 0.3,
}: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<LlmChatJsonResult<T>> {
  const config = readLlmConfig();

  if (!config.configured || !config.apiKey) {
    return { ok: false, error: missingKeyMessage(config.provider) };
  }

  if (config.provider === "cursor") {
    return callCursorJsonChat<T>({
      system,
      user,
      apiKey: config.apiKey,
      model: config.model,
    });
  }

  return fetchOpenAiJsonChat<T>({
    system,
    user,
    temperature,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });
}

export async function checkLlmConnection() {
  const config = readLlmConfig();

  if (!config.configured) {
    return {
      provider: config.provider,
      configured: false,
      model: config.model,
      baseUrl: config.baseUrl,
      ok: false,
      error: missingKeyMessage(config.provider),
    };
  }

  const result = await callLlmJsonChat<{ ok?: boolean }>({
    system: "Return JSON only.",
    user: '{"ok":true}',
    temperature: 0,
  });

  return {
    provider: config.provider,
    configured: true,
    model: config.model,
    baseUrl: config.baseUrl,
    ok: result.ok,
    error: result.ok ? undefined : result.error,
    status: result.ok ? undefined : result.status,
  };
}

// Backward-compatible exports
export type OpenAiChatJsonResult<T> = LlmChatJsonResult<T>;

export function readOpenAiConfig() {
  return readLlmConfig();
}

export async function callOpenAiJsonChat<T>(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<LlmChatJsonResult<T>> {
  return callLlmJsonChat<T>(args);
}

export async function checkOpenAiConnection() {
  return checkLlmConnection();
}
