'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

type Props = {
  onSubmit: (nickname: string) => void
  error?: string
  isLoading?: boolean
}

export default function NicknameForm({ onSubmit, error, isLoading }: Props) {
  const [nickname, setNickname] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (nickname.trim()) {
      onSubmit(nickname.trim())
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            加入聊天室
          </CardTitle>
          <CardDescription>
            请输入一个唯一的昵称来开始聊天
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="输入你的昵称..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isLoading}
                className="w-full"
                maxLength={20}
              />
              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={!nickname.trim() || isLoading}
            >
              {isLoading ? '加入中...' : '加入聊天室'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 