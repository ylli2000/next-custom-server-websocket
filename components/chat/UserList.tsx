'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { User } from '@/types/chat'

type Props = {
  users: User[]
  currentUser: User | null
}

export default function UserList({ users, currentUser }: Props) {
  const getAvatarInitials = (nickname: string) => {
    return nickname.slice(0, 2).toUpperCase()
  }

  return (
    <Card className="w-64 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          在线用户
          <Badge variant="secondary" className="text-xs">
            {users.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {users.map((user) => {
          const isCurrentUser = currentUser?.id === user.id
          
          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
              } ${user.isAdmin ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : ''}`}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage 
                  src={user.avatarUrl} 
                  alt={`${user.nickname}的头像`}
                  className="object-cover"
                />
                <AvatarFallback className={`text-xs ${
                  user.isAdmin 
                    ? 'bg-yellow-500 text-white' 
                    : isCurrentUser 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-500 text-white'
                }`}>
                  {getAvatarInitials(user.nickname)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className={`text-sm font-medium truncate ${
                    user.isAdmin 
                      ? 'text-yellow-700' 
                      : isCurrentUser 
                        ? 'text-blue-700' 
                        : 'text-gray-900'
                  }`}>
                    {user.nickname}
                    {isCurrentUser && (
                      <span className="text-xs text-blue-500 ml-1">(你)</span>
                    )}
                  </p>
                  {user.isAdmin && (
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0">
                      👑
                    </Badge>
                  )}
                </div>
                {user.isAdmin && (
                  <p className="text-xs text-yellow-600">(管理员)</p>
                )}
              </div>
              
              <div className={`w-2 h-2 rounded-full ${
                user.isAdmin 
                  ? 'bg-yellow-500' 
                  : isCurrentUser 
                    ? 'bg-blue-500' 
                    : 'bg-green-500'
              }`} />
            </div>
          )
        })}
        
        {users.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">暂无在线用户</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 