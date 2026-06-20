import { generateResumeSummaryAction, updateResumeAction } from "@/app/actions";
import { AiFeedbackBanner } from "@/components/resume/AiFeedbackBanner";
import { ResumeImportForm } from "@/components/resume/ResumeImportForm";
import { SaveSuccessBanner } from "@/components/resume/SaveSuccessBanner";
import { TailorResumeForm } from "@/components/resume/TailorResumeForm";
import {
  btnDarkClass,
  btnPrimaryClass,
  cardClass,
  cardElevatedClass,
  inputClass,
  labelClass,
} from "@/lib/ui/styles";
import {
  formatCertificationBlocks,
  formatEducationBlocks,
  formatExperienceBlocks,
  formatSkillGroups,
  type BaseResume,
  type TailoredResumeVersion,
} from "@/lib/resume/schema";

export function ResumeEditor({
  resume,
  versions,
  aiError,
  aiSummary,
  saved,
}: {
  resume: BaseResume;
  versions: TailoredResumeVersion[];
  aiError?: string;
  aiSummary?: boolean;
  saved?: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
      <div className="space-y-6">
        <SaveSuccessBanner saved={saved} />
        <AiFeedbackBanner aiError={aiError} aiSummary={aiSummary} />
        <ResumeImportForm resumeId={resume.id} />

        <form
          key={resume.updatedAt}
          action={updateResumeAction}
          className={`${cardElevatedClass} space-y-6`}
        >
          <input type="hidden" name="resumeId" value={resume.id} />

          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Resume editor
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                {resume.content.title}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Edit below and click <strong>Save resume</strong> to keep your changes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                formAction={generateResumeSummaryAction}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                Generate with AI
              </button>
              <button type="submit" className={btnDarkClass}>Save resume</button>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Contact & headline
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className={labelClass}>Resume title</span>
                <input name="title" defaultValue={resume.content.title} className={inputClass} />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className={labelClass}>Full name</span>
                <input name="fullName" defaultValue={resume.content.personal.fullName} className={inputClass} />
              </label>
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className={labelClass}>Headline (target role)</span>
                <input
                  name="headline"
                  defaultValue={resume.content.personal.headline}
                  placeholder="Senior Software Engineer"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className={labelClass}>Email</span>
                <input
                  type="email"
                  name="email"
                  defaultValue={resume.content.personal.email}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className={labelClass}>Phone</span>
                <input name="phone" defaultValue={resume.content.personal.phone} className={inputClass} />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className={labelClass}>Location</span>
                <input name="location" defaultValue={resume.content.personal.location} className={inputClass} />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className={labelClass}>LinkedIn</span>
                <input name="linkedin" defaultValue={resume.content.personal.linkedin} className={inputClass} />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className={labelClass}>GitHub</span>
                <input name="github" defaultValue={resume.content.personal.github} className={inputClass} />
              </label>
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className={labelClass}>Portfolio</span>
                <input name="portfolio" defaultValue={resume.content.personal.portfolio} className={inputClass} />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Professional summary
            </h2>
            <textarea
              name="summary"
              defaultValue={resume.content.summary}
              rows={4}
              className={inputClass}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Work experience
            </h2>
            <textarea
              name="experiences"
              defaultValue={formatExperienceBlocks(resume.content.experiences)}
              rows={14}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
            <p className="text-xs text-zinc-500">
              Company, Title, Location, Start, End — then bullets with <code>-</code>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Education</h2>
            <textarea
              name="education"
              defaultValue={formatEducationBlocks(resume.content.education)}
              rows={8}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Skills</h2>
            <textarea
              name="skillGroups"
              defaultValue={formatSkillGroups(resume.content.skillGroups)}
              rows={8}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Certifications
            </h2>
            <textarea
              name="certifications"
              defaultValue={formatCertificationBlocks(resume.content.certifications)}
              rows={5}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
          </section>

          <input type="hidden" name="projects" value="" />

          <div className="flex justify-end border-t border-zinc-100 pt-4">
            <button type="submit" className={btnPrimaryClass}>Save changes</button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <TailorResumeForm resumeId={resume.id} />

        <section className={cardClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Version history
              </p>
              <h2 className="text-xl font-bold text-zinc-900">Tailored outputs</h2>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {versions.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {versions.length ? (
              versions.map((version) => (
                <a
                  key={version.id}
                  href={`/resumes/${resume.id}/versions/${version.id}`}
                  className="block rounded-xl border border-zinc-200 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <p className="font-medium text-zinc-900">{version.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(version.createdAt).toLocaleString()}
                  </p>
                </a>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                Paste a job description to generate your first tailored resume.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
