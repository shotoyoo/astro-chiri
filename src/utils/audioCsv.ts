import { readFileSync } from 'node:fs'
import Papa from 'papaparse'

export type AudioDefinition = {
  id: string
  title: string
  youtubeId: string
  date: string
}

export type AudioCsvEntry = AudioDefinition & {
  description: string
  audioUrl: string
}

type AudioSelection = {
  id: string
  description: string
}

const AUDIO_PATH = 'src/content/audio/audio.csv'
const DATASET_PATHS: Record<string, string> = {
  pickup: 'src/content/audio/pickup.csv',
  recently: 'src/content/audio/recently.csv'
}

function parseCsv<T>(path: string): T[] {
  try {
    const csv = readFileSync(path, 'utf-8')
    const { data } = Papa.parse(csv, {
      header: true,
      comments: '#',
      skipEmptyLines: true,
      transform: (value) => (typeof value === 'string' ? value.trim() : value)
    }) as { data: T[] }

    return data
  } catch (error) {
    console.error('Failed to parse audio CSV', path, error)
    return []
  }
}

const audioDefinitions = parseCsv<AudioDefinition>(AUDIO_PATH).filter(
  (audio) => audio.id && audio.title && audio.youtubeId && audio.date
)

const audioById = new Map(audioDefinitions.map((audio) => [audio.id, audio]))

export function getAudioById(id: string): AudioDefinition | undefined {
  return audioById.get(id)
}

export function getAudioCsv(dataset: string): AudioCsvEntry[] {
  const path = DATASET_PATHS[dataset]
  if (!path) return []

  return parseCsv<AudioSelection>(path).flatMap((selection) => {
    const audio = audioById.get(selection.id)
    if (!audio) {
      console.warn(`Audio ID not found in ${AUDIO_PATH}: ${selection.id}`)
      return []
    }

    return [
      {
        ...audio,
        description: selection.description ?? '',
        audioUrl: `https://youtu.be/${audio.youtubeId}`
      }
    ]
  })
}
