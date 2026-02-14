# Zopdev Ebook Generation Engine
# Usage: make <target> [ebook=<slug>] [slug=<slug> title="<title>" subtitle="<subtitle>"]

.DEFAULT_GOAL := help

# ─── Variables ───────────────────────────────────────────────────────────────

BOOKS_DIR   := books
OUTPUT_DIR  := _output
SCRIPTS_DIR := scripts

# ─── Help ────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show all targets
	@echo "Zopdev Ebook Engine"
	@echo "==================="
	@echo ""
	@echo "Usage: make <target> [ebook=<slug>]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ─── Setup ───────────────────────────────────────────────────────────────────

.PHONY: install
install: ## Install Bun dependencies
	bun install

.PHONY: setup
setup: ## Symlink brand into all ebooks
	@for dir in $(BOOKS_DIR)/*/; do \
		slug=$$(basename "$$dir"); \
		$(SCRIPTS_DIR)/setup-ebook.sh "$$slug"; \
	done

# ─── Validation ──────────────────────────────────────────────────────────────

.PHONY: validate
validate: ## Validate calendar + ebook manifests
	bun run $(SCRIPTS_DIR)/validate.ts

# ─── List ────────────────────────────────────────────────────────────────────

.PHONY: list
list: ## List all ebooks with status
	@echo "Ebooks:"
	@echo "-------"
	@while IFS= read -r line; do \
		case "$$line" in \
			*"slug:"*) slug=$$(echo "$$line" | sed 's/.*slug:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' | tr -d '"') ;; \
			*"title:"*) title=$$(echo "$$line" | sed 's/.*title:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' | tr -d '"') ;; \
			*"status:"*) status=$$(echo "$$line" | sed 's/.*status:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' | tr -d '"'); \
				printf "  %-25s %-40s [%s]\n" "$$slug" "$$title" "$$status" ;; \
		esac; \
	done < calendar.yml

# ─── Render ──────────────────────────────────────────────────────────────────

.PHONY: render
render: ## Render one ebook (all formats) — ebook=<slug>
ifndef ebook
	$(error Usage: make render ebook=<slug>)
endif
	@echo "Rendering $(ebook)..."
	quarto render $(BOOKS_DIR)/$(ebook)

.PHONY: render-html
render-html: ## Render HTML only — ebook=<slug>
ifndef ebook
	$(error Usage: make render-html ebook=<slug>)
endif
	quarto render $(BOOKS_DIR)/$(ebook) --to html

.PHONY: render-pdf
render-pdf: ## Render PDF only — ebook=<slug>
ifndef ebook
	$(error Usage: make render-pdf ebook=<slug>)
endif
	quarto render $(BOOKS_DIR)/$(ebook) --to pdf

.PHONY: render-epub
render-epub: ## Render EPUB only — ebook=<slug>
ifndef ebook
	$(error Usage: make render-epub ebook=<slug>)
endif
	quarto render $(BOOKS_DIR)/$(ebook) --to epub

.PHONY: render-all
render-all: ## Render all non-archived ebooks
	$(SCRIPTS_DIR)/render-all.sh

# ─── Landing Pages ───────────────────────────────────────────────────────────

.PHONY: landing
landing: ## Generate landing page — ebook=<slug>
ifndef ebook
	$(error Usage: make landing ebook=<slug>)
endif
	bun run _landing/generate.ts $(ebook)

.PHONY: landing-all
landing-all: ## Generate all landing pages
	bun run _landing/generate.ts

# ─── Social Media Assets ────────────────────────────────────────────────────

.PHONY: social
social: ## Generate all social assets — ebook=<slug>
ifndef ebook
	$(error Usage: make social ebook=<slug>)
endif
	bun run _social/generate.ts $(ebook)

.PHONY: social-linkedin
social-linkedin: ## LinkedIn carousel only — ebook=<slug>
ifndef ebook
	$(error Usage: make social-linkedin ebook=<slug>)
endif
	bun run _social/generate.ts $(ebook) linkedin

.PHONY: social-instagram
social-instagram: ## Instagram posts only — ebook=<slug>
ifndef ebook
	$(error Usage: make social-instagram ebook=<slug>)
endif
	bun run _social/generate.ts $(ebook) instagram

.PHONY: social-og
social-og: ## OG image only — ebook=<slug>
ifndef ebook
	$(error Usage: make social-og ebook=<slug>)
endif
	bun run _social/generate.ts $(ebook) og

# ─── Scaffold ────────────────────────────────────────────────────────────────

.PHONY: new-ebook
new-ebook: ## Scaffold new ebook — slug=<slug> title="<title>" [subtitle="<subtitle>"]
ifndef slug
	$(error Usage: make new-ebook slug=<slug> title="<title>")
endif
ifndef title
	$(error Usage: make new-ebook slug=<slug> title="<title>")
endif
	$(SCRIPTS_DIR)/new-ebook.sh "$(slug)" "$(title)" "$(subtitle)"

# ─── Full Pipeline ───────────────────────────────────────────────────────────

.PHONY: all
all: validate render-all landing-all ## Full pipeline: validate → render → landing → social
	@echo ""
	@echo "Generating social assets for all ebooks..."
	bun run _social/generate.ts
	@echo ""
	@echo "Full pipeline complete."

# ─── Clean ───────────────────────────────────────────────────────────────────

.PHONY: clean
clean: ## Remove all _output/
	rm -rf $(OUTPUT_DIR)
	@echo "Cleaned $(OUTPUT_DIR)/"
