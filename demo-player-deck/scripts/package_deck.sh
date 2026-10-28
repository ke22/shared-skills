#!/usr/bin/env bash
# Package a player deck into an online folder (compressed film) and an offline zip (original film).
# Usage: package_deck.sh deck.html film.mp4 out_dir
# Env: CRF (default 26), KEEP_AUDIO=1 to keep the soundtrack, MAX_H (default 1080).
# The deck's data-video must equal the film's file name; both versions keep that name.
set -euo pipefail
deck=${1:?deck.html}; film=${2:?film.mp4}; out=${3:?out_dir}
name=$(basename "$film")
crf=${CRF:-26}; max_h=${MAX_H:-1080}
grep -q "data-video=\"$name\"" "$deck" || { echo "data-video in $deck is not \"$name\"" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found" >&2; exit 1; }

mkdir -p "$out/online" "$out/offline"
audio=(-an); [ "${KEEP_AUDIO:-0}" = 1 ] && audio=(-c:a aac -b:a 128k)
ffmpeg -hide_banner -loglevel error -y -i "$film" \
  -map_metadata -1 -c:v libx264 -preset slow -crf "$crf" -pix_fmt yuv420p \
  -vf "scale=-2:'min($max_h,ih)'" "${audio[@]}" -movflags +faststart \
  "$out/online/$name"
cp "$deck" "$out/online/index.html"

cp "$deck" "$out/offline/index.html"
cp "$film" "$out/offline/$name"
(cd "$out" && rm -f offline.zip && zip -qr offline.zip offline)

size() { du -h "$1" | cut -f1; }
echo "film original $(size "$film") -> online $(size "$out/online/$name")"
echo "online:  $out/online/  (publish index.html with $name as a published file)"
echo "offline: $out/offline.zip  (unzip, open index.html; no network needed except web fonts)"
