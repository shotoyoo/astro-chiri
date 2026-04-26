import { getCollection, type CollectionEntry } from 'astro:content'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const POSTS_DIR = resolve(process.cwd(), 'src/content/posts')
const HISTORY_DIR = resolve(process.cwd(), 'src/content/history')
const CONCERT_CSV_PATH = resolve(HISTORY_DIR, 'concert.csv')
const REPERTOIRE_CSV_PATH = resolve(HISTORY_DIR, 'repertoire.csv')

const SPECIAL_DATE_SOURCES: Record<string, string> = {
  '演奏予定・演奏記録': CONCERT_CSV_PATH,
  '演奏予定・記録': CONCERT_CSV_PATH,
  'レパートリー': REPERTOIRE_CSV_PATH
}

async function getPostModifiedDate(postId: string): Promise<Date | null> {
  const candidates = [
    resolve(POSTS_DIR, postId),
    resolve(POSTS_DIR, `${postId}.md`),
    resolve(POSTS_DIR, `${postId}.mdx`)
  ]

  for (const filePath of candidates) {
    try {
      const fileStat = await stat(filePath)
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
        const modifiedDate = specialDateSource
          ? await getPostModifiedDate(specialDateSource)
          : await getPostModifiedDate(post.id)

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
