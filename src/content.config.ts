import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const posts = defineCollection({
  // Load Markdown and MDX files in the `src/content/posts/` directory.
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  // Type-check frontmatter using a schema
  schema: () =>
    z.object({
      title: z.string(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      image: z.string().optional()
    })
})

const about = defineCollection({
  // Load Markdown files in the `src/content/about/` directory.
  loader: glob({ base: './src/content/about', pattern: '**/*.md' }),
  // Type-check frontmatter using a schema
  schema: z.object({})
})

const audio = defineCollection({
  // Load all Markdown files in `src/content/audio/` directory including subdirectories.
  loader: glob({ base: './src/content/audio', pattern: '**/*.md' }),
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    audioUrl: z.string(), // YouTube URL or local audio file path
    youtubeId: z.string().optional(), // YouTube video ID (e.g., "dQw4w9WgXcQ")
    date: z.string(),
    size: z.number().optional(),
    cover: z.string().optional()
  })
})

const history = defineCollection({
  // Load all Markdown files in `src/content/history/` directory.
  loader: glob({ base: './src/content/history', pattern: '**/*.md' }),
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    composer: z.string(),
    lyricist: z.string()
  })
})

export const collections = { posts, about, audio, history }
