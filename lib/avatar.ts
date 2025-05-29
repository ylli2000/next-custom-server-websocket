/**
 * 生成 Robohash 头像 URL
 * @param nickname 用户昵称
 * @param isAdmin 是否为管理员
 * @returns 头像 URL
 */
export function generateAvatarUrl(nickname: string, isAdmin: boolean = false): string {
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