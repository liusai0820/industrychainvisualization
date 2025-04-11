import { IndustryStyle } from './industryStyles';

/**
 * 生成饼图的SVG代码
 * @param data 数据数组，每个元素包含名称和值
 * @param colors 颜色数组
 * @returns SVG元素字符串
 */
export function generatePieChart(
  data: { name: string; value: number }[],
  style: IndustryStyle
): string {
  const colors = style.chartColors;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;
  
  // 生成饼图扇区
  const sectors = data.map((item, index) => {
    const percent = (item.value / total) * 100;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    
    const startX = Math.cos(2 * Math.PI * startPercent / 100);
    const startY = Math.sin(2 * Math.PI * startPercent / 100);
    const endX = Math.cos(2 * Math.PI * cumulativePercent / 100);
    const endY = Math.sin(2 * Math.PI * cumulativePercent / 100);
    
    const largeArcFlag = percent > 50 ? 1 : 0;
    
    // 计算扇区路径
    const pathData = [
      `M 0 0`,
      `L ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `Z`
    ].join(' ');
    
    return {
      path: pathData,
      color: colors[index % colors.length],
      percent,
      name: item.name,
      value: item.value
    };
  });
  
  // 生成图例项
  const legendItems = data.map((item, index) => {
    const color = colors[index % colors.length];
    return `
      <div class="flex items-center mb-2">
        <div class="w-3 h-3 rounded-sm mr-2" style="background-color: ${color}"></div>
        <div class="text-xs">${item.name} (${Math.round((item.value / total) * 100)}%)</div>
      </div>
    `;
  }).join('');
  
  // 生成整个图表
  return `
    <div class="flex flex-col md:flex-row items-center justify-center gap-6 my-6">
      <div class="relative w-48 h-48">
        <svg viewBox="-1.1 -1.1 2.2 2.2" class="w-full h-full">
          ${sectors.map(sector => `
            <path 
              d="${sector.path}" 
              fill="${sector.color}"
              stroke="white"
              stroke-width="0.03"
              class="hover:opacity-80 transition-opacity cursor-pointer"
              data-tooltip="${sector.name}: ${Math.round(sector.percent)}%"
            ></path>
          `).join('')}
        </svg>
      </div>
      <div class="legend flex flex-col">
        ${legendItems}
      </div>
    </div>
  `;
}

/**
 * 生成水平条形图的SVG代码
 * @param data 数据数组，每个元素包含名称和值
 * @param style 样式配置
 * @returns SVG元素字符串
 */
export function generateBarChart(
  data: { name: string; value: number }[],
  style: IndustryStyle,
  title?: string
): string {
  const primaryColor = style.primaryColor;
  const secondaryColor = style.secondaryColor;
  
  // 找出最大值，用于计算宽度百分比
  const maxValue = Math.max(...data.map(item => item.value));
  
  // 生成条形图
  const bars = data.map((item, index) => {
    const percent = (item.value / maxValue) * 100;
    const color = index % 2 === 0 ? primaryColor : secondaryColor;
    
    return `
      <div class="mb-3 last:mb-0">
        <div class="flex justify-between mb-1">
          <span class="text-xs font-medium">${item.name}</span>
          <span class="text-xs font-medium">${item.value.toLocaleString()}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div class="h-2.5 rounded-full" style="width: ${percent}%; background-color: ${color}"></div>
        </div>
      </div>
    `;
  }).join('');
  
  // 生成整个图表
  return `
    <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
      ${title ? `<h4 class="text-sm font-semibold mb-4">${title}</h4>` : ''}
      <div class="w-full">
        ${bars}
      </div>
    </div>
  `;
}

/**
 * 生成分段式环形图
 * @param sections 数据数组，每个元素包含标题和百分比
 * @param style 样式配置
 * @returns SVG元素字符串
 */
export function generateDonutChart(
  sections: { title: string; percent: number; description?: string }[],
  style: IndustryStyle
): string {
  const colors = style.chartColors;
  
  // 生成环形图段
  const segments = sections.map((section, index) => {
    const color = colors[index % colors.length];
    const percent = section.percent;
    
    return `
      <div class="relative mb-4">
        <div class="flex justify-between mb-1">
          <span class="text-xs font-medium">${section.title}</span>
          <span class="text-xs font-medium">${percent}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div class="h-2.5 rounded-full transition-all duration-500" 
               style="width: ${percent}%; background-color: ${color}"></div>
        </div>
        ${section.description ? `<p class="text-xs text-gray-500 mt-1">${section.description}</p>` : ''}
      </div>
    `;
  }).join('');
  
  // 生成整个图表
  return `
    <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow my-6">
      <div class="w-full">
        ${segments}
      </div>
    </div>
  `;
}

/**
 * 生成SWOT分析图表
 * @param data SWOT数据，包含优势、劣势、机会和威胁
 * @param style 样式配置
 * @returns HTML元素字符串
 */
export function generateSwotChart(
  data: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  },
  style: IndustryStyle
): string {
  const { primaryColor, secondaryColor, accentColor } = style;
  
  // 生成各象限的内容
  const strengthsItems = data.strengths.map(item => `<li class="mb-1">${item}</li>`).join('');
  const weaknessesItems = data.weaknesses.map(item => `<li class="mb-1">${item}</li>`).join('');
  const opportunitiesItems = data.opportunities.map(item => `<li class="mb-1">${item}</li>`).join('');
  const threatsItems = data.threats.map(item => `<li class="mb-1">${item}</li>`).join('');
  
  // 生成SWOT图表
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
      <div class="p-4 rounded-lg" style="background-color: ${hexToRgba(primaryColor, 0.1)}; border: 1px solid ${primaryColor}">
        <h4 class="font-bold mb-2" style="color: ${primaryColor}">优势 (Strengths)</h4>
        <ul class="list-disc pl-5 text-sm">
          ${strengthsItems}
        </ul>
      </div>
      <div class="p-4 rounded-lg" style="background-color: ${hexToRgba(secondaryColor, 0.1)}; border: 1px solid ${secondaryColor}">
        <h4 class="font-bold mb-2" style="color: ${secondaryColor}">劣势 (Weaknesses)</h4>
        <ul class="list-disc pl-5 text-sm">
          ${weaknessesItems}
        </ul>
      </div>
      <div class="p-4 rounded-lg" style="background-color: ${hexToRgba(accentColor, 0.1)}; border: 1px solid ${accentColor}">
        <h4 class="font-bold mb-2" style="color: ${accentColor}">机会 (Opportunities)</h4>
        <ul class="list-disc pl-5 text-sm">
          ${opportunitiesItems}
        </ul>
      </div>
      <div class="p-4 rounded-lg" style="background-color: ${hexToRgba('#EF4444', 0.1)}; border: 1px solid #EF4444">
        <h4 class="font-bold mb-2" style="color: #EF4444">威胁 (Threats)</h4>
        <ul class="list-disc pl-5 text-sm">
          ${threatsItems}
        </ul>
      </div>
    </div>
  `;
}

/**
 * 生成简单的KPI卡片
 * @param kpis KPI数据数组
 * @param style 样式配置
 * @returns HTML元素字符串
 */
export function generateKpiCards(
  kpis: { title: string; value: string; change?: string; isPositive?: boolean; icon?: string }[],
  style: IndustryStyle
): string {
  const { primaryColor, secondaryColor, accentColor } = style;
  
  // 生成KPI卡片
  const cards = kpis.map((kpi, index) => {
    const color = index % 3 === 0 ? primaryColor : (index % 3 === 1 ? secondaryColor : accentColor);
    const changeColor = kpi.isPositive ? '#10B981' : '#EF4444'; // 绿色或红色
    const changeIcon = kpi.isPositive ? 
      '<path fill-rule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clip-rule="evenodd" />' :
      '<path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clip-rule="evenodd" />';
    
    // 检查是否有指定图标，如果没有则使用默认图标
    const iconPath = kpi.icon || 'M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 13.5H21A7.5 7.5 0 0013.5 6v7.5z';
    
    return `
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">${kpi.title}</p>
            <h3 class="text-xl font-bold mt-1" style="color: ${color}">${kpi.value}</h3>
            ${kpi.change ? `
              <p class="text-xs flex items-center mt-1" style="color: ${changeColor}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 mr-1">
                  ${changeIcon}
                </svg>
                ${kpi.change}
              </p>
            ` : ''}
          </div>
          <div class="p-2 rounded-full" style="background-color: ${hexToRgba(color, 0.1)}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="${color}" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="${iconPath}" />
            </svg>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // 生成卡片网格
  return `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      ${cards}
    </div>
  `;
}

/**
 * 生成竞争对比表格
 * @param competitors 竞争对手数据
 * @param style 样式配置
 * @returns HTML元素字符串
 */
export function generateCompetitorTable(
  competitors: { name: string; metrics: { name: string; value: number | string; isGood?: boolean }[] }[],
  style: IndustryStyle
): string {
  const { primaryColor } = style;
  
  // 获取所有指标名称
  const metricNames = Array.from(new Set(
    competitors.flatMap(comp => comp.metrics.map(m => m.name))
  ));
  
  // 生成表头
  const tableHeader = `
    <tr class="bg-gray-50 dark:bg-gray-700">
      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">公司/指标</th>
      ${metricNames.map(name => `
        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${name}</th>
      `).join('')}
    </tr>
  `;
  
  // 生成表格行
  const tableRows = competitors.map((competitor, index) => {
    const isFirstCompany = index === 0; // 第一个通常是目标公司
    
    return `
      <tr class="${isFirstCompany ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-700">
        <td class="px-4 py-3 text-sm font-medium ${isFirstCompany ? `text-${primaryColor.replace('#', '')}` : 'text-gray-900 dark:text-white'}">${competitor.name}</td>
        ${metricNames.map(metricName => {
          const metric = competitor.metrics.find(m => m.name === metricName);
          
          if (!metric) {
            return `<td class="px-4 py-3 text-sm text-gray-400">-</td>`;
          }
          
          const isGood = metric.isGood !== undefined ? metric.isGood : false;
          
          return `
            <td class="px-4 py-3 text-sm ${isGood ? 'text-green-600 dark:text-green-400' : (isGood === false ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')}">
              ${metric.value}
            </td>
          `;
        }).join('')}
      </tr>
    `;
  }).join('');
  
  // 生成整个表格
  return `
    <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 my-6">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          ${tableHeader}
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * 生成表格列表，用于呈现关键信息
 * @param items 数据项
 * @param style 样式配置
 * @returns HTML元素字符串
 */
export function generateSimpleList(
  items: { title: string; value: string; icon?: string }[],
  style: IndustryStyle
): string {
  const { primaryColor } = style;
  
  // 生成列表项
  const listItems = items.map(item => {
    const iconPath = item.icon || 'M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5';
    
    return `
      <li class="py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 px-2 rounded">
        <div class="flex items-center">
          <div class="p-1 mr-3 rounded-full" style="background-color: ${hexToRgba(primaryColor, 0.1)}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="${primaryColor}" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="${iconPath}" />
            </svg>
          </div>
          <span class="text-sm font-medium text-gray-900 dark:text-white">${item.title}</span>
        </div>
        <span class="text-sm text-gray-500 dark:text-gray-400">${item.value}</span>
      </li>
    `;
  }).join('');
  
  // 生成整个列表
  return `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700 my-6">
      <ul>
        ${listItems}
      </ul>
    </div>
  `;
}

/**
 * 生成引用块，用于突出重要信息
 * @param quote 引用内容
 * @param source 来源
 * @param style 样式配置
 * @returns HTML元素字符串
 */
export function generateQuoteBlock(
  quote: string,
  source?: string,
  style?: IndustryStyle
): string {
  const primaryColor = style?.primaryColor || '#3B82F6';
  
  return `
    <div class="relative p-6 my-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4" style="border-color: ${primaryColor}">
      <svg class="absolute top-3 left-3 transform -translate-y-6 -translate-x-6 h-10 w-10 text-gray-200 dark:text-gray-700" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
      </svg>
      <p class="relative text-lg font-medium text-gray-900 dark:text-white">${quote}</p>
      ${source ? `<footer class="mt-2 text-sm text-gray-500 dark:text-gray-400">— ${source}</footer>` : ''}
    </div>
  `;
}

/**
 * 生成文本摘要卡片
 * @param title 标题
 * @param content 内容
 * @param style 样式配置
 * @returns HTML元素字符串
 */
export function generateSummaryCard(
  title: string,
  content: string,
  style: IndustryStyle
): string {
  const { primaryColor } = style;
  
  return `
    <div class="relative p-5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-t-4 my-6" style="border-color: ${primaryColor}">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">${title}</h3>
      <p class="text-gray-700 dark:text-gray-300 text-sm">${content}</p>
    </div>
  `;
}

/**
 * 将十六进制颜色转换为带透明度的RGBA格式
 * @param hex 十六进制颜色
 * @param alpha 透明度
 * @returns RGBA格式颜色
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
} 