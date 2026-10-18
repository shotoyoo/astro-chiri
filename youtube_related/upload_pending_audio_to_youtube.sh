#!/usr/bin/env bash

set -Eeuo pipefail

# for_youtube_upload 直下の音声ファイルを動画に変換し、YouTube へ順次アップロードする。
# Usage:
#   ./upload_pending_audio_to_youtube.sh [DESCRIPTION]
#   ./upload_pending_audio_to_youtube.sh --list

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
INPUT_DIR="$SCRIPT_DIR/for_youtube_upload"
DONE_DIR="$INPUT_DIR/done"
IMAGE="$SCRIPT_DIR/image/yamanami_icon_round.png"
UPLOADER="${YOUTUBE_UPLOADER:-$SCRIPT_DIR/youtubeuploader.exe}"
AUDIO_CSV_PATH="$SCRIPT_DIR/../src/content/audio/audio.csv"
RECENTLY_CSV_PATH="$SCRIPT_DIR/../src/content/audio/recently.csv"
DESCRIPTION="練習の様子"
LIST_ONLY=false

TARGET_W=1920
TARGET_H=1080

usage() {
  cat <<'EOF'
Usage:
  ./upload_pending_audio_to_youtube.sh [DESCRIPTION]
  ./upload_pending_audio_to_youtube.sh --list

Options:
  --list       List pending audio files without uploading them.
  -h, --help   Show this help.

DESCRIPTION defaults to: 練習の様子
EOF
}

if (( $# > 1 )); then
  usage >&2
  exit 2
fi

if (( $# == 1 )); then
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --list)
      LIST_ONLY=true
      ;;
    --*)
      printf 'Unknown option: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
    *)
      DESCRIPTION="$1"
      ;;
  esac
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

csv_escape() {
  local value="${1//\"/\"\"}"
  printf '"%s"' "$value"
}

csv_has_id() {
  local path="$1"
  local id="$2"

  awk -v target="$id" '
    NR > 1 && (index($0, target ",") == 1 || index($0, "\"" target "\",") == 1) {
      found = 1
    }
    END { exit found ? 0 : 1 }
  ' "$path"
}

register_audio() {
  local id="$1"
  local title="$2"
  local description="$3"
  local video_id="$4"
  local recording_date="$5"

  if grep -Fq -- "$video_id" "$AUDIO_CSV_PATH"; then
    printf 'Video ID is already present in audio.csv: %s\n' "$video_id" >&2
    return 1
  fi

  if csv_has_id "$AUDIO_CSV_PATH" "$id"; then
    printf 'Audio ID is already present in audio.csv: %s\n' "$id" >&2
    return 1
  fi

  {
    csv_escape "$id"
    printf ','
    csv_escape "$title"
    printf ','
    csv_escape "$video_id"
    printf ','
    csv_escape "$recording_date"
    printf '\n'
  } >> "$AUDIO_CSV_PATH"
  printf 'Appended to audio.csv: %s\n' "$id"

  if ! csv_has_id "$RECENTLY_CSV_PATH" "$id"; then
    {
      csv_escape "$id"
      printf ','
      csv_escape "$description"
      printf '\n'
    } >> "$RECENTLY_CSV_PATH"
    printf 'Appended to recently.csv: %s\n' "$id"
  fi
}

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

if [[ "$LIST_ONLY" == true ]]; then
  printf 'Pending audio files (%d):\n' "${#AUDIO_FILES[@]}"
  printf '  %s\n' "${AUDIO_FILES[@]##*/}"
  exit 0
fi

require_command ffmpeg

if [[ ! -f "$IMAGE" ]]; then
  printf 'Image file not found: %s\n' "$IMAGE" >&2
  exit 1
fi

if [[ ! -f "$UPLOADER" ]]; then
  printf 'YouTube uploader not found: %s\n' "$UPLOADER" >&2
  exit 1
fi

if [[ ! -f "$AUDIO_CSV_PATH" ]]; then
  printf 'audio.csv not found: %s\n' "$AUDIO_CSV_PATH" >&2
  exit 1
fi

if [[ ! -f "$RECENTLY_CSV_PATH" ]]; then
  printf 'recently.csv not found: %s\n' "$RECENTLY_CSV_PATH" >&2
  exit 1
fi

mkdir -p -- "$DONE_DIR"

# 全ファイルをアップロードする前に確認し、途中で名前衝突により止まるのを防ぐ。
for audio in "${AUDIO_FILES[@]}"; do
  done_audio="$DONE_DIR/$(basename -- "$audio")"
  if [[ -e "$done_audio" ]]; then
    printf 'A file with the same name already exists in done: %s\n' \
      "$done_audio" >&2
    exit 1
  fi
done

# Windows が付加する代替データストリームの残骸を配下全体から削除する。
find "$INPUT_DIR" -type f -name '*:Zone.Identifier' -delete

# 毎回 OAuth 認証をやり直し、失効済みトークンを使わないようにする。
# --help、--list、事前検査の失敗時には認証状態を変更しない。
rm -f -- "$SCRIPT_DIR/request.token"

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
  register_audio \
    "$id" "$title" "$DESCRIPTION" "$video_id" "$recording_date"
  mv -- "$audio" "$done_audio"
  printf 'Uploaded: %s (https://youtu.be/%s)\n' "$video_id" "$video_id"
  printf 'Moved to: %s\n' "$done_audio"
done

printf '\nUpload complete. Video IDs:\n'
for i in "${!VIDEO_IDS[@]}"; do
  printf '%s\t%s\n' "${VIDEO_IDS[$i]}" "${VIDEO_TITLES[$i]}"
done
