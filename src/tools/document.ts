import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import type { GogMcpConfig } from "../config.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, SectionType } from "docx";

function ok(data: { filePath: string; format: string; size: number }) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function err(msg: string) {
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

function parseMarkdownToParagraphs(markdown: string): Paragraph[] {
  const blocks = markdown.split(/\n\n+/);
  return blocks.flatMap((block) => {
    block = block.trim();
    if (!block) return [new Paragraph("")];

    const lines = block.split("\n").filter((l) => l.trim());

    if (block.startsWith("### ")) {
      return [new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(block.slice(4))] })];
    }
    if (block.startsWith("## ")) {
      return [new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(block.slice(3))] })];
    }
    if (block.startsWith("# ")) {
      return [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(block.slice(2))] })];
    }

    if (lines.every((l) => l.trim().startsWith("- "))) {
      return lines.map((l) =>
        new Paragraph({
          children: [new TextRun(l.trim().slice(2))],
          bullet: { level: 0 },
        }),
      );
    }

    return [new Paragraph({ children: [new TextRun(block)] })];
  });
}

export function registerDocumentTools(server: McpServer, _config: GogMcpConfig) {
  server.tool("gog_document_generate",
    "Generate a professional document (.docx or .pdf) from markdown content",
    {
      title: z.string(),
      content: z.string().describe("Markdown content"),
      format: z.enum(["docx", "pdf"]),
      template: z.enum(["report", "briefing", "memo", "blank"]).optional().default("blank"),
      outputPath: z.string().optional().describe("Save path; defaults to ~/Documents/gog-docs/"),
      author: z.string().optional(),
    },
    async ({ title, content, format, template, outputPath, author }) => {
      if (format === "pdf") {
        return err("PDF generation is not yet supported. Use format='docx' and convert externally.");
      }

      try {
        const defaultDir = join(process.env.HOME || "", "Documents", "gog-docs");
        const dir = outputPath ? outputPath.replace(/\/[^/]+$/, "") : defaultDir;
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const now = new Date().toISOString().slice(0, 10);
        const filename = `${now}-${slug}.docx`;
        const filePath = join(dir, filename);

        const children: Paragraph[] = [];

        if (template === "report") {
          children.push(
            new Paragraph({
              heading: HeadingLevel.TITLE,
              children: [new TextRun({ text: title, bold: true, size: 48 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `Generated: ${now}`, color: "888888", size: 20 })],
              spacing: { after: 400 },
            }),
          );
          if (author) {
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `By: ${author}`, size: 22 })],
                spacing: { after: 600 },
              }),
            );
          }
        } else if (template === "memo") {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: "MEMORANDUM", bold: true })],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Subject: ${title}`, bold: true })],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Date: ${now}` })],
              spacing: { after: 200 },
            }),
            ...(author ? [new Paragraph({ children: [new TextRun({ text: `From: ${author}` })], spacing: { after: 400 } })] : []),
          );
        } else if (template === "briefing") {
          children.push(
            new Paragraph({
              heading: HeadingLevel.TITLE,
              children: [new TextRun({ text: `BRIEFING: ${title}`, bold: true, size: 40 })],
              alignment: AlignmentType.LEFT,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `${now} | ${author || "Prepared by agent"}`, color: "888888", size: 20 })],
              spacing: { after: 600 },
            }),
          );
        } else {
          children.push(
            new Paragraph({
              heading: HeadingLevel.TITLE,
              children: [new TextRun({ text: title, bold: true })],
              spacing: { after: 400 },
            }),
          );
        }

        children.push(...parseMarkdownToParagraphs(content));

        const doc = new Document({
          sections: [{
            properties: { type: SectionType.CONTINUOUS },
            children,
          }],
        });

        const buffer = await Packer.toBuffer(doc);
        writeFileSync(filePath, buffer);

        return ok({ filePath, format: "docx", size: buffer.length });
      } catch (e) {
        return err(`Document generation failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );
}
