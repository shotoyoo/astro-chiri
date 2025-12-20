import { readFileSync } from 'node:fs'
import Papa from 'papaparse'

export type AudioCsvEntry = {
  id: string
  title: string
  description: string
  audioUrl: string
  youtubeId?: string
  date: string
}

const DATASET_PATHS: Record<string, string> = {
  pickup: 'src/content/audio/pickup.csv',
  recently: 'src/content/audio/recently.csv',
}

function safeParse(path: string): AudioCsvEntry[] {
  try {
    const csv = readFileSync(path, 'utf-8')
    const { data } = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
    }) as { data: AudioCsvEntry[] }

    return data
      .filter((row) => row.id && row.title && row.audioUrl)
  } catch (e) {
    console.error('Failed to parse audio CSV', path, e)
    return []
  }
}

export function getAudioCsv(dataset: string): AudioCsvEntry[] {
  const path = DATASET_PATHS[dataset]
  if (!path) return []
  return safeParse(path)
}
