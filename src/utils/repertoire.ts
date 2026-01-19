import { readFileSync } from 'node:fs'
import Papa from 'papaparse'

// Read and parse CSV file
const csvFilePath = 'src/content/history/repertoire.csv'
const csvContent = readFileSync(csvFilePath, 'utf-8')
const { data: parsedData } = Papa.parse(csvContent, {
  header: true,
  comments: '#',
  skipEmptyLines: true,
}) as { data: Array<{ title: string; composer: string; lyricist: string }> }

// Group by composer
export const groupedByComposer = parsedData.reduce((acc, item) => {
  const composer = item.composer
  if (!acc[composer]) {
    acc[composer] = []
  }
  acc[composer].push(item)
  return acc
}, {} as Record<string, typeof parsedData>)

export const sortedComposers = Object.keys(groupedByComposer).sort((a, b) => 
  a.localeCompare(b, 'ja')
)
