---
name: youtube-audio-upload
description: Upload pending choir rehearsal audio from this astro-chiri repository to YouTube and register it in recently.csv. Use when asked to process, publish, upload, or check audio placed in youtube_related/for_youtube_upload, including MP4 conversion, OAuth authorization, moving completed audio, reporting video IDs, and updating the site's recent-audio CSV.
---

# YouTube Audio Upload

Use the repository's `youtube_related/upload_pending_audio_to_youtube.sh` as the single source of truth. Do not recreate its ffmpeg or CSV logic in ad hoc commands.

## Inspect before execution

1. Work from the astro-chiri repository root.
2. Read the current upload script before changing or running it.
3. List supported audio files directly under `youtube_related/for_youtube_upload`. Do not process files in `done`.
4. Confirm the requested description. If none is specified, the script defaults to `練習の様子`.
5. Treat upload as an external mutation. Run it only when the user explicitly asks to upload or execute.

## Execute

Run:

```bash
cd youtube_related
./upload_pending_audio_to_youtube.sh "DESCRIPTION"
```

Allow network access when required. Keep the process attached and relay OAuth instructions immediately. The script deletes `request.token` at startup, so expect browser authorization on each run.

The script performs this sequence:

1. Delete all `*:Zone.Identifier` files recursively below `for_youtube_upload`.
2. Convert each pending audio file to a temporary 1920x1080 H.264/AAC MP4.
3. Upload it to YouTube with `privacy=unlisted`.
4. Extract and display the 11-character video ID.
5. Append a row to `src/content/audio/recently.csv`, unless that video ID already exists.
6. Move the successfully uploaded source audio into `for_youtube_upload/done`.
7. Remove temporary MP4 and log files on exit.

CSV fields are `id,title,description,audioUrl,youtubeId,date`. Derive `id` and `title` from the filename without its extension. For names beginning with `YYYYMMDD_`, derive `date` as `YYYY-MM-DD`; otherwise use the execution date. Quote and escape all generated CSV values.

## Handle failures safely

- Do not move an audio file unless upload, video-ID extraction, and CSV registration have succeeded.
- If OAuth waits, ask the user to approve access in the opened browser and continue monitoring.
- If `invalid_grant` occurs, verify that `request.token` was removed and reauthorize; do not repeatedly upload blindly.
- If output suggests an upload succeeded but a later step failed, inspect the video ID, `recently.csv`, and `done` before rerunning. Avoid duplicate YouTube uploads.
- If a same-named file already exists in `done`, stop before uploading it and report the collision.

## Verify and report

After execution:

1. Confirm every reported video ID exists in `recently.csv` with the requested description and correct date.
2. Confirm each successful audio file is in `for_youtube_upload/done` and absent from the pending directory.
3. Confirm no `*:Zone.Identifier` files remain.
4. Report each title, video ID, and clickable `https://youtu.be/VIDEO_ID` URL. State whether CSV registration and file moves completed.
