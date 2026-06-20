"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { signInWithEmail, signOut, signUpWithEmail } from "@/lib/auth";
import { requireUser } from "@/lib/auth";
import { resolveJobDescriptionInput } from "@/lib/jobs/fetchJobDescription";
import { generateProfessionalSummary } from "@/lib/ai/generateProfessionalSummary";
import { tailorResume } from "@/lib/ai/tailorResume";
import { extractTextFromResumeFile, parseResumeTextToContent } from "@/lib/resume/importResume";
import { parseJobDescription } from "@/lib/jobs/parseJobDescription";
import { generateAtsReport } from "@/lib/resume/atsChecks";
import {
  normalizeResumeContent,
  resumeContentFromFormData,
  tailoredResumeVersionSchema,
} from "@/lib/resume/schema";
import {
  createApplication,
  createResume,
  getResumeById,
  getResumeVersion,
  mutateStore,
  saveTargetJob,
  updateApplicationStatus,
  updateResume,
} from "@/lib/store";
import type { ApplicationStatus } from "@/lib/types";

export async function signInAction(formData: FormData) {
  await signInWithEmail(formData);
}

export async function signUpAction(formData: FormData) {
  await signUpWithEmail(formData);
}

export async function signOutAction() {
  await signOut();
}

export async function createResumeAction() {
  const user = await requireUser();
  const resume = await createResume(user.id, user.email, user.name);
  redirect(`/resumes/${resume.id}`);
}

export async function updateResumeAction(formData: FormData) {
  const user = await requireUser();
  const resumeId = String(formData.get("resumeId") ?? "");
  const content = resumeContentFromFormData(formData);
  await updateResume(user.id, resumeId, content);
  revalidatePath(`/resumes/${resumeId}`);
  revalidatePath("/dashboard");
  redirect(`/resumes/${resumeId}?saved=1`);
}

export async function importResumeAction(formData: FormData) {
  const user = await requireUser();
  const resumeId = String(formData.get("resumeId") ?? "");
  const file = formData.get("resumeFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Upload a resume file first.");
  }

  const resume = await getResumeById(user.id, resumeId);
  if (!resume) {
    throw new Error("Resume not found.");
  }

  const extractedText = await extractTextFromResumeFile(file);
  const importedContent = parseResumeTextToContent(
    extractedText,
    resume.content,
    file.name.replace(/\.[^.]+$/, "") || "Imported Resume",
  );

  await updateResume(user.id, resumeId, importedContent);
  revalidatePath(`/resumes/${resumeId}`);
  revalidatePath("/dashboard");
  redirect(`/resumes/${resumeId}`);
}

export async function generateResumeSummaryAction(formData: FormData) {
  const user = await requireUser();
  const resumeId = String(formData.get("resumeId") ?? "");
  const resume = await getResumeById(user.id, resumeId);
  if (!resume) {
    throw new Error("Resume not found.");
  }

  const result = await generateProfessionalSummary(
    normalizeResumeContent(resume.content, { fallbackEmail: user.email }),
  );
  if (!result.summary) {
    const message = result.error ?? "Could not generate summary with AI.";
    redirect(`/resumes/${resumeId}?aiError=${encodeURIComponent(message)}`);
  }

  await updateResume(user.id, resumeId, {
    ...resume.content,
    summary: result.summary,
  });

  revalidatePath(`/resumes/${resumeId}`);
  revalidatePath("/dashboard");
  redirect(`/resumes/${resumeId}?aiSummary=1`);
}

export async function tailorResumeAction(formData: FormData) {
  const user = await requireUser();
  const resumeId = String(formData.get("resumeId") ?? "");
  const resume = await getResumeById(user.id, resumeId);
  if (!resume) {
    throw new Error("Resume not found.");
  }

  const resolvedJobInput = await resolveJobDescriptionInput({
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  const targetJob = await saveTargetJob(
    user.id,
    parseJobDescription({
      company: String(formData.get("company") ?? ""),
      role: String(formData.get("role") ?? ""),
      sourceUrl: resolvedJobInput.sourceUrl,
      description: resolvedJobInput.description,
      pageTitle: resolvedJobInput.pageTitle,
      companyHint: resolvedJobInput.companyHint,
    }),
  );

  const tailored = await tailorResume(
    normalizeResumeContent(resume.content, { fallbackEmail: user.email }),
    targetJob,
  );
  const versionId = crypto.randomUUID();
  const reportId = crypto.randomUUID();
  const report = generateAtsReport({
    userId: user.id,
    versionId,
    baseResume: resume.content,
    tailoredResume: tailored.resume,
    targetJob,
  });

  await mutateStore((store) => {
    store.atsReports.push({
      ...report,
      id: reportId,
      createdAt: new Date().toISOString(),
    });

    store.tailoredResumeVersions.push(
      tailoredResumeVersionSchema.parse({
        id: versionId,
        userId: user.id,
        baseResumeId: resume.id,
        targetJobId: targetJob.id,
        title: `${targetJob.role} Tailored Resume`,
        resume: tailored.resume,
        changeSummary: tailored.changeSummary,
        atsReportId: reportId,
        createdAt: new Date().toISOString(),
      }),
    );
  });

  revalidatePath(`/resumes/${resume.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  redirect(`/resumes/${resume.id}/versions/${versionId}`);
}

export async function createApplicationAction(formData: FormData) {
  const user = await requireUser();
  const resumeVersionId = String(formData.get("resumeVersionId") ?? "");
  const targetJobId = String(formData.get("targetJobId") ?? "");
  const workspace = await getResumeVersion(user.id, resumeVersionId);

  await createApplication(user.id, {
    resumeVersionId,
    targetJobId,
    company: String(formData.get("company") ?? ""),
    role: String(formData.get("role") ?? ""),
    source: String(formData.get("source") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    meta: workspace?.report
      ? {
          keywords_matched: workspace.report.matchedKeywords,
          keywords_missing: workspace.report.missingKeywords,
        }
      : undefined,
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath(`/resumes/${String(formData.get("resumeId") ?? "")}`);
}

export async function updateApplicationStatusAction(formData: FormData) {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  const status = String(formData.get("status") ?? "") as ApplicationStatus;

  await updateApplicationStatus(user.id, applicationId, status);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}
