/**
 * d2-render.ts — D2 → SVG/PNG rendering utility
 *
 * Uses the D2 CLI to render D2 source code to SVG or PNG.
 * Used by blog and social generators to embed diagram visuals.
 */

import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Render D2 source code to SVG string.
 */
export function renderD2ToSvg(d2Source: string, options?: {
  layout?: string;
  theme?: string;
  pad?: number;
}): string {
  const layout = options?.layout || "elk";
  const theme = options?.theme || "0"; // CLI accepts numeric themes
  const pad = options?.pad || 20;

  const tmpInput = join(tmpdir(), `d2-input-${Date.now()}-${Math.random().toString(36).slice(2)}.d2`);
  const tmpOutput = join(tmpdir(), `d2-output-${Date.now()}-${Math.random().toString(36).slice(2)}.svg`);

  try {
    writeFileSync(tmpInput, d2Source);
    execSync(
      `d2 --layout=${layout} --theme=${theme} --pad=${pad} "${tmpInput}" "${tmpOutput}"`,
      { stdio: "pipe", timeout: 30000 }
    );
    const svg = readFileSync(tmpOutput, "utf-8");
    return svg;
  } catch (err: any) {
    console.warn(`D2 render failed: ${err.message}`);
    return "";
  } finally {
    try { unlinkSync(tmpInput); } catch {}
    try { unlinkSync(tmpOutput); } catch {}
  }
}

/**
 * Render D2 source code to a base64-encoded SVG data URI.
 * Useful for embedding in HTML img tags.
 */
export function renderD2ToDataUri(d2Source: string, options?: {
  layout?: string;
  theme?: string;
  pad?: number;
}): string {
  const svg = renderD2ToSvg(d2Source, options);
  if (!svg) return "";
  const encoded = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Render D2 to PNG using Sharp (if available).
 * Falls back to SVG if Sharp is not installed.
 */
export async function renderD2ToPng(
  d2Source: string,
  width: number = 1080,
  height: number = 600,
  options?: { layout?: string; theme?: string; pad?: number }
): Promise<Buffer | null> {
  const svg = renderD2ToSvg(d2Source, options);
  if (!svg) return null;

  try {
    // Dynamic import for Sharp (optional dependency)
    const sharp = await import("sharp");
    const pngBuffer = await sharp
      .default(Buffer.from(svg))
      .resize(width, height, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();
    return pngBuffer;
  } catch (err) {
    console.warn("Sharp not available for PNG conversion, returning null");
    return null;
  }
}

/**
 * Extract D2 code blocks from a QMD file's content string.
 * Strips Quarto comment directives (//| ...) that the D2 CLI doesn't understand.
 * Returns an array of clean D2 source strings.
 */
export function extractD2Blocks(content: string): string[] {
  const blocks: string[] = [];
  const regex = /```\{\.?d2[^}]*\}\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    // Strip Quarto comment directives (//| label:, //| fig-cap:, etc.)
    const cleaned = match[1]
      .split("\n")
      .filter(line => !line.trimStart().startsWith("//|"))
      .join("\n")
      .trim();
    if (cleaned) blocks.push(cleaned);
  }
  return blocks;
}
