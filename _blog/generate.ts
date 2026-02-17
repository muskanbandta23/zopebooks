#!/usr/bin/env bun
/**
 * Blog post generator.
 * Extracts standalone blog posts from ebook chapters.
 * Each chapter becomes one HTML blog post with SEO metadata and CTA.
 *
 * Usage:
 *   bun run _blog/generate.ts <slug>       # Generate blog posts for one ebook
 *   bun run _blog/generate.ts              # Generate for all ebooks with blog enabled
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from "fs";
import { join, dirname, basename } from "path";
import { parse } from "yaml";
import Mustache from "mustache";
import { loadMergedBrand, buildCssVars } from "../scripts/brand-utils.js";
import { loadEbookContent } from "../scripts/content-utils.js";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = join(SCRIPT_DIR, "..");

// ── Markdown to HTML (lightweight) ──────────────────────────────────────────

function markdownToHtml(md: string): string {
  let html = md;

  // Strip YAML frontmatter
  html = html.replace(/^---[\s\S]*?---\n*/m, "");

  // Code blocks (fenced) — must come before inline patterns
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : "";
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre><code${langAttr}>${escaped}</code></pre>`;
  });

  // D2 diagram blocks — render as placeholder
  html = html.replace(/```\{\.d2[^}]*\}[\s\S]*?```/g,
    '<div class="diagram-placeholder"><em>[Diagram — see full ebook for interactive version]</em></div>');

  // OJS blocks — render as placeholder
  html = html.replace(/```\{ojs[^}]*\}[\s\S]*?```/g,
    '<div class="calculator-placeholder"><em>[Interactive calculator — see full ebook for interactive version]</em></div>');

  // Callout blocks
  html = html.replace(/::: \{\.callout-(note|tip|warning|important)\}\n([\s\S]*?):::/g, (_, type, content) => {
    return `<div class="callout callout-${type}"><strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${content.trim()}</div>`;
  });

  // Headers
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>\n");

  // Tables (basic)
  html = html.replace(/^\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/gm, (_, header, rows) => {
    const ths = header.split("|").map((h: string) => `<th>${h.trim()}</th>`).join("");
    const trs = rows.trim().split("\n").map((row: string) => {
      const tds = row.replace(/^\||\|$/g, "").split("|").map((c: string) => `<td>${c.trim()}</td>`).join("");
      return `<tr>${tds}</tr>`;
    }).join("\n");
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Paragraphs (wrap lines that aren't already wrapped)
  html = html.replace(/^(?!<[hupoltdb]|<\/|<li|<pre|<code|<div|<blockquote)(.+)$/gm, "<p>$1</p>");

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  // Remove HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  return html;
}

// ── SEO Helpers ─────────────────────────────────────────────────────────────

function generateSeoTitle(chapterTitle: string, ebookTitle: string, companyName: string): string {
  const full = `${chapterTitle} | ${ebookTitle} - ${companyName}`;
  return full.length <= 60 ? full : `${chapterTitle} | ${companyName}`.substring(0, 60);
}

function generateMetaDescription(content: string): string {
  // Strip markdown, take first 155 chars of prose
  const plain = content
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s.+$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return plain.substring(0, 155).replace(/\s+\S*$/, "") + "...";
}

function extractChapterTitle(content: string): string {
  // Try YAML frontmatter title first
  const fmMatch = content.match(/^---\n[\s\S]*?title:\s*["']?([^"'\n]+)["']?[\s\S]*?---/m);
  if (fmMatch) return fmMatch[1].trim();

  // Fall back to first # heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  return "Untitled";
}

function estimateReadingTime(content: string): number {
  const words = content.replace(/```[\s\S]*?```/g, "").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 250));
}

// ── Main Generator ──────────────────────────────────────────────────────────

export interface BlogResult {
  chapter: string;
  outputPath: string;
  wordCount: number;
  title: string;
}

export function generateBlogPosts(slug: string): BlogResult[] {
  const bookDir = join(PROJECT_ROOT, "books", slug);
  const chaptersDir = join(bookDir, "chapters");
  const templatePath = join(SCRIPT_DIR, "template.html");
  const cssPath = join(SCRIPT_DIR, "styles.css");

  if (!existsSync(chaptersDir)) {
    console.error(`  No chapters found: books/${slug}/chapters/`);
    return [];
  }

  if (!existsSync(templatePath)) {
    console.error(`  Blog template not found: _blog/template.html`);
    return [];
  }

  // Load brand and ebook config
  const brandConfig = loadMergedBrand(PROJECT_ROOT, slug);
  const ebookContent = loadEbookContent(PROJECT_ROOT, slug);
  const companyName = brandConfig?.company?.name || "Zopdev";
  const companyWebsite = brandConfig?.company?.website || "https://zopdev.com";
  const ebookTitle = ebookContent?.title || slug;
  const ebookSubtitle = ebookContent?.subtitle || "";

  // Build CSS vars
  const cssVars = brandConfig ? buildCssVars(brandConfig) : [];

  const template = readFileSync(templatePath, "utf-8");
  const outputDir = join(PROJECT_ROOT, "_output", "blog", slug);
  mkdirSync(outputDir, { recursive: true });

  // Copy styles
  if (existsSync(cssPath)) {
    copyFileSync(cssPath, join(outputDir, "styles.css"));
  }

  // Process each chapter
  const chapterFiles = readdirSync(chaptersDir)
    .filter(f => f.endsWith(".qmd") || f.endsWith(".md"))
    .sort();

  const results: BlogResult[] = [];

  for (const file of chapterFiles) {
    const qmdContent = readFileSync(join(chaptersDir, file), "utf-8");
    const chapterTitle = extractChapterTitle(qmdContent);
    const seoTitle = generateSeoTitle(chapterTitle, ebookTitle, companyName);
    const metaDescription = generateMetaDescription(qmdContent);
    const readingTime = estimateReadingTime(qmdContent);
    const articleHtml = markdownToHtml(qmdContent);
    const wordCount = qmdContent.replace(/```[\s\S]*?```/g, "").split(/\s+/).length;
    const chapterSlug = basename(file, ".qmd").replace(".md", "");

    const data = {
      seo_title: seoTitle,
      meta_description: metaDescription,
      chapter_title: chapterTitle,
      ebook_title: ebookTitle,
      ebook_subtitle: ebookSubtitle,
      company_name: companyName,
      company_website: companyWebsite,
      reading_time: readingTime,
      article_html: articleHtml,
      slug,
      chapter_slug: chapterSlug,
      css_vars: cssVars,
      year: new Date().getFullYear(),
    };

    const html = Mustache.render(template, data);
    const outputPath = join(outputDir, `${chapterSlug}.html`);
    writeFileSync(outputPath, html, "utf-8");

    results.push({ chapter: chapterSlug, outputPath, wordCount, title: chapterTitle });
  }

  return results;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const targetSlug = process.argv[2];

  console.log("Blog Post Generator");
  console.log("===================\n");

  if (targetSlug) {
    console.log(`Generating blog posts for "${targetSlug}"...`);
    const results = generateBlogPosts(targetSlug);
    console.log(`  Generated ${results.length} blog posts`);
    for (const r of results) {
      console.log(`    ${r.chapter}: "${r.title}" (~${r.wordCount} words)`);
    }
  } else {
    // Process all ebooks from calendar.yml
    const calPath = join(PROJECT_ROOT, "calendar.yml");
    if (!existsSync(calPath)) {
      console.error("calendar.yml not found");
      process.exit(1);
    }
    const calendar = parse(readFileSync(calPath, "utf-8")) as { ebooks: Array<{ slug: string; status?: string }> };
    let total = 0;
    for (const ebook of calendar.ebooks) {
      if (ebook.status === "archived") continue;
      console.log(`\n${ebook.slug}:`);
      const results = generateBlogPosts(ebook.slug);
      console.log(`  ${results.length} posts generated`);
      total += results.length;
    }
    console.log(`\nTotal: ${total} blog posts generated`);
  }
}
