# Contributing to Zopdev Ebook Engine

## Development Workflow

### 1. Working with the Repository

```bash
# Clone the repo
git clone https://github.com/talvinder/ebooks.git
cd ebooks

# Install dependencies
make install

# Validate configuration
make validate

# Test rendering
make render ebook=finops-playbook
```

### 2. Creating a New Ebook

```bash
# Scaffold a new ebook
make new-ebook slug=my-ebook title="My Ebook Title" subtitle="Optional Subtitle"

# Add entry to calendar.yml
# Edit books/my-ebook/chapters/
# Test build
make render ebook=my-ebook
```

### 3. Git Workflow

- **Main branch**: Production-ready code only
- **Feature branches**: Use `feature/<epic-name>` for epics, `feat/<description>` for stories
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` new features
  - `fix:` bug fixes
  - `docs:` documentation updates
  - `refactor:` code refactoring
  - `chore:` maintenance tasks

```bash
# Example workflow
git checkout -b feature/brand-system
# Make changes
git add -A
git commit -m "feat: implement hierarchical brand configuration

- Add _brand-extended.yml for company/product/ICP metadata
- Create brand-overrides.yml schema for per-ebook customization
- Update generators to merge brand + overrides

Closes #1"
git push origin feature/brand-system
# Open PR on GitHub
```

## Development Best Practices

These practices were discovered during Epic #1 implementation and should be followed for all future work:

### 1. Shared Utilities Pattern

**✅ Do:** Create shared utility modules when multiple generators/scripts need the same logic

```typescript
// scripts/brand-utils.ts
export function loadMergedBrand(ebookId: string): BrandConfig {
  // Shared merge logic used by landing, social, PDF generators
}
```

**❌ Don't:** Duplicate merge logic across multiple generator files

**Why:**
- Single source of truth for complex logic
- Easier to test and debug
- Consistent behavior across all generators
- TypeScript types can be shared

### 2. TypeScript Types for YAML Schemas

**✅ Do:** Define TypeScript interfaces alongside YAML schema

```typescript
interface BrandExtended {
  company: {
    name: string;
    website: string;
  };
  products: Product[];
  default_icps: ICP[];
}
```

**❌ Don't:** Work with untyped YAML objects

**Why:**
- Compile-time validation catches errors early
- IDE autocomplete improves developer experience
- Self-documenting code structure
- Easier refactoring

### 3. Template Files for Scaffolding

**✅ Do:** Create template files in `_templates/` for repeated structures

```bash
cp _templates/brand-overrides.yml books/new-ebook/brand-overrides.yml
```

**❌ Don't:** Copy-paste from existing ebooks (may have customizations)

**Why:**
- Templates are canonical examples
- Reduces copy-paste errors
- Makes scaffolding scripts simpler
- Clear separation: template vs real config

### 4. Deep Merge Logic Documentation

**✅ Do:** Document merge behavior explicitly with examples

```yaml
# Merge Rules:
# - Scalars (strings, numbers): Last value wins
# - Objects: Deep merge recursively
# - Arrays: Complete replacement (no merge)
```

**❌ Don't:** Assume users understand implicit merge behavior

**Why:**
- Prevents confusion about override behavior
- Reduces support questions
- Makes testing clear (expected behavior)
- Enables better validation

### 5. Validation Cross-References

**✅ Do:** Validate references between related configs

```typescript
// Validate that ICP IDs in overrides exist in brand defaults
const validIcpIds = brandExtended.default_icps.map(icp => icp.id);
for (const icpId of overrides.target_icps) {
  if (!validIcpIds.includes(icpId)) {
    throw new Error(`Unknown ICP ID: ${icpId}`);
  }
}
```

**❌ Don't:** Just validate YAML syntax

**Why:**
- Catches typos at build time (not runtime)
- Prevents broken references in production
- Provides helpful error messages
- Enforces consistency

### 6. Generator Updates Should Be Minimal

**✅ Do:** Use utility functions to minimize generator changes

```typescript
// Before: generator loads brand directly
// After: one-line change to use utility
const brand = loadMergedBrand(ebookId);
```

**❌ Don't:** Rewrite entire generators for new features

**Why:**
- Reduces risk of breaking existing functionality
- Easier code review
- Preserves working code
- Faster implementation

### 7. Example-Driven Documentation

**✅ Do:** Provide real, working examples (not just schema)

```bash
books/finops-playbook/brand-overrides.yml  # Real example
_templates/brand-overrides.yml              # Scaffold template
```

**❌ Don't:** Only document schema structure

**Why:**
- Examples are faster to understand than specs
- Copy-paste-modify workflow
- Shows realistic usage patterns
- Tests serve as documentation

### 8. Build Script Integration

**✅ Do:** Update scaffold scripts when adding new config files

```bash
# scripts/new-ebook.sh should scaffold brand-overrides.yml
cp _templates/brand-overrides.yml "$book_dir/"
```

**❌ Don't:** Require manual file creation

**Why:**
- Prevents forgotten config files
- Ensures consistency across ebooks
- Reduces onboarding friction
- Less documentation needed

### 9. Backward Compatibility

**✅ Do:** Make new configs optional with sensible defaults

```typescript
const overrides = existsSync(overridesPath)
  ? loadYaml(overridesPath)
  : {};  // Empty overrides = use all brand defaults
