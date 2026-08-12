#!/bin/bash
set -u
ROOT="/Users/noelgempeler/Documents/GitHub/portfolio/bilder"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

make_sm_from_image() {
  local src="$1"
  local out="$2"
  if [[ -f "$out" ]]; then
    echo "SKIP  $out"
    return 0
  fi
  if ! ffmpeg -y -i "$src" -frames:v 1 -update 1 -vf "scale='min(800,iw)':-2" "$TMP/frame.png" </dev/null >/dev/null 2>&1; then
    echo "FAIL  decode $src"
    return 1
  fi
  if cwebp -q 72 "$TMP/frame.png" -o "$out" >/dev/null 2>&1; then
    echo "DONE  $(ls -lh "$out" | awk '{print $5}')  $out"
  else
    echo "FAIL  cwebp $src"
    return 1
  fi
}

make_sm_from_video() {
  local src="$1"
  local out="$2"
  if [[ -f "$out" ]]; then
    echo "SKIP  $out"
    return 0
  fi
  if ! ffmpeg -y -ss 1 -i "$src" -frames:v 1 -update 1 -vf "scale='min(800,iw)':-2" "$TMP/frame.png" </dev/null >/dev/null 2>&1; then
    if ! ffmpeg -y -i "$src" -frames:v 1 -update 1 -vf "scale='min(800,iw)':-2" "$TMP/frame.png" </dev/null >/dev/null 2>&1; then
      echo "FAIL  ffmpeg $src"
      return 1
    fi
  fi
  if cwebp -q 72 "$TMP/frame.png" -o "$out" >/dev/null 2>&1; then
    echo "DONE  $(ls -lh "$out" | awk '{print $5}')  $out (from video)"
  else
    echo "FAIL  cwebp video $src"
    return 1
  fi
}

# Numbered / named stills (skip covers and already-sm)
while IFS= read -r -d '' src; do
  dir=$(dirname "$src")
  base=$(basename "$src" .webp)
  [[ "$base" == *cover* ]] && continue
  [[ "$base" == *-sm ]] && continue
  out="$dir/${base}-sm.webp"
  make_sm_from_image "$src" "$out"
done < <(find "$ROOT" -type f -name '*.webp' -print0)

# Videos without a matching still: Nfill.mp4 -> N-sm.webp
while IFS= read -r -d '' src; do
  [[ "$src" == *-mobile.mp4 ]] && continue
  dir=$(dirname "$src")
  base=$(basename "$src" .mp4)
  num="${base%fill}"
  [[ -z "$num" || "$num" == "$base" ]] && continue
  if [[ -f "$dir/${num}.webp" ]]; then
    continue
  fi
  out="$dir/${num}-sm.webp"
  make_sm_from_video "$src" "$out"
done < <(find "$ROOT" -type f -name '*fill.mp4' -print0)

echo "ALL_SM_DONE"
count=$(find "$ROOT" -type f -name '*-sm.webp' ! -name '*cover*' | wc -l | tr -d ' ')
echo "slide-sm count: $count"
