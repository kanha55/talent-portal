import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import { ATS_SECTION_HEADINGS } from "@/lib/resume/sanitizeContent";
import {
  formatContactLines,
  formatEducationDegreeLine,
  formatExperienceDateRange,
  formatExperienceTitleLine,
} from "@/lib/resume/sectionContent";
import type { ResumeContent } from "@/lib/resume/schema";

function heading(text: string) {
  return new Paragraph({
    text: text.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  });
}

function body(text: string, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold })],
    spacing: { after: 80 },
  });
}

function centeredBody(text: string, bold = false, size?: number) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold, size })],
    spacing: { after: 80 },
  });
}

export async function renderResumeDocx(resume: ResumeContent) {
  const children: Paragraph[] = [
    centeredBody(resume.personal.fullName, true, 32),
  ];

  if (resume.personal.headline) {
    children.push(centeredBody(resume.personal.headline));
  }

  for (const line of formatContactLines(resume)) {
    children.push(centeredBody(line));
  }

  children.push(heading(ATS_SECTION_HEADINGS.summary));
  children.push(body(resume.summary));

  children.push(heading(ATS_SECTION_HEADINGS.experience));
  for (const experience of resume.experiences) {
    children.push(body(experience.company, true));
    children.push(body(formatExperienceDateRange(experience)));
    children.push(body(formatExperienceTitleLine(experience)));
    for (const bullet of experience.bullets) {
      children.push(body(bullet));
    }
  }

  children.push(heading(ATS_SECTION_HEADINGS.education));
  for (const entry of resume.education) {
    children.push(body(entry.school, true));
    children.push(body(entry.graduationDate));
    children.push(body(formatEducationDegreeLine(entry)));
  }

  children.push(heading(ATS_SECTION_HEADINGS.skills));
  for (const group of resume.skillGroups) {
    children.push(body(group.category, true));
    for (const item of group.items) {
      children.push(body(item));
    }
  }

  if (resume.certifications.length) {
    children.push(heading(ATS_SECTION_HEADINGS.certifications));
    for (const cert of resume.certifications) {
      children.push(body(cert.name, true));
      if (cert.date || cert.issuer) {
        children.push(body([cert.date, cert.issuer].filter(Boolean).join(" · ")));
      }
    }
  }

  const document = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(document);
}
