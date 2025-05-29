'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatFileSize, validateAndProcessImage } from '@/lib/imageUtils'
import { ImageIcon, X } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'

type Props = {
  onSendMessage: (message: string) => void
  onSendImage: (imageData: ArrayBuffer, fileName: string, fileSize: number, mimeType: string, content?: string) => void
  disabled?: boolean
}

export default function MessageInput({ onSendMessage, onSendImage, disabled }: Props) {
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (disabled || isUploading) {
      console.log('❌ Submit blocked: disabled or uploading')
      return
    }

    // 发送图片
    if (selectedImage) {
      console.log('📸 Starting image upload process...')
      setIsUploading(true)
      try {
        console.log('🔄 Validating and processing image...')
        const result = await validateAndProcessImage(selectedImage)
        
        if (result.isValid && result.arrayBuffer) {
          console.log('✅ Image validation successful, sending to server...')
          console.log(`   - File: ${selectedImage.name}`)
          console.log(`   - Size: ${selectedImage.size} bytes`)
          console.log(`   - Type: ${selectedImage.type}`)
          console.log(`   - ArrayBuffer size: ${result.arrayBuffer.byteLength} bytes`)
          console.log(`   - Content: ${message.trim() || 'No description'}`)
          
          await onSendImage(
            result.arrayBuffer,
            selectedImage.name,
            selectedImage.size,
            selectedImage.type,
            message.trim() || undefined // 传递图片说明文字
          )
          
          console.log('✅ Image sent successfully, clearing selection...')
          clearImageSelection()
          setMessage('') // 清空消息输入框
        } else {
          console.error('❌ Image validation failed:', result.error)
          alert(result.error || '图片处理失败')
        }
      } catch (error) {
        console.error('❌ Error in image upload process:', error)
        console.error('   - Error type:', typeof error)
        console.error('   - Error message:', error instanceof Error ? error.message : 'Unknown error')
        console.error('   - Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        alert('发送图片失败')
      } finally {
        console.log('🔄 Image upload process completed, resetting upload state...')
        setIsUploading(false)
      }
    }
    // 发送文本消息
    else if (message.trim()) {
      console.log('💬 Sending text message...')
      onSendMessage(message.trim())
      setMessage('')
      console.log('✅ Text message sent successfully')
    } else {
      console.log('❌ No message content to send')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 基本验证
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB')
      return
    }

    setSelectedImage(file)
    
    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const clearImageSelection = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const canSend = !disabled && !isUploading && (message.trim() || selectedImage)

  return (
    <div className="w-full message-input border-t bg-white p-4">
      {/* 图片预览 */}
      {imagePreview && selectedImage && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="relative">
              <Image
                src={imagePreview}
                alt="预览"
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded-md"
                unoptimized // 因为是本地blob URL
              />
              <button
                type="button"
                onClick={clearImageSelection}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                disabled={isUploading}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedImage.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedImage.size)}
              </p>
              {isUploading && (
                <p className="text-xs text-blue-600 mt-1">正在发送...</p>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            type="text"
            placeholder={selectedImage ? "添加图片说明..." : "输入消息..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || isUploading}
            className="flex-1"
            maxLength={500}
          />
          
          {/* 图片上传按钮 */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading || !!selectedImage}
            className="flex-shrink-0"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          
          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={!canSend}
          className="px-6"
        >
          {isUploading ? '发送中...' : '发送'}
        </Button>
      </form>
    </div>
  )
} 