#!/usr/bin/env bash
# Renders all non-archived ebooks listed in calendar.yml.
# Usage: ./scripts/render-all.sh [format]
# format: html, pdf, epub, or empty for all formats

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CALENDAR="$ROOT_DIR/calendar.yml"

if [ ! -f "$CALENDAR" ]; then
  echo "Error: calendar.yml not found at $CALENDAR"
  exit 1
fi

FORMAT="${1:-}"

# Parse ebook slugs from calendar.yml, skipping archived ones
# Uses a simple grep/awk approach to avoid requiring yq
SLUGS=()
CURRENT_SLUG=""
CURRENT_STATUS=""

while IFS= read -r line; do
  # Match slug lines
  if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*slug:[[:space:]]*(.+) ]]; then
    CURRENT_SLUG="${BASH_REMATCH[1]}"
    CURRENT_SLUG="${CURRENT_SLUG%\"}"
    CURRENT_SLUG="${CURRENT_SLUG#\"}"
    CURRENT_SLUG="$(echo "$CURRENT_SLUG" | xargs)"  # trim whitespace
    CURRENT_STATUS=""
  fi
  # Match status lines
  if [[ "$line" =~ ^[[:space:]]*status:[[:space:]]*(.+) ]]; then
    CURRENT_STATUS="${BASH_REMATCH[1]}"
    CURRENT_STATUS="${CURRENT_STATUS%\"}"
    CURRENT_STATUS="${CURRENT_STATUS#\"}"
    CURRENT_STATUS="$(echo "$CURRENT_STATUS" | xargs)"  # trim whitespace
    # If we have both slug and status, decide whether to include
    if [ -n "$CURRENT_SLUG" ] && [ "$CURRENT_STATUS" != "archived" ]; then
      SLUGS+=("$CURRENT_SLUG")
    fi
    CURRENT_SLUG=""
    CURRENT_STATUS=""
  fi
done < "$CALENDAR"

if [ ${#SLUGS[@]} -eq 0 ]; then
  echo "No non-archived ebooks found in calendar.yml"
  exit 0
fi

echo "Rendering ${#SLUGS[@]} ebook(s)..."
echo ""

FAILED=0

for SLUG in "${SLUGS[@]}"; do
  BOOK_DIR="$ROOT_DIR/books/$SLUG"

  if [ ! -d "$BOOK_DIR" ]; then
    echo "Warning: Book directory not found for '$SLUG', skipping"
    continue
  fi

  echo "--- Rendering: $SLUG ---"

  if [ -n "$FORMAT" ]; then
    echo "  Format: $FORMAT"
    if ! quarto render "$BOOK_DIR" --to "$FORMAT"; then
      echo "  FAILED: $SLUG ($FORMAT)"
      FAILED=$((FAILED + 1))
    fi
  else
    echo "  Format: all"
    if ! quarto render "$BOOK_DIR"; then
      echo "  FAILED: $SLUG"
      FAILED=$((FAILED + 1))
    fi
  fi

  echo ""
done

if [ $FAILED -gt 0 ]; then
  echo "Completed with $FAILED failure(s)"
  exit 1
else
  echo "All ebooks rendered successfully"
fi
