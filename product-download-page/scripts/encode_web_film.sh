#!/usr/bin/env bash
# Re-encode a product film for a web page and grab a poster frame.
# Usage: encode_web_film.sh input.mp4 out_dir [basename]
# Env: CRF (default 23), POSTER_AT seconds (default 2), MAX_H (default 1080), NO_AUDIO=1 to drop sound.
# Output: <basename>.mp4 (H.264 + AAC, faststart, metadata stripped) and <basename>-poster.jpg.
set -euo pipefail
in=${1:?input.mp4}; out=${2:?out_dir}; base=${3:-product-film}
crf=${CRF:-23}; at=${POSTER_AT:-2}; max_h=${MAX_H:-1080}
mkdir -p "$out"
audio=(-c:a aac -b:a 128k); [ "${NO_AUDIO:-0}" = 1 ] && audio=(-an)
ffmpeg -hide_banner -loglevel error -y -i "$in" \
  -map_metadata -1 -map_chapters -1 \
  -c:v libx264 -preset slow -crf "$crf" -pix_fmt yuv420p -vf "scale=-2:'min($max_h,ih)'" \
  "${audio[@]}" -movflags +faststart "$out/$base.mp4"
ffmpeg -hide_banner -loglevel error -y -ss "$at" -i "$out/$base.mp4" -frames:v 1 -q:v 3 "$out/$base-poster.jpg"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height -of compact=p=0 "$out/$base.mp4"
echo "poster: $out/$base-poster.jpg"
echo "Check metadata: ffprobe -v error -show_entries format_tags -of json $out/$base.mp4 (only major_brand/minor_version/compatible_brands/encoder should remain)"
