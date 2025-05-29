import { arrayBufferToBlobUrl } from '@/lib/imageUtils'
import { io, Socket } from 'socket.io-client'

type User = {
  id: string
  nickname: string
  isAdmin?: boolean
  avatarUrl?: string
}

type LinkPreview = {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

type Message = {
  id: string
  userId: string
  nickname: string
  content: string
  timestamp: number
  type?: 'text' | 'image'
  imageData?: ArrayBuffer
  fileName?: string
  fileSize?: number
  mimeType?: string
  isBroadcast?: boolean
  isSticky?: boolean
  linkPreviews?: LinkPreview[]
}

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect() {
    console.log('🔄 Attempting to connect to WebSocket server...')
    
    this.socket = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket?.id)
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason)
      console.log('   - Socket ID was:', this.socket?.id)
      
      if (reason === 'io server disconnect') {
        console.log('   - Server initiated disconnect')
      } else if (reason === 'io client disconnect') {
        console.log('   - Client initiated disconnect')
      } else {
        console.log('   - Unexpected disconnect, will attempt to reconnect')
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`)
      }
    })

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error)
    })

    return this.socket
  }

  disconnect() {
    console.log('🔄 Manually disconnecting from server...')
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinRoom(nickname: string) {
    console.log(`🔄 Attempting to join room with nickname: ${nickname}`)
    if (this.socket) {
      this.socket.emit('join', nickname)
    } else {
      console.error('❌ Cannot join room: Socket not connected')
    }
  }

  sendMessage(message: string) {
    console.log(`💬 Sending text message: ${message.substring(0, 50)}...`)
    if (this.socket) {
      this.socket.emit('send-message', message)
      console.log('✅ Text message sent successfully')
    } else {
      console.error('❌ Cannot send message: Socket not connected')
    }
  }

  async sendImage(imageData: ArrayBuffer, fileName: string, fileSize: number, mimeType: string, content?: string) {
    console.log(`📸 Preparing to send image:`)
    console.log(`   - File: ${fileName}`)
    console.log(`   - Size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
    console.log(`   - Type: ${mimeType}`)
    console.log(`   - Content: ${content || 'No description'}`)
    console.log(`   - ArrayBuffer length: ${imageData.byteLength}`)
    
    if (!this.socket) {
      console.error('❌ Cannot send image: Socket not connected')
      throw new Error('Socket not connected')
    }

    if (!imageData || imageData.byteLength === 0) {
      console.error('❌ Cannot send image: Invalid or empty ArrayBuffer')
      throw new Error('Invalid image data')
    }

    try {
      console.log('📡 Emitting send-image event...')
      
      this.socket.emit('send-image', {
        imageData,
        fileName,
        fileSize,
        mimeType,
        content
      })
      
      console.log('✅ Image data sent to server successfully')
      
      // 等待一小段时间确保数据发送完成
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error('❌ Error sending image:', error)
      throw error
    }
  }

  sendBroadcast(message: string) {
    console.log(`📢 Sending broadcast message: ${message}`)
    if (this.socket) {
      this.socket.emit('send-broadcast', message)
      console.log('✅ Broadcast message sent successfully')
    } else {
      console.error('❌ Cannot send broadcast: Socket not connected')
    }
  }

  kickUser(userId: string) {
    console.log(`👢 Kicking user: ${userId}`)
    if (this.socket) {
      this.socket.emit('kick-user', userId)
      console.log('✅ Kick user request sent successfully')
    } else {
      console.error('❌ Cannot kick user: Socket not connected')
    }
  }

  onJoinSuccess(callback: (data: { user: User }) => void) {
    if (this.socket) {
      this.socket.on('join-success', (data) => {
        console.log('✅ Join successful:', data.user.nickname)
        callback(data)
      })
    }
  }

  onNicknameTaken(callback: (data: { message: string }) => void) {
    if (this.socket) {
      this.socket.on('nickname-taken', (data) => {
        console.log('❌ Nickname taken:', data.message)
        callback(data)
      })
    }
  }

  onMessageHistory(callback: (messages: Message[]) => void) {
    if (this.socket) {
      this.socket.on('message-history', (messages) => {
        console.log(`📜 Received message history: ${messages.length} messages`)
        
        // 处理图片消息的 Blob URL 转换
        const processedMessages = messages.map((msg: Message) => {
          if (msg.type === 'image' && msg.imageData && msg.mimeType) {
            console.log(`🖼️ Processing image message: ${msg.fileName}`)
            try {
              const blobUrl = arrayBufferToBlobUrl(msg.imageData, msg.mimeType)
              return { ...msg, blobUrl }
            } catch (error) {
              console.error('❌ Error processing image in history:', error)
              return msg
            }
          }
          return msg
        })
        
        callback(processedMessages)
      })
    }
  }

  onNewMessage(callback: (message: Message) => void) {
    if (this.socket) {
      this.socket.on('new-message', (message) => {
        console.log(`📨 Received new message from ${message.nickname}:`)
        console.log(`   - Type: ${message.type || 'text'}`)
        
        if (message.type === 'image') {
          console.log(`   - Image: ${message.fileName} (${message.fileSize} bytes)`)
          
          // 处理图片消息的 Blob URL 转换
          if (message.imageData && message.mimeType) {
            try {
              const blobUrl = arrayBufferToBlobUrl(message.imageData, message.mimeType)
              console.log('✅ Image Blob URL created successfully')
              callback({ ...message, blobUrl })
              return
            } catch (error) {
              console.error('❌ Error creating Blob URL for image:', error)
            }
          } else {
            console.error('❌ Image message missing data or mimeType')
          }
        } else {
          console.log(`   - Content: ${message.content.substring(0, 50)}...`)
        }
        
        callback(message)
      })
    }
  }

  onStickyMessage(callback: (message: Message) => void) {
    if (this.socket) {
      this.socket.on('sticky-message', (message) => {
        console.log('📌 Received sticky message:', message.content)
        callback(message)
      })
    }
  }

  onUsersUpdate(callback: (users: User[]) => void) {
    if (this.socket) {
      this.socket.on('users-update', (users) => {
        console.log(`👥 Users update: ${users.length} users online`)
        callback(users)
      })
    }
  }

  onUserJoined(callback: (data: { nickname: string; isAdmin?: boolean }) => void) {
    if (this.socket) {
      this.socket.on('user-joined', (data) => {
        console.log(`👋 User joined: ${data.nickname} (${data.isAdmin ? 'Admin' : 'User'})`)
        callback(data)
      })
    }
  }

  onUserLeft(callback: (data: { nickname: string; isAdmin?: boolean }) => void) {
    if (this.socket) {
      this.socket.on('user-left', (data) => {
        console.log(`👋 User left: ${data.nickname} (${data.isAdmin ? 'Admin' : 'User'})`)
        callback(data)
      })
    }
  }

  onUserKicked(callback: (data: { nickname: string; adminNickname: string }) => void) {
    if (this.socket) {
      this.socket.on('user-kicked', (data) => {
        console.log(`👢 User kicked: ${data.nickname} by ${data.adminNickname}`)
        callback(data)
      })
    }
  }

  onKicked(callback: (data: { message: string }) => void) {
    if (this.socket) {
      this.socket.on('kicked', (data) => {
        console.log('👢 You were kicked:', data.message)
        callback(data)
      })
    }
  }

  onError(callback: (data: { message: string }) => void) {
    if (this.socket) {
      this.socket.on('error', (data) => {
        console.error('❌ Server error:', data.message)
        callback(data)
      })
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }
}

export const websocketService = new WebSocketService() 