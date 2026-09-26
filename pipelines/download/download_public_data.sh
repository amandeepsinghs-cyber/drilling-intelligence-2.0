#!/usr/bin/env bash
# Download public well-log datasets from Zenodo (CC0 IODP sets) and FORCE 2020 from GitHub.
# Usage:
#   bash pipelines/download/download_public_data.sh            # all scriptable sets
#   bash pipelines/download/download_public_data.sh c0002n     # one set
# Sets: c0002n c0002p u1445a u1450b u1453a c0024 force2020
# Writes to data/raw/logs/<dataset>/ and appends to data/raw/DOWNLOAD_LOG.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RAW="$ROOT/data/raw/logs"
LOG="$ROOT/data/raw/DOWNLOAD_LOG.md"
mkdir -p "$RAW"
[[ -f "$LOG" ]] || printf "# Download Log\n\n| UTC | Dataset | File | Bytes | SHA256 |\n|---|---|---|---|---|\n" > "$LOG"

declare -A RECORD=( [c0002n]=3942006 [c0002p]=3942008 [u1445a]=5668873 [u1450b]=5668822 [u1453a]=5668808 [c0024]=6909792 )
declare -A DIR=( [c0002n]=iodp_348_c0002n [c0002p]=iodp_348_c0002p [u1445a]=iodp_353_u1445a [u1450b]=iodp_354_u1450b [u1453a]=iodp_354_u1453a [c0024]=iodp_358_c0024 )

zenodo_download() {
  local key="$1" rec="${RECORD[$1]}" dest="$RAW/${DIR[$1]}"
  mkdir -p "$dest"
  echo ">> Zenodo record $rec -> $dest"
  # List files via API, then download each with resume support.
  curl -sfL "https://zenodo.org/api/records/$rec" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for f in d["files"]:
    print(f["key"], f["size"], f["links"]["self"])
' | while read -r name size url; do
    local out="$dest/$name"
    if [[ -f "$out" && "$(stat -c %s "$out")" == "$size" ]]; then
      echo "   = $name already complete"; continue
    fi
    echo "   ↓ $name ($((size/1000000)) MB)"
    curl -fL --retry 5 --retry-delay 5 -C - -o "$out" "$url"
    local got; got=$(stat -c %s "$out")
    [[ "$got" == "$size" ]] || { echo "   ✗ size mismatch for $name ($got != $size)"; exit 1; }
    local sha; sha=$(sha256sum "$out" | cut -d" " -f1)
    printf "| %s | %s | %s | %s | %s |\n" "$(date -u +%FT%TZ)" "$key" "$name" "$got" "$sha" >> "$LOG"
    if [[ "$name" == *.zip ]]; then
      echo "   ⇲ unzipping $name"; unzip -q -n "$out" -d "$dest/unzipped"
    fi
  done
}

force2020() {
  local dest="$RAW/force_2020"
  if [[ -d "$dest/.git" ]]; then echo "= FORCE 2020 already cloned"; return; fi
  rm -rf "$dest"; git clone --depth 1 https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition "$dest"
  printf "| %s | force2020 | git clone | - | - |\n" "$(date -u +%FT%TZ)" >> "$LOG"
}

targets=("$@"); [[ ${#targets[@]} -eq 0 ]] && targets=(c0002n c0002p u1445a u1450b u1453a c0024 force2020)
for t in "${targets[@]}"; do
  case "$t" in
    force2020) force2020 ;;
    c0002n|c0002p|u1445a|u1450b|u1453a|c0024) zenodo_download "$t" ;;
    *) echo "unknown dataset: $t"; exit 2 ;;
  esac
done
echo "Done. Next: update data/DATA_PROVENANCE.md and run pipelines/ingest/inspect_logs.py"
