# 产业链图谱生成系统

基于智能算法的产业链结构分析与可视化系统，使用 Next.js 构建。

## 功能特点

- 智能分析产业链层级关系
- 精准识别产业链关键节点
- 深入洞察产业发展新方向
- 一键生成产业链全景图谱
- 支持预设行业快速查看
- 实时生成进度展示
- 优雅的响应式界面设计
- 支持图谱导出

## 最新更新

- 优化首页布局和视觉层次
- 改进搜索框宽度和位置
- 优化产业分类展示间距
- 增强用户界面交互体验

## 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- ECharts
- Dify API

## 本地开发

1. 克隆项目

```bash
git clone [repository-url]
cd industry-chain-map
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

创建 `.env.local` 文件并添加以下内容：

```
DIFY_API_KEY=your-api-key
```

4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 部署

项目可以直接部署到 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=[repository-url])

## 许可证

MIT 