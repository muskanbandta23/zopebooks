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

**Location:** `_brand/_brand.yml` (existing) + `_brand/_brand-extended.yml` (planned in #1)

**What's Defined:**
- **Core Brand**: Colors, typography, logos (current `_brand.yml`)
- **Company Info**: Name, tagline, website, social links
- **Product Catalog**: ZopNight, ZopCloud, services offered
- **Default ICPs**: Target personas (DevOps Engineers, CTOs, FinOps Practitioners)
- **Tone & Voice**: Brand guidelines for messaging

**Example** (`_brand/_brand-extended.yml` - to be created):

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

**Location:** `books/<slug>/brand-overrides.yml` (to be created in #1)

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

### Implementation (Planned in Epic #1)

When Epic #1 is complete, the system will:

1. **Generator Scripts** (landing, social) will:
   - Load `_brand/_brand.yml` + `_brand/_brand-extended.yml`
   - Load `books/<slug>/brand-overrides.yml` if exists
   - Deep merge with override rules
   - Pass merged config to templates

2. **Validation** (`scripts/validate.ts`) will:
   - Check that overrides don't break brand identity
   - Warn if color drift exceeds thresholds
   - Validate ICP IDs against brand defaults
   - Ensure featured products exist in catalog

3. **Documentation** will include:
   - Override schema specification
   - Example use cases
   - Best practices guide
   - Testing overrides locally

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
