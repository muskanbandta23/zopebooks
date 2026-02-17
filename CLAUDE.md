# Claude Code Agent Instructions

This document contains patterns, practices, and architectural decisions for AI agents working on the Zopdev Ebook Engine.

## Critical Rules

### Engine-First, Not Content-First

**When working on generation engines (pipeline stages, providers, content transforms), ALWAYS focus on engine quality and validation — NOT on improving past generations.**

- Do NOT re-run pipelines repeatedly to polish a single ebook's content
- Do NOT manually fix generated output; fix the engine that produced it
- When a generation defect is found, fix the code, then validate with an A/B comparison (old output vs new output) to prove the engine improved
- Build automated quality comparison tooling (before/after metrics) rather than eyeballing individual chapters
- Use existing ebooks as **test fixtures** for engine validation, not as content to be perfected
- The measure of success is: "does the engine produce better output for ANY topic?" — not "does this one chapter read well?"

**Anti-pattern:** Run pipeline → read output → tweak prompts → re-run → read again → repeat
**Correct pattern:** Run pipeline → measure quality metrics → fix engine code → run A/B comparison → validate improvement is systematic

## Project Architecture

### Core Philosophy
This is a **static site generator** for marketing ebooks with a focus on:
- Brand consistency with per-campaign flexibility
- Multi-format output (HTML, PDF, landing pages, social assets)
- TypeScript-based tooling with YAML configuration
- Validation-first approach

### Key Technologies
- **Runtime:** Bun (fast TypeScript execution)
- **Templating:** Mustache (simple, logic-less)
- **Styling:** CSS (no frameworks, custom design system)
- **Build:** Make (simple, portable)
- **Rendering:** Sharp (images), pdf-lib (PDFs), Satori (social assets)

## Architectural Patterns

### 1. Hierarchical Configuration

**Pattern:** Three-layer config hierarchy with deep merge
```
Base Layer (_brand/brand.yml)
    ↓
Extended Layer (_brand/_brand-extended.yml)
    ↓
Override Layer (books/{id}/brand-overrides.yml)
    ↓
Merged Config (runtime)
```

**Implementation:**
- Use `scripts/brand-utils.ts` → `loadMergedBrand()`
- Merge rules: scalars override, objects deep merge, arrays replace
- All generators should use this utility (landing, social, PDF)

**When to use:**
- Any time you need brand/company/product data
- Any generator that produces branded output
- Validation of brand-related configs

### 2. Generator Architecture

**Pattern:** Separate generator per output format

```
_landing/generate.ts  → Landing pages
_social/generate.ts   → Social media assets
_pdf/generate.ts      → PDF ebooks (planned)
```

**Structure:**
```typescript
// 1. Load configs (with brand merge)
const brand = loadMergedBrand(ebookId);
const ebook = loadYaml(`books/${ebookId}/calendar.yml`);

// 2. Prepare template data
const data = {
  ...brand,
  ...ebook,
  // Add computed fields
};

// 3. Render template
const html = mustache.render(template, data);

// 4. Write output
writeFile(outputPath, html);
```

**Best Practices:**
- Keep generators thin (logic in utilities)
- Use TypeScript types from shared modules
- Handle missing configs gracefully
- Provide helpful error messages with file paths

### 3. Shared Utilities

**Pattern:** Domain-specific utility modules

```
scripts/
├── brand-utils.ts      # Brand config loading & merging
├── validate.ts         # Config validation
├── new-ebook.sh        # Scaffolding
└── (future: pdf-utils.ts, social-utils.ts)
```

**When to create a utility:**
- Logic is needed by 2+ generators
- Complex transformation/validation
- Reusable types/interfaces
- Cross-cutting concerns (logging, file I/O)

**When NOT to create a utility:**
- Generator-specific logic
- One-off transformations
- Simple operations

### 4. Validation Strategy

**Pattern:** Validate early, validate often

```typescript
// 1. Schema validation (structure)
validateYamlSchema(config, schema);

// 2. Cross-reference validation (relationships)
validateIcpIds(overrides.target_icps, brand.default_icps);
validateProductIds(overrides.featured_products, brand.products);

// 3. Business rules validation
warnIfColorDriftExcessive(overrides.colors, brand.colors);
```

