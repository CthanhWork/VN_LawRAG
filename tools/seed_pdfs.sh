#!/usr/bin/env bash
set -euo pipefail

DB_HOST=${DB_HOST:-mysql}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-laws}
DB_USER=${DB_USER:-app}
DB_PASS=${DB_PASS:-app}

PDF_DIR=${PDF_DIR:-/seed}

echo "[seed] Waiting a moment for dependencies..."
sleep 5

echo "[seed] Importing PDFs from ${PDF_DIR}"
shopt -s nullglob
found_any=false
while IFS= read -r -d '' f; do
  found_any=true
  echo "[seed] Import: $f"
  python /app/tools/import_pdf.py \
    --file "$f" \
    --replace \
    --db-host "$DB_HOST" --db-port "$DB_PORT" --db-name "$DB_NAME" --db-user "$DB_USER" --db-pass "$DB_PASS"
done < <(find "$PDF_DIR" -maxdepth 1 -type f -name '*.pdf' -print0)

if [ "$found_any" = false ]; then
  echo "[seed] No PDF files found in ${PDF_DIR}, skipping import."
fi

echo "[seed] Embedding laws into Chroma..."
RESET_EMBED=${RESET_EMBED:-1} \
DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_NAME="$DB_NAME" DB_USER="$DB_USER" DB_PASS="$DB_PASS" \
CHROMA_PATH=${CHROMA_PATH:-/data/chroma} \
python /app/tools/embed_laws_plus.py

echo "[seed] Done."

