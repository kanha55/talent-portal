/** Strip ATS-hostile artifacts from pasted or imported text. */
export function sanitizeText(text: string) {
  return text
    .replace(/\u0007/g, "")
    .replace(/[\u2500-\u257F\u2580-\u259F]/g, "")
    .replace(/\t+/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s{3,}/g, " ").trim())
    .filter((line) => !/^[\|+─\-=]{2,}$/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasTableLikeFormatting(text: string) {
  return text.split(/\r?\n/).some((line) => (line.match(/\t/g) ?? []).length >= 2 || /\s{4,}\S+\s{4,}/.test(line));
}

export function hasTextBoxArtifacts(text: string) {
  return /[\u0007\u2500-\u257F]/.test(text);
}

export const ATS_SECTION_HEADINGS = {
  summary: "Professional summary",
  experience: "Work experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
} as const;
