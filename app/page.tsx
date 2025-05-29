'use client'

import ChatRoom from '@/components/chat/ChatRoom'
import NicknameForm from '@/components/chat/NicknameForm'
import SocketService from '@/services/socket'
import type { ChatState, Message } from '@/types/chat'
import { useEffect, useState } from 'react'

export default function Home() {
  const [chatState, setChatState] = useState<ChatState>({
    user: null,
    messages: [],
    onlineUsers: [],
    isConnected: false,
    stickyMessage: null
  })
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const socketService = SocketService.getInstance()

  // 处理图片消息，验证 ArrayBuffer 数据
  const processImageMessage = (message: Message): Message => {
    if (message.type === 'image' && message.imageData && typeof message.imageData !== 'string') {
      console.log(`🖼️ HomePage: Processing image message from ${message.nickname}`)
      console.log(`   - File: ${message.fileName || 'Unknown'}`)
      console.log(`   - Reported size: ${message.fileSize || 0} bytes`)
      console.log(`   - MIME type: ${message.mimeType || 'Unknown'}`)
      
      try {
        // 验证接收到的数据
        const imageData = message.imageData as ArrayBuffer
        const reportedSize = message.fileSize || 0
        
        console.log(`🔍 HomePage: Validating received image data...`)
        console.log(`   - Data type: ${typeof imageData}`)
        console.log(`   - Is ArrayBuffer: ${imageData instanceof ArrayBuffer}`)
        console.log(`   - Actual size: ${imageData.byteLength} bytes`)
        console.log(`   - Size match: ${reportedSize === imageData.byteLength}`)
        
        if (!imageData || !(imageData instanceof ArrayBuffer)) {
          console.error(`❌ HomePage: Invalid image data type:`, typeof imageData)
          console.error(`   - Expected: ArrayBuffer`)
          console.error(`   - Received: ${typeof imageData}`)
          return message
        }
        
        if (imageData.byteLength === 0) {
          console.error(`❌ HomePage: Empty ArrayBuffer received`)
          return message
        }
        
        if (imageData.byteLength !== reportedSize) {
          console.error(`❌ HomePage: Size mismatch!`)
          console.error(`   - Reported: ${reportedSize} bytes`)
          console.error(`   - Actual: ${imageData.byteLength} bytes`)
          console.error(`   - Difference: ${Math.abs(reportedSize - imageData.byteLength)} bytes`)
        }
        
        console.log(`✅ HomePage: Image data validation passed`)
        console.log(`🔄 HomePage: Keeping ArrayBuffer for ImageMessage component to handle`)
        
        // 保持 imageData 为 ArrayBuffer，让 ImageMessage 组件处理 Blob URL 创建
        return {
          ...message,
          imageData: imageData // 保持 ArrayBuffer 格式
        }
      } catch (error) {
        console.error(`❌ HomePage: Error processing image message:`, error)
        console.error(`   - Error type:`, typeof error)
        console.error(`   - Error message:`, error instanceof Error ? error.message : 'Unknown error')
        console.error(`   - Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
        console.error(`   - Message data:`, {
          fileName: message.fileName,
          fileSize: message.fileSize,
          mimeType: message.mimeType,
          dataType: typeof message.imageData
        })
        return message
      }
    }
    return message
  }

  useEffect(() => {
    // 连接WebSocket
    socketService.connect()

    // 设置事件监听器
    socketService.onConnect(() => {
      setChatState(prev => ({ ...prev, isConnected: true }))
    })

    socketService.onDisconnect(() => {
      setChatState(prev => ({ ...prev, isConnected: false }))
    })

    socketService.onJoinSuccess(({ user }) => {
      setChatState(prev => ({ ...prev, user }))
      setIsLoading(false)
      setError('')
    })

    socketService.onNicknameTaken(({ message }) => {
      setError(message)
      setIsLoading(false)
    })

    socketService.onMessageHistory((messages) => {
      // 处理历史消息中的图片数据验证
      const processedMessages = messages.map(processImageMessage)
      setChatState(prev => ({ ...prev, messages: processedMessages }))
    })

    socketService.onNewMessage((message) => {
      // 处理新消息中的图片数据验证
      const processedMessage = processImageMessage(message)
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, processedMessage]
      }))
    })

    socketService.onStickyMessage((message) => {
      setChatState(prev => ({ ...prev, stickyMessage: message }))
    })

    socketService.onUsersUpdate((users) => {
      setChatState(prev => ({ ...prev, onlineUsers: users }))
    })

    socketService.onUserJoined(({ nickname, isAdmin }) => {
      console.log(`${nickname}${isAdmin ? ' (管理员)' : ''} 加入了聊天室`)
    })

    socketService.onUserLeft(({ nickname, isAdmin }) => {
      console.log(`${nickname}${isAdmin ? ' (管理员)' : ''} 离开了聊天室`)
    })

    socketService.onUserKicked(({ nickname, adminNickname }) => {
      console.log(`${nickname} 被管理员 ${adminNickname} 踢出了聊天室`)
    })

    socketService.onKicked(({ message }) => {
      alert(message)
      // 重置状态，返回登录界面
      setChatState({
        user: null,
        messages: [],
        onlineUsers: [],
        isConnected: false,
        stickyMessage: null
      })
    })

    // 监听服务器错误
    socketService.onError(({ message }) => {
      console.error('❌ HomePage: Server error received:', message)
      alert(`服务器错误: ${message}`)
    })

    // 清理函数
    return () => {
      socketService.removeAllListeners()
      socketService.disconnect()
    }
  }, [])

  const handleJoinChat = (nickname: string) => {
    setIsLoading(true)
    setError('')
    socketService.joinChat(nickname)
  }

  const handleSendMessage = (content: string) => {
    socketService.sendMessage(content)
  }

  const handleSendImage = async (imageData: ArrayBuffer, fileName: string, fileSize: number, mimeType: string, content?: string) => {
    console.log('📸 HomePage: Handling image send request...')
    console.log(`   - File: ${fileName}`)
    console.log(`   - Size: ${fileSize} bytes`)
    console.log(`   - Type: ${mimeType}`)
    console.log(`   - Content: ${content || 'No description'}`)
    
    try {
      console.log('🔄 HomePage: Calling SocketService.sendImage...')
      socketService.sendImage(imageData, fileName, fileSize, mimeType, content)
      console.log('✅ HomePage: Image sent successfully via SocketService')
    } catch (error) {
      console.error('❌ HomePage: Error sending image:', error)
      console.error('   - Error type:', typeof error)
      console.error('   - Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('   - Socket connected:', socketService.isConnected())
      console.error('   - Socket ID:', socketService.getSocketId())
      
      // 显示用户友好的错误信息
      const errorMessage = error instanceof Error ? error.message : '发送图片失败'
      alert(`发送图片失败: ${errorMessage}`)
      
      // 重新抛出错误让上层组件处理
      throw error
    }
  }

  const handleSendBroadcast = (content: string) => {
    socketService.sendBroadcast(content)
  }

  const handleClearBroadcast = () => {
    socketService.clearBroadcast()
  }

  const handleKickUser = (userId: string) => {
    socketService.kickUser(userId)
  }

  // 如果用户还没有加入聊天室，显示昵称输入表单
  if (!chatState.user) {
    return (
      <NicknameForm
        onSubmit={handleJoinChat}
        error={error}
        isLoading={isLoading}
      />
    )
  }

  // 显示聊天室
  return (
    <ChatRoom
      user={chatState.user}
      messages={chatState.messages}
      onlineUsers={chatState.onlineUsers}
      stickyMessage={chatState.stickyMessage}
      onSendMessage={handleSendMessage}
      onSendImage={handleSendImage}
      onSendBroadcast={handleSendBroadcast}
      onClearBroadcast={handleClearBroadcast}
      onKickUser={handleKickUser}
      isConnected={chatState.isConnected}
    />
  )
}
