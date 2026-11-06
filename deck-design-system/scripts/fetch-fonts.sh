#!/usr/bin/env bash
# Download the three iasdr fonts (SIL OFL 1.1) into templates/fonts/ for offline rendering.
# The .ttf files are git-ignored (Noto Sans TC alone is ~12 MB); the OFL licences are committed.
set -euo pipefail
dir="$(cd "$(dirname "$0")/../templates/fonts" && pwd)"
base="https://cdn.jsdelivr.net/gh/google/fonts@main/ofl"
fetch(){ [ -s "$dir/$2" ] && { echo "have $2"; return; }; curl -fsSL --max-time 300 -o "$dir/$2" "$base/$1"; echo "got  $2"; }
fetch "manrope/Manrope%5Bwght%5D.ttf"        Manrope-wght.ttf
fetch "inter/Inter%5Bopsz,wght%5D.ttf"        Inter-opsz-wght.ttf
fetch "notosanstc/NotoSansTC%5Bwght%5D.ttf"   NotoSansTC-wght.ttf
