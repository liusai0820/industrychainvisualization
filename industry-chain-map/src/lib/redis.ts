import { VercelKV, createClient } from '@vercel/kv';

// 尝试从环境变量中获取配置
const redisUrl = process.env.REDIS_URL;
const kvRestApiUrl = process.env.KV_REST_API_URL;
const kvRestApiToken = process.env.KV_REST_API_TOKEN;

let redisClient: VercelKV;

// 如果有KV REST API配置，使用它
if (kvRestApiUrl && kvRestApiToken) {
  redisClient = createClient({
    url: kvRestApiUrl,
    token: kvRestApiToken
  });
  console.log('使用KV REST API配置初始化Redis客户端');
} 
// 如果只有REDIS_URL，从中提取信息
else if (redisUrl) {
  try {
    // REDIS_URL格式: redis://default:password@host:port
    const url = new URL(redisUrl);
    const host = url.hostname;
    // 提取密码，去除"default:"前缀
    let password = url.password;
    if (password.startsWith('default:')) {
      password = password.substring(8);
    }
    
    // 创建REST API URL - 注意：不使用端口号，Vercel KV使用标准HTTPS
    const restApiUrl = `https://${host}`;
    
    redisClient = createClient({
      url: restApiUrl,
      token: password
    });
    
    console.log('从REDIS_URL提取信息并初始化Redis客户端:', { 
      url: restApiUrl, 
      tokenLength: password ? password.length : 0 
    });
  } catch (error) {
    console.error('解析REDIS_URL时出错:', error);
    throw new Error('Redis配置错误，请检查环境变量');
  }
} else {
  throw new Error('缺少Redis配置，请提供KV_REST_API_URL和KV_REST_API_TOKEN或REDIS_URL');
}

export { redisClient as redis }; 