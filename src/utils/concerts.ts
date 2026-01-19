import { readFileSync } from 'node:fs'
import Papa from 'papaparse'

export interface Concert {
  ID: string
  year: string
  month: string
  date: string
  name: string
  venue: string
  songs: string
  url: string
}

interface RepertoireItem {
  ID: string
  title: string
  composer: string
  lyricist: string
}

// Read and parse concert CSV file
const concertCsvPath = 'src/content/history/concert.csv'
const concertCsvContent = readFileSync(concertCsvPath, 'utf-8')
const { data: parsedData } = Papa.parse(concertCsvContent, {
  header: true,
  comments: '#',
  skipEmptyLines: true,
}) as { data: Concert[] }

// Read and parse repertoire CSV file to build song mapping
const repertoireCsvPath = 'src/content/history/repertoire.csv'
const repertoireCsvContent = readFileSync(repertoireCsvPath, 'utf-8')
const { data: repertoireData } = Papa.parse(repertoireCsvContent, {
  header: true,
  comments: '#',
  skipEmptyLines: true,
}) as { data: RepertoireItem[] }

// Build song mapping from repertoire data
const songMap: Record<string, string> = {}
repertoireData.forEach(item => {
  if (item.ID && item.title && item.composer) {
    songMap[item.ID] = `${item.composer} - ${item.title}`
  }
})

// Group by year (descending order)
export const groupedByYear = parsedData.reduce((acc, concert) => {
  const year = concert.year
  if (!acc[year]) {
    acc[year] = []
  }
  acc[year].push(concert)
  return acc
}, {} as Record<string, Concert[]>)

// Sort years in descending order
export const sortedYears = Object.keys(groupedByYear).sort((a, b) => 
  parseInt(b) - parseInt(a)
)

// Sort concerts within each year by date (descending)
Object.keys(groupedByYear).forEach(year => {
  groupedByYear[year].sort((a, b) => {
    const dateA = parseInt(a.month) * 100 + parseInt(a.date)
    const dateB = parseInt(b.month) * 100 + parseInt(b.date)
    return dateB - dateA
  })
})

// Helper function to format song codes into readable format
export function formatSongs(songCodes: string): string[] {
  if (!songCodes) return []
  
  return songCodes.split(',').map(code => songMap[code.trim()] || code.trim())
}
