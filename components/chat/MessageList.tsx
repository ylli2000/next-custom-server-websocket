'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Message, User } from '@/types/chat'
import { useEffect, useRef, useState } from 'react'
import ImageMessage from './ImageMessage'
import LinkPreview from './LinkPreview'

type Props = {
  messages: Message[]
  currentUser: User | null
  onlineUsers: User[]
}

export default function MessageList({ messages, currentUser, onlineUsers }: Props) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const prevMessagesLengthRef = useRef(messages.length)
  const lastMessageUserIdRef = useRef<string | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)

  const scrollToBottom = (smooth = false) => {
    if (scrollAreaRef.current) {
      console.log('🔄 MessageList: Scrolling to bottom (smooth) for user\'s own message')
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')

      console.log('🔄 MessageList: scrollContainer found? ' + !!scrollContainer + ' smoothScroll? ' + smooth)
      if (scrollContainer) {
        if (smooth) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          })
        } else {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
        // 滚动到底部后清除未读消息计数
        setUnreadMessages(0)
      }
    }
  }

  const handleUnreadButtonClick = () => {
    scrollToBottom(true)
  }

  useEffect(() => {
    const currentMessagesLength = messages.length
    const prevMessagesLength = prevMessagesLengthRef.current
    
    // 如果有新消息
    if (currentMessagesLength > prevMessagesLength) {
      const latestMessage = messages[messages.length - 1]
      const isOwnMessage = currentUser?.id === latestMessage?.userId
      
      console.log('📜 MessageList: New message detected')
      console.log(`   - Is own message: ${isOwnMessage}`)
      console.log(`   - Message from: ${latestMessage?.nickname}`)
      console.log(`   - Current user: ${currentUser?.nickname}`)
      
      if (isOwnMessage) {
        // 如果是用户自己发送的消息，强制平滑滚动到底部
        setTimeout(() => {
          scrollToBottom(true)
        }, 100) // 稍微延迟确保DOM更新完成
      } else {
        // 如果是其他用户的消息，检查用户是否在底部附近
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
          if (scrollContainer) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100 // 100px阈值
            
            console.log('📍 MessageList: Checking scroll position for other user\'s message')
            console.log(`   - Is near bottom: ${isNearBottom}`)
            
            if (isNearBottom) {
              // 如果用户在底部附近，平滑滚动到底部
              console.log('🔄 MessageList: User near bottom, scrolling to bottom')
              setTimeout(() => {
                scrollToBottom(true)
              }, 100)
            } else {
              // 如果用户在查看历史消息，增加未读消息计数
              console.log('📖 MessageList: User viewing history, incrementing unread count')
              setUnreadMessages(prev => prev + 1)
            }
          }
        }
      }
      
      // 更新上一次的消息用户ID
      lastMessageUserIdRef.current = latestMessage?.userId || null
    } else if (currentMessagesLength === 0) {
      // 如果消息被清空，重置状态
      lastMessageUserIdRef.current = null
      setUnreadMessages(0)
    }
    
    // 更新消息数量引用
    prevMessagesLengthRef.current = currentMessagesLength
  }, [messages, currentUser])

  // 初始加载时滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      console.log('🔄 MessageList: Initial scroll to bottom')
      scrollToBottom(false)
    }
  }, []) // 只在组件挂载时执行一次

  // 监听滚动事件，当用户手动滚动到底部时清除未读消息
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100 // 100px阈值
      
      if (isNearBottom && unreadMessages > 0) {
        console.log('🔄 MessageList: User manually scrolled to bottom, clearing unread messages')
        setUnreadMessages(0)
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [unreadMessages]) // 依赖unreadMessages确保能访问最新状态

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAvatarInitials = (nickname: string) => {
    return nickname.slice(0, 2).toUpperCase()
  }

  const getUserAvatar = (userId: string) => {
    // 从在线用户列表中查找头像URL
    const user = onlineUsers.find(u => u.id === userId)
    return user?.avatarUrl
  }

  const isUserAdmin = (userId: string) => {
    const user = onlineUsers.find(u => u.id === userId)
    return user?.isAdmin || false
  }

  return (
    <div className="relative flex-1 h-full">
      <ScrollArea className="flex-1 h-full" ref={scrollAreaRef}>
        <div className="space-y-4 p-4">
          {messages.map((message) => {
            const isOwnMessage = currentUser?.id === message.userId
            const avatarUrl = getUserAvatar(message.userId)
            const isAdmin = isUserAdmin(message.userId)
            const isBroadcast = message.isBroadcast
            
            // 广播消息的特殊显示
            if (isBroadcast) {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="max-w-[80%] bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                        📢 广播消息
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium text-center">
                      {message.content}
                    </p>
                  </div>
                </div>
              )
            }
            
            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage 
                    src={avatarUrl} 
                    alt={`${message.nickname}的头像`}
                    className="object-cover"
                  />
                  <AvatarFallback className={`text-xs ${
                    isAdmin
                      ? 'bg-yellow-500 text-white'
                      : isOwnMessage 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-500 text-white'
                  }`}>
                    {getAvatarInitials(message.nickname)}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex flex-col max-w-[70%] ${
                  isOwnMessage ? 'items-end' : 'items-start'
                }`}>
                  <div className={`flex items-center gap-2 mb-1 ${
                    isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                  }`}>
                    <span className={`text-sm font-medium ${
                      isAdmin ? 'text-yellow-700' : 'text-gray-700'
                    }`}>
                      {message.nickname}
                      {isAdmin && ' 👑'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  
                  {/* 消息内容 */}
                  {message.type === 'image' && message.imageData && message.imageData instanceof ArrayBuffer ? (
                    // 图片消息
                    <ImageMessage
                      imageData={message.imageData}
                      fileName={message.fileName || '图片'}
                      fileSize={message.fileSize || 0}
                      mimeType={message.mimeType}
                      content={message.content || undefined}
                    />
                  ) : message.type === 'image' && message.imageData ? (
                    // 如果imageData不是ArrayBuffer，显示错误信息
                    <div className="text-red-500 text-sm">图片数据格式错误</div>
                  ) : (
                    // 文本消息
                    <div className={`rounded-lg px-3 py-2 ${
                      isOwnMessage
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  )}

                  {/* 链接预览 */}
                  {message.linkPreviews && message.linkPreviews.length > 0 && (
                    <div className={`mt-2 ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                      {message.linkPreviews.map((preview, index) => (
                        <LinkPreview key={`${message.id}-${index}`} preview={preview} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>还没有消息，开始聊天吧！</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 未读消息悬浮按钮 */}
      {unreadMessages > 0 && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            onClick={handleUnreadButtonClick}
            className="bg-blue-900 hover:bg-blue-800 text-white shadow-lg rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105"
          >
            <span className="mr-2">↓</span>
            {unreadMessages === 1 ? '1个未读消息' : `${unreadMessages}个未读消息`}
          </Button>
        </div>
      )}
    </div>
  )
} 