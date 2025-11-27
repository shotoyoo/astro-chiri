import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'

/**
 * Get a random audio entry from the audio collection
 * @returns A random audio entry or null if no audio files exist
 */
export async function getRandomAudio(): Promise<CollectionEntry<'audio'> | null> {
  const audioFiles = await getCollection('audio')
  
  if (audioFiles.length === 0) {
    return null
  }
  
  const randomIndex = Math.floor(Math.random() * audioFiles.length)
  return audioFiles[randomIndex]
}

/**
 * Parse duration string (mm:ss or hh:mm:ss) to seconds
 * @param durationStr Duration string in format "mm:ss" or "hh:mm:ss"
 * @returns Duration in seconds
 */
export function parseDuration(durationStr: string): number {
  const parts = durationStr.split(':').map(Number)
  
  if (parts.length === 2) {
    // mm:ss format
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    // hh:mm:ss format
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  
  return 0
}
