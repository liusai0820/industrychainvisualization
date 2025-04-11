if (!process.env.DIFY_API_URL || !process.env.DIFY_API_KEY) {
  console.warn('⚠️ Dify API配置缺失');
}

export const DIFY_CONFIG = {
  API_URL: process.env.DIFY_API_URL || 'https://api.dify.ai/v1/chat-messages',
  API_KEY: process.env.DIFY_API_KEY || '',
  HEADERS: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
  }
}; 