import { PDFDocument, StandardFonts } from "pdf-lib";

import { ATS_SECTION_HEADINGS } from "@/lib/resume/sanitizeContent";
import {
  formatContactLines,
  formatEducationDegreeLine,
  formatExperienceDateRange,
  formatExperienceTitleLine,
} from "@/lib/resume/sectionContent";
import type { ResumeContent } from "@/lib/resume/schema";

function wrapText(text: string, maxChars = 95) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function renderResumePdf(resume: ResumeContent) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([612, 792]);

  const pageWidth = 612;
  const left = 48;
  const right = pageWidth - 48;
  let y = 760;

  const ensureSpace = (requiredHeight: number) => {
    if (y - requiredHeight > 48) {
      return;
    }

    page = document.addPage([612, 792]);
    y = 760;
  };

  const drawLine = (text: string, size = 11, isBold = false) => {
    const lines = wrapText(text);
    for (const line of lines) {
      ensureSpace(size + 10);
      page.drawText(line, {
        x: left,
        y,
        size,
        font: isBold ? bold : font,
      });
      y -= size + 6;
    }
  };

  const drawCenteredLine = (text: string, size = 11, isBold = false) => {
    const activeFont = isBold ? bold : font;
    const lines = wrapText(text, 90);
    for (const line of lines) {
      ensureSpace(size + 10);
      const width = activeFont.widthOfTextAtSize(line, size);
      page.drawText(line, {
        x: (pageWidth - width) / 2,
        y,
        size,
        font: activeFont,
      });
      y -= size + 6;
    }
  };

  const drawDivider = () => {
    ensureSpace(14);
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 0.8,
    });
    y -= 12;
  };

  const drawSectionHeading = (title: string) => {
    drawLine(title.toUpperCase(), 11, true);
    drawDivider();
  };

  drawCenteredLine(resume.personal.fullName, 18, true);
  if (resume.personal.headline) {
    drawCenteredLine(resume.personal.headline, 12);
  }
  for (const line of formatContactLines(resume)) {
    drawCenteredLine(line, 10);
  }

  y -= 8;
  drawSectionHeading(ATS_SECTION_HEADINGS.summary);
  drawLine(resume.summary);

  y -= 4;
  drawSectionHeading(ATS_SECTION_HEADINGS.experience);
  for (const experience of resume.experiences) {
    ensureSpace(80);
    drawLine(experience.company, 12, true);
    drawLine(formatExperienceDateRange(experience), 10);
    drawLine(formatExperienceTitleLine(experience), 10);
    for (const bullet of experience.bullets) {
      drawLine(bullet);
    }
    y -= 4;
  }

  y -= 4;
  drawSectionHeading(ATS_SECTION_HEADINGS.education);
  for (const entry of resume.education) {
    ensureSpace(48);
    drawLine(entry.school, 12, true);
    drawLine(entry.graduationDate, 10);
    drawLine(formatEducationDegreeLine(entry), 10);
  }

  y -= 4;
  drawSectionHeading(ATS_SECTION_HEADINGS.skills);
  for (const group of resume.skillGroups) {
    drawLine(group.category, 11, true);
    for (const item of group.items) {
      drawLine(item, 10);
    }
    y -= 2;
  }

  if (resume.certifications.length) {
    y -= 4;
    drawSectionHeading(ATS_SECTION_HEADINGS.certifications);
    for (const cert of resume.certifications) {
      ensureSpace(32);
      drawLine(cert.name, 11, true);
      if (cert.date || cert.issuer) {
        drawLine([cert.date, cert.issuer].filter(Boolean).join(" · "), 10);
      }
    }
  }

  return document.save();
}
