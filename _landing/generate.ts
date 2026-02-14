#!/usr/bin/env bun
/**
 * Landing page generator.
 * Reads calendar.yml and _brand.yml, generates HTML landing pages for each ebook.
 *
 * Usage:
 *   bun run _landing/generate.ts                  # all ebooks with landing_page enabled
 *   bun run _landing/generate.ts finops-playbook  # specific ebook
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { parse } from "yaml";
import Mustache from "mustache";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const ROOT_DIR = join(SCRIPT_DIR, "..");

// --- Load configuration ---

const calendarPath = join(ROOT_DIR, "calendar.yml");
const brandPath = join(ROOT_DIR, "_brand", "_brand.yml");
const templatePath = join(SCRIPT_DIR, "template.html");
const cssPath = join(SCRIPT_DIR, "styles.css");

if (!existsSync(calendarPath)) {
  console.error("Error: calendar.yml not found");
  process.exit(1);
}

if (!existsSync(brandPath)) {
  console.error("Error: _brand/_brand.yml not found");
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

const brand = parse(readFileSync(brandPath, "utf-8")) as {
  color: {
    palette: Record<string, string>;
    foreground?: string;
    background?: string;
    primary?: string;
    secondary?: string;
    link?: string;
  };
  typography?: Record<string, unknown>;
  logo?: { light?: string; dark?: string };
};

const template = readFileSync(templatePath, "utf-8");
const targetSlug = process.argv[2] || null;

// --- Build CSS custom properties from brand ---

function resolveColor(value: string): string {
  if (value.startsWith("#")) return value;
  return brand.color.palette[value] || value;
}

function buildCssVars(): Array<{ name: string; value: string }> {
  const vars: Array<{ name: string; value: string }> = [];

  // Palette colors
  for (const [key, value] of Object.entries(brand.color.palette)) {
    vars.push({ name: `--color-${key}`, value });
  }

  // Semantic colors
  const semanticKeys = ["foreground", "background", "primary", "secondary", "link"] as const;
  for (const key of semanticKeys) {
    const value = brand.color[key];
    if (value) {
      vars.push({ name: `--color-${key}`, value: resolveColor(value) });
    }
  }

  return vars;
}

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

  // Load per-ebook metadata if available
  const ebookYmlPath = join(ROOT_DIR, "books", ebook.slug, "ebook.yml");
  let ebookMeta: { chapters?: Array<{ id: string; title: string; summary?: string }> } = {};
  if (existsSync(ebookYmlPath)) {
    ebookMeta = parse(readFileSync(ebookYmlPath, "utf-8"));
  }

  // Build template data
  const landing = ebook.landing || {};
  const chapters = (ebookMeta as any).chapters || [];

  const data = {
    slug: ebook.slug,
    title: ebook.title,
    subtitle: ebook.subtitle || "",
    headline: landing.headline || ebook.title,
    description: landing.description || "",
    cta_text: landing.cta_text || "Download Free PDF",
    form_action: landing.form_action || "#",
    year: new Date().getFullYear(),
    css_vars: buildCssVars(),
    tags: ebook.tags && ebook.tags.length > 0 ? { items: ebook.tags } : null,
    chapters: chapters.length > 0
      ? {
          items: chapters.map((ch: { id: string; title: string; summary?: string }, i: number) => ({
            number: i + 1,
            title: ch.title,
            summary: ch.summary || "",
          })),
        }
      : null,
    og_image: existsSync(join(ROOT_DIR, "_output", "social", ebook.slug, "og", "og-image.png"))
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
