#!/usr/bin/env bash
# Check a deployed product/download page from the public internet, not localhost.
# Usage: verify_live.sh <site_url> <owner/repo> [marker ...]
#   site_url   e.g. https://owner.github.io/repo/
#   owner/repo the repo whose releases/latest the download button points at
#   marker     strings that must appear in the served HTML (e.g. an element id of the new section)
# Every local asset referenced by src/href/poster is fetched; .mp4/.webm must answer a byte-range
# request with 206 and a video/* type, so browsers can start playback before the whole file arrives.
set -uo pipefail
site=${1:?site_url}; repo=${2:?owner/repo}; shift 2
site=${site%/}/
fail=0
ok()  { printf 'ok    %s\n' "$*"; }
bad() { printf 'FAIL  %s\n' "$*"; fail=1; }

html=$(curl -fsSL "$site") || { bad "page $site did not load"; exit 1; }
ok "page loads ($(printf %s "$html" | wc -c | tr -d ' ') bytes)"
for m in "$@"; do
  if grep -qF -- "$m" <<<"$html"; then ok "marker present: $m"; else bad "marker missing: $m (Pages may still be building; retry in a minute)"; fi
done

assets=$(grep -oE '(src|href|poster)="[^"#]+"' <<<"$html" | sed -E 's/^[a-z]+="//; s/"$//' \
  | grep -vE '^(https?:|mailto:|data:|//)' | sort -u)
for a in $assets; do
  url="$site${a#./}"
  case "$a" in
    *.mp4|*.webm)
      hdr=$(curl -s -r 0-1023 -o /dev/null -D - "$url")  # GET, not HEAD: some hosts answer HEAD+Range with 200
      code=$(awk 'NR==1{print $2}' <<<"$hdr")
      type=$(grep -i '^content-type:' <<<"$hdr" | tr -d '\r' | awk '{print $2}')
      if [ "$code" = 206 ] && [[ "$type" == video/* ]]; then ok "$a  range 206 $type"; else bad "$a  range request gave $code $type"; fi ;;
    *)
      code=$(curl -s -o /dev/null -w '%{http_code}' "$url")
      if [ "$code" = 200 ]; then ok "$a  200"; else bad "$a  $code"; fi ;;
  esac
done

if grep -q "github.com/$repo/releases/latest" <<<"$html"; then
  loc=$(curl -sI "https://github.com/$repo/releases/latest" | grep -i '^location:' | tr -d '\r' | awk '{print $2}')
  tag=${loc##*/}
  if [ -n "$tag" ] && [ "$tag" != latest ]; then
    n=$(gh release view "$tag" -R "$repo" --json assets -q '.assets | length' 2>/dev/null || echo '?')
    ok "download button -> releases/latest -> $tag ($n assets)"
  else
    bad "releases/latest does not resolve to a tag (no published release?)"
  fi
else
  printf 'note  page does not link releases/latest; check the download link by hand\n'
fi
exit $fail
