'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { Message, User } from '@/types/chat'
import AdminToolbar from './AdminToolbar'
import MessageInput from './MessageInput'
import MessageList from './MessageList'
import StickyMessage from './StickyMessage'
import UserList from './UserList'

type Props = {
  user: User
  messages: Message[]
  onlineUsers: User[]
  stickyMessage: Message | null
  onSendMessage: (message: string) => void
  onSendImage: (imageData: ArrayBuffer, fileName: string, fileSize: number, mimeType: string, content?: string) => Promise<void>
  onSendBroadcast: (message: string) => void
  onClearBroadcast: () => void
  onKickUser: (userId: string) => void
  isConnected: boolean
}

export default function ChatRoom({ 
  user, 
  messages, 
  onlineUsers, 
  stickyMessage,
  onSendMessage,
  onSendImage,
  onSendBroadcast,
  onClearBroadcast,
  onKickUser,
  isConnected 
}: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)] flex gap-4">
        {/* 聊天区域 */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <span>聊天室</span>
              <div className="flex items-center gap-2">
                <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                  {isConnected ? "已连接" : "连接中断"}
                </Badge>
                <span className="text-sm text-gray-500">
                  欢迎, {user.nickname}
                  {user.isAdmin && (
                    <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-800">
                      👑 管理员
                    </Badge>
                  )}
                </span>
              </div>
            </CardTitle>
            {/* 置顶消息 */}
            {stickyMessage && <StickyMessage message={stickyMessage} />}
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <MessageList 
              messages={messages} 
              currentUser={user} 
              onlineUsers={onlineUsers}
            />
          </CardContent>
          
          <CardFooter className="p-0 mt-auto">
            <MessageInput 
              onSendMessage={onSendMessage} 
              onSendImage={onSendImage}
              disabled={!isConnected}
            />
          </CardFooter>
        </Card>

        {/* 右侧面板 */}
        {user.isAdmin ? (
          /* 管理员只显示管理员工具栏 */
          <AdminToolbar
            onlineUsers={onlineUsers}
            currentUser={user}
            onKickUser={onKickUser}
            onSendBroadcast={onSendBroadcast}
            onClearBroadcast={onClearBroadcast}
          />
        ) : (
          /* 普通用户只显示在线用户列表 */
          <UserList users={onlineUsers} currentUser={user} />
        )}
      </div>
    </div>
  )
} 