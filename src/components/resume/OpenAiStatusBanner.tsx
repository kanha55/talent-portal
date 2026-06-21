"use client";

import { useEffect, useState } from "react";

type AiStatus = {
  provider: "cursor" | "openai";
  configured: boolean;
  model: string;
  baseUrl: string;
  ok: boolean;
  error?: string;
  status?: number;
};

export function OpenAiStatusBanner() {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/ai/status")
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as AiStatus;
      })
      .then((payload) => {
        if (!cancelled) {
          setStatus(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || status.ok) {
    return null;
  }

  const providerLabel = status.provider === "cursor" ? "Cursor" : "OpenAI";
  const keyName = status.provider === "cursor" ? "CURSOR_API_KEY" : "OPENAI_API_KEY";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-medium">{providerLabel} AI is not available</p>
      <p className="mt-2 leading-6">{status.error}</p>
      {!status.configured ? (
        <p className="mt-2 leading-6">
          Add <code className="rounded bg-amber-100 px-1">{keyName}</code> to{" "}
          <code className="rounded bg-amber-100 px-1">.env</code> and restart the dev server.
          {status.provider === "cursor" ? (
            <>
              {" "}
              Create a key at{" "}
              <a
                href="https://cursor.com/dashboard/integrations"
                className="font-medium text-amber-900 underline"
              >
                cursor.com/dashboard
              </a>
              .
            </>
          ) : null}
        </p>
      ) : status.provider === "openai" &&
        (status.status === 429 ||
          status.error?.toLowerCase().includes("quota") ||
          status.error?.toLowerCase().includes("billing")) ? (
        <p className="mt-2 leading-6">
          Add billing at{" "}
          <a
            href="https://platform.openai.com/settings/organization/billing"
            className="font-medium text-amber-900 underline"
          >
            platform.openai.com
          </a>
          , or in Vercel set{" "}
          <code className="rounded bg-amber-100 px-1">AI_PROVIDER=cursor</code> and ensure{" "}
          <code className="rounded bg-amber-100 px-1">CURSOR_API_KEY</code> is set, then redeploy.
        </p>
      ) : status.provider === "cursor" &&
        status.error?.toLowerCase().includes("environment_public_id") ? (
        <p className="mt-2 leading-6">
          Cursor cloud is not enabled for your account. Redeploy the latest code, or use a free
          Groq key: set <code className="rounded bg-amber-100 px-1">OPENAI_API_KEY</code>,{" "}
          <code className="rounded bg-amber-100 px-1">
            OPENAI_BASE_URL=https://api.groq.com/openai/v1
          </code>
          , and <code className="rounded bg-amber-100 px-1">AI_PROVIDER=openai</code> on Vercel.
        </p>
      ) : null}
    </div>
  );
}
