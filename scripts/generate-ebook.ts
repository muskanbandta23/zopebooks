#!/usr/bin/env bun
/**
 * generate-ebook.ts — One-command ebook generator
 *
 * Takes a topic string, generates the full ebook + all modalities:
 *   Scaffold → Pipeline (research → outline → plan → transform) → Render → Blog → Social → Dashboard
 *
 * Usage:
 *   bun run scripts/generate-ebook.ts --topic="Docker Security Best Practices"
 *   bun run scripts/generate-ebook.ts --topic="AWS Lambda Cost Optimization" --chapters=6
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { join, dirname } from "path";
import * as yaml from "yaml";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const SCRIPTS = join(ROOT, "scripts");
const BOOKS = join(ROOT, "books");
const TEMPLATES = join(ROOT, "_templates");

// ── Terminal Colors ─────────────────────────────────────────────
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ── Helpers ─────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function stepHeader(num: number, total: number, label: string): void {
  console.log(`\n${BLUE}── [${num}/${total}]${RESET} ${BOLD}${label}${RESET}\n`);
}

function runBun(script: string, args: string[]): boolean {
  const result = spawnSync("bun", ["run", script, ...args], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return result.status === 0;
}

function runQuarto(args: string[]): boolean {
  const result = spawnSync("quarto", args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return result.status === 0;
}

function runShell(cmd: string, args: string[]): boolean {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return result.status === 0;
}

function updateQuartoChapters(slug: string): void {
  const outlinePath = join(BOOKS, slug, "outline.yml");
  const quartoPath = join(BOOKS, slug, "_quarto.yml");

  if (!existsSync(outlinePath) || !existsSync(quartoPath)) return;

  const outline = yaml.parse(readFileSync(outlinePath, "utf-8"));
  const quarto = yaml.parse(readFileSync(quartoPath, "utf-8"));

  if (!outline?.chapters || !Array.isArray(outline.chapters)) return;

  const chapterFiles = outline.chapters.map((ch: any) => {
    const id = ch.id || slugify(ch.title);
    return `chapters/${id}.qmd`;
  });

  quarto.book.chapters = ["index.qmd", ...chapterFiles];
  writeFileSync(quartoPath, yaml.stringify(quarto, { lineWidth: 120 }));
  console.log(`  ${GREEN}✓${RESET} Updated _quarto.yml with ${chapterFiles.length} chapters`);
}

function addClosingChapter(slug: string, title: string): void {
  const closingTemplate = join(TEMPLATES, "closing.qmd");
  if (!existsSync(closingTemplate)) return;

  const bookDir = join(BOOKS, slug);
  const closingDest = join(bookDir, "chapters", "99-closing.qmd");
  if (existsSync(closingDest)) return;

  let closing = readFileSync(closingTemplate, "utf-8");
  closing = closing.replace(/\{\{book_title\}\}/g, title);
  closing = closing.replace(/\{\{company_name\}\}/g, "Zopdev");
  closing = closing.replace(/\{\{company_website\}\}/g, "https://zopdev.com");
  closing = closing.replace(/\{\{company_description\}\}/g, "Zopdev builds tools that help engineering teams ship faster, spend less, and operate with confidence.");
  closing = closing.replace(/\{\{#product_name\}\}[\s\S]*?\{\{\/product_name\}\}/g, "");
  closing = closing.replace(/\{\{#.*?\}\}|\{\{\/.*?\}\}|\{\{\.\}\}/g, "");
  closing = closing.replace(
    /\{\{#takeaways\}\}[\s\S]*?\{\{\/takeaways\}\}/g,
    "- Review the strategies and frameworks presented in each chapter\n- Identify quick wins you can implement this week\n- Build a roadmap for longer-term improvements"
  );

  writeFileSync(closingDest, closing);

  // Add to _quarto.yml
  const quartoPath = join(bookDir, "_quarto.yml");
  if (existsSync(quartoPath)) {
    const quarto = yaml.parse(readFileSync(quartoPath, "utf-8"));
    if (quarto.book?.chapters && !quarto.book.chapters.includes("chapters/99-closing.qmd")) {
      quarto.book.chapters.push("chapters/99-closing.qmd");
      writeFileSync(quartoPath, yaml.stringify(quarto, { lineWidth: 120 }));
    }
  }
  console.log(`  ${GREEN}✓${RESET} Added closing chapter`);
}

// ── Parse args ─────────────────────────────────────────────────

const args = process.argv.slice(2);
const opts: Record<string, string> = {};
for (const arg of args) {
  if (arg.startsWith("--")) {
    const eqIdx = arg.indexOf("=");
    if (eqIdx !== -1) {
      opts[arg.substring(2, eqIdx)] = arg.substring(eqIdx + 1);
    } else {
      opts[arg.substring(2)] = "";
    }
  }
}

const topic = opts.topic;
const numChapters = parseInt(opts.chapters || "5") || 5;

if (!topic) {
  console.error(`${RED}Error: --topic is required${RESET}`);
  console.error(`\n${BOLD}Usage:${RESET}`);
  console.error(`  ebook generate --topic="Docker Security Best Practices"`);
  console.error(`  ebook generate --topic="AWS Lambda Cost Optimization" --chapters=6`);
  console.error(`  ebook generate --topic="Kubernetes Monitoring" --slug=k8s-monitoring`);
  process.exit(1);
}

const slug = opts.slug || slugify(topic);
const title = opts.title || topic;
const subtitle = opts.subtitle || `A Practical Guide to ${topic}`;

// ── Main ───────────────────────────────────────────────────────

const TOTAL_STEPS = 10;
let currentStep = 0;

console.log(`
${BLUE}╔══════════════════════════════════════════════════════════════╗${RESET}
${BLUE}║${RESET}${BOLD}  Zopdev Ebook Engine — Auto Generator${RESET}${BLUE}                       ║${RESET}
${BLUE}╚══════════════════════════════════════════════════════════════╝${RESET}

  ${BOLD}Topic:${RESET}    ${topic}
  ${BOLD}Slug:${RESET}     ${slug}
  ${BOLD}Title:${RESET}    ${title}
  ${BOLD}Subtitle:${RESET} ${subtitle}
  ${BOLD}Chapters:${RESET} ${numChapters}
`);

const bookDir = join(BOOKS, slug);

// ── Step 1: Scaffold ────────────────────────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Scaffolding ebook");

if (existsSync(join(bookDir, "_quarto.yml"))) {
  console.log(`  ${GREEN}✓${RESET} Book directory already exists, skipping scaffold`);
} else {
  runShell("bash", [join(SCRIPTS, "new-ebook.sh"), slug, title, subtitle]);
}

// Copy diagram templates so D2 references work
const diagramsSrc = join(ROOT, "_diagrams", "templates");
const diagramsDst = join(bookDir, "diagrams");
if (existsSync(diagramsSrc) && !existsSync(diagramsDst)) {
  mkdirSync(diagramsDst, { recursive: true });
  for (const f of readdirSync(diagramsSrc).filter(f => f.endsWith(".d2"))) {
    const src = join(diagramsSrc, f);
    const dst = join(diagramsDst, f);
    writeFileSync(dst, readFileSync(src, "utf-8"));
  }
  console.log(`  ${GREEN}✓${RESET} Copied ${readdirSync(diagramsDst).length} diagram templates`);
}

// Write topic.yml
// Note: chapter_count must be a string range (e.g. "3-5") as expected by pipeline-types.ts
const topicYml = {
  topic: topic,
  title: title,
  subtitle: subtitle,
  audience: "DevOps Engineers & SREs",
  depth: numChapters <= 4 ? "light" : numChapters <= 7 ? "standard" : "full",
  chapter_count: `${numChapters}-${numChapters + 2}`,
  target_chapters: numChapters,
  angle: "Practitioner's guide — step-by-step implementation",
  product_id: null,
};

mkdirSync(bookDir, { recursive: true });
writeFileSync(join(bookDir, "topic.yml"), yaml.stringify(topicYml, { lineWidth: 120 }));
console.log(`  ${GREEN}✓${RESET} Written topic.yml`);

// Write ebook.yml with social config so social assets can be generated
const ebookYml = {
  meta: {
    slug: slug,
    title: title,
    subtitle: subtitle,
    version: "0.1.0",
    authors: ["zopdev-team"],
  },
  social: {
    linkedin_carousel: {
      slides: [
        { heading: title, body: `${subtitle} — by Zopdev` },
        { heading: "The Challenge", body: `Most teams struggle with ${topic.toLowerCase()}. This guide shows you how to fix it.` },
        { heading: "Key Strategies", body: `Proven techniques and production-ready examples for ${topic.toLowerCase()}.` },
        { heading: "Get the Full Guide", body: "Download now at zopdev.com" },
      ],
    },
    instagram_posts: {
      quotes: [
        { text: `${topic} isn't optional anymore — it's a competitive advantage.`, attribution: "Zopdev Team" },
      ],
    },
    og_image: {
      title: title,
      subtitle: subtitle,
    },
  },
};
const ebookYmlPath = join(bookDir, "ebook.yml");
if (!existsSync(ebookYmlPath)) {
  writeFileSync(ebookYmlPath, yaml.stringify(ebookYml, { lineWidth: 120 }));
  console.log(`  ${GREEN}✓${RESET} Written ebook.yml (with social config)`);
}

// Add to calendar.yml if not already present (needed for social asset generation)
const calendarPath = join(ROOT, "calendar.yml");
if (existsSync(calendarPath)) {
  const calendarContent = readFileSync(calendarPath, "utf-8");
  if (!calendarContent.includes(`slug: ${slug}`)) {
    const calendarEntry = `
  - slug: ${slug}
    title: "${title}"
    subtitle: "${subtitle}"
    authors:
      - "Zopdev Team"
    status: draft
    tags: [${topic.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !["and", "for", "the", "with", "best"].includes(w)).slice(0, 4).join(", ")}]
    outputs:
      html: true
      pdf: true
      epub: true
      landing_page: true
      linkedin_carousel: true
      instagram_posts: true
      og_image: true
`;
    writeFileSync(calendarPath, calendarContent.trimEnd() + "\n" + calendarEntry);
    console.log(`  ${GREEN}✓${RESET} Added to calendar.yml`);
  }
}

// ── Step 2: Research ────────────────────────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Researching topic");
runBun(join(SCRIPTS, "research-topic.ts"), [slug]);

// ── Step 3: Outline ─────────────────────────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Generating outline");
runBun(join(SCRIPTS, "generate-outline.ts"), [slug]);

// ── Step 4: Update _quarto.yml chapters ─────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Updating chapter list");
updateQuartoChapters(slug);

// ── Step 5: Plan chapters ───────────────────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Planning chapters");
runBun(join(SCRIPTS, "plan-chapters.ts"), [slug]);

// ── Step 6: Transform to prose ──────────────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Writing chapters (LLM)");
runBun(join(SCRIPTS, "transform-chapter.ts"), [slug]);

// Add closing chapter
addClosingChapter(slug, title);

// ── Step 7: Render PDF + HTML ───────────────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Rendering PDF & HTML");

// Check if Quarto is available
const quartoCheck = spawnSync("quarto", ["--version"], { cwd: ROOT, stdio: "pipe" });
const hasQuarto = quartoCheck.status === 0;

if (hasQuarto) {
  const renderOk = runQuarto(["render", join("books", slug)]);
  if (!renderOk) {
    console.log(`  ${YELLOW}⚠${RESET} Quarto render had issues — trying PDF separately...`);
    runQuarto(["render", join("books", slug), "--to", "html"]);
    runQuarto(["render", join("books", slug), "--to", "pdf"]);
  }
} else {
  console.log(`  ${YELLOW}⚠${RESET} Quarto not found — using standalone HTML reader...`);
}

// Always generate standalone HTML reader (works with or without Quarto)
const readerOk = runBun(join(ROOT, "_reader", "generate.ts"), [slug]);
if (readerOk) {
  console.log(`  ${GREEN}✓${RESET} Standalone HTML book generated`);
} else {
  console.log(`  ${YELLOW}⚠${RESET} Standalone HTML reader generation failed`);
}

// ── Step 8: Generate blog posts ─────────────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Generating blog posts");
runBun(join(ROOT, "_blog", "generate.ts"), [slug]);

// ── Step 9: Generate social assets ──────────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Generating social assets (LinkedIn, Instagram, OG)");
runBun(join(ROOT, "_social", "generate.ts"), [slug]);

// ── Step 10: Regenerate dashboard ───────────────────────────────
currentStep++;
stepHeader(currentStep, TOTAL_STEPS, "Updating dashboard");
runBun(join(ROOT, "_dashboard", "generate.ts"), []);

// ── Summary ─────────────────────────────────────────────────────

const outputDir = join(ROOT, "_output", "books", slug);
const pdfFiles = existsSync(outputDir)
  ? readdirSync(outputDir).filter(f => f.endsWith(".pdf"))
  : [];
const blogDir = join(ROOT, "_output", "blog", slug);
const blogFiles = existsSync(blogDir)
  ? readdirSync(blogDir).filter(f => f.endsWith(".html"))
  : [];
const socialDir = join(ROOT, "_output", "social", slug);
const hasSocial = existsSync(socialDir);

console.log(`
${GREEN}╔══════════════════════════════════════════════════════════════╗${RESET}
${GREEN}║${RESET}  ${BOLD}✅ Ebook Generated Successfully!${RESET}
${GREEN}╠══════════════════════════════════════════════════════════════╣${RESET}
${GREEN}║${RESET}
${GREEN}║${RESET}  ${BOLD}${title}${RESET}
${GREEN}║${RESET}  ${DIM}${subtitle}${RESET}
${GREEN}║${RESET}
${GREEN}║${RESET}  📖 HTML      → _output/books/${slug}/index.html
${GREEN}║${RESET}  📄 PDF       → ${pdfFiles.length > 0 ? `_output/books/${slug}/${pdfFiles[0]}` : "not generated"}
${GREEN}║${RESET}  📝 Blog      → _output/blog/${slug}/ (${blogFiles.length} posts)
${GREEN}║${RESET}  📱 Social    → ${hasSocial ? `_output/social/${slug}/` : "not generated"}
${GREEN}║${RESET}  🏠 Dashboard → _output/dashboard/index.html
${GREEN}║${RESET}
${GREEN}║${RESET}  Open dashboard: ${CYAN}open _output/dashboard/index.html${RESET}
${GREEN}║${RESET}
${GREEN}╚══════════════════════════════════════════════════════════════╝${RESET}
`);
