import { createServer } from 'http'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { parse } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { extractUrls, fetchMultipleLinkPreviews } from './lib/linkPreview.js'

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const app = next({ dev })
const handle = app.getRequestHandler()

type User = {
  id: string
  nickname: string
  socketId: string
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

// 生成 Robohash 头像 URL
function generateAvatarUrl(nickname: string, isAdmin: boolean = false): string {
  const baseUrl = 'https://robohash.org'
  const size = '200x200' // 优化速度，使用较小尺寸
  
  // 对昵称进行编码以确保URL安全
  const encodedNickname = encodeURIComponent(nickname)
  
  if (isAdmin) {
    // 管理员使用机器人头像（默认set1）
    return `${baseUrl}/${encodedNickname}.png?size=${size}`
  } else {
    // 普通用户使用人像（set5）
    return `${baseUrl}/${encodedNickname}.png?size=${size}&set=set5`
  }
}

// 存储在线用户和消息历史
const users = new Map<string, User>()
const messages: Message[] = []
let stickyMessage: Message | null = null

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new SocketIOServer(server, {
    cors: {
      origin: dev 
        ? "*" 
        : [
            // Railway
            "https://*.railway.app",
            "https://*.up.railway.app",
            // Render
            "https://*.onrender.com",
            // Fly.io
            "https://*.fly.dev",
            // Heroku
            "https://*.herokuapp.com",
            // 允许自定义域名（如果有）
            process.env.CUSTOM_DOMAIN || "",
          ].filter(Boolean),
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    maxHttpBufferSize: 15 * 1024 * 1024,
    pingTimeout: 60000,
    pingInterval: 25000
  })

  io.engine.on('connection_error', (err) => {
    console.error('❌ Socket.IO Engine connection error:', err)
    console.error('   - Error code:', err.code)
    console.error('   - Error message:', err.message)
    console.error('   - Error context:', err.context)
    console.error('   - Error type:', err.type)
  })

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id)
    console.log('   - Transport:', socket.conn.transport.name)
    console.log('   - Remote address:', socket.conn.remoteAddress)

    socket.conn.on('error', (error) => {
      console.error(`❌ Transport error for ${socket.id}:`, error)
      console.error('   - Error type:', typeof error)
      console.error('   - Error message:', error.message)
      console.error('   - Error stack:', error.stack)
    })

    socket.conn.on('upgrade', () => {
      console.log(`🔄 Transport upgraded for ${socket.id} to:`, socket.conn.transport.name)
    })

    socket.conn.on('close', (reason) => {
      console.log(`❌ Transport closed for ${socket.id}, reason:`, reason)
    })

    // 用户加入聊天室
    socket.on('join', (nickname: string) => {
      console.log(`🔄 User ${socket.id} attempting to join with nickname: ${nickname}`)
      
      // 检查昵称是否已存在
      const existingUser = Array.from(users.values()).find(user => user.nickname === nickname)
      if (existingUser) {
        console.log(`❌ Nickname "${nickname}" already taken by user ${existingUser.socketId}`)
        socket.emit('nickname-taken', { message: '昵称已被使用，请选择其他昵称' })
        return
      }

      const isAdmin = nickname.toLowerCase() === 'admin'
      const avatarUrl = generateAvatarUrl(nickname, isAdmin)
      
      const user: User = {
        id: uuidv4(),
        nickname,
        socketId: socket.id,
        isAdmin,
        avatarUrl
      }

      users.set(socket.id, user)
      console.log(`✅ User ${socket.id} joined successfully as "${nickname}" (${isAdmin ? 'Admin' : 'User'})`)
      
      // 发送历史消息给新用户
      socket.emit('message-history', messages)
      
      // 发送置顶消息给新用户
      if (stickyMessage) {
        socket.emit('sticky-message', stickyMessage)
      }
      
      // 发送在线用户列表
      const onlineUsers = Array.from(users.values())
        .map(u => ({ 
          id: u.id, 
          nickname: u.nickname, 
          isAdmin: u.isAdmin,
          avatarUrl: u.avatarUrl
        }))
        .sort((a, b) => {
          // 管理员置顶
          if (a.isAdmin && !b.isAdmin) return -1
          if (!a.isAdmin && b.isAdmin) return 1
          return 0
        })
      io.emit('users-update', onlineUsers)
      
      // 通知其他用户有新用户加入
      socket.broadcast.emit('user-joined', { nickname, isAdmin })
      
      socket.emit('join-success', { 
        user: { 
          id: user.id, 
          nickname: user.nickname, 
          isAdmin: user.isAdmin,
          avatarUrl: user.avatarUrl
        } 
      })
    })

    // 处理新消息
    socket.on('send-message', async (content: string) => {
      console.log(`💬 Text message from ${socket.id}: ${content.substring(0, 50)}...`)
      
      const user = users.get(socket.id)
      if (!user) {
        console.log(`❌ User ${socket.id} not found when sending message`)
        return
      }

      try {
        // 检测消息中的链接
        const urls = extractUrls(content)
        let linkPreviews: LinkPreview[] = []

        // 如果有链接，获取预览信息
        if (urls.length > 0) {
          console.log(`🔗 Found ${urls.length} URLs in message, fetching previews...`)
          try {
            linkPreviews = await fetchMultipleLinkPreviews(urls)
            console.log(`✅ Successfully fetched ${linkPreviews.length} link previews`)
          } catch (error) {
            console.error('❌ Error fetching link previews:', error)
          }
        }

        const message: Message = {
          id: uuidv4(),
          userId: user.id,
          nickname: user.nickname,
          content,
          timestamp: Date.now(),
          type: 'text',
          linkPreviews: linkPreviews.length > 0 ? linkPreviews : undefined
        }

        messages.push(message)
        
        // 只保留最近100条消息
        if (messages.length > 100) {
          messages.shift()
        }

        // 广播消息给所有用户
        io.emit('new-message', message)
        console.log(`✅ Text message broadcasted successfully`)
      } catch (error) {
        console.error(`❌ Error processing text message from ${socket.id}:`, error)
      }
    })

    // 处理图片消息
    socket.on('send-image', (data: {
      imageData: ArrayBuffer | Buffer | { type: 'Buffer'; data: number[] } // 支持多种数据格式
      fileName: string
      fileSize: number
      mimeType: string
      content?: string
    }) => {
      console.log(`📸 Image message from ${socket.id}:`)
      console.log(`   - File: ${data.fileName}`)
      console.log(`   - Size: ${data.fileSize} bytes (${(data.fileSize / 1024 / 1024).toFixed(2)} MB)`)
      console.log(`   - Type: ${data.mimeType}`)
      console.log(`   - Content: ${data.content || 'No description'}`)
      console.log(`   - Transport: ${socket.conn.transport.name}`)
      console.log(`   - Data received type:`, typeof data.imageData)
      console.log(`   - Data is ArrayBuffer:`, data.imageData instanceof ArrayBuffer)
      console.log(`   - Data is Buffer:`, Buffer.isBuffer(data.imageData))
      
      const user = users.get(socket.id)
      if (!user) {
        console.log(`❌ User ${socket.id} not found when sending image`)
        return
      }

      try {
        // 详细验证接收到的数据
        console.log(`🔍 Validating received image data...`)
        
        if (!data) {
          console.error(`❌ No data received`)
          socket.emit('error', { message: '未接收到图片数据' })
          return
        }

        if (!data.imageData) {
          console.error(`❌ No imageData in received data`)
          socket.emit('error', { message: '图片数据缺失' })
          return
        }

        // 检查数据类型和大小
        let actualSize = 0
        let processedImageData: ArrayBuffer

        if (data.imageData instanceof ArrayBuffer) {
          console.log(`✅ Received ArrayBuffer directly`)
          actualSize = data.imageData.byteLength
          processedImageData = data.imageData
        } else if (Buffer.isBuffer(data.imageData)) {
          console.log(`🔄 Received Buffer, converting to ArrayBuffer`)
          actualSize = data.imageData.length
          processedImageData = data.imageData.buffer.slice(
            data.imageData.byteOffset,
            data.imageData.byteOffset + data.imageData.byteLength
          ) as ArrayBuffer
        } else if (typeof data.imageData === 'object' && 'type' in data.imageData && data.imageData.type === 'Buffer') {
          console.log(`🔄 Received Buffer object, converting to ArrayBuffer`)
          const bufferData = data.imageData as { type: 'Buffer'; data: number[] }
          const buffer = Buffer.from(bufferData.data)
          actualSize = buffer.length
          processedImageData = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
          ) as ArrayBuffer
        } else {
          console.error(`❌ Invalid image data type:`, typeof data.imageData)
          console.error(`   - Constructor:`, (data.imageData as object).constructor?.name)
          console.error(`   - Data sample:`, JSON.stringify(data.imageData).substring(0, 200))
          socket.emit('error', { message: '图片数据格式错误' })
          return
        }

        console.log(`✅ Image data processed successfully`)
        console.log(`   - Reported size: ${data.fileSize} bytes`)
        console.log(`   - Actual size: ${actualSize} bytes`)
        console.log(`   - Size match: ${data.fileSize === actualSize}`)

        // 验证文件大小
        if (data.fileSize > 10 * 1024 * 1024) {
          console.log(`❌ Image too large: ${data.fileSize} bytes (max: 10MB)`)
          socket.emit('error', { message: '图片文件过大，最大支持 10MB' })
          return
        }

        if (actualSize > 10 * 1024 * 1024) {
          console.log(`❌ Actual image data too large: ${actualSize} bytes (max: 10MB)`)
          socket.emit('error', { message: '图片数据过大，最大支持 10MB' })
          return
        }

        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(data.mimeType)) {
          console.log(`❌ Invalid image type: ${data.mimeType}`)
          socket.emit('error', { message: '不支持的图片格式' })
          return
        }

        console.log(`✅ Image validation passed, creating message...`)

        const message: Message = {
          id: uuidv4(),
          userId: user.id,
          nickname: user.nickname,
          content: data.content || '',
          timestamp: Date.now(),
          type: 'image',
          imageData: processedImageData,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType
        }

        messages.push(message)
        console.log(`✅ Image message added to history (total messages: ${messages.length})`)
        
        // 只保留最近100条消息
        if (messages.length > 100) {
          messages.shift()
          console.log(`🗑️ Removed old message, keeping last 100`)
        }

        // 广播图片消息给所有用户
        console.log(`📡 Broadcasting image message to all users...`)
        console.log(`   - Broadcasting to ${io.sockets.sockets.size} connected sockets`)
        
        try {
          io.emit('new-message', message)
          console.log(`✅ Image message broadcasted successfully`)
        } catch (broadcastError) {
          console.error(`❌ Error broadcasting image message:`, broadcastError)
          console.error(`   - Broadcast error type:`, typeof broadcastError)
          console.error(`   - Broadcast error message:`, broadcastError instanceof Error ? broadcastError.message : 'Unknown error')
          socket.emit('error', { message: '广播图片消息失败' })
        }
        
      } catch (error) {
        console.error(`❌ Error processing image message from ${socket.id}:`, error)
        console.error(`   - Error type:`, typeof error)
        console.error(`   - Error name:`, error instanceof Error ? error.name : 'Unknown')
        console.error(`   - Error message:`, error instanceof Error ? error.message : 'Unknown error')
        console.error(`   - Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
        console.error(`   - Socket connected:`, socket.connected)
        console.error(`   - Transport:`, socket.conn.transport.name)
        socket.emit('error', { message: '图片处理失败，请重试' })
      }
    })

    // 处理广播消息（仅管理员）
    socket.on('send-broadcast', (content: string) => {
      console.log(`📢 Broadcast message from ${socket.id}: ${content}`)
      
      const user = users.get(socket.id)
      if (!user || !user.isAdmin) {
        console.log(`❌ Unauthorized broadcast attempt from ${socket.id}`)
        return
      }

      try {
        const broadcastMessage: Message = {
          id: uuidv4(),
          userId: user.id,
          nickname: user.nickname,
          content,
          timestamp: Date.now(),
          isBroadcast: true,
          isSticky: true
        }

        // 替换现有的置顶消息
        stickyMessage = broadcastMessage

        // 广播置顶消息给所有用户
        io.emit('sticky-message', stickyMessage)
        console.log(`✅ Broadcast message sent successfully`)
      } catch (error) {
        console.error(`❌ Error processing broadcast from ${socket.id}:`, error)
      }
    })

    // 处理清空广播消息（仅管理员）
    socket.on('clear-broadcast', () => {
      console.log(`🧹 Clear broadcast request from ${socket.id}`)
      
      const user = users.get(socket.id)
      if (!user || !user.isAdmin) {
        console.log(`❌ Unauthorized clear broadcast attempt from ${socket.id}`)
        return
      }

      try {
        // 清空置顶消息
        stickyMessage = null

        // 通知所有用户清空置顶消息
        io.emit('sticky-message', null)
        console.log(`✅ Broadcast message cleared successfully`)
      } catch (error) {
        console.error(`❌ Error clearing broadcast from ${socket.id}:`, error)
      }
    })

    // 处理踢人操作（仅管理员）
    socket.on('kick-user', (targetUserId: string) => {
      console.log(`👢 Kick user request from ${socket.id} for user ${targetUserId}`)
      
      const adminUser = users.get(socket.id)
      if (!adminUser || !adminUser.isAdmin) {
        console.log(`❌ Unauthorized kick attempt from ${socket.id}`)
        return
      }

      // 找到目标用户
      const targetUser = Array.from(users.values()).find(u => u.id === targetUserId)
      if (!targetUser || targetUser.isAdmin) {
        console.log(`❌ Cannot kick user ${targetUserId} (not found or is admin)`)
        return // 不能踢管理员
      }

      try {
        // 踢出用户
        const targetSocket = io.sockets.sockets.get(targetUser.socketId)
        if (targetSocket) {
          targetSocket.emit('kicked', { message: '你已被管理员踢出聊天室' })
          targetSocket.disconnect()
          console.log(`✅ User ${targetUser.nickname} (${targetUser.socketId}) kicked successfully`)
        }

        // 移除用户
        users.delete(targetUser.socketId)

        // 更新在线用户列表
        const onlineUsers = Array.from(users.values())
          .map(u => ({ 
            id: u.id, 
            nickname: u.nickname, 
            isAdmin: u.isAdmin,
            avatarUrl: u.avatarUrl
          }))
          .sort((a, b) => {
            if (a.isAdmin && !b.isAdmin) return -1
            if (!a.isAdmin && b.isAdmin) return 1
            return 0
          })
        io.emit('users-update', onlineUsers)

        // 通知其他用户
        socket.broadcast.emit('user-kicked', { 
          nickname: targetUser.nickname, 
          adminNickname: adminUser.nickname 
        })
      } catch (error) {
        console.error(`❌ Error kicking user ${targetUserId}:`, error)
      }
    })

    // 用户断开连接
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`)
      
      const user = users.get(socket.id)
      if (user) {
        console.log(`   - User was: ${user.nickname} (${user.isAdmin ? 'Admin' : 'User'})`)
        users.delete(socket.id)
        
        // 更新在线用户列表
        const onlineUsers = Array.from(users.values())
          .map(u => ({ 
            id: u.id, 
            nickname: u.nickname, 
            isAdmin: u.isAdmin,
            avatarUrl: u.avatarUrl
          }))
          .sort((a, b) => {
            if (a.isAdmin && !b.isAdmin) return -1
            if (!a.isAdmin && b.isAdmin) return 1
            return 0
          })
        io.emit('users-update', onlineUsers)
        
        // 通知其他用户有用户离开
        socket.broadcast.emit('user-left', { nickname: user.nickname, isAdmin: user.isAdmin })
        console.log(`✅ User cleanup completed for ${user.nickname}`)
      } else {
        console.log(`   - User data not found for ${socket.id}`)
      }
    })

    // 处理连接错误
    socket.on('error', (error: Error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error)
    })
  })

  server.listen(port, hostname, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.NODE_ENV
      }`
    )
  })
}) 