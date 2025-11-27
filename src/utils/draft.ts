import { getCollection, type CollectionEntry } from 'astro:content'

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
  
  // 「当団について」の投稿の日付を本日+1日に動的に設定
  const processedPosts = posts.map((post: CollectionEntry<'posts'>) => {
    if (post.data.title === '当団について') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return {
        ...post,
        data: {
          ...post.data,
          pubDate: tomorrow
        }
      }
    }
    return post
  })
  
  return processedPosts.sort(
    (a: CollectionEntry<'posts'>, b: CollectionEntry<'posts'>) =>
      b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  )
}
