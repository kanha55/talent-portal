import type { ResumeContent } from "@/lib/resume/schema";
import { ATS_SECTION_HEADINGS } from "@/lib/resume/sanitizeContent";
import {
  formatContactLines,
  formatEducationDegreeLine,
  formatExperienceDateRange,
  formatExperienceTitleLine,
} from "@/lib/resume/sectionContent";

function sectionTitle(title: string) {
  return (
    <div className="border-b border-zinc-300 pb-1">
      <h3 className="text-xs font-semibold tracking-[0.2em] text-zinc-700 uppercase">{title}</h3>
    </div>
  );
}

export function ResumePreview({
  resume,
  roleLabel,
}: {
  resume: ResumeContent;
  roleLabel?: string;
}) {
  const headline = resume.personal.headline || roleLabel;

  return (
    <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="border-b border-zinc-200 pb-5 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
          {resume.personal.fullName}
        </h2>
        {headline ? (
          <p className="mt-1 text-sm font-medium text-indigo-700">{headline}</p>
        ) : null}
        <div className="mt-3 space-y-1 text-sm leading-6 text-zinc-600">
          {formatContactLines(resume).map((line, index) => (
            <div key={`contact-${index}`}>{line}</div>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          {sectionTitle(ATS_SECTION_HEADINGS.summary)}
          <p className="mt-3 text-sm leading-7 text-zinc-800">{resume.summary}</p>
        </div>

        <div>
          {sectionTitle(ATS_SECTION_HEADINGS.experience)}
          <div className="mt-4 space-y-5">
            {resume.experiences.map((experience) => (
              <article key={experience.id}>
                <p className="text-base font-semibold text-zinc-950">{experience.company}</p>
                <p className="text-sm text-zinc-500">{formatExperienceDateRange(experience)}</p>
                <p className="text-sm font-medium text-zinc-700">
                  {formatExperienceTitleLine(experience)}
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-zinc-800">
                  {experience.bullets.map((bullet, index) => (
                    <li key={`${experience.id}-bullet-${index}`}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div>
          {sectionTitle(ATS_SECTION_HEADINGS.education)}
          <div className="mt-4 space-y-4">
            {resume.education.map((entry) => (
              <article key={entry.id}>
                <p className="text-base font-semibold text-zinc-950">{entry.school}</p>
                <p className="text-sm text-zinc-500">{entry.graduationDate}</p>
                <p className="text-sm font-medium text-zinc-700">
                  {formatEducationDegreeLine(entry)}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div>
          {sectionTitle(ATS_SECTION_HEADINGS.skills)}
          <div className="mt-4 space-y-4">
            {resume.skillGroups.map((group, groupIndex) => (
              <div key={`${groupIndex}-${group.category}`}>
                <p className="text-sm font-semibold text-zinc-900">{group.category}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.items.map((skill, index) => (
                    <span
                      key={`${groupIndex}-${index}-${skill}`}
                      className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {resume.certifications.length ? (
          <div>
            {sectionTitle(ATS_SECTION_HEADINGS.certifications)}
            <div className="mt-4 space-y-3">
              {resume.certifications.map((cert) => (
                <article key={cert.id}>
                  <p className="text-sm font-semibold text-zinc-950">{cert.name}</p>
                  {cert.date || cert.issuer ? (
                    <p className="text-sm text-zinc-500">
                      {[cert.date, cert.issuer].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
