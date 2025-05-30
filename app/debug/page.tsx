'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [socketStatus, setSocketStatus] = useState<string>('Checking...')
  const [origin, setOrigin] = useState<string>('')
  const [env, setEnv] = useState<string>('')
  
  useEffect(() => {
    // 获取当前环境信息
    setOrigin(window.location.origin)
    setEnv(process.env.NODE_ENV || 'unknown')
    
    // 测试 Socket.IO 连接
    const checkSocket = async () => {
      try {
        const response = await fetch('/socket.io/?EIO=4&transport=polling')
        if (response.ok) {
          setSocketStatus('Socket.IO endpoint is accessible ✅')
        } else {
          setSocketStatus(`Socket.IO endpoint returned ${response.status} ❌`)
        }
      } catch (error) {
        setSocketStatus(`Socket.IO endpoint error: ${error} ❌`)
      }
    }
    
    checkSocket()
  }, [])
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <div className="space-y-2">
        <p><strong>Origin:</strong> {origin}</p>
        <p><strong>Environment:</strong> {env}</p>
        <p><strong>Socket.IO Status:</strong> {socketStatus}</p>
        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Test Links</h2>
        <ul className="space-y-1">
          <li><Link href="/" className="text-blue-500 underline">Home Page</Link></li>
          <li><a href="/health" className="text-blue-500 underline">Health Check</a></li>
          <li><a href="/api/health" className="text-blue-500 underline">API Health (if exists)</a></li>
        </ul>
      </div>
    </div>
  )
} 