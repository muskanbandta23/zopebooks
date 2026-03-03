#!/usr/bin/env bun
/**
 * Local dev server for the Zopdev Ebook Engine.
 * Serves static files from _output/ and exposes an SSE-based generation API.
 *
 * Usage:
 *   bun run _server/server.ts
 *   PORT=8080 bun run _server/server.ts
 */

import { join, extname } from "path";
import { spawn, type ChildProcess } from "child_process";
import { existsSync, statSync } from "fs";

const ROOT = join(import.meta.dir, "..");
const OUTPUT = join(ROOT, "_output");
const PORT = parseInt(process.env.PORT || "3000");

// ── MIME Types ────────────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".epub": "application/epub+zip",
};

// ── Generation State ──────────────────────────────────────────────────────

let activeChild: ChildProcess | null = null;

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

// ── Static File Serving ───────────────────────────────────────────────────

function resolveStaticFile(pathname: string): string | null {
  let filePath = join(OUTPUT, pathname);

  // Directory index fallback
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  // Try adding index.html for paths without extension
  if (!extname(filePath) && !existsSync(filePath)) {
    const withIndex = join(filePath, "index.html");
    if (existsSync(withIndex)) filePath = withIndex;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath;
  }

  return null;
}

// ── SSE Generation Handler ────────────────────────────────────────────────

function handleGenerate(url: URL): Response {
  const topic = url.searchParams.get("topic");
  const chapters = url.searchParams.get("chapters") || "5";

  if (!topic) {
    return new Response(JSON.stringify({ error: "topic is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (activeChild) {
    return new Response(JSON.stringify({ error: "Generation already in progress" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream may be closed
        }
      };

      // Keepalive interval to prevent browser timeout
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keepalive\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      send({ step: 0, total: 10, label: "Starting generation...", status: "running", slug });

      const child = spawn("bun", [
        "run",
        join(ROOT, "scripts", "generate-ebook.ts"),
        `--topic=${topic}`,
        `--chapters=${chapters}`,
      ], {
        cwd: ROOT,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      activeChild = child;
      let currentStep = 0;

      const processLine = (line: string) => {
        const clean = stripAnsi(line).trim();
        if (!clean) return;

        // Detect step headers: ── [N/10] Label
        const stepMatch = clean.match(/── \[(\d+)\/(\d+)\]\s*(.+)/);
        if (stepMatch) {
          currentStep = parseInt(stepMatch[1]);
          const total = parseInt(stepMatch[2]);
          const label = stepMatch[3].trim();
          send({ step: currentStep, total, label, status: "running", slug });
        } else {
          send({ type: "log", text: clean, step: currentStep });
        }
      };

      let stdoutBuf = "";
      child.stdout?.on("data", (data: Buffer) => {
        stdoutBuf += data.toString();
        const lines = stdoutBuf.split("\n");
        stdoutBuf = lines.pop() || "";
        for (const line of lines) processLine(line);
      });

      let stderrBuf = "";
      child.stderr?.on("data", (data: Buffer) => {
        stderrBuf += data.toString();
        const lines = stderrBuf.split("\n");
        stderrBuf = lines.pop() || "";
        for (const line of lines) processLine(line);
      });

      child.on("close", (code) => {
        // Flush remaining buffer
        if (stdoutBuf.trim()) processLine(stdoutBuf);
        if (stderrBuf.trim()) processLine(stderrBuf);

        clearInterval(keepalive);
        activeChild = null;

        if (code === 0) {
          send({ step: 10, total: 10, label: "Complete!", status: "done", complete: true, slug });
        } else {
          send({ type: "error", text: `Generation failed (exit code ${code})`, step: currentStep });
        }

        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      child.on("error", (err) => {
        clearInterval(keepalive);
        activeChild = null;
        send({ type: "error", text: `Failed to start: ${err.message}`, step: 0 });
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },

    cancel() {
      // Client disconnected — kill the child process
      if (activeChild) {
        activeChild.kill("SIGTERM");
        activeChild = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── Server ────────────────────────────────────────────────────────────────

Bun.serve({
  port: PORT,

  fetch(req) {
    const url = new URL(req.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Route: redirect / to dashboard
    if (url.pathname === "/") {
      return Response.redirect("/dashboard/index.html", 302);
    }

    // Route: SSE generation
    if (url.pathname === "/api/generate") {
      return handleGenerate(url);
    }

    // Route: generation status check
    if (url.pathname === "/api/status") {
      return new Response(JSON.stringify({
        generating: activeChild !== null,
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Route: static files from _output/
    const filePath = resolveStaticFile(url.pathname);
    if (filePath) {
      const ext = extname(filePath);
      const contentType = MIME[ext] || "application/octet-stream";
      return new Response(Bun.file(filePath), {
        headers: { "Content-Type": contentType },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`
\x1b[36m╔══════════════════════════════════════════════════╗\x1b[0m
\x1b[36m║\x1b[0m  \x1b[1mZopdev Ebook Engine — Dev Server\x1b[0m
\x1b[36m║\x1b[0m
\x1b[36m║\x1b[0m  http://localhost:${PORT}
\x1b[36m║\x1b[0m
\x1b[36m║\x1b[0m  Serving: _output/
\x1b[36m║\x1b[0m  Press Ctrl+C to stop
\x1b[36m╚══════════════════════════════════════════════════╝\x1b[0m
`);
