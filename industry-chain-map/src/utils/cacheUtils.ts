/**
 * 企业分析缓存工具
 * 提供了在浏览器本地存储中存储和检索企业分析结果的功能
 */

interface CacheItem<T> {
  timestamp: number;
  data: T;
}

const CACHE_KEY_PREFIX = 'industry-chain-map:company-analysis:';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1小时过期

/**
 * 保存数据到本地缓存
 * @param key 缓存键（通常是公司名+行业名）
 * @param data 要缓存的数据
 */
export function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
    const cacheItem: CacheItem<T> = {
      timestamp: Date.now(),
      data
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    console.log(`缓存数据已保存: ${key}`);
  } catch (error) {
    console.warn('保存缓存失败:', error);
    // 静默失败 - 缓存失败不应影响主要功能
  }
}

/**
 * 从本地缓存获取数据
 * @param key 缓存键（通常是公司名+行业名）
 * @returns 缓存的数据，如果不存在或已过期则返回null
 */
export function getFromCache<T>(key: string): T | null {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
    const cachedValue = localStorage.getItem(cacheKey);
    
    if (!cachedValue) return null;
    
    const cacheItem = JSON.parse(cachedValue) as CacheItem<T>;
    const now = Date.now();
    
    // 检查是否过期
    if (now - cacheItem.timestamp > CACHE_EXPIRY) {
      console.log(`缓存已过期: ${key}`);
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log(`使用缓存数据: ${key}`);
    return cacheItem.data;
  } catch (error) {
    console.warn('读取缓存失败:', error);
    return null;
  }
}

/**
 * 清理过期的缓存项
 */
export function cleanupCache(): void {
  try {
    const now = Date.now();
    
    // 遍历localStorage中的所有项
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        const cachedValue = localStorage.getItem(key);
        
        if (cachedValue) {
          try {
            const cacheItem = JSON.parse(cachedValue) as CacheItem<unknown>;
            
            if (now - cacheItem.timestamp > CACHE_EXPIRY) {
              localStorage.removeItem(key);
              console.log(`已清理过期缓存: ${key}`);
            }
          } catch (parseError) {
            // 如果解析失败，删除该项
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (error) {
    console.warn('清理缓存失败:', error);
  }
}

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  // 页面加载时执行一次清理
  setTimeout(() => {
    cleanupCache();
  }, 1000);
  
  // 每10分钟清理一次
  setInterval(() => {
    cleanupCache();
  }, 10 * 60 * 1000);
} 