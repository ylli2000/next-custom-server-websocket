'use client'

import type { Message, User } from '@/types/chat'
import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  private static instance: SocketService

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  connect(): Socket {
    console.log('🔄 SocketService: Attempting to connect...')
    
    if (!this.socket) {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000'
      console.log(`🔄 SocketService: Connecting to ${serverUrl}`)
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        upgrade: true,
        rememberUpgrade: true,
        withCredentials: true
      })

      this.socket.on('connect', () => {
        console.log('✅ SocketService: Connected successfully, socket ID:', this.socket?.id)
        console.log('   - Transport:', this.socket?.io.engine.transport.name)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('❌ SocketService: Disconnected, reason:', reason)
        console.log('   - Socket ID was:', this.socket?.id)
        
        if (reason === 'transport error') {
          console.error('   - 传输错误：可能是网络问题或数据过大')
        } else if (reason === 'transport close') {
          console.error('   - 传输关闭：连接被意外关闭')
        } else if (reason === 'ping timeout') {
          console.error('   - Ping 超时：网络延迟过高')
        }
      })

      this.socket.on('connect_error', (error) => {
        console.error('❌ SocketService: Connection error:', error)
        console.error('   - Error message:', error.message)
        console.error('   - Error stack:', error.stack)
      })

      this.socket.on('error', (error) => {
        console.error('❌ SocketService: Socket error:', error)
      })
    }
    
    return this.socket
  }

  disconnect(): void {
    console.log('🔄 SocketService: Manually disconnecting...')
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      console.log('✅ SocketService: Disconnected successfully')
    }
  }

  joinChat(nickname: string): void {
    console.log(`🔄 SocketService: Joining chat with nickname: ${nickname}`)
    this.socket?.emit('join', nickname)
  }

  sendMessage(content: string): void {
    console.log(`💬 SocketService: Sending text message: ${content.substring(0, 50)}...`)
    this.socket?.emit('send-message', content)
  }

  sendImage(imageData: ArrayBuffer, fileName: string, fileSize: number, mimeType: string, content?: string): void {
    console.log(`📸 SocketService: Sending image:`)
    console.log(`   - File: ${fileName}`)
    console.log(`   - Size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
    console.log(`   - Type: ${mimeType}`)
    console.log(`   - Content: ${content || 'No description'}`)
    console.log(`   - ArrayBuffer length: ${imageData.byteLength}`)
    console.log(`   - Socket connected: ${this.socket?.connected}`)
    console.log(`   - Socket ID: ${this.socket?.id}`)

    if (!this.socket) {
      console.error('❌ SocketService: Cannot send image - socket is null')
      throw new Error('Socket not initialized')
    }

    if (!this.socket.connected) {
      console.error('❌ SocketService: Cannot send image - socket not connected')
      throw new Error('Socket not connected')
    }

    if (!imageData || imageData.byteLength === 0) {
      console.error('❌ SocketService: Cannot send image - invalid ArrayBuffer')
      throw new Error('Invalid image data')
    }

    try {
      console.log('📡 SocketService: Emitting send-image event...')
      this.socket.emit('send-image', {
        imageData,
        fileName,
        fileSize,
        mimeType,
        content
      })
      console.log('✅ SocketService: Image emit completed')
    } catch (error) {
      console.error('❌ SocketService: Error emitting image:', error)
      throw error
    }
  }

  sendBroadcast(content: string): void {
    console.log(`📢 SocketService: Sending broadcast: ${content}`)
    this.socket?.emit('send-broadcast', content)
  }

  clearBroadcast(): void {
    console.log(`🧹 SocketService: Clearing broadcast message`)
    this.socket?.emit('clear-broadcast')
  }

  kickUser(userId: string): void {
    console.log(`👢 SocketService: Kicking user: ${userId}`)
    this.socket?.emit('kick-user', userId)
  }

  onJoinSuccess(callback: (data: { user: User }) => void): void {
    this.socket?.on('join-success', (data) => {
      console.log('✅ SocketService: Join success event received:', data.user.nickname)
      callback(data)
    })
  }

  onNicknameTaken(callback: (data: { message: string }) => void): void {
    this.socket?.on('nickname-taken', (data) => {
      console.log('❌ SocketService: Nickname taken event received:', data.message)
      callback(data)
    })
  }

  onMessageHistory(callback: (messages: Message[]) => void): void {
    this.socket?.on('message-history', (messages) => {
      console.log(`📜 SocketService: Message history received: ${messages.length} messages`)
      callback(messages)
    })
  }

  onNewMessage(callback: (message: Message) => void): void {
    this.socket?.on('new-message', (message) => {
      console.log(`📨 SocketService: New message received from ${message.nickname}`)
      console.log(`   - Type: ${message.type || 'text'}`)
      if (message.type === 'image') {
        console.log(`   - Image: ${message.fileName} (${message.fileSize} bytes)`)
      }
      callback(message)
    })
  }

  onStickyMessage(callback: (message: Message | null) => void): void {
    this.socket?.on('sticky-message', (message) => {
      if (message) {
        console.log('📌 SocketService: Sticky message received:', message.content)
      } else {
        console.log('🧹 SocketService: Sticky message cleared (null received)')
      }
      callback(message)
    })
  }

  onUsersUpdate(callback: (users: User[]) => void): void {
    this.socket?.on('users-update', (users) => {
      console.log(`👥 SocketService: Users update received: ${users.length} users`)
      callback(users)
    })
  }

  onUserJoined(callback: (data: { nickname: string; isAdmin?: boolean }) => void): void {
    this.socket?.on('user-joined', (data) => {
      console.log(`👋 SocketService: User joined: ${data.nickname}`)
      callback(data)
    })
  }

  onUserLeft(callback: (data: { nickname: string; isAdmin?: boolean }) => void): void {
    this.socket?.on('user-left', (data) => {
      console.log(`👋 SocketService: User left: ${data.nickname}`)
      callback(data)
    })
  }

  onUserKicked(callback: (data: { nickname: string; adminNickname: string }) => void): void {
    this.socket?.on('user-kicked', (data) => {
      console.log(`👢 SocketService: User kicked: ${data.nickname} by ${data.adminNickname}`)
      callback(data)
    })
  }

  onKicked(callback: (data: { message: string }) => void): void {
    this.socket?.on('kicked', (data) => {
      console.log('👢 SocketService: You were kicked:', data.message)
      callback(data)
    })
  }

  onConnect(callback: () => void): void {
    this.socket?.on('connect', () => {
      console.log('✅ SocketService: Connect event triggered')
      callback()
    })
  }

  onDisconnect(callback: () => void): void {
    this.socket?.on('disconnect', (reason) => {
      console.log('❌ SocketService: Disconnect event triggered, reason:', reason)
      callback()
    })
  }

  removeAllListeners(): void {
    console.log('🔄 SocketService: Removing all listeners...')
    this.socket?.removeAllListeners()
  }

  onError(callback: (data: { message: string }) => void): void {
    this.socket?.on('error', (data) => {
      console.error('❌ SocketService: Server error event received:', data)
      callback(data)
    })
  }

  isConnected(): boolean {
    const connected = this.socket?.connected || false
    console.log(`🔍 SocketService: Connection status check: ${connected}`)
    return connected
  }

  getSocketId(): string | undefined {
    const id = this.socket?.id
    console.log(`🔍 SocketService: Socket ID: ${id}`)
    return id
  }
}

export default SocketService 