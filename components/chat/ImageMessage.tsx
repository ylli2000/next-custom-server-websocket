'use client'

import { arrayBufferToBlobUrl, formatFileSize } from '@/lib/imageUtils'
import { Download, Eye } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

type Props = {
  imageData: ArrayBuffer
  fileName: string
  fileSize: number
  mimeType?: string
  content?: string // 图片说明文字
}

export default function ImageMessage({ imageData, fileName, fileSize, mimeType, content }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showFullSize, setShowFullSize] = useState(false)

  console.log(`🖼️ ImageMessage: Rendering image component`)
  console.log(`   - File: ${fileName}`)
  console.log(`   - Size: ${fileSize} bytes (${formatFileSize(fileSize)})`)
  console.log(`   - Content: ${content || 'No description'}`)
  console.log(`   - Image data: ${imageData.byteLength} bytes`)

  useEffect(() => {
    console.log(`🔄 ImageMessage: Setting up cleanup for ${fileName}`)
    
    const createImageUrl = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        console.log(`🖼️ ImageMessage: Creating Blob URL for ${fileName}, data size: ${imageData.byteLength} bytes`)
        
        // 从文件名推断MIME类型，如果没有提供的话
        const inferredMimeType = mimeType || getMimeTypeFromFileName(fileName)
        console.log(`🔍 ImageMessage: Using MIME type: ${inferredMimeType}`)
        
        const url = arrayBufferToBlobUrl(imageData, inferredMimeType)
        console.log(`✅ ImageMessage: Blob URL created successfully for ${fileName}: ${url.substring(0, 50)}...`)
        
        setImageUrl(url)
        setIsLoading(false)
      } catch (err) {
        console.error(`❌ ImageMessage: Failed to create Blob URL for ${fileName}:`, err)
        setError('图片加载失败')
        setIsLoading(false)
      }
    }

    createImageUrl()

    // Cleanup function
    return () => {
      if (imageUrl) {
        console.log(`🗑️ ImageMessage: Cleaning up Blob URL for ${fileName}`)
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageData])

  const handleImageLoad = () => {
    console.log(`✅ ImageMessage: Image loaded successfully for ${fileName}`)
  }

  const handleImageError = () => {
    console.error(`❌ ImageMessage: Image failed to load for ${fileName}`)
    console.log(`🔍 ImageMessage: Checking Blob URL validity for ${fileName}:`, imageUrl)
    
    // 检查 Blob URL 是否仍然有效
    if (imageUrl) {
      fetch(imageUrl)
        .then(response => {
          console.log(`🔍 ImageMessage: Blob URL fetch response for ${fileName}:`, response.status, response.statusText)
        })
        .catch(err => {
          console.error(`🔍 ImageMessage: Blob URL fetch failed for ${fileName}:`, err)
        })
    }
    
    setError('图片加载失败')
  }

  const handleDownload = () => {
    if (!imageUrl) return
    
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleViewFullSize = () => {
    setShowFullSize(true)
  }

  const closeFullSize = () => {
    setShowFullSize(false)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-48 h-32 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-sm text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-sm">
        {/* 图片说明文字 */}
        {content && (
          <p className="text-sm mb-2 break-words">{content}</p>
        )}
        
        {/* 图片容器 */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* 只有当 imageUrl 存在且不为空时才渲染 img 标签 */}
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={fileName}
              width={400}
              height={256}
              className="w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={handleViewFullSize}
              unoptimized // 因为是blob URL
            />
          )}
          
          {/* 悬停操作按钮 - 只有当图片加载完成时才显示 */}
          {imageUrl && !isLoading && (
            <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                <button
                  onClick={handleViewFullSize}
                  className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  title="查看大图"
                >
                  <Eye className="w-3 h-3" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  title="下载图片"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* 文件信息 */}
        <div className="mt-1 text-xs text-gray-500">
          <span>{fileName}</span>
          <span className="mx-1">•</span>
          <span>{formatFileSize(fileSize)}</span>
        </div>
      </div>

      {/* 全屏查看模态框 - 只有当 imageUrl 存在时才显示 */}
      {showFullSize && imageUrl && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeFullSize}
        >
          <div className="relative max-w-full max-h-full">
            <Image
              src={imageUrl}
              alt={fileName}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
              unoptimized // 因为是blob URL
            />
            <button
              onClick={closeFullSize}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// 从文件名推断MIME类型的辅助函数
function getMimeTypeFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/jpeg' // 默认值
  }
} 