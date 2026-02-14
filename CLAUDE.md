# Claude Code Agent Instructions

This document contains patterns, practices, and architectural decisions for AI agents working on the Zopdev Ebook Engine.

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

### Next (Epic #3)
- 🚧 **Enhanced Content System**
  - Rich chapter metadata
  - Author bios
  - Call-out boxes
  - Chapter dependencies

### Future
- See `docs/EBOOK_UPGRADE_ROADMAP.md` for full roadmap
- 12 epics planned across Q1-Q2 2026
- Focus areas: visual design, content system, automation

## Quick Reference

### File Paths
```
_brand/
├── brand.yml              # Core visual identity
└── _brand-extended.yml    # Company, products, ICPs

books/{id}/
├── calendar.yml           # Ebook metadata
├── brand-overrides.yml    # Brand customization
└── chapters/              # Markdown content

scripts/
├── brand-utils.ts         # Brand loading & merging
├── theme-tokens.ts        # Design token definitions
├── theme-utils.ts         # Token CSS vars & social theme values
├── validate.ts            # Config validation
└── new-ebook.sh          # Scaffolding

_templates/
├── brand-overrides.yml    # Scaffold template
└── chapter-template.md

_landing/
├── generate.ts           # Landing page generator
├── template.html
└── styles.css

_social/
├── generate.ts           # Social asset generator
└── (no templates - programmatic)
```

### Key Functions
```typescript
// Load merged brand config
loadMergedBrand(ebookId: string): BrandConfig

// Deep merge two objects
deepMerge(base: any, override: any): any

// Generate CSS variables from brand + design tokens
buildCssVars(config: MergedBrandConfig): Array<{ name: string; value: string }>

// Generate design token CSS variables
buildDesignTokenCssVars(): Array<{ name: string; value: string }>

// Get Satori-safe social theme values
getSocialThemeValues(config): SocialThemeColors
```

### Make Commands
```bash
make validate              # Validate all configs
make render ebook={id}     # Generate all formats
make landing ebook={id}    # Generate landing page
make social ebook={id}     # Generate social assets
make new-ebook slug={id}   # Scaffold new ebook
make clean                 # Clear outputs
make all                   # Full pipeline
```

---

**Last Updated:** 2026-02-14 (after Epic #2 completion)
