import { getCollection, type CollectionEntry } from 'astro:content'
import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const POSTS_DIR = 'src/content/posts'
const CONCERT_CSV_PATH = 'src/content/history/concert.csv'
const REPERTOIRE_CSV_PATH = 'src/content/history/repertoire.csv'

const SPECIAL_DATE_SOURCES: Record<string, string> = {
  '演奏予定・演奏記録': CONCERT_CSV_PATH,
  '演奏予定・記録': CONCERT_CSV_PATH,
  'レパートリー': REPERTOIRE_CSV_PATH
}

function getPostPathCandidates(postId: string): string[] {
  return [
    `${POSTS_DIR}/${postId}`,
    `${POSTS_DIR}/${postId}.md`,
    `${POSTS_DIR}/${postId}.mdx`
  ]
}

async function getGitLastCommitDate(filePath: string): Promise<Date | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '-1', '--format=%cI', '--', filePath],
      { cwd: process.cwd() }
    )

    const rawDate = stdout.trim()
    if (!rawDate) {
      return null
    }

    const parsedDate = new Date(rawDate)
    return Number.isNaN(parsedDate.valueOf()) ? null : parsedDate
  } catch {
    return null
  }
}

async function getPostModifiedDate(candidates: string[]): Promise<Date | null> {
  for (const filePath of candidates) {
    const gitDate = await getGitLastCommitDate(filePath)
    if (gitDate) {
      return gitDate
    }
  }

  for (const filePath of candidates) {
    try {
      const fileStat = await stat(resolve(process.cwd(), filePath))
      return fileStat.mtime
    } catch {
      // Try the next candidate path.
    }
  }

  return null
}

/**
 * Get all posts, filtering out posts whose filenames start with _
 */
export async function getFilteredPosts() {
  const posts = await getCollection('posts')
  return posts.filter((post: CollectionEntry<'posts'>) => !post.id.startsWith('_'))
}

/**
 * Get all posts sorted by publication date, filtering out posts whose filenames start with _
 */
export async function getSortedFilteredPosts() {
  const posts = await getFilteredPosts()
  
  const processedPosts = await Promise.all(
    posts.map(async (post: CollectionEntry<'posts'>) => {
      let calculatedPubDate = post.data.pubDate

      // Keep this one pinned to the top.
      if (post.data.title === '当団について') {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        calculatedPubDate = tomorrow
      } else {
        const specialDateSource = SPECIAL_DATE_SOURCES[post.data.title]
        const dateCandidates = specialDateSource ? [specialDateSource] : getPostPathCandidates(post.id)
        const modifiedDate = await getPostModifiedDate(dateCandidates)

        if (modifiedDate) {
          calculatedPubDate = modifiedDate
        }
      }

      return {
        ...post,
        data: {
          ...post.data,
          pubDate: calculatedPubDate
        }
      }
    })
  )
  
  return processedPosts.sort(
    (a: CollectionEntry<'posts'>, b: CollectionEntry<'posts'>) =>
      b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  )
}
