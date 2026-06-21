import type { AgentOptions } from "@cursor/sdk";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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

export function isServerlessRuntime() {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.NETLIFY)
  );
}

export function resolveLlmProvider(): LlmProvider {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "cursor") {
    return "cursor";
  }
  if (explicit === "openai") {
    return "openai";
  }

  if (isServerlessRuntime()) {
    if (process.env.CURSOR_API_KEY?.trim()) {
      return "cursor";
    }
    if (process.env.OPENAI_API_KEY?.trim()) {
      return "openai";
    }
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

function parseOpenAiErrorPayload(body: string): OpenAiErrorPayload["error"] | null {
  try {
    const payload = JSON.parse(body) as OpenAiErrorPayload;
    return payload.error ?? null;
  } catch {
    return null;
  }
}

function parseOpenAiErrorMessage(status: number, body: string) {
  const error = parseOpenAiErrorPayload(body);
  if (error?.message) {
    return error.message;
  }

  return `OpenAI request failed with status ${status}.`;
}

function isOpenAiQuotaOrRateLimitError(status?: number, errorMessage?: string) {
  const message = errorMessage?.toLowerCase() ?? "";
  return (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("billing") ||
    message.includes("insufficient_quota")
  );
}

function missingKeyMessage(provider: LlmProvider) {
  if (provider === "cursor") {
    if (isServerlessRuntime()) {
      return "CURSOR_API_KEY is not set on Vercel. Add OPENAI_API_KEY (recommended) or CURSOR_API_KEY for cloud agents.";
    }
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

async function buildCursorLocalOptions(): Promise<NonNullable<AgentOptions["local"]>> {
  const { JsonlLocalAgentStore } = await import("@cursor/sdk");
  const storeRoot =
    process.env.CURSOR_SDK_STORE_PATH?.trim() ||
    path.join(os.tmpdir(), "talent-portal-cursor-sdk");
  await mkdir(storeRoot, { recursive: true });
  const store = new JsonlLocalAgentStore(storeRoot);
  const cwd = process.env.CURSOR_CWD?.trim() || os.tmpdir();
  return { cwd, store };
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
  const prompt = `${system}\n\n${user}`;

  const options: AgentOptions = {
    apiKey,
    model: { id: model },
  };

  if (isServerlessRuntime()) {
    // Cloud agents need a valid Cursor cloud environment on your team.
    // Use /tmp-backed local store instead (writable on Vercel Lambda).
    options.local = await buildCursorLocalOptions();
  } else {
    const cwd = process.env.CURSOR_CWD?.trim() || process.cwd();
    options.local = { cwd };
  }

  try {
    const { Agent, CursorAgentError } = await import("@cursor/sdk");
    const result = await Agent.prompt(prompt, options);

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
    const { CursorAgentError } = await import("@cursor/sdk");
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

  const openaiResult = await fetchOpenAiJsonChat<T>({
    system,
    user,
    temperature,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });

  if (openaiResult.ok) {
    return openaiResult;
  }

  const cursorApiKey = process.env.CURSOR_API_KEY?.trim();
  const cursorModel = process.env.CURSOR_MODEL?.trim() || "composer-2.5";
  if (
    cursorApiKey &&
    isOpenAiQuotaOrRateLimitError(openaiResult.status, openaiResult.error)
  ) {
    const cursorResult = await callCursorJsonChat<T>({
      system,
      user,
      apiKey: cursorApiKey,
      model: cursorModel,
    });
    if (cursorResult.ok) {
      return cursorResult;
    }
  }

  return openaiResult;
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
