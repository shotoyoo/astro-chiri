import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import { getAudioById, type AudioDefinition } from '@/utils/audioCsv'

export type RepertoireItem = {
  ID: string
  title: string
  composer: string
  lyricist: string
  audioId?: string
  audio?: AudioDefinition
}

// Read and parse CSV file
const csvFilePath = 'src/content/history/repertoire.csv'
const csvContent = readFileSync(csvFilePath, 'utf-8')
const { data: parsedData } = Papa.parse(csvContent, {
  header: true,
  comments: '#',
  skipEmptyLines: true
}) as { data: RepertoireItem[] }

const repertoireData = parsedData.map((item) => ({
  ...item,
  audio: item.audioId ? getAudioById(item.audioId) : undefined
}))

// Group by composer
export const groupedByComposer = repertoireData.reduce(
  (acc, item) => {
    const composer = item.composer
    if (!acc[composer]) {
      acc[composer] = []
    }
    acc[composer].push(item)
    return acc
  },
  {} as Record<string, typeof repertoireData>
)

export const sortedComposers = Object.keys(groupedByComposer).sort((a, b) =>
  a.localeCompare(b, 'ja')
)