```

**❌ Don't:** Break existing ebooks when adding new features

**Why:**
- Gradual adoption
- Reduces migration burden
- Tests remain passing
- Safer deployments

### 10. Commit Granularity

**✅ Do:** Make atomic, focused commits

```bash
git commit -m "feat: add brand-utils.ts with deep merge logic"
git commit -m "feat: update landing generator to use loadMergedBrand()"
git commit -m "feat: add validation for brand overrides"
```

**❌ Don't:** Commit everything in one giant commit

**Why:**
- Easier code review
- Better git history for debugging
- Easier to revert specific changes
- Clear separation of concerns

## Brand Configuration System

### Hierarchy Overview

The ebook engine uses a **tiered brand configuration system** that allows brand-level defaults with ebook-level overrides. This ensures consistency while enabling customization.

```
Brand Level (Default)           Per-Ebook Level (Override)
─────────────────────          ──────────────────────────
_brand/_brand.yml       ──┐
                          ├──→ MERGED ──→ Final Config
books/<slug>/                │                    ↓
  brand-overrides.yml   ──┘             Rendered Ebook
```

### Brand-Level Configuration

**Location:** `_brand/_brand.yml` (existing) + `_brand/_brand-extended.yml` ✅ **Implemented in Epic #1**

**What's Defined:**
- **Core Brand**: Colors, typography, logos (current `_brand.yml`)
- **Company Info**: Name, tagline, website, social links
- **Product Catalog**: ZopNight, ZopCloud, services offered
- **Default ICPs**: Target personas (DevOps Engineers, CTOs, FinOps Practitioners)
- **Tone & Voice**: Brand guidelines for messaging

**Example** (`_brand/_brand-extended.yml`):

```yaml
company:
  name: "Zopdev"
  tagline: "Cloud Engineering Excellence"
  website: "https://zopdev.com"
  linkedin: "https://linkedin.com/company/zopdev"

products:
  - name: "ZopNight"
    description: "FinOps automation platform"
    url: "https://zopnight.com"
  - name: "ZopCloud"
    description: "Cloud migration services"
    url: "https://zopcloud.com"

default_icps:
  - id: "devops-engineer"
    title: "DevOps Engineer"
    pain_points:
      - "Cloud costs spiraling out of control"
      - "No visibility into who's spending what"
    goals:
      - "Reduce cloud spend by 30%"
      - "Implement automated cost controls"

  - id: "cto"
    title: "CTO / Engineering Leader"
    pain_points:
      - "Board asking hard questions about cloud ROI"
      - "Teams don't understand cost impact"
    goals:
      - "Build cost-aware engineering culture"
      - "Demonstrate cloud value to business"

tone:
  voice: "Technical, authoritative, practical"
  avoid: "Marketing fluff, generic advice, buzzwords"
