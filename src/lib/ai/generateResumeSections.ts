import {
  buildResumeTailoringUserMessage,
  RESUME_TAILORING_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/resumeTailoring";
import { buildGenerateResumeSectionsPrompt } from "@/lib/ai/prompts/generateResumeSections";
import { callOpenAiJsonChat } from "@/lib/ai/openaiClient";
import type { Certification, ResumeContent, SkillGroup, TargetJob } from "@/lib/resume/schema";

export type TailoringMeta = {
  ats_match_score?: number;
  keywords_matched?: string[];
  keywords_missing?: string[];
  tailoring_notes?: string;
};

export type GeneratedResumeSections = {
  summary?: string;
  headline?: string;
  skillGroups?: SkillGroup[];
  experiences?: { id: string; bullets: string[] }[];
  education?: { id: string; highlights: string[] }[];
  certifications?: Certification[];
  changeSummary?: string[];
  meta?: TailoringMeta;
};

export type GenerateResumeSectionsResult =
  | { ok: true; data: GeneratedResumeSections; model: string }
  | { ok: false; error: string };

export function formatTailoringMetaNotes(meta?: TailoringMeta) {
  if (!meta) {
    return [];
  }

  const notes: string[] = [];

  if (meta.tailoring_notes?.trim()) {
    notes.push(meta.tailoring_notes.trim());
  }

  if (meta.keywords_matched?.length) {
    notes.push(`Keywords matched: ${meta.keywords_matched.join(", ")}`);
  }

  if (meta.keywords_missing?.length) {
    notes.push(
      `Skills in job description not evidenced on resume (not added): ${meta.keywords_missing.join(", ")}`,
    );
  }

  if (typeof meta.ats_match_score === "number") {
    notes.push(`Estimated ATS match score: ${meta.ats_match_score}/100`);
  }

  return notes;
}

export async function generateResumeSections(
  baseResume: ResumeContent,
  targetJob?: TargetJob,
): Promise<GenerateResumeSectionsResult> {
  const result = await callOpenAiJsonChat<GeneratedResumeSections>({
    system: targetJob
      ? RESUME_TAILORING_SYSTEM_PROMPT
      : "You write ATS-friendly resume sections using only provided candidate facts. Return valid JSON.",
    user: targetJob
      ? buildResumeTailoringUserMessage(baseResume, targetJob)
      : buildGenerateResumeSectionsPrompt(baseResume),
    temperature: targetJob ? 0.3 : 0.4,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const summary = result.data.summary?.trim() ?? "";
  if (summary.length < 20) {
    return {
      ok: false,
      error: "AI returned an empty or too-short summary.",
    };
  }

  return { ok: true, data: result.data, model: result.model };
}
