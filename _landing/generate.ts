#!/usr/bin/env bun
/**
 * Landing page generator.
 * Reads calendar.yml, _brand.yml + _brand-extended.yml, and per-ebook
 * brand-overrides.yml to generate HTML landing pages.
 *
 * Usage:
 *   bun run _landing/generate.ts                  # all ebooks with landing_page enabled
 *   bun run _landing/generate.ts finops-playbook  # specific ebook
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { parse } from "yaml";
import Mustache from "mustache";
import { loadMergedBrand, buildCssVars } from "../scripts/brand-utils.js";
import { loadEbookContent } from "../scripts/content-utils.js";
import type { EnrichedChapter } from "../scripts/content-utils.js";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const ROOT_DIR = join(SCRIPT_DIR, "..");

// --- Load configuration ---

const calendarPath = join(ROOT_DIR, "calendar.yml");
const templatePath = join(SCRIPT_DIR, "template.html");
const cssPath = join(SCRIPT_DIR, "styles.css");

if (!existsSync(calendarPath)) {
  console.error("Error: calendar.yml not found");
  process.exit(1);
}

const calendar = parse(readFileSync(calendarPath, "utf-8")) as {
  ebooks: Array<{
    slug: string;
    title: string;
    subtitle?: string;
    tags?: string[];
    status: string;
    outputs?: Record<string, boolean>;
    landing?: {
      headline?: string;
      description?: string;
      cta_text?: string;
      form_action?: string;
    };
  }>;
};

const template = readFileSync(templatePath, "utf-8");
const targetSlug = process.argv[2] || null;

// --- Generate landing pages ---

let generated = 0;

for (const ebook of calendar.ebooks) {
  // Filter by slug if specified
  if (targetSlug && ebook.slug !== targetSlug) continue;

  // Skip if landing page not enabled
  if (!ebook.outputs?.landing_page) {
    console.log(`Skipping ${ebook.slug}: landing_page not enabled`);
    continue;
  }

  // Skip archived
  if (ebook.status === "archived") {
    console.log(`Skipping ${ebook.slug}: archived`);
    continue;
  }

  console.log(`Generating landing page for: ${ebook.slug}`);

  // Load enriched ebook content
  const ebookContent = loadEbookContent(ROOT_DIR, ebook.slug);
  const ebookAuthors = ebookContent?.meta?.authors || [];

  // Load merged brand config (core + extended + overrides + author resolution)
  const brandConfig = loadMergedBrand(ROOT_DIR, ebook.slug, ebookAuthors);

  const chapters: EnrichedChapter[] = ebookContent?.chapters || [];

  // Build template data
  const landing = ebook.landing || {};

  // Use override CTAs if available, fall back to calendar/defaults
  const ctaText = landing.cta_text || brandConfig.resolved.ctas.primary.text || "Download Free PDF";

  // Map chapters with enriched metadata for template
  const chapterItems = chapters.map((ch, i) => ({
    number: i + 1,
    title: ch.title,
    summary: ch.summary || "",
    difficulty: ch.difficulty || null,
    is_beginner: ch.difficulty === "beginner",
    is_intermediate: ch.difficulty === "intermediate",
    is_advanced: ch.difficulty === "advanced",
    reading_time_minutes: ch.reading_time_minutes || null,
    has_objectives: ch.learning_objectives && ch.learning_objectives.length > 0,
    learning_objectives: ch.learning_objectives
      ? ch.learning_objectives.map((obj) => ({ text: obj }))
      : null,
    has_takeaways: ch.key_takeaways && ch.key_takeaways.length > 0,
    key_takeaways: ch.key_takeaways
      ? ch.key_takeaways.map((t) => ({ text: t }))
      : null,
  }));

  // Map authors for template
  const authorItems = brandConfig.resolved.authors.map((a) => ({
    name: a.name,
    title: a.title || "",
    bio: a.bio || "",
    avatar_url: a.avatar_url || null,
    has_social: a.social && Object.keys(a.social).length > 0,
    linkedin: a.social?.linkedin || null,
    github: a.social?.github || null,
    twitter: a.social?.twitter || null,
  }));

  const data = {
    slug: ebook.slug,
    title: ebook.title,
    subtitle: ebook.subtitle || "",
    headline: landing.headline || ebook.title,
    description: landing.description || "",
    cta_text: ctaText,
    form_action: landing.form_action || "#",
    year: new Date().getFullYear(),
    theme_color: brandConfig.resolved.colors.primary,
    css_vars: buildCssVars(brandConfig),

    // Brand-extended data
    company_name: brandConfig.resolved.company.name,
    company_website: brandConfig.resolved.company.website,
    company_tagline: brandConfig.resolved.company.tagline,

    // Secondary CTA (from overrides or brand defaults)
    secondary_cta: brandConfig.resolved.ctas.secondary || null,

    // Featured products for the landing page
    featured_products:
      brandConfig.resolved.featuredProducts.length > 0
        ? { items: brandConfig.resolved.featuredProducts }
        : null,

    tags: ebook.tags && ebook.tags.length > 0 ? { items: ebook.tags } : null,
    chapters: chapterItems.length > 0 ? { items: chapterItems } : null,
    authors: authorItems.length > 0 ? { items: authorItems } : null,
    og_image: existsSync(
      join(ROOT_DIR, "_output", "social", ebook.slug, "og", "og-image.png"),
    )
      ? `../../social/${ebook.slug}/og/og-image.png`
      : null,
  };

  // Render
  const html = Mustache.render(template, data);

  // Write output
  const outputDir = join(ROOT_DIR, "_output", "landing", ebook.slug);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "index.html"), html, "utf-8");

  // Copy CSS
  copyFileSync(cssPath, join(outputDir, "styles.css"));

  // Copy logo
  const logoSource = join(ROOT_DIR, "_brand", "logos", "zopdev-logo-light.svg");
  if (existsSync(logoSource)) {
    copyFileSync(logoSource, join(outputDir, "logo.svg"));
  }

  console.log(`  → ${outputDir}/index.html`);
  generated++;
}

if (generated === 0 && targetSlug) {
  console.error(`No ebook found with slug '${targetSlug}' and landing_page enabled`);
  process.exit(1);
}

console.log(`\nGenerated ${generated} landing page(s)`);
