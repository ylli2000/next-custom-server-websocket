'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { LinkPreview as LinkPreviewType } from '@/types/chat'
import { ExternalLink, Globe } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

type Props = {
  preview: LinkPreviewType
}

export default function LinkPreview({ preview }: Props) {
  const [imageError, setImageError] = useState(false)

  const handleClick = () => {
    window.open(preview.url, '_blank', 'noopener,noreferrer')
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  return (
    <Card 
      className="mt-2 max-w-md cursor-pointer hover:bg-blue-50 bg-blue-100 transition-colors"
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* 图片预览 */}
          {preview.image && !imageError && (
            <div className="flex-shrink-0">
              <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100">
                <Image
                  src={preview.image}
                  alt={preview.title || 'Link preview'}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* 内容区域 */}
          <div className="flex-1 min-w-0">
            {/* 标题 */}
            {preview.title && (
              <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                {preview.title}
              </h4>
            )}

            {/* 描述 */}
            {preview.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {preview.description}
              </p>
            )}

            {/* 网站信息 */}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {preview.favicon ? (
                <Image
                  src={preview.favicon}
                  alt=""
                  width={12}
                  height={12}
                  className="rounded-sm"
                  unoptimized
                />
              ) : (
                <Globe className="w-3 h-3" />
              )}
              <span className="truncate">
                {preview.siteName || getDomain(preview.url)}
              </span>
              <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 