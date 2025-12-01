#!/usr/bin/env node
/**
 * Upload audio file to YouTube and generate markdown file
 * Usage: pnpm upload-audio <audio-file-path> <directory-name> [title] [description]
 * Example: pnpm upload-audio ./audio/song.m4a recently "My Song" "Description here"
 */

import { execSync } from 'child_process'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { basename, extname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get command line arguments
const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('Usage: pnpm upload-audio <audio-file-path> <directory-name> [title] [description]')
  console.error('Example: pnpm upload-audio ./audio/song.m4a recently "My Song" "Description here"')
  process.exit(1)
}

const audioFilePath = resolve(args[0])
const directoryName = args[1]
const customTitle = args[2]
const customDescription = args[3]

// Validate audio file exists
if (!existsSync(audioFilePath)) {
  console.error(`Error: Audio file not found: ${audioFilePath}`)
  process.exit(1)
}

const audioFileName = basename(audioFilePath, extname(audioFilePath))
const audioExt = extname(audioFilePath)

// Default image path (adjust as needed)
const imagePath = resolve(__dirname, '..', 'src', 'content', 'audio', 'youtube_related', 'image', 'yamanami_icon_round.png')
const tempVideoPath = join(__dirname, '..', 'temp', `${audioFileName}.mp4`)

// Create temp directory if it doesn't exist
const tempDir = join(__dirname, '..', 'temp')
if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true })
}

console.log(`📤 Uploading audio file to YouTube...`)
console.log(`   Audio: ${audioFilePath}`)
console.log(`   Image: ${imagePath}`)
console.log(`   Directory: ${directoryName}`)
console.log()

// Prepare title and description
const title = customTitle || audioFileName.replace(/_/g, ' ')
const description = customDescription || 'Uploaded from astro-chiri'

try {
  // Step 1: Create video from image + audio using ffmpeg
  console.log(`🎬 Creating video with ffmpeg...`)
  console.log(`   Output: ${tempVideoPath}`)
  
  const ffmpegCommand = `ffmpeg -y -loop 1 -i "${imagePath}" -i "${audioFilePath}" \
    -vf "scale=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p" \
    -c:v libx264 -c:a aac -b:a 192k -shortest "${tempVideoPath}"`
  
  execSync(ffmpegCommand, { encoding: 'utf-8', stdio: 'inherit' })
  
  console.log(`✅ Video created successfully`)
  console.log()
  
  // Step 2: Upload to YouTube using youtubeuploader
  console.log(`📺 Uploading to YouTube...`)
  console.log(`   Title: ${title}`)
  console.log(`   Description: ${description}`)
  console.log()
  
  const youtubeUploaderPath = resolve(__dirname, '..', 'src', 'content', 'audio', 'youtube_related', 'youtubeuploader.exe')
  
  if (!existsSync(youtubeUploaderPath)) {
    console.error(`Error: youtubeuploader.exe not found at ${youtubeUploaderPath}`)
    console.error('Please make sure youtubeuploader is installed.')
    process.exit(1)
  }
  
  const uploadCommand = `"${youtubeUploaderPath}" \
    -filename="${tempVideoPath}" \
    -title="${title}" \
    -description="${description}" \
    -privacy=unlisted`
  
  const output = execSync(uploadCommand, { encoding: 'utf-8' })
  console.log(output)
  
  // Extract Video ID from output
  const videoIdMatch = output.match(/Video ID:\s*([a-zA-Z0-9_-]{11})/)
  
  if (!videoIdMatch) {
    console.error('Error: Could not extract Video ID from upload output')
    console.error(`Output: ${output}`)
    process.exit(1)
  }
  
  const videoId = videoIdMatch[1]
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  
  console.log()
  console.log(`✅ Upload successful!`)
  console.log(`   Video ID: ${videoId}`)
  console.log(`   URL: ${videoUrl}`)
  console.log()
  
  // Step 3: Clean up temporary video file
  try {
    const fs = await import('fs/promises')
    await fs.unlink(tempVideoPath)
    console.log(`🗑️  Deleted temporary video file`)
  } catch (err) {
    console.warn(`Warning: Could not delete temporary file: ${tempVideoPath}`)
  }
  
  // Step 4: Generate markdown file
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
  
  const mdContent = `---
title: ${title}
description: ${description}
youtubeId: ${videoId}
audioUrl: ${videoUrl}
date: ${dateStr}
cover: cover-images/defaultCover.jpg
---
`
  
  // Create directory if it doesn't exist
  const targetDir = join(__dirname, '..', 'src', 'content', 'audio', directoryName)
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
    console.log(`📁 Created directory: ${targetDir}`)
  }
  
  // Generate unique filename
  const timestamp = today.toISOString().split('T')[0].replace(/-/g, '')
  const mdFileName = `${timestamp}_${audioFileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`
  const mdFilePath = join(targetDir, mdFileName)
  
  // Write markdown file
  writeFileSync(mdFilePath, mdContent, 'utf-8')
  
  console.log()
  console.log(`📝 Created markdown file: ${mdFilePath}`)
  console.log()
  console.log(`Content:`)
  console.log(mdContent)
  console.log()
  console.log(`✨ Done! You can now use this audio in your site.`)
  
} catch (error) {
  console.error('❌ Error during upload process:')
  if (error instanceof Error) {
    console.error(error.message)
  }
  console.error()
  console.error('Make sure you have:')
  console.error('  1. ffmpeg installed and in PATH')
  console.error('  2. youtubeuploader.exe configured with credentials')
  process.exit(1)
}

