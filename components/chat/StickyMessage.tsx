'use client'

import { Badge } from '@/components/ui/badge'
import type { Message } from '@/types/chat'

type Props = {
  message: Message
}

export default function StickyMessage({ message }: Props) {

  return (message.content ? (
   <div className="pt-1"> 
      <span className="flex flex-row items-center gap-2">
        <Badge variant="default" className="text-xs bg-red-600">
          📢 广播消息
        </Badge>
        <p className="text-sm text-gray-900 font-medium text-red-500">
          {message.content}
        </p>
      </span> 
    </div>) : null
  )
} 