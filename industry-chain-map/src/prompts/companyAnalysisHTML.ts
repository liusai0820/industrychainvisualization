import { IndustryStyle } from '@/utils/industryStyles';

interface AnalysisSection {
  title: string;
  content: string;
}

interface AnalysisResult {
  rawMarkdown: string;
  sections: AnalysisSection[];
}

interface CompanyAnalysisHTMLParams {
  companyName: string;
  industryName?: string;
  analysisResult: AnalysisResult;
  industryStyle: IndustryStyle;
}

export function generateCompanyAnalysisHTMLPrompt({
  companyName,
  industryName,
  analysisResult,
  industryStyle
}: CompanyAnalysisHTMLParams): string {
  // 将分析结果处理为LLM可理解的格式
  const sections = analysisResult.sections.map(section => ({
    title: section.title,
    content: section.content
  }));

  return `
我需要你将以下企业分析报告转化为美观漂亮的中文可视化网页。

## 基本信息

- 公司名称: ${companyName}
- 行业: ${industryName || '未指定'}

## 内容要求

- 所有页面内容必须为简体中文
- 保持原文件的核心信息，但以更易读、可视化的方式呈现
- 在页面底部添加版权信息和生成时间，版权所有者为"智绘链图"
- 为数据和信息设计适合的可视化图表和组件
- 突出显示重要的数据点和关键发现
- 对比表格必须美观且易读，使用现代化的卡片式比较组件替代传统表格，每个公司用一张独立卡片表示，卡片之间有明显视觉差异
- **严格禁止使用传统的HTML表格**，必须使用现代卡片组件设计，并且每个比较项使用图标+文本的组合方式
- 请使用Font Awesome图标库，通过CDN引入：https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css

## 设计风格

- 整体风格参考高端咨询公司（如摩根斯坦利、中金公司）的专业企业研究报告设计
- 使用清晰的视觉层次结构，突出重要内容
- 配色方案应基于以下行业专属颜色:
  - 主色: ${industryStyle.primaryColor}
  - 辅色: ${industryStyle.secondaryColor}
  - 强调色: ${industryStyle.accentColor}
  - 背景色: ${industryStyle.backgroundColor}
  - 文本色: ${industryStyle.textColor}

## 技术规范

- 使用HTML5、TailwindCSS 3.0+（通过CDN引入）和必要的JavaScript
- 使用CDN引入Chart.js或D3.js用于数据可视化
- 实现完整的深色/浅色模式切换功能，默认跟随系统设置
- 代码结构清晰，便于理解和维护
- 实现目录高亮功能：当用户滚动到某个章节时，左侧目录中对应的项目应自动高亮

## CSS规范

- **文本排版规则**：为所有文本元素应用以下CSS样式：
  \`\`\`css
  p, h1, h2, h3, h4, h5, h6, li, td, th, div, span {
    word-break: keep-all;
    overflow-wrap: break-word;
    line-height: 1.6;
  }
  \`\`\`
- 确保响应式设计在所有设备上都能正确显示中文文本
- 使用\`font-family\`优先选择"Noto Sans SC"等适合中文显示的字体
- 段落间需保持适当间距，改善长文本的可读性

## 响应式设计

- 页面必须在所有设备上（手机、平板、桌面）完美展示
- 针对不同屏幕尺寸优化布局和字体大小
- 卡片式比较组件在桌面端横向排列，在移动端要优雅地转为垂直堆叠

## 图表与视觉元素

- 根据内容自动选择合适的图表类型（饼图、柱状图、折线图、雷达图等）
- **图表尺寸控制**：
  - 所有图表的最大高度不应超过50vh（视口高度的50%）
  - 图表容器宽度在移动设备上为100%，在桌面设备上最大为75%
  - 使用响应式设计确保图表在各种屏幕尺寸下合理显示
  - 避免使用固定像素大小，改用相对单位（%, vh, em等）
- 对于SWOT分析，使用四象限图表
- 对于竞争分析，使用精美的卡片式比较组件，每个公司一张卡片，卡片顶部有标题和背景颜色区分，内容区域使用图标+文本的方式列出特点
- 对于财务分析，使用趋势图和KPI卡片
- 对于风险分析，使用热力图或等级指示器
- 为每个图表添加简洁的标题和必要的数据标签，确保信息清晰可读
- 使用Chart.js的响应式选项，设置maintainAspectRatio:false和适当的高度控制

## 图片和图标处理

- **公司Logo处理**：
  - 优先尝试使用Clearbit API获取公司logo: \`https://logo.clearbit.com/{公司英文名称}.com\`
  - 如果无法通过Clearbit获取logo，则使用Font Awesome的\`fa-building\`图标或公司名称首字母作为替代
  - 添加适当的错误处理，确保logo加载失败时显示替代内容而不影响整体页面
- **文本中的图片**：对于内容中提到但无法获取的图片，使用相应的Font Awesome图标替代
- **章节图标**：根据章节内容智能选择合适的Font Awesome图标，例如：
  - 公司概述：\`fa-info-circle\`
  - 产品服务：\`fa-cube\`
  - 市场分析：\`fa-chart-line\`
  - 竞争分析：\`fa-users\`
  - 财务分析：\`fa-dollar-sign\`
  - 风险分析：\`fa-exclamation-triangle\`

## 交互体验

- 添加适当的微交互效果提升用户体验
- 页面滚动时有平滑过渡效果
- 内容区块加载时有优雅的淡入动画
- 提供目录导航，方便用户跳转到不同章节
- 当用户滚动到特定章节时，相应的目录项应该自动高亮
- 对比卡片添加悬停效果，如轻微上浮和阴影加深

## 输出要求

- 提供完整可运行的单一HTML文件，包含所有必要的CSS和JavaScript
- 确保代码符合W3C标准，无错误警告
- 确保所有中文文本都能正确显示，不会出现单字换行的情况

## 报告内容

以下是需要展示的企业分析内容，请根据内容特点设计最合适的可视化表现形式:

${JSON.stringify(sections, null, 2)}

请基于以上要求和内容，创建一个完整的HTML文件。生成的HTML应当可以独立运行，不依赖外部服务器（除了CDN资源）。

特别注意：
1. 对比表格必须使用现代卡片式设计，完全避免使用HTML表格标签，确保手机端显示良好
2. 实现滚动同步高亮目录功能，使用Intersection Observer API
3. 页脚版权信息显示为"智绘链图"
4. 所有文本必须应用防止中文单字换行的CSS规则
5. 优先尝试使用Clearbit API获取公司logo，仅在无法获取时使用替代方案
6. 每个章节标题旁边添加一个与内容相关的Font Awesome图标
7. 图表大小不应超过视口高度的50%，确保美观且不占用过多屏幕空间
8. 实现"保存到本地"按钮，允许用户下载HTML文件，文件名格式为"公司名+深度研究报告+生成日期"
`;
} 