```

### Ebook-Level Overrides

**Location:** `books/<slug>/brand-overrides.yml` ✅ **Implemented in Epic #1**

**What Can Be Overridden:**
- **Target ICP**: Narrow to specific persona (e.g., only DevOps, only CTOs)
- **Color Palette**: Adjust colors for specific audience (e.g., darker for developers, brighter for executives)
- **Messaging Tone**: Adjust technical depth (deep technical vs executive summary)
- **CTAs**: Customize calls-to-action (e.g., "Try ZopNight" vs "Book Consultation")
- **Product Focus**: Highlight specific products

**Example** (`books/finops-playbook/brand-overrides.yml`):

```yaml
# Override brand defaults for FinOps Playbook
# This ebook targets DevOps Engineers specifically

target_icps:
  - "devops-engineer"  # Only this ICP (from brand defaults)

# Slightly darker color scheme for technical audience
colors:
  primary: "#003DBF"  # Darker blue (brand default: #0052FF)
  # Other colors inherit from brand

# Adjust tone for hands-on practitioners
tone:
  voice: "Deeply technical, code-heavy, field-tested"
  depth: "production-ready implementations"

# Product emphasis
featured_products:
  - "ZopNight"  # Focus on ZopNight for FinOps automation

# Custom CTAs for this ebook
ctas:
  primary: "Try ZopNight Free"
  secondary: "Download Code Examples"

# Landing page customization
landing:
  headline: "Master Cloud Financial Operations"  # From calendar.yml
  form_fields:
    - "name"
    - "email"
    - "company"
    - "cloud_spend_monthly"  # Additional field for qualification
```

### Override Rules

1. **Explicit Override**: If a field is defined in `brand-overrides.yml`, it completely replaces the brand default
2. **Deep Merge**: For nested objects (colors, typography), only specified fields are overridden
3. **Array Replace**: Arrays (like ICPs, products) are replaced entirely, not merged
4. **Validation**: The system warns if overrides drift too far from brand (e.g., completely different color scheme)

**Example Merge Logic:**

```yaml
# _brand/_brand.yml
colors:
  primary: "#0052FF"
  secondary: "#002D8E"
  success: "#00C48C"

# books/x/brand-overrides.yml
colors:
  primary: "#003DBF"  # Override primary only

# Final Merged Config
colors:
  primary: "#003DBF"    # From override
  secondary: "#002D8E"  # From brand (inherited)
  success: "#00C48C"    # From brand (inherited)
```

### Responsible Override Guidelines

**✅ Good Overrides:**
- Adjust color brightness for different audiences (engineers vs executives)
- Narrow ICP to one persona for focused messaging
- Add ebook-specific form fields for lead qualification
- Emphasize relevant products (ZopNight for FinOps, ZopCloud for migration)

**⚠️ Use Caution:**
- Changing brand colors dramatically (keep hue consistent)
- Overly technical tone for executive-focused ebooks
- CTAs that conflict with brand strategy

**❌ Avoid:**
- Completely different color scheme (breaking brand identity)
- Contradicting brand values or messaging
- Using competitor products in featured list
- Generic "Download Now" CTAs (be specific)

### Implementation ✅ **Complete (Epic #1)**

The hierarchical brand system now:

1. **Generator Scripts** (`_landing/generate.ts`, `_social/generate.ts`):
   - Use `loadMergedBrand()` from `scripts/brand-utils.ts`
   - Automatically merge brand defaults + ebook overrides
   - Deep merge logic: scalars override, objects merge recursively, arrays replace
   - Pass merged config to templates

2. **Validation** (`scripts/validate.ts`):
   - Validates `_brand/_brand-extended.yml` structure (company, products, ICPs)
   - Validates `brand-overrides.yml` in each ebook
   - Cross-references ICP IDs and product IDs against brand defaults
   - Provides helpful error messages with file paths

3. **Build Tools**:
   - `scripts/new-ebook.sh` scaffolds `brand-overrides.yml` from template
   - `_templates/brand-overrides.yml` provides starter template
   - See example implementation in `books/finops-playbook/brand-overrides.yml`

## Design Token System

### Overview

The design token system provides consistent, reusable design primitives across all output formats. Tokens are defined once in `scripts/theme-tokens.ts` and consumed through format-specific utilities.

### Token Categories

| Category | Prefix | Example | File |
|----------|--------|---------|------|
| Type scale | `--font-size-*` | `--font-size-2xl` → `1.728rem` | `theme-tokens.ts` |
| Spacing | `--space-*` | `--space-8` → `2rem` | `theme-tokens.ts` |
| Shadows | `--shadow-*` | `--shadow-lg` → complex box-shadow | `theme-tokens.ts` |
| Border radius | `--radius-*` | `--radius-lg` → `0.75rem` | `theme-tokens.ts` |
| Transitions | `--transition-*` | `--transition-fast` → `150ms ease` | `theme-tokens.ts` |
| Letter spacing | `--letter-spacing-*` | `--letter-spacing-tight` → `-0.025em` | `theme-tokens.ts` |
| Line height | `--line-height-*` | `--line-height-relaxed` → `1.625` | `theme-tokens.ts` |

### How Tokens Flow

```
scripts/theme-tokens.ts        Pure data definitions (no I/O)
        ↓
