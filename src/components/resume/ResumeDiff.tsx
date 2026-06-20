import type { ResumeContent } from "@/lib/resume/schema";
import { flattenSkillItems } from "@/lib/resume/sectionContent";

function diffLines(baseLines: string[], tailoredLines: string[]) {
  return tailoredLines.map((line) => ({
    line,
    changed: !baseLines.includes(line),
  }));
}

export function ResumeDiff({
  baseResume,
  tailoredResume,
}: {
  baseResume: ResumeContent;
  tailoredResume: ResumeContent;
}) {
  const baseBullets = baseResume.experiences.flatMap((experience) => experience.bullets);
  const tailoredBullets = tailoredResume.experiences.flatMap((experience) => experience.bullets);
  const bulletDiff = diffLines(baseBullets, tailoredBullets);
  const baseSkills = flattenSkillItems(baseResume);
  const tailoredSkills = flattenSkillItems(tailoredResume);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-zinc-900">Before</h3>
        <p className="mt-3 text-sm text-zinc-700">{baseResume.summary}</p>
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-zinc-900">Top skills</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {baseSkills.map((skill, index) => (
              <span
                key={`base-${index}-${skill}`}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6">
        <h3 className="text-lg font-semibold text-zinc-900">After</h3>
        <p className="mt-3 text-sm text-zinc-700">{tailoredResume.summary}</p>
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-zinc-900">Prioritized skills</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {tailoredSkills.map((skill, index) => (
              <span
                key={`tailored-${index}-${skill}`}
                className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-zinc-900">Bullet-level changes</h3>
        <p className="mt-2 text-sm text-zinc-600">
          Compare base accomplishments against tailored bullets rewritten for action verb → metric →
          impact.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Base bullets</h4>
            <ul className="mt-2 space-y-2 text-sm text-zinc-700">
              {baseBullets.map((bullet, index) => (
                <li key={`base-${index}`}>- {bullet}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Tailored bullets</h4>
            <ul className="mt-2 space-y-2 text-sm text-zinc-700">
              {bulletDiff.map(({ line, changed }, index) => (
                <li
                  key={`tailored-${index}`}
                  className={changed ? "rounded-lg bg-emerald-50 px-2 py-1 text-emerald-900" : ""}
                >
                  - {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
