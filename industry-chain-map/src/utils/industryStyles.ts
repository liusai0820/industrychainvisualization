interface IndustryStyle {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  fontFamily: string;
  chartColors: string[];
  icons: {
    industry: string;
    finance: string;
    product: string;
    technology: string;
    competition: string;
    strategy: string;
    risk: string;
  };
  gradients: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

type IndustryCategory = 
  | '科技' 
  | '医疗健康' 
  | '金融' 
  | '制造业' 
  | '消费品' 
  | '能源' 
  | '传媒娱乐'
  | '教育'
  | '房地产'
  | '农业'
  | '其他';

const defaultStyle: IndustryStyle = {
  primaryColor: '#3B82F6', // 蓝色
  secondaryColor: '#6366F1', // 靛蓝色
  accentColor: '#EC4899', // 粉色
  backgroundColor: '#F9FAFB', // 浅灰色
  cardColor: '#FFFFFF', // 白色
  textColor: '#1F2937', // 深灰色
  fontFamily: 'Inter, system-ui, sans-serif',
  chartColors: ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6', '#EF4444'],
  icons: {
    industry: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    finance: 'M3 3v18h18M9 9v6m3-6v6m3-6v6',
    product: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    technology: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    competition: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    strategy: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    risk: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  },
  gradients: {
    primary: 'from-blue-500 to-indigo-600',
    secondary: 'from-indigo-500 to-purple-600',
    accent: 'from-pink-500 to-rose-500'
  }
};

// 不同行业类别的样式配置
const industryStyleMap: Record<IndustryCategory, Partial<IndustryStyle>> = {
  '科技': {
    primaryColor: '#3B82F6', // 蓝色
    secondaryColor: '#6366F1', // 靛蓝色
    accentColor: '#10B981', // 绿色
    chartColors: ['#3B82F6', '#10B981', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'],
    gradients: {
      primary: 'from-blue-500 to-cyan-600',
      secondary: 'from-indigo-500 to-purple-600',
      accent: 'from-green-400 to-teal-500'
    }
  },
  '医疗健康': {
    primaryColor: '#10B981', // 绿色
    secondaryColor: '#3B82F6', // 蓝色
    accentColor: '#8B5CF6', // 紫色
    chartColors: ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#6366F1', '#EF4444'],
    gradients: {
      primary: 'from-teal-400 to-green-500',
      secondary: 'from-blue-400 to-blue-600',
      accent: 'from-purple-400 to-indigo-500'
    }
  },
  '金融': {
    primaryColor: '#1E40AF', // 深蓝色
    secondaryColor: '#047857', // 深绿色
    accentColor: '#9333EA', // 紫色
    backgroundColor: '#F8FAFC', // 更淡的灰色
    chartColors: ['#1E40AF', '#047857', '#9333EA', '#F59E0B', '#EF4444', '#10B981', '#6366F1'],
    gradients: {
      primary: 'from-blue-700 to-blue-900',
      secondary: 'from-green-700 to-green-900',
      accent: 'from-purple-600 to-purple-800'
    }
  },
  '制造业': {
    primaryColor: '#F59E0B', // 橙色
    secondaryColor: '#4B5563', // 灰色
    accentColor: '#EF4444', // 红色
    chartColors: ['#F59E0B', '#4B5563', '#EF4444', '#3B82F6', '#10B981', '#6366F1', '#EC4899'],
    gradients: {
      primary: 'from-amber-500 to-orange-600',
      secondary: 'from-gray-600 to-gray-700',
      accent: 'from-red-500 to-red-600'
    }
  },
  '消费品': {
    primaryColor: '#EC4899', // 粉色
    secondaryColor: '#8B5CF6', // 紫色
    accentColor: '#F59E0B', // 橙色
    chartColors: ['#EC4899', '#8B5CF6', '#F59E0B', '#3B82F6', '#10B981', '#6366F1', '#EF4444'],
    gradients: {
      primary: 'from-pink-500 to-rose-500',
      secondary: 'from-purple-500 to-indigo-500',
      accent: 'from-amber-400 to-yellow-500'
    }
  },
  '能源': {
    primaryColor: '#FBBF24', // 黄色
    secondaryColor: '#10B981', // 绿色
    accentColor: '#3B82F6', // 蓝色
    chartColors: ['#FBBF24', '#10B981', '#3B82F6', '#EC4899', '#6366F1', '#8B5CF6', '#EF4444'],
    gradients: {
      primary: 'from-yellow-400 to-amber-500',
      secondary: 'from-green-500 to-emerald-600',
      accent: 'from-blue-500 to-sky-600'
    }
  },
  '传媒娱乐': {
    primaryColor: '#8B5CF6', // 紫色
    secondaryColor: '#EC4899', // 粉色
    accentColor: '#F59E0B', // 橙色
    chartColors: ['#8B5CF6', '#EC4899', '#F59E0B', '#3B82F6', '#10B981', '#6366F1', '#EF4444'],
    gradients: {
      primary: 'from-purple-500 to-violet-600',
      secondary: 'from-pink-500 to-rose-500',
      accent: 'from-amber-400 to-orange-500'
    }
  },
  '教育': {
    primaryColor: '#3B82F6', // 蓝色
    secondaryColor: '#F59E0B', // 橙色
    accentColor: '#8B5CF6', // 紫色
    chartColors: ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899', '#6366F1', '#EF4444'],
    gradients: {
      primary: 'from-blue-500 to-sky-600',
      secondary: 'from-amber-400 to-orange-500',
      accent: 'from-purple-500 to-indigo-600'
    }
  },
  '房地产': {
    primaryColor: '#4B5563', // 灰色
    secondaryColor: '#1E40AF', // 深蓝色
    accentColor: '#10B981', // 绿色
    chartColors: ['#4B5563', '#1E40AF', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#EF4444'],
    gradients: {
      primary: 'from-gray-600 to-gray-700',
      secondary: 'from-blue-700 to-blue-900',
      accent: 'from-green-500 to-emerald-600'
    }
  },
  '农业': {
    primaryColor: '#10B981', // 绿色
    secondaryColor: '#F59E0B', // 橙色
    accentColor: '#3B82F6', // 蓝色
    chartColors: ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#EF4444'],
    gradients: {
      primary: 'from-green-500 to-emerald-600',
      secondary: 'from-amber-400 to-orange-500',
      accent: 'from-blue-500 to-sky-600'
    }
  },
  '其他': defaultStyle
};

// 行业名称到行业类别的映射
const industryNameToCategoryMap: Record<string, IndustryCategory> = {
  // 科技
  '半导体与集成电路': '科技',
  '软件': '科技',
  '人工智能': '科技',
  '云计算': '科技',
  '互联网': '科技',
  '计算机硬件': '科技',
  '电子设备': '科技',
  '信息技术': '科技',
  '数字创意': '科技',
  '通信': '科技',
  '网络安全': '科技',
  '机器人技术': '科技',
  
  // 医疗健康
  '医疗器械': '医疗健康',
  '制药': '医疗健康',
  '生物技术': '医疗健康',
  '健康服务': '医疗健康',
  '医疗保健': '医疗健康',
  '基因技术': '医疗健康',
  '生物医药': '医疗健康',
  
  // 金融
  '银行': '金融',
  '保险': '金融',
  '投资': '金融',
  '证券': '金融',
  '金融科技': '金融',
  '支付': '金融',
  '财务服务': '金融',
  
  // 制造业
  '汽车制造': '制造业',
  '航空航天': '制造业',
  '工业制造': '制造业',
  '机械制造': '制造业',
  '电气设备': '制造业',
  '纺织品': '制造业',
  '钢铁': '制造业',
  '化工': '制造业',
  
  // 消费品
  '零售': '消费品',
  '电子商务': '消费品',
  '食品饮料': '消费品',
  '服装': '消费品',
  '奢侈品': '消费品',
  '日用消费品': '消费品',
  '家居用品': '消费品',
  
  // 能源
  '石油天然气': '能源',
  '可再生能源': '能源',
  '采矿': '能源',
  '电力': '能源',
  '环保能源': '能源',
  '清洁能源': '能源',
  
  // 传媒娱乐
  '媒体': '传媒娱乐',
  '娱乐': '传媒娱乐',
  '游戏': '传媒娱乐',
  '社交媒体': '传媒娱乐',
  '流媒体': '传媒娱乐',
  '内容创作': '传媒娱乐',
  '影视': '传媒娱乐',
  
  // 教育
  '教育技术': '教育',
  '在线教育': '教育',
  '高等教育': '教育',
  '职业培训': '教育',
  '教育服务': '教育',
  
  // 房地产
  '房地产开发': '房地产',
  '商业地产': '房地产',
  '住宅地产': '房地产',
  '物业管理': '房地产',
  
  // 农业
  '农业科技': '农业',
  '种植': '农业',
  '养殖': '农业',
  '食品加工': '农业'
};

/**
 * 根据行业名称获取行业类别
 * @param industryName 行业名称
 * @returns 行业类别
 */
export function getIndustryCategory(industryName: string): IndustryCategory {
  // 如果没有提供行业名称，返回默认类别
  if (!industryName) return '其他';
  
  // 检查完全匹配
  if (industryNameToCategoryMap[industryName]) {
    return industryNameToCategoryMap[industryName];
  }
  
  // 检查部分匹配
  for (const [key, value] of Object.entries(industryNameToCategoryMap)) {
    if (industryName.includes(key) || key.includes(industryName)) {
      return value;
    }
  }
  
  return '其他';
}

/**
 * 根据行业名称获取样式配置
 * @param industryName 行业名称
 * @returns 样式配置
 */
export function getIndustryStyle(industryName: string): IndustryStyle {
  const category = getIndustryCategory(industryName);
  const styleOverrides = industryStyleMap[category] || {};
  
  // 合并默认样式和行业特定样式
  return {
    ...defaultStyle,
    ...styleOverrides
  };
}

export type { IndustryStyle, IndustryCategory }; 