scripts/theme-utils.ts         Consumer utilities
        ↓
┌───────────────────────────────────────────────────┐
│                                                   │
│  Landing pages:                                   │
│    buildDesignTokenCssVars() → CSS custom props    │
│    Appended via buildCssVars() in brand-utils.ts  │
│    Used in styles.css as var(--font-size-xl, ...)  │
│                                                   │
│  Social templates:                                │
│    getSocialThemeValues() → flat object            │
│    No CSS vars (Satori doesn't support them)      │
│    Adds darkPrimary, lightBackground from primary │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Adding New Tokens

1. Add the token values to the appropriate constant in `scripts/theme-tokens.ts`
2. If it's a new category, add it to the `designTokens` bundle
3. Add CSS variable generation in `scripts/theme-utils.ts` → `buildDesignTokenCssVars()`
4. If social templates need it, update `getSocialThemeValues()` in `theme-utils.ts`
5. Use the new tokens in CSS (`var(--your-token)`) or social templates (direct values)
6. Validation automatically checks that all token categories produce CSS variables

### Key Files

```
scripts/
├── theme-tokens.ts     # Token definitions (pure data)
├── theme-utils.ts      # buildDesignTokenCssVars(), getSocialThemeValues()
└── brand-utils.ts      # Imports & re-exports theme utils, integrates into buildCssVars()
```

## Issue Workflow

### Epics
Epics represent major features spanning multiple stories. They're tracked as GitHub issues with the `epic` label.

### Stories
Stories are smaller, implementable tasks. They close with `Closes #<epic-number>` when the epic is complete.

### Example

```markdown
# Story: Implement brand-overrides.yml schema

## Description
Create the YAML schema for per-ebook brand overrides.

## Tasks
- [ ] Define schema structure
- [ ] Add TypeScript types
- [ ] Create example override file
- [ ] Update validation script

## Acceptance Criteria
- Schema documented in CONTRIBUTING.md
- Example file in books/finops-playbook/
- Validation passes with overrides

Part of: #1 (Brand System Epic)
```

## Testing

### Validation
```bash
make validate  # Check all configs are valid
```

### Rendering
```bash
make render ebook=<slug>        # Test all formats
make render-html ebook=<slug>   # Test HTML only
make render-pdf ebook=<slug>    # Test PDF only
```

### Landing Pages
```bash
make landing ebook=<slug>  # Test landing page generation
open _output/landing/<slug>/index.html
```

### Social Assets
```bash
make social ebook=<slug>  # Test social asset generation
open _output/social/<slug>/
```

### Full Pipeline
```bash
make clean  # Clear outputs
make all    # Run complete pipeline
```

## Documentation Standards

- **Code comments**: Explain *why*, not *what*
- **README sections**: Keep concise, link to issues for details
- **Issue descriptions**: Include examples, acceptance criteria, dependencies
- **Commit messages**: Follow Conventional Commits format

## Questions?

- **Roadmap questions**: Comment on [#7](https://github.com/talvinder/ebooks/issues/7)
- **Technical issues**: Open a new issue with the `question` label
- **Brand system**: See [Epic #1](https://github.com/talvinder/ebooks/issues/1)

---

Thank you for contributing to the Zopdev Ebook Engine! 🚀
