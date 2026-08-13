#!/usr/bin/env bash

set -Eeuo pipefail

# for_youtube_upload 直下の音声ファイルを動画に変換し、YouTube へ順次アップロードする。
# Usage: ./upload_pending_audio_to_youtube.sh [DESCRIPTION]

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
INPUT_DIR="$SCRIPT_DIR/for_youtube_upload"
DONE_DIR="$INPUT_DIR/done"
IMAGE="$SCRIPT_DIR/image/yamanami_icon_round.png"
UPLOADER="${YOUTUBE_UPLOADER:-$SCRIPT_DIR/youtubeuploader.exe}"
CSV_PATH="$SCRIPT_DIR/../src/content/audio/recently.csv"
DESCRIPTION="${1:-練習の様子}"

TARGET_W=1920
TARGET_H=1080

# 毎回 OAuth 認証をやり直し、失効済みトークンを使わないようにする。
rm -f -- "$SCRIPT_DIR/request.token"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

require_command ffmpeg

csv_escape() {
  local value="${1//\"/\"\"}"
  printf '"%s"' "$value"
}

append_to_recently_csv() {
  local id="$1"
  local title="$2"
  local description="$3"
  local video_id="$4"
  local recording_date="$5"
  local video_url="https://youtu.be/$video_id"

  if grep -Fq -- "$video_id" "$CSV_PATH"; then
    printf 'Already present in recently.csv: %s\n' "$video_id"
    return
  fi

  {
    csv_escape "$id"
    printf ','
    csv_escape "$title"
    printf ','
    csv_escape "$description"
    printf ','
    csv_escape "$video_url"
    printf ','
    csv_escape "$video_id"
    printf ','
    csv_escape "$recording_date"
    printf '\n'
  } >> "$CSV_PATH"
  printf 'Appended to recently.csv: %s\n' "$id"
}

# Windows が付加する代替データストリームの残骸を配下全体から削除する。
find "$INPUT_DIR" -type f -name '*:Zone.Identifier' -delete

if [[ ! -f "$IMAGE" ]]; then
  printf 'Image file not found: %s\n' "$IMAGE" >&2
  exit 1
fi

if [[ ! -f "$UPLOADER" ]]; then
  printf 'YouTube uploader not found: %s\n' "$UPLOADER" >&2
  exit 1
fi

if [[ ! -f "$CSV_PATH" ]]; then
  printf 'recently.csv not found: %s\n' "$CSV_PATH" >&2
  exit 1
fi

mkdir -p -- "$DONE_DIR"

mapfile -d '' AUDIO_FILES < <(
  find "$INPUT_DIR" -maxdepth 1 -type f \
    \( -iname '*.m4a' -o -iname '*.mp3' -o -iname '*.wav' \
       -o -iname '*.aac' -o -iname '*.flac' -o -iname '*.ogg' \) \
    -print0 | sort -z
)

if (( ${#AUDIO_FILES[@]} == 0 )); then
  printf 'No audio files found in %s\n' "$INPUT_DIR"
  exit 0
fi

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/youtube-audio-upload.XXXXXX")"
trap 'rm -rf -- "$TEMP_DIR"' EXIT

declare -a VIDEO_IDS=()
declare -a VIDEO_TITLES=()

for audio in "${AUDIO_FILES[@]}"; do
  filename="$(basename -- "$audio")"
  title="${filename%.*}"
  id="$title"
  if [[ "$title" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})[_[:space:]-] ]]; then
    recording_date="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
  else
    recording_date="$(date +%Y-%m-%d)"
  fi
  output="$TEMP_DIR/${title}.mp4"
  upload_log="$TEMP_DIR/${title}.upload.log"
  done_audio="$DONE_DIR/$filename"

  if [[ -e "$done_audio" ]]; then
    printf 'A file with the same name already exists in done: %s\n' \
      "$done_audio" >&2
    exit 1
  fi

  printf '\n[%d/%d] Converting: %s\n' \
    "$(( ${#VIDEO_IDS[@]} + 1 ))" "${#AUDIO_FILES[@]}" "$filename"

  ffmpeg -hide_banner -loglevel error -y \
    -loop 1 -i "$IMAGE" -i "$audio" \
    -vf "scale=${TARGET_W}:${TARGET_H}:force_original_aspect_ratio=decrease,pad=${TARGET_W}:${TARGET_H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
    -c:v libx264 -c:a aac -b:a 192k -shortest "$output"

  printf 'Uploading: %s\n' "$title"
  if ! (cd -- "$SCRIPT_DIR" && "$UPLOADER" \
      -filename="$output" \
      -title="$title" \
      -description="$DESCRIPTION" \
      -privacy=unlisted 2>&1) | tee "$upload_log"; then
    upload_output="$(<"$upload_log")"
    printf 'Upload failed: %s\n%s\n' "$filename" "$upload_output" >&2
    exit 1
  fi

  upload_output="$(<"$upload_log")"

  video_id=$(printf '%s\n' "$upload_output" \
    | sed -nE 's/.*Video ID:[[:space:]]*([A-Za-z0-9_-]{11}).*/\1/p' \
    | head -n 1)

  if [[ -z "$video_id" ]]; then
    printf 'Could not retrieve Video ID for %s.\n%s\n' \
      "$filename" "$upload_output" >&2
    exit 1
  fi

  VIDEO_TITLES+=("$title")
  VIDEO_IDS+=("$video_id")
  append_to_recently_csv \
    "$id" "$title" "$DESCRIPTION" "$video_id" "$recording_date"
  mv -- "$audio" "$done_audio"
  printf 'Uploaded: %s (https://youtu.be/%s)\n' "$video_id" "$video_id"
  printf 'Moved to: %s\n' "$done_audio"
done

printf '\nUpload complete. Video IDs:\n'
for i in "${!VIDEO_IDS[@]}"; do
  printf '%s\t%s\n' "${VIDEO_IDS[$i]}" "${VIDEO_TITLES[$i]}"
done
