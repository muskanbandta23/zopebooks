# Zopdev Ebook Generation Engine

A modular, pluggable ebook-as-code system for generating multi-format ebooks (HTML, PDF, EPUB) with auto-generated landing pages and social media assets.

## ✅ System Status: **Fully Operational**

All components tested and working:
- ✅ HTML book rendering (with Mermaid diagrams)
- ✅ PDF generation (236KB)
- ✅ EPUB generation (204KB)
- ✅ Landing page generation
- ✅ Social media assets (LinkedIn carousel, Instagram posts, OG images)
- ✅ Validation & scaffolding

## Quick Start

```bash
# Install dependencies
make install

# Validate configuration
make validate

# List all ebooks
make list

# Render finops-playbook (all formats)
make render ebook=finops-playbook

# Generate landing page
make landing ebook=finops-playbook

# Generate social assets
make social ebook=finops-playbook

# Full pipeline (validate → render → landing → social)
make all
```

## Available Commands

```bash
make help                           # Show all targets
make install                        # Install Bun dependencies
make setup                          # Symlink brand into all ebooks
make validate                       # Validate calendar + ebook manifests
make list                           # List all ebooks with status

# Rendering
make render ebook=<slug>            # Render one ebook (all formats)
make render-html ebook=<slug>       # Render HTML only
make render-pdf ebook=<slug>        # Render PDF only
make render-epub ebook=<slug>       # Render EPUB only
make render-all                     # Render all non-archived ebooks

# Landing Pages
make landing ebook=<slug>           # Generate landing page
make landing-all                    # Generate all landing pages

# Social Media
make social ebook=<slug>            # Generate all social assets
make social-linkedin ebook=<slug>   # LinkedIn carousel only
make social-instagram ebook=<slug>  # Instagram posts only
make social-og ebook=<slug>         # OG image only

# Scaffolding
make new-ebook slug=<slug> title="<title>" [subtitle="<subtitle>"]

# Pipeline
make all                            # Full pipeline
make clean                          # Remove all _output/
```

## Directory Structure

```
ebooks/
├── Makefile                        # CLI: 19 targets
├── package.json                    # Bun dependencies
├── calendar.yml                    # Content calendar (source of truth)
│
├── _brand/                         # Brand assets
│   ├── _brand.yml                  # Colors, typography, logos
│   └── logos/                      # SVG logo files
│
├── _themes/                        # Shared themes
│   ├── zopdev-book.scss            # HTML book theme
│   ├── zopdev-epub.css             # EPUB styles
│   └── preamble.tex                # LaTeX preamble for PDF
│
├── _templates/                     # Scaffolding templates
│   ├── _quarto-base.yml            # Template _quarto.yml
│   ├── chapter.qmd                 # Starter chapter
│   └── ebook.yml                   # Starter manifest
│
├── _landing/                       # Landing page generator
│   ├── generate.ts                 # Bun script
│   ├── template.html               # Mustache template
│   └── styles.css                  # Landing page CSS
│
├── _social/                        # Social asset generator
│   ├── generate.ts                 # Bun script (Satori + Sharp + pdf-lib)
│   ├── templates/                  # TSX templates
│   │   ├── linkedin-slide.tsx      # 1080x1080 carousel
│   │   ├── instagram-post.tsx      # 1080x1350 quote card
│   │   └── og-image.tsx            # 1200x630 OG image
│   └── fonts/                      # Inter fonts (Regular, Bold)
│
├── scripts/                        # Shell scripts & validators
│   ├── setup-ebook.sh              # Symlink brand
│   ├── new-ebook.sh                # Scaffold new ebook
│   ├── render-all.sh               # Render all non-archived
│   └── validate.ts                 # Schema validation
│
├── books/                          # Ebook projects
│   └── finops-playbook/            # Example: The FinOps Playbook
│       ├── _quarto.yml             # Book config
│       ├── _brand.yml              # → symlink to ../../_brand/_brand.yml
│       ├── ebook.yml               # Per-ebook metadata & social config
│       ├── index.qmd               # Preface
│       ├── chapters/               # 8 chapters with content
│       ├── images/                 # Image assets
│       └── references.bib          # Bibliography
│
└── _output/                        # Generated output (gitignored)
    ├── books/<slug>/html|pdf|epub
    ├── landing/<slug>/index.html
    └── social/<slug>/linkedin|instagram|og
```

## Current Content

### The FinOps Playbook
**Status**: in-progress  
**Formats**: HTML, PDF (236KB), EPUB (204KB)  
**Chapters**: 8 (Intro, Cloud Cost Fundamentals, FinOps Framework, Cost Allocation, Optimization Strategies, Tooling & Automation, Culture & Adoption, Case Studies)

**Generated Assets**:
- Landing page with lead capture form
- LinkedIn carousel: 6 slides + combined PDF
- Instagram: 3 quote cards (1080x1350)
- OG image (1200x630)

## Dependencies

### Installed
- ✅ Bun (runtime)
- ✅ Quarto CLI 1.8.27
- ✅ TinyTeX (LaTeX for PDF)
- ✅ Node packages: satori, sharp, pdf-lib, yaml, mustache, react
- ✅ Fonts: Inter-Regular.ttf, Inter-Bold.ttf

## Adding a New Ebook

1. **Scaffold structure**:
   ```bash
   make new-ebook slug=my-ebook title="My Ebook Title" subtitle="Optional Subtitle"
   ```

2. **Add entry to `calendar.yml`**:
   ```yaml
   - slug: my-ebook
     title: "My Ebook Title"
     subtitle: "Optional Subtitle"
     status: draft
     tags: [tag1, tag2]
     outputs:
       html: true
       pdf: true
       epub: true
       landing_page: true
       linkedin_carousel: true
       instagram_posts: true
       og_image: true
     landing:
       headline: "Your compelling headline"
       description: "Lead capture description"
       cta_text: "Download Free PDF"
       form_action: "https://YOUR_WEBHOOK_URL"
   ```

3. **Write content** in `books/my-ebook/chapters/`

4. **Generate outputs**:
   ```bash
   make render ebook=my-ebook
   make landing ebook=my-ebook
   make social ebook=my-ebook
   ```

## Customization

### Brand Colors
Edit `_brand/_brand.yml` to change colors, typography, and logos. Changes apply to:
- Quarto-rendered books (HTML/PDF/EPUB)
- Landing pages
- Social media assets

### Themes
- **HTML**: `_themes/zopdev-book.scss` (SCSS extending Quarto's cosmo theme)
- **PDF**: `_themes/preamble.tex` (LaTeX with custom chapter formatting, headers, code blocks)
- **EPUB**: `_themes/zopdev-epub.css` (Hardcoded colors for e-reader compatibility)

### Social Templates
Edit TSX templates in `_social/templates/` to customize:
- LinkedIn carousel slide layout
- Instagram quote card design
- Open Graph image appearance

## Output Examples

**HTML Book**: Full-featured website with navigation, search, and Mermaid diagrams  
**PDF**: 236KB professionally formatted book with custom headers, branded chapter titles  
**EPUB**: 204KB e-reader compatible format  
**Landing Page**: Lead capture page with form, chapter listing, and brand styling  
**Social Assets**: Ready-to-publish images for LinkedIn, Instagram, and social sharing

## License

Proprietary — Zopdev internal use only.
