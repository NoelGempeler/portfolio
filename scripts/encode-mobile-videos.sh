#!/bin/bash
set -u
cd /Users/noelgempeler/Documents/GitHub/portfolio

encode_one() {
  local f="$1"
  local out="${f%.mp4}-mobile.mp4"
  echo "START $f"
  if ffmpeg -y -i "$f" \
    -vf "scale='min(1280,iw)':-2" \
    -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p \
    -c:a aac -b:a 96k -ac 2 \
    -movflags +faststart \
    "$out" </dev/null >/tmp/ff-$(basename "$f").out 2>&1
  then
    echo "DONE  $(ls -lh "$out" | awk '{print $5}')  $out"
    return 0
  fi
  if ffmpeg -y -i "$f" \
    -vf "scale='min(1280,iw)':-2" \
    -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p \
    -an -movflags +faststart \
    "$out" </dev/null >>/tmp/ff-$(basename "$f").out 2>&1
  then
    echo "DONE  $(ls -lh "$out" | awk '{print $5}')  $out (no audio)"
    return 0
  fi
  echo "FAIL  $f"
  return 1
}

NEED=(
  bilder/experimente/3fill.mp4
  bilder/experimente/4fill.mp4
  bilder/experimente/5fill.mp4
  bilder/experimente/6fill.mp4
  bilder/experimente/7fill.mp4
  bilder/experimente/8fill.mp4
  bilder/experimente/9fill.mp4
  bilder/glbviewer/1fill.mp4
  bilder/ringwebsite/2.mp4
  bilder/tat/1fill.mp4
  bilder/tat/2fill.mp4
  bilder/tat/3fill.mp4
  bilder/tat/5fill.mp4
)

# Run 2 at a time
i=0
for f in "${NEED[@]}"; do
  encode_one "$f" &
  i=$((i + 1))
  if (( i % 2 == 0 )); then
    wait
  fi
done
wait
echo "ALL_ENCODE_DONE"
