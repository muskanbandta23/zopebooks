#!/usr/bin/env bun
/**
 * Validates calendar.yml and per-ebook ebook.yml files.
 * Usage: bun run scripts/validate.ts
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { parse } from "yaml";

const ROOT_DIR = join(dirname(import.meta.dir), ".");
// When run via `bun run scripts/validate.ts`, import.meta.dir is the scripts dir
// Adjust to find root correctly
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = join(SCRIPT_DIR, "..");

interface CalendarEbook {
  slug: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  status: string;
  scheduled_publish?: string;
  tags?: string[];
  outputs?: Record<string, boolean>;
  landing?: {
    headline?: string;
    description?: string;
    cta_text?: string;
    form_action?: string;
  };
}

interface Calendar {
  ebooks: CalendarEbook[];
}

interface EbookManifest {
  meta: {
    slug: string;
    title: string;
    subtitle?: string;
    version?: string;
  };
  chapters?: Array<{
    id: string;
    title: string;
    summary?: string;
  }>;
  social?: Record<string, unknown>;
}

const VALID_STATUSES = ["draft", "in-progress", "review", "published", "archived"];

let errors: string[] = [];
let warnings: string[] = [];

function error(msg: string) {
  errors.push(`ERROR: ${msg}`);
}

function warn(msg: string) {
  warnings.push(`WARN: ${msg}`);
}

// --- Validate calendar.yml ---

const calendarPath = join(PROJECT_ROOT, "calendar.yml");

if (!existsSync(calendarPath)) {
  error("calendar.yml not found");
  printResults();
  process.exit(1);
}

console.log("Validating calendar.yml...");

const calendarContent = readFileSync(calendarPath, "utf-8");
let calendar: Calendar;

try {
  calendar = parse(calendarContent) as Calendar;
} catch (e) {
  error(`calendar.yml is not valid YAML: ${e}`);
  printResults();
  process.exit(1);
}

if (!calendar.ebooks || !Array.isArray(calendar.ebooks)) {
  error("calendar.yml must have an 'ebooks' array");
  printResults();
  process.exit(1);
}

const slugs = new Set<string>();

for (const ebook of calendar.ebooks) {
  const prefix = `calendar.yml [${ebook.slug || "unknown"}]`;

  // Required fields
  if (!ebook.slug) {
    error(`${prefix}: missing 'slug'`);
    continue;
  }

  if (slugs.has(ebook.slug)) {
    error(`${prefix}: duplicate slug '${ebook.slug}'`);
  }
  slugs.add(ebook.slug);

  if (!ebook.title) {
    error(`${prefix}: missing 'title'`);
  }

  if (!ebook.status) {
    error(`${prefix}: missing 'status'`);
  } else if (!VALID_STATUSES.includes(ebook.status)) {
    error(`${prefix}: invalid status '${ebook.status}'. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  // Check book directory exists
  const bookDir = join(PROJECT_ROOT, "books", ebook.slug);
  if (!existsSync(bookDir)) {
    warn(`${prefix}: book directory not found at books/${ebook.slug}/`);
  }

  // Check _quarto.yml exists
  const quartoPath = join(bookDir, "_quarto.yml");
  if (existsSync(bookDir) && !existsSync(quartoPath)) {
    error(`${prefix}: _quarto.yml not found in books/${ebook.slug}/`);
  }

  // Validate outputs if present
  if (ebook.outputs) {
    const validOutputs = [
      "html", "pdf", "epub",
      "landing_page", "linkedin_carousel",
      "instagram_posts", "og_image",
    ];
    for (const key of Object.keys(ebook.outputs)) {
      if (!validOutputs.includes(key)) {
        warn(`${prefix}: unknown output key '${key}'`);
      }
    }
  }
}

// --- Validate per-ebook ebook.yml files ---

for (const slug of slugs) {
  const ebookYmlPath = join(PROJECT_ROOT, "books", slug, "ebook.yml");

  if (!existsSync(ebookYmlPath)) {
    warn(`books/${slug}/ebook.yml not found`);
    continue;
  }

  console.log(`Validating books/${slug}/ebook.yml...`);

  const ebookContent = readFileSync(ebookYmlPath, "utf-8");
  let ebookManifest: EbookManifest;

  try {
    ebookManifest = parse(ebookContent) as EbookManifest;
  } catch (e) {
    error(`books/${slug}/ebook.yml is not valid YAML: ${e}`);
    continue;
  }

  const prefix = `books/${slug}/ebook.yml`;

  if (!ebookManifest.meta) {
    error(`${prefix}: missing 'meta' section`);
    continue;
  }

  if (!ebookManifest.meta.slug) {
    error(`${prefix}: missing 'meta.slug'`);
  } else if (ebookManifest.meta.slug !== slug) {
    error(`${prefix}: meta.slug '${ebookManifest.meta.slug}' does not match directory slug '${slug}'`);
  }

  if (!ebookManifest.meta.title) {
    error(`${prefix}: missing 'meta.title'`);
  }
}

// --- Validate brand file ---

const brandPath = join(PROJECT_ROOT, "_brand", "_brand.yml");
if (!existsSync(brandPath)) {
  error("_brand/_brand.yml not found");
}

printResults();

function printResults() {
  console.log("");

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.log(`  ⚠ ${w}`);
    }
    console.log("");
  }

  if (errors.length > 0) {
    for (const e of errors) {
      console.log(`  ✗ ${e}`);
    }
    console.log("");
    console.log(`Validation failed: ${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  }

  console.log(`Validation passed: 0 errors, ${warnings.length} warning(s)`);
}
