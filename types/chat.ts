export type User = {
  id: string
  nickname: string
  isAdmin?: boolean
  avatarUrl?: string
}

export type LinkPreview = {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

export type Message = {
  id: string
  userId: string
  nickname: string
  content: string
  timestamp: number
  type?: 'text' | 'image'
  imageData?: string | ArrayBuffer // Base64 或 Blob URL 或 ArrayBuffer
  fileName?: string
  fileSize?: number
  mimeType?: string
  isBroadcast?: boolean
  isSticky?: boolean
  linkPreviews?: LinkPreview[]
}

export type ChatState = {
  user: User | null
  messages: Message[]
  onlineUsers: User[]
  isConnected: boolean
  stickyMessage: Message | null
} 