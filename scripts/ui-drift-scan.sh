#!/bin/bash

# UI Drift Scan Script
# Scans for arbitrary values (text-[...], shadow-[...], rounded-[...], bg-[image...])
# Excludes allowlisted patterns if needed.

echo "🔍 UI Drift Mean Scan..."
echo "========================="

# Regex patterns
PATTERNS=(
  "text-\[[0-9]+px\]"
  "shadow-\["
  "rounded-\["
  "bg-\[image:"
)

# Output file
REPORT_FILE="docs/ui_drift_raw.txt"
mkdir -p docs
echo "Scan Report - $(date)" > "$REPORT_FILE"
echo "------------------------" >> "$REPORT_FILE"

TOTAL_VIOLATIONS=0

for pattern in "${PATTERNS[@]}"; do
  echo "" >> "$REPORT_FILE"
  echo "Checking pattern: $pattern" >> "$REPORT_FILE"
  echo "------------------------" >> "$REPORT_FILE"

  # Find matches, exclude node_modules, .git, build, artifacts
  # Using ripgrep (rg) for speed if available, or grep
  if command -v rg &> /dev/null; then
    MATCHES=$(rg "$pattern" --glob '!node_modules' --glob '!.git' --glob '!dist' --glob '!docs' --glob '!scripts' --glob '!*.md' --count-matches | sort -t: -k2 -nr)
  else
    # Fallback to grep (slower, less clean output)
    MATCHES=$(grep -rE "$pattern" . --exclude-dir={node_modules,.git,dist,docs,scripts} --exclude=*.md | awk -F: '{print $1}' | sort | uniq -c | sort -nr)
  fi
  
  if [ -z "$MATCHES" ]; then
    echo "No violations found." >> "$REPORT_FILE"
  else
    echo "$MATCHES" >> "$REPORT_FILE"
    count=$(echo "$MATCHES" | awk -F: '{sum+=$2} END {print sum}')
    TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + count))
  fi
done

echo "" >> "$REPORT_FILE"
echo "========================" >> "$REPORT_FILE"
echo "Total Potential Drift Violations: $TOTAL_VIOLATIONS" >> "$REPORT_FILE"

echo "✅ Scan complete. Raw report saved to $REPORT_FILE"
cat "$REPORT_FILE"
