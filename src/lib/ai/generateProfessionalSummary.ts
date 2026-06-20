import { buildGenerateSummaryPrompt } from "@/lib/ai/prompts/generateSummary";
import { callOpenAiJsonChat } from "@/lib/ai/openaiClient";
import type { ResumeContent, TargetJob } from "@/lib/resume/schema";

export type GenerateSummaryResult = {
  summary: string | null;
  error?: string;
  model?: string;
};

export async function generateProfessionalSummary(
  baseResume: ResumeContent,
  targetJob?: TargetJob,
): Promise<GenerateSummaryResult> {
  const prompt = buildGenerateSummaryPrompt(baseResume, targetJob);

  const result = await callOpenAiJsonChat<{ summary?: string }>({
    system:
      "You write concise, ATS-friendly professional resume summaries using only provided candidate facts. Return JSON.",
    user: prompt,
    temperature: 0.4,
  });

  if (!result.ok) {
    return { summary: null, error: result.error };
  }

  const summary = result.data.summary?.trim() ?? "";
  if (summary.length < 20) {
    return {
      summary: null,
      error: "AI returned an empty or too-short summary.",
      model: result.model,
    };
  }

  return { summary, model: result.model };
}
