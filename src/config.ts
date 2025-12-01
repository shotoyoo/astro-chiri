import type { ThemeConfig } from './types'

export const themeConfig: ThemeConfig = {
  // SITE INFO ///////////////////////////////////////////////////////////////////////////////////////////
  site: {
    website: 'https://yamanami-choir-club.netlify.app/', // Site domain
    title: 'やまなみコーラスクラブのHP(工事中)', // Site title
    author: 'yamanami choir club', // Author name
    description: '東京を中心に活動する合唱団「やまなみコーラスクラブ」の公式サイト(永遠に工事中)です。', // Site description
    language: 'ja' // Default language
  },

  // GENERAL SETTINGS ////////////////////////////////////////////////////////////////////////////////////
  general: {
    contentWidth: '35rem', // Content area width
    centeredLayout: true, // Use centered layout (false for left-aligned)
    themeToggle: false, // Show theme toggle button (uses system theme by default)
    postListDottedDivider: false, // Show dotted divider in post list
    footer: true, // Show footer
    fadeAnimation: true // Enable fade animations
  },

  // DATE SETTINGS ///////////////////////////////////////////////////////////////////////////////////////
  date: {
    dateFormat: 'YYYY-MM-DD', // Date format: YYYY-MM-DD, MM-DD-YYYY, DD-MM-YYYY, MONTH DAY YYYY, DAY MONTH YYYY
    dateSeparator: '.', // Date separator: . - / (except for MONTH DAY YYYY and DAY MONTH YYYY)
    dateOnRight: true // Date position in post list (true for right, false for left)
  },

  // POST SETTINGS ///////////////////////////////////////////////////////////////////////////////////////
  post: {
    readingTime: false, // Show reading time in posts
    toc: true, // Show table of contents (when there is enough page width)
    imageViewer: true, // Enable image viewer
    copyCode: true, // Enable copy button in code blocks
    linkCard: true // Enable link card
  }
}
