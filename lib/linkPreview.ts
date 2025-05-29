import type { LinkPreview } from '@/types/chat'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

// URL 正则表达式
const URL_REGEX = /(https?:\/\/[^\s]+)/g

/**
 * 从文本中提取所有URL
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX)
  return matches || []
}

/**
 * 获取网站的 Open Graph 和 meta 标签信息
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    // 设置超时控制器
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatBot/1.0; +http://localhost:3000)'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // 提取 Open Graph 标签
    const ogTitle = $('meta[property="og:title"]').attr('content')
    const ogDescription = $('meta[property="og:description"]').attr('content')
    const ogImage = $('meta[property="og:image"]').attr('content')
    const ogSiteName = $('meta[property="og:site_name"]').attr('content')

    // 提取标准 meta 标签作为备选
    const title = ogTitle || $('title').text() || $('meta[name="title"]').attr('content')
    const description = ogDescription || 
                       $('meta[name="description"]').attr('content') ||
                       $('meta[property="description"]').attr('content')

    // 提取 favicon
    let favicon = $('link[rel="icon"]').attr('href') ||
                  $('link[rel="shortcut icon"]').attr('href') ||
                  $('link[rel="apple-touch-icon"]').attr('href')

    // 处理相对路径的 favicon
    if (favicon && !favicon.startsWith('http')) {
      const urlObj = new URL(url)
      if (favicon.startsWith('/')) {
        favicon = `${urlObj.protocol}//${urlObj.host}${favicon}`
      } else {
        favicon = `${urlObj.protocol}//${urlObj.host}/${favicon}`
      }
    }

    // 处理相对路径的图片
    let image = ogImage
    if (image && !image.startsWith('http')) {
      const urlObj = new URL(url)
      if (image.startsWith('/')) {
        image = `${urlObj.protocol}//${urlObj.host}${image}`
      } else {
        image = `${urlObj.protocol}//${urlObj.host}/${image}`
      }
    }

    // 如果没有找到任何有用信息，返回 null
    if (!title && !description && !image) {
      return null
    }

    return {
      url,
      title: title?.trim(),
      description: description?.trim(),
      image,
      siteName: ogSiteName?.trim(),
      favicon
    }
  } catch (error) {
    console.error('Error fetching link preview:', error)
    return null
  }
}

/**
 * 批量获取多个URL的预览信息
 */
export async function fetchMultipleLinkPreviews(urls: string[]): Promise<LinkPreview[]> {
  const previews = await Promise.allSettled(
    urls.map(url => fetchLinkPreview(url))
  )

  return previews
    .map((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        return result.value
      }
      // 如果获取失败，返回基本信息
      return {
        url: urls[index],
        title: urls[index]
      }
    })
    .filter(Boolean)
} 