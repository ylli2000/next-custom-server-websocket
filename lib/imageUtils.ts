/**
 * 图片处理工具函数
 */

// 支持的图片格式
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
]

// 最大文件大小 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * 检查文件是否为支持的图片格式
 */
export function isValidImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type)
}

/**
 * 检查文件大小是否在限制内
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE
}

/**
 * 将文件转换为 ArrayBuffer
 */
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('读取文件失败'))
      }
    }
    reader.onerror = () => reject(new Error('读取文件时发生错误'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 将 ArrayBuffer 转换为 Blob URL
 */
export function arrayBufferToBlobUrl(arrayBuffer: ArrayBuffer, mimeType: string): string {
  console.log(`🔄 imageUtils: Converting ArrayBuffer to Blob URL`)
  console.log(`   - ArrayBuffer size: ${arrayBuffer.byteLength} bytes`)
  console.log(`   - MIME type: ${mimeType}`)
  console.log(`   - ArrayBuffer valid: ${arrayBuffer instanceof ArrayBuffer}`)
  
  try {
    // 验证输入参数
    if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
      console.error(`❌ imageUtils: Invalid ArrayBuffer`)
      console.error(`   - Type: ${typeof arrayBuffer}`)
      console.error(`   - Value: ${arrayBuffer}`)
      throw new Error('Invalid ArrayBuffer provided')
    }
    
    if (arrayBuffer.byteLength === 0) {
      console.error(`❌ imageUtils: Empty ArrayBuffer`)
      throw new Error('ArrayBuffer is empty')
    }
    
    if (!mimeType || typeof mimeType !== 'string') {
      console.error(`❌ imageUtils: Invalid MIME type: ${mimeType}`)
      throw new Error('Invalid MIME type provided')
    }
    
    console.log(`✅ imageUtils: Input validation passed`)
    console.log(`🔄 imageUtils: Creating Blob...`)
    
    const blob = new Blob([arrayBuffer], { type: mimeType })
    
    console.log(`✅ imageUtils: Blob created successfully`)
    console.log(`   - Blob size: ${blob.size} bytes`)
    console.log(`   - Blob type: ${blob.type}`)
    console.log(`   - Size match: ${blob.size === arrayBuffer.byteLength}`)
    
    if (blob.size !== arrayBuffer.byteLength) {
      console.error(`❌ imageUtils: Blob size mismatch!`)
      console.error(`   - ArrayBuffer: ${arrayBuffer.byteLength} bytes`)
      console.error(`   - Blob: ${blob.size} bytes`)
    }
    
    console.log(`🔄 imageUtils: Creating object URL...`)
    const blobUrl = URL.createObjectURL(blob)
    
    console.log(`✅ imageUtils: Blob URL created successfully`)
    console.log(`   - URL: ${blobUrl}`)
    console.log(`   - URL length: ${blobUrl.length}`)
    console.log(`   - Valid format: ${blobUrl.startsWith('blob:')}`)
    
    return blobUrl
  } catch (error) {
    console.error(`❌ imageUtils: Error creating Blob URL:`, error)
    console.error(`   - Error type:`, typeof error)
    console.error(`   - Error message:`, error instanceof Error ? error.message : 'Unknown error')
    console.error(`   - Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    console.error(`   - Input data:`, {
      arrayBufferSize: arrayBuffer?.byteLength || 'N/A',
      mimeType,
      arrayBufferType: typeof arrayBuffer
    })
    throw error
  }
}

/**
 * 格式化文件大小显示
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

/**
 * 验证并处理图片文件
 */
export async function validateAndProcessImage(file: File): Promise<{
  isValid: boolean
  error?: string
  arrayBuffer?: ArrayBuffer
}> {
  // 检查文件类型
  if (!isValidImageFile(file)) {
    return {
      isValid: false,
      error: `不支持的文件格式。支持的格式：${SUPPORTED_IMAGE_TYPES.join(', ')}`
    }
  }

  // 检查文件大小
  if (!isValidFileSize(file)) {
    return {
      isValid: false,
      error: `文件过大。最大支持 ${formatFileSize(MAX_FILE_SIZE)}`
    }
  }

  try {
    const arrayBuffer = await fileToArrayBuffer(file)
    return {
      isValid: true,
      arrayBuffer
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : '读取文件失败'
    }
  }
} 