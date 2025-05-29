'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { User } from '@/types/chat'
import { useState } from 'react'

type Props = {
  onlineUsers: User[]
  currentUser: User
  onKickUser: (userId: string) => void
  onSendBroadcast: (message: string) => void
  onClearBroadcast: () => void
}

export default function AdminToolbar({ 
  onlineUsers, 
  currentUser, 
  onKickUser, 
  onSendBroadcast, 
  onClearBroadcast 
}: Props) {
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [showBroadcastForm, setShowBroadcastForm] = useState(false)

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault()
    if (broadcastMessage.trim()) {
      onSendBroadcast(broadcastMessage.trim())
      setBroadcastMessage('')
      setShowBroadcastForm(false)
    }
  }

  const getAvatarInitials = (nickname: string) => {
    return nickname.slice(0, 2).toUpperCase()
  }

  const regularUsers = onlineUsers.filter(user => !user.isAdmin)

  return (
    <Card className="w-80 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          🛠️ 管理员工具
          <Badge variant="destructive" className="text-xs">
            ADMIN
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 广播消息区域 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">📢 广播消息</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={showBroadcastForm ? "secondary" : "default"}
                onClick={() => setShowBroadcastForm(!showBroadcastForm)}
              >
                {showBroadcastForm ? '取消' : '发送广播'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onClearBroadcast}
              >
                清空广播
              </Button>
            </div>
          </div>
          
          {showBroadcastForm && (
            <form onSubmit={handleSendBroadcast} className="space-y-2">
              <Input
                type="text"
                placeholder="输入广播消息..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="text-sm"
                maxLength={200}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={!broadcastMessage.trim()}>
                  发送
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setBroadcastMessage('')
                    setShowBroadcastForm(false)
                  }}
                >
                  取消
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 用户管理区域 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">👥 用户管理</h3>
            <Badge variant="secondary" className="text-xs">
              {regularUsers.length} 用户
            </Badge>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {regularUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-gray-50 hover:bg-gray-100"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage 
                    src={user.avatarUrl} 
                    alt={`${user.nickname}的头像`}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xs bg-gray-500 text-white">
                    {getAvatarInitials(user.nickname)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900">
                    {user.nickname}
                  </p>
                </div>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onKickUser(user.id)}
                  className="text-xs px-2 py-1 h-auto"
                >
                  踢出
                </Button>
              </div>
            ))}
            
            {regularUsers.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                <p className="text-sm">暂无普通用户</p>
              </div>
            )}
          </div>
        </div>

        {/* 管理员信息 */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>👑</span>
            <span>当前管理员: {currentUser.nickname}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 