**Implementation:**
- All validation in `scripts/validate.ts`
- Use TypeScript types to catch compile-time errors
- Provide actionable error messages (file:line:field)
- Warn for suspicious configs (don't block)

### 5. Template & Config Separation

**Pattern:** Templates are code, configs are data

```
_templates/           # Code (committed)
├── brand-overrides.yml
└── chapter-template.md

books/{id}/          # Data (committed)
├── brand-overrides.yml
├── calendar.yml
└── chapters/
```

**Rules:**
- Templates = scaffolding for new ebooks
- Never copy from existing ebooks (use templates)
- Configs = ebook-specific data
- Scaffold scripts use templates (not examples)

### 6. D2 Diagram Integration

**Pattern:** Reusable diagram templates with brand consistency

```
_diagrams/templates/              # Reusable D2 templates
├── cloud-architecture.d2         # Infrastructure with cost annotations
├── finops-workflow.d2            # FinOps lifecycle visualization
├── before-after-optimization.d2  # Side-by-side comparisons
├── multi-cloud-comparison.d2     # Provider comparisons
└── data-pipeline.d2              # ETL/analytics workflows

books/{id}/diagrams/              # Ebook-specific diagrams
├── prod-architecture.d2
└── optimization-results.d2
```

**Implementation:**
- Use `scripts/diagram-utils.ts` for D2 operations
- All templates use Zopdev brand colors (#0052FF, #00C48C, #FFB020, #FF6B6B)
- Validation with `make diagrams ebook={id}` or `d2 validate`
- Embed in chapters with ```{d2} code fence

**When to use:**
- Cloud/infrastructure architecture diagrams
- Before/after optimization visualizations
- Workflow/process diagrams with cost awareness
- Multi-step procedures with visual flow

**Best Practices:**
- Copy template to book's diagrams/ directory
- Customize for specific scenario (update costs, resources)
- Add descriptive fig-cap
- Test rendering in HTML, PDF, EPUB

### 7. Observable JS Calculators

**Pattern:** Interactive calculators for scenario modeling

```
_templates/ojs/                   # Reusable calculator templates
├── cost-comparison-calculator.qmd
├── roi-calculator.qmd
└── resource-optimizer.qmd
```

**Implementation:**
- Use `scripts/ojs-utils.ts` for OJS operations
- Style with Zopdev CSS classes (.ojs-calculator, .ojs-metric)
- Always include static fallback for PDF/EPUB
- Validation with `make validate` checks OJS syntax

**When to use:**
- ROI estimation (implementation cost vs. savings)
- Cost comparison (on-demand vs. reserved, multi-cloud)
- Resource optimization (instance sizing, tier selection)
- Scenario modeling (scaling, growth projections)

**Best Practices:**
- Use Observable Inputs (range, select, checkbox) for controls
- Keep 3-6 inputs maximum (avoid overwhelming users)
- Format numbers with d3.format("$,.0f")
- Provide context (callout explaining how to use)
- Add static fallback table with default scenario

**Static Fallback Pattern:**
```markdown
```{ojs}
// Interactive calculator (HTML only)
viewof hours = Inputs.range([0, 10000], { value: 2000 })
cost = hours * 0.085
```

::: {.content-visible when-format="pdf"}
**Calculator (Default Scenario)**
Based on 2,000 compute hours at $0.085/hour: **$170.00/month**
:::
```

### 8. Content Quality Validation

**Pattern:** Automated quality checks with measurable thresholds

```
quality-thresholds.yml            # Configurable quality standards
scripts/
├── content-audit.ts              # 6 quality metrics measurement
├── code-validation.ts            # Multi-language syntax checking
└── compare-outputs.ts            # Before/after comparison
```

**Metrics:**
1. **Diagram Density** — Diagrams per 1000 words (target: ≥0.3)
2. **Code Density** — Code blocks per chapter (target: ≥2)
3. **Generic Claims** — Vague language detection (target: ≤5 per chapter)
4. **Interactive Elements** — OJS calculators (target: ≥1 per ebook)
5. **Real Numbers** — $ amounts, specific percentages (target: ≥1 per chapter)
6. **Reading Level** — Flesch-Kincaid grade (target: 8-14)

**Implementation:**
- Run `make audit ebook={id}` to generate quality report
- Warnings don't block builds (advisory only)
- Use `make compare` to quantify before/after improvements
- Customize thresholds per ebook in `quality-thresholds.yml`

**When to use:**
- Before submitting PR (check quality score)
- After major content transformations (validate improvement)
- Continuous monitoring (track quality over time)

**Best Practices:**
- Aim for Overall Score B or better (≤3 violations)
- Fix high-impact violations first (diagram density, code density)
- Replace generic claims with specific numbers
- Add real examples ($ amounts, fleet sizes, time measurements)

**Example Audit Output:**
```
Overall Score: C (7 violations)

DIAGRAMS: 0.11 per 1000 words (target: 0.3) [WARN]
CODE BLOCKS: 12 total, 0 untagged
GENERIC CLAIMS: 47 total (avg 5.9 per chapter) [WARN]
INTERACTIVE ELEMENTS: 0 (target: ≥1) [WARN]
REAL NUMBERS: 23 total (avg 2.9 per chapter)
READING LEVEL: 11.2 grade (target: 8-14)
```

## Epic #5 Insights: SOTA Content Engineering

### The Engine-First Philosophy

**Core Principle:** Build reusable tools before scaling content production.

**Anti-Pattern:**
```
❌ Transform all 8 chapters → tools emerge organically → 6-8 weeks
```

**Recommended Pattern:**
```
✅ Build tools (2 weeks) → Document (1 week) → Validate with 1-2 chapters (1 week) → 4 weeks total
   Result: Tools work for ANY ebook, not just one
```

**Why This Matters:**
- ROI comes from reusability, not perfection
- Tools + documentation enable self-service adoption
- Validation with small test case proves the pattern works
- Future ebooks benefit immediately from the infrastructure

**Application:** When starting Epic #6, resist the urge to "just transform all chapters." Build the next tool (diagram generator CLI, automated setup scripts) and validate with a test case.

---

### Team Parallelization Strategy

**When to Use Teams:**
- Infrastructure work with independent components (D2 engine, OJS engine, validation engine)
- Multiple generators can be built simultaneously (landing, social, PDF)
- Large content projects where chapters can be transformed in parallel

**How to Structure:**
1. **Team Lead** (you): Coordination, integration, documentation
2. **Specialist Teammates**: Focused on single component
   - d2-engineer: D2 templates + utilities + integration
   - ojs-engineer: OJS templates + utilities + styling
   - validation-engineer: Content audit + comparison tools

**Critical Success Factors:**
- Clear scope per teammate (no shared state)
- Defined deliverables (code, tests, docs)
- Integration checkpoints (validate work composes correctly)
- Shutdown protocol (graceful termination when done)

**ROI:** 40% time reduction for Epic #5 (12 days sequential → 5 days parallel).

---

### Content Quality as Code

**Insight:** Treat content quality like code quality - measure it, automate checks, enforce standards.

**The 6 Metrics Framework:**
```typescript
interface ContentQuality {
  diagramDensity: number;      // Diagrams per 1000 words (target: ≥0.3)
  codeDensity: number;          // Code blocks per chapter (target: ≥2)
  genericClaims: number;        // Vague language count (target: ≤5 per chapter)
  interactiveElements: number;  // OJS calculators (target: ≥1 per ebook)
  realNumbers: number;          // Specific $ amounts, percentages (target: ≥10 per chapter)
  readingLevel: number;         // Flesch-Kincaid grade (target: 8-14)
}
```

**Why Each Metric Matters:**
1. **Diagram Density:** Professional docs have visual explanations, not just text walls
2. **Code Density:** Technical ebooks need production-ready, copy-pasteable code
3. **Generic Claims:** "30-50%" and "should consider" are weak - be specific
4. **Interactive Elements:** Calculators make abstract concepts concrete
5. **Real Numbers:** "$22,300/month" is stronger than "significant savings"
6. **Reading Level:** Balance accessibility (grade 8-10) with technical depth (grade 12-14)

**Validation Strategy:**
- Warn, don't block (quality is aspirational)
- Advisory feedback guides authors
- Before/after comparison proves improvement

---

### D2 Diagram Best Practices

**Color Palette (Zopdev Brand):**
```d2
style.fill: "#e6f0ff"        # Primary tint (backgrounds)
style.stroke: "#0052FF"       # Primary (borders, arrows)
style.fill: "#e8f5e9"         # Success tint (positive states)
style.stroke: "#00C48C"       # Success (checkmarks, savings)
style.fill: "#fff8e1"         # Warning tint (caution states)
style.stroke: "#FFB020"       # Warning (alerts, pending)
style.fill: "#ffebee"         # Danger tint (error states)
style.stroke: "#FF6B6B"       # Danger (errors, waste)
```

**Layout Engines:**
- `elk`: Best for hierarchical diagrams (cloud architecture, org charts)
- `dagre`: Good for workflows (FinOps phases, CI/CD pipelines)
- `tala`: Experimental, use for graph layouts

**Common Gotchas:**
```d2
# ❌ Dollar signs break syntax (interpreted as variable substitution)
cost: $22,300/month

# ✅ Replace with plain text
cost: 22300 dollars per month

# ❌ Markdown bold doesn't work
title: **Savings: $18K**

# ✅ Use D2 style.bold instead
savings: Savings 18K dollars {
  style.bold: true
}
```

**When to Use D2 vs Mermaid:**
- **D2:** Brand-critical diagrams, cost annotations, complex layouts, customer-facing content
- **Mermaid:** Quick flowcharts, sequence diagrams, internal docs

---

### Observable JS Patterns

**The Reactive Model:**
```javascript
// Inputs create reactive variables
viewof instanceCount = Inputs.range([10, 1000], {value: 143})

// Calculations update automatically
monthlySavings = instanceCount * savingsPerInstance

// Output updates reactively
html`<h3>Total: ${fmt(monthlySavings)}</h3>`
```

**Environment Requirements:**
- Quarto (installed)
- Jupyter kernel (requires setup: `pip install jupyter pyyaml`)
- Python 3.x with PyYAML

**PDF/EPUB Fallback Pattern:**
```qmd
```{ojs}
//| echo: false
viewof x = Inputs.range([0, 100], {value: 50})
md`Result: ${x}`
```

::: {.content-visible when-format="pdf"}
**Static Result (default: 50)**

Interactive calculator available in HTML version.
:::
```

**Best Practices:**
- Always provide PDF/EPUB fallback (static table with default values)
- Use brand colors for metric cards: `style.fill: "#0052FF"`
- Format numbers: `d3.format("$,.0f")(value)` for currency
- Add labels to all inputs (don't rely on tooltips)

---

### SOTA Content Transformation Pattern

**The 5-Section Structure (proven with Chapter 5):**

1. **Incident-Driven Opening (3-5 paragraphs)**
   ```markdown
   ## The $22K Wake-Up Call

   When Sarah, the FinOps lead at Acme Corp, ran her first right-sizing
   audit in January 2024, she was shocked: **143 EC2 instances were running
   at an average of 18% CPU utilization**...
   ```
   - Real protagonist (even if anonymized)
   - Specific problem ($, fleet size, timeframe)
   - Emotional stakes (fear, frustration, surprise)

2. **D2 Diagram (before/after or architecture)**
   ```qmd
   ```{d2}
   //| label: fig-before-after
   //| fig-cap: "Right-sizing transformation: $18,400/month savings"
   //| file: diagrams/right-sizing-before-after.d2
   ```
   ```
   - Cost annotations (specific $ amounts)
   - Timeline or phases
   - Outcomes (savings, performance)

3. **Production-Ready Code (100-150 lines)**
   ```python
   #!/usr/bin/env python3
   """
   Right-sizing analyzer for EC2 instances.

   Requirements:
       pip install boto3 pandas

   Usage:
       python right_sizing_analyzer.py --region us-east-1
   """
   # Full implementation with imports, error handling, docstrings...
   ```
   - Copy-pasteable (real imports, no pseudocode)
   - Documented (docstrings, comments)
   - Runnable (includes example output)

4. **Interactive Calculator (OJS)**
   ```qmd
   ```{ojs}
   //| echo: false
   viewof instanceCount = Inputs.range([10, 1000], {value: 143})
   # ... calculation logic
   html`<div class="ojs-metric">
     <span class="ojs-metric-value">${fmt(savings)}</span>
     <span class="ojs-metric-label">Monthly Savings</span>
   </div>`
   ```
   ```
   - 3-5 input controls
   - Reactive calculations
   - Branded metric cards
   - PDF fallback table

5. **Quantified Results Section**
   ```markdown
   **Results:**
   - **$18,400/month in sustained savings** (83% of identified waste)
   - **Zero performance incidents** from downsizing
   - **14 minutes average time** to review each recommendation
   - **92% engineering team satisfaction** (post-rollout survey)
   ```
   - Specific numbers (not ranges)
   - Implementation timeline (weeks, not "a while")
   - Team metrics (satisfaction, adoption)

**Time to Transform:** 4-6 hours per chapter (with templates).

---

### Validation Granularity

**Three Levels of Validation:**

1. **Syntax Validation (BLOCK builds)**
   ```typescript
   // scripts/validate.ts
   validateD2Syntax(path);
   validatePythonSyntax(code);
   validateYamlStructure(config);
   // throws Error if invalid
   ```
   - Broken refs, syntax errors, malformed YAML
   - Always block builds (can't render broken content)

2. **Schema Validation (WARN)**
   ```typescript
   // scripts/validate.ts
   if (!validIcpIds.includes(id)) {
     warnings.push(`Unknown ICP ID: ${id}`);
     // continues build
   }
   ```
   - Cross-reference checks (ICP IDs, product IDs)
   - Warn but don't block (might be intentional)

3. **Quality Validation (ADVISORY)**
   ```typescript
   // scripts/content-audit.ts
   if (diagramDensity < 0.3) {
     advisory.push(`Low diagram density: ${diagramDensity}`);
     // informational only
   }
   ```
   - Content quality metrics
   - Reading level, generic claims
   - Never blocks (quality is aspirational)

**Why This Matters:** Distinguishing validation levels prevents false failures while maintaining quality standards.

---

### Documentation as Force Multiplier

**The 30-Minute Test:**
Can a new author add a feature in <30 minutes using only documentation (no handholding)?

**Epic #5 Proven Pattern:**
1. Comprehensive guide (D2_DIAGRAM_GUIDE.md, OBSERVABLE_JS_PATTERNS.md)
2. Worked examples (5+ examples per guide)
3. Troubleshooting section (common errors + fixes)
4. Template files (_templates/ojs/, _diagrams/templates/)
5. SOTA chapter template (fully commented)

**ROI:**
- Initial investment: 3-4 days to write comprehensive docs
- Ongoing benefit: Self-service adoption (no questions asked)
- Payback: After 3-4 uses by different authors

**Test:** Give a teammate the docs and observe:
- Can they complete the task?
- Do they ask clarifying questions? (If yes, docs need improvement)
- How long does it take? (Target: <30 minutes)

---

### Mistakes to Avoid

**1. Creating Backup Files in Content Directories**
```bash
# ❌ Don't do this
cp chapters/05-optimization.qmd chapters/05-optimization-BEFORE.qmd

# ✅ Use git instead
git checkout -b experiment/chapter-5-transformation
```
**Why:** Backup files get counted by audit tools, pollute git history, confuse readers.

**2. Assuming "Native Support" Means "Zero Setup"**
- Quarto has "native OJS support" but requires Jupyter + Python
- Always verify end-to-end rendering before claiming success
- Document environment setup explicitly

**3. Not Testing Special Characters Early**
- D2 interprets `$` as variable substitution
- SQL uses `;` as statement separator
- Shell uses `|` for pipes
- Test edge cases with minimal examples BEFORE writing production code

**4. Writing Generic Error Messages**
```typescript
// ❌ Not helpful
throw new Error('Invalid config');

// ✅ Actionable
throw new Error(
  `D2 syntax error in books/finops-playbook/diagrams/cost.d2:28\n` +
  `  Replace "$22,300" with "22300 dollars"\n` +
  `  D2 interprets $ as variable substitution`
);
```

---

## Development Workflow

### Adding New Config Fields

**Checklist:**
1. ✅ Add TypeScript type to relevant utility (e.g., `brand-utils.ts`)
2. ✅ Update YAML schema/example in `_brand/` or `_templates/`
3. ✅ Update validation in `scripts/validate.ts`
4. ✅ Update generators that need the field
5. ✅ Update template files if rendered
6. ✅ Test with existing ebooks (backward compatibility)
7. ✅ Update documentation in `CONTRIBUTING.md`

### Adding New Generators

**Checklist:**
1. ✅ Create directory: `_{format}/`
2. ✅ Main script: `_{format}/generate.ts`
3. ✅ Template: `_{format}/template.{ext}`
4. ✅ Styles (if applicable): `_{format}/styles.css`
5. ✅ Use `loadMergedBrand()` for brand data
6. ✅ Add Make target to `Makefile`
7. ✅ Add validation for format-specific configs
8. ✅ Test output in `_output/{format}/{id}/`
9. ✅ Update documentation

### Modifying Existing Features

**Pattern:** Minimize blast radius

1. **Read first:** Understand existing implementation
2. **Utilities:** Put complex logic in shared modules
3. **Backward compat:** Make new features opt-in
4. **Validate:** Update validation for new fields
5. **Test:** Verify existing ebooks still work
6. **Document:** Update relevant sections

**Example (Epic #1):**
- Added `brand-utils.ts` (new utility)
- Updated generators with 1-line change (minimal)
- Made overrides optional (backward compatible)
- Added validation for new configs
- Tested with `finops-playbook`
- Updated `CONTRIBUTING.md`

## Code Style

### TypeScript

```typescript
// Use explicit types (avoid 'any')
interface BrandConfig {
  company: CompanyInfo;
  products: Product[];
}

// Prefer named exports
export function loadMergedBrand(id: string): BrandConfig { }

// Use const for immutable data
const brand = loadYaml(path);

// Destructure for clarity
const { company, products } = brand;
```

### YAML

```yaml
# Use comments to explain non-obvious fields
products:
  - id: "zopnight"  # Referenced by brand-overrides.yml
    name: "ZopNight"

# Group related fields
company:
  name: "Zopdev"
  website: "https://zopdev.com"

# Use lists for repeated items
default_icps:
  - id: "devops-engineer"
  - id: "cto"
```

### File Organization

```
books/{id}/
├── calendar.yml           # Ebook metadata (title, chapters)
├── brand-overrides.yml    # Brand customization
├── chapters/              # Markdown content
│   ├── 01-introduction.md
│   └── 02-chapter.md
└── _output/              # Generated files (gitignored)
    ├── landing/
    ├── social/
    └── pdf/
```

## Common Patterns

### Loading Configs

```typescript
// Always use absolute paths
const basePath = process.cwd();
const configPath = `${basePath}/_brand/_brand-extended.yml`;

// Check existence before loading
if (!existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}

// Parse YAML with error handling
try {
  const config = yaml.parse(readFileSync(configPath, 'utf-8'));
} catch (error) {
  throw new Error(`Failed to parse ${configPath}: ${error.message}`);
}
```

### Deep Merging

```typescript
function deepMerge(base: any, override: any): any {
  // Scalar: override wins
  if (typeof override !== 'object' || override === null) {
    return override;
  }

  // Array: replace completely
  if (Array.isArray(override)) {
    return override;
  }

  // Object: merge recursively
  const result = { ...base };
  for (const key in override) {
    result[key] = deepMerge(base[key], override[key]);
  }
  return result;
}
```

### Cross-Reference Validation

```typescript
// Validate ICP IDs
const validIds = brand.default_icps.map(icp => icp.id);
for (const id of overrides.target_icps) {
  if (!validIds.includes(id)) {
    errors.push(`Unknown ICP ID "${id}" in books/${ebookId}/brand-overrides.yml`);
  }
}
```

## Testing Approach

### Manual Testing (Current)

```bash
# Validate configs
bun run validate

# Generate specific ebook
bun run generate:landing finops-playbook

# View output
open books/finops-playbook/_output/landing/index.html
```

### Future: Automated Testing

When implementing automated tests:
- Unit tests for utilities (brand-utils, validation)
- Integration tests for generators (snapshot testing)
- End-to-end tests for full pipeline
- Use Bun's built-in test runner

## Common Pitfalls

### ❌ Don't: Duplicate logic across generators

```typescript
// _landing/generate.ts
const brand = yaml.parse(readFileSync('_brand/brand.yml'));
const extended = yaml.parse(readFileSync('_brand/_brand-extended.yml'));
const merged = { ...brand, ...extended }; // Shallow merge!

// _social/generate.ts
const brand = yaml.parse(readFileSync('_brand/brand.yml'));
// ... duplicate logic
```

### ✅ Do: Use shared utilities

```typescript
// Both generators
import { loadMergedBrand } from '../scripts/brand-utils.js';
const brand = loadMergedBrand(ebookId);
```

---

### ❌ Don't: Assume configs exist

```typescript
const overrides = yaml.parse(readFileSync(overridesPath)); // Throws if missing
```

### ✅ Do: Check existence first

```typescript
const overrides = existsSync(overridesPath)
  ? yaml.parse(readFileSync(overridesPath, 'utf-8'))
  : {}; // Sensible default
```

---

### ❌ Don't: Use relative paths

```typescript
const config = readFileSync('../_brand/brand.yml'); // Breaks if CWD changes
```

### ✅ Do: Use absolute paths

```typescript
const basePath = process.cwd();
const config = readFileSync(`${basePath}/_brand/brand.yml`);
```

---

### ❌ Don't: Generic error messages

```typescript
throw new Error('Invalid config'); // Where? What's invalid?
```

### ✅ Do: Provide context

```typescript
throw new Error(
  `Invalid ICP ID "devops" in books/finops-playbook/brand-overrides.yml:3. ` +
  `Valid IDs: ${validIds.join(', ')}`
);
```

## Roadmap Context

### Completed
- ✅ **Epic #1:** Hierarchical Brand Configuration System
  - Branch: `feature/brand-system`
  - PR: #8
  - Key files: `_brand/_brand-extended.yml`, `scripts/brand-utils.ts`, `books/finops-playbook/brand-overrides.yml`

- ✅ **Epic #2:** Visual Foundation & Premium Theme System
  - Branch: `feature/visual-foundation`
  - Key files: `scripts/theme-tokens.ts`, `scripts/theme-utils.ts`, `_landing/styles.css`, all social templates
  - Design tokens: Type scale, spacing, shadows, radii, transitions, letter-spacing, line-height
  - Landing pages: Mesh gradients, glass-morphism, card hover lifts, 4 responsive breakpoints
  - Social assets: Gradient backgrounds, decorative elements, expanded color palette

- ✅ **Epic #3:** Enhanced Content System
  - Branch: `feature/enhanced-content`
  - Key files: `scripts/content-utils.ts`, `books/finops-playbook/ebook.yml`, `_brand/_brand-extended.yml`
  - Rich chapter metadata: difficulty, reading time, learning objectives, key takeaways, tags, prerequisites
  - Author system: brand-level author profiles, per-ebook author references
  - Landing page: enriched chapter cards with difficulty badges, reading time, objectives; author section
  - Validation: difficulty values, prerequisite cross-refs, author ID cross-refs

- ✅ **Epic #4:** Premium Quarto HTML + PDF Theme
  - Branch: `feature/premium-quarto-theme`
  - Key files: `_themes/zopdev-book.scss`, `_themes/preamble.tex`, `_themes/zopdev-epub.css`
  - HTML theme: Premium title block (gradient), styled headers (h1 border, h2 arrow prefix, h3 left border), callout boxes (color-coded: note/tip/warning/important), code blocks with left accent, tables with gradient header, TOC styling, responsive breakpoints
  - PDF theme: XeTeX with Inter font, navy chapter titles, color-coded tcolorbox callouts, blue-accented code blocks, booktabs tables with blue rules, styled blockquotes, professional headers/footers
  - EPUB theme: Consistent callout colors, left-border code blocks, uppercase table headers, styled headings
  - Quarto config: `code-copy`, `code-overflow: wrap`, `pdf-engine: xelatex`, `classoption: [oneside, 11pt]`

- ✅ **Epic #5:** Engine Enhancements for SOTA Content Quality
  - Branch: `feature/epic5-engine-enhancements`
  - Key files: `scripts/diagram-utils.ts`, `scripts/ojs-utils.ts`, `scripts/content-audit.ts`, `scripts/code-validation.ts`, `scripts/compare-outputs.ts`, `quality-thresholds.yml`
  - D2 diagram engine: 5 reusable templates, CLI integration, Quarto extension support, brand-styled diagrams
  - Observable JS engine: 3 calculator templates, interactive HTML with PDF/EPUB fallbacks, brand styling
  - Content quality validation: 6 automated metrics (diagram density, code density, generic claims, interactive elements, real numbers, reading level)
  - Documentation: Comprehensive guides (D2, OJS, content quality), SOTA chapter template, updated CONTRIBUTING.md/CLAUDE.md
  - Validation test case: finops-playbook chapters transformed, before/after comparison with measurable improvements

### Future
- See `docs/EBOOK_UPGRADE_ROADMAP.md` for full roadmap
- Focus areas: Content transformation at scale, advanced D2 patterns, automation

## Quick Reference

### File Paths
```
_brand/
├── brand.yml              # Core visual identity (Quarto native brand)
└── _brand-extended.yml    # Company, products, ICPs, authors

_themes/
├── zopdev-book.scss       # Premium HTML theme (SCSS, extends cosmo + brand)
├── preamble.tex           # Premium PDF theme (LaTeX, XeTeX)
└── zopdev-epub.css        # Premium EPUB theme (CSS)

_diagrams/
└── templates/             # Reusable D2 diagram templates
    ├── cloud-architecture.d2
    ├── finops-workflow.d2
    ├── before-after-optimization.d2
    ├── multi-cloud-comparison.d2
    └── data-pipeline.d2

books/{id}/
├── _quarto.yml            # Quarto project config (references themes)
├── _brand.yml             # Symlink to _brand/_brand.yml
├── ebook.yml              # Content metadata (chapters, social)
├── brand-overrides.yml    # Brand customization
├── diagrams/              # Ebook-specific D2 diagrams
└── chapters/              # Markdown content (.qmd)

scripts/
├── brand-utils.ts         # Brand loading & merging (incl. author resolution)
├── content-utils.ts       # Content loading, author resolution, reading time
├── diagram-utils.ts       # D2 diagram validation, listing, copying, rendering
├── ojs-utils.ts           # Observable JS extraction, validation, counting
├── content-audit.ts       # 6-metric content quality audit
├── code-validation.ts     # Multi-language code syntax checking
├── compare-outputs.ts     # Before/after quality comparison
├── theme-tokens.ts        # Design token definitions
├── theme-utils.ts         # Token CSS vars & social theme values
├── validate.ts            # Config validation (incl. content, diagrams, OJS)
└── new-ebook.sh          # Scaffolding

quality-thresholds.yml     # Configurable content quality standards

_templates/
├── _quarto-base.yml       # Quarto config template for new ebooks
├── brand-overrides.yml    # Scaffold template
├── sota-chapter-template.qmd  # Full SOTA chapter example
└── ojs/                   # Observable JS calculator templates
    ├── cost-comparison-calculator.qmd
    ├── roi-calculator.qmd
    └── resource-optimizer.qmd

_landing/
├── generate.ts           # Landing page generator
├── template.html
└── styles.css

_social/
├── generate.ts           # Social asset generator
└── (no templates - programmatic)

docs/
├── D2_DIAGRAM_GUIDE.md       # Comprehensive D2 guide
├── OBSERVABLE_JS_PATTERNS.md # Comprehensive OJS guide
├── CONTENT_QUALITY.md        # SOTA content standards
└── CONTRIBUTING.md           # Contribution workflow
```

### Key Functions
```typescript
// ── Brand & Content ───────────────────────────────────────────────────

// Load merged brand config (with optional author filtering)
loadMergedBrand(rootDir: string, slug: string, authorIds?: string[]): MergedBrandConfig

// Deep merge two objects
deepMerge(base: any, override: any): any

// Load ebook content with enriched types
loadEbookContent(rootDir: string, slug: string): EbookContentMeta | null

// Resolve author ID references to full profiles
resolveAuthors(authorIds: string[], authors: AuthorRef[]): AuthorRef[]

// Compute reading time from a QMD file (250 wpm)
computeReadingTime(qmdPath: string): number

// ── Theming ──────────────────────────────────────────────────────────

// Generate CSS variables from brand + design tokens
buildCssVars(config: MergedBrandConfig): Array<{ name: string; value: string }>

// Generate design token CSS variables
buildDesignTokenCssVars(): Array<{ name: string; value: string }>

// Get Satori-safe social theme values
getSocialThemeValues(config): SocialThemeColors

// ── D2 Diagrams ──────────────────────────────────────────────────────

// Validate D2 file syntax using D2 CLI
validateD2Syntax(path: string): DiagramValidation

// List available D2 diagram templates
listDiagramTemplates(rootDir: string): TemplateInfo[]

// Copy diagram template to book's diagrams/ directory
copyTemplateToBook(rootDir: string, template: string, slug: string): string

// Render D2 file to SVG
renderD2Preview(path: string): string

// Find all .d2 files in a book
findBookDiagrams(rootDir: string, slug: string): string[]

// Validate all diagrams in a book
validateBookDiagrams(rootDir: string, slug: string): DiagramValidation[]

// ── Observable JS ────────────────────────────────────────────────────

// Extract all OJS code blocks from a QMD file
extractOJSBlocks(qmdPath: string): OJSBlock[]

// Validate OJS code for common issues
validateOJSSyntax(code: string): OJSValidationResult

// Check if OJS block uses HTML-only features
hasHtmlOnlyFeatures(code: string): boolean

// Validate all OJS blocks in a QMD file
validateOJSFile(qmdPath: string): OJSFileSummary

// Count interactive elements in an ebook
countInteractiveElements(rootDir: string, slug: string): number

// Get detailed OJS usage summary
getOJSSummary(rootDir: string, slug: string): OJSFileSummary[]

// ── Content Quality ──────────────────────────────────────────────────

// Measure diagram density (diagrams per 1000 words)
measureDiagramDensity(slug: string): DiagramMetrics

// Measure code block density and languages
measureCodeDensity(slug: string): CodeMetrics

// Detect generic/vague claims
detectGenericClaims(slug: string): GenericClaimMetrics

// Count interactive elements (OJS blocks)
countInteractiveElements(slug: string): InteractiveMetrics

// Detect real numbers ($ amounts, specific %)
detectRealNumbers(slug: string): NumberMetrics

// Measure reading level (Flesch-Kincaid)
measureReadingLevel(slug: string): ReadabilityMetrics

// Run full content audit
auditEbook(slug: string): AuditReport

// Compare before/after quality metrics
compareQuality(slug: string, beforeDir: string, afterDir: string): ComparisonReport

// ── Code Validation ──────────────────────────────────────────────────

// Validate Terraform/HCL syntax
validateTerraform(code: string): ValidationResult

// Validate Python syntax
validatePython(code: string): ValidationResult

// Validate YAML syntax
validateYAML(code: string): ValidationResult

// Validate SQL syntax
validateSQL(code: string): ValidationResult

// Auto-detect code language
detectLanguage(code: string): string
```

### Make Commands
```bash
make validate                  # Validate all configs (YAML, D2, OJS)
make render ebook={id}         # Generate all formats (HTML, PDF, EPUB)
make landing ebook={id}        # Generate landing page
make social ebook={id}         # Generate social assets
make diagrams ebook={id}       # Validate all D2 diagrams
make audit ebook={id}          # Run content quality audit (6 metrics)
make audit-all                 # Audit all ebooks
make code-validate ebook={id}  # Validate code block syntax
make compare ebook={id} before={path} after={path}  # Compare before/after quality
make new-ebook slug={id}       # Scaffold new ebook
make clean                     # Clear outputs
make all                       # Full pipeline
```

---

**Last Updated:** 2026-02-14 (after Epic #5 completion)
