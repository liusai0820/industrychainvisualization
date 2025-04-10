# 产业图谱生成与展示应用

## 1. 项目概述

本项目旨在构建一个智能化、自动化的产业图谱生成与展示平台。通过 **直接调用 OpenRouter 提供的 AI 模型 API**，应用能够根据用户指定的产业（如"新能源汽车"、"人工智能"等），自动分析并构建出涵盖上游、中游、下游关键环节、细分领域及代表性企业的产业链全景图谱。

**核心价值:**

*   **效率提升**: 自动化生成图谱，替代传统手动绘制，大幅节省研究时间和人力成本。
*   **深度洞察**: 提供结构化的产业链视图，帮助用户快速理解产业格局、关键节点和潜在机会。
*   **灵活的模型选择**: 通过 OpenRouter 可以方便地切换和使用多种先进的 AI 模型。
*   **便捷交互**: 提供直观的可视化界面和便捷的公司深度分析入口。

本应用适用于需要进行产业研究、市场分析、投资决策等场景的用户。

## 2. 核心功能详解

*   **智能图谱生成 (通过后台任务)**:
    *   **预设产业与自定义输入**: 支持快速选择或手动输入产业名称。
    *   **后台处理**: 用户提交请求后，由**后台任务**调用 OpenRouter 模型 API (`GRAPH_MODEL_NAME`)，结合 `industryGraph.ts` Prompt 进行分析和数据抽取，生成结构化图谱数据。
*   **异步任务与状态跟踪**:
    *   图谱生成采用异步处理。前端通过轮询 `/api/status` 获取 Redis 中的任务状态（Pending, Completed, Failed），并展示进度 (`ProgressBar.tsx`)。
    *   生成的图谱数据缓存在 Redis 中。
*   **多端图谱可视化 (`IndustryChainChart.tsx`)**:
    *   清晰展示"上游-中游-下游"结构，支持桌面和移动端响应式布局。
    *   提供 Tooltip 提示、公司点击交互和图谱下载功能。
*   **公司深度分析 (HTML - `/api/company-analysis-html`)**:
    *   用户点击公司触发请求。API **优先检查内存和 Redis 缓存**。
    *   若无缓存，则调用 OpenRouter 模型 API (`COMPANY_ANALYSIS_MODEL_NAME`) 及 `companyAnalysisHTML.ts` Prompt 生成 HTML 报告。
    *   结果存入缓存，并在前端模态框 (`CompanyReportModal.tsx`) 中展示。
*   **公司深度分析 (JSON/Markdown - `/api/company-analysis`)**:
    *   提供 API 端点，调用 OpenRouter 模型及 `companyAnalysis.ts` Prompt，返回结构化的 JSON 或 Markdown 分析结果。
*   **用户反馈 (`FeedbackButton.tsx` & `/api/feedback`)**:
    *   提供前端反馈按钮和后端处理 API。

## 3. 技术栈

*   **前端**: Next.js (App Router), React, Tailwind CSS, TypeScript, `html2canvas`
*   **后端**: Next.js (API Routes), TypeScript
*   **AI能力**: OpenRouter (模型 API 调用)
*   **缓存/数据库**: Redis (存储任务状态和图谱/报告缓存)
*   **运行环境**: Node.js
*   **部署**: Vercel (推荐)

## 4. 项目设置与启动

1.  **克隆仓库**: `git clone <your-repository-url> && cd <repository-directory>`
2.  **安装依赖**: `npm install` (或 yarn/pnpm)
3.  **配置环境变量 (`.env.local`)**:
    *   **必需**:
        *   `OPENROUTER_API_KEY`: 你的 OpenRouter API 密钥。
        *   `GRAPH_MODEL_NAME`: 图谱生成模型名称 (e.g., `openai/gpt-4o`)。
        *   `COMPANY_ANALYSIS_MODEL_NAME`: 公司分析 (JSON/MD) 模型名称。
        *   `COMPANY_HTML_MODEL`: 公司分析 (HTML) 模型名称 (e.g., `anthropic/claude-3.7-sonnet`)。
        *   `REDIS_URL`: Redis 连接 URL。
    *   **可选**:
        *   `OPENROUTER_API_BASE`: OpenRouter API 基础 URL。
        *   `REDIS_CACHE_EXPIRATION_SECONDS`: 图谱数据缓存时间 (秒)。
        *   `REDIS_STATUS_EXPIRATION_SECONDS`: 任务状态缓存时间 (秒)。
        *   `COMPANY_ANALYSIS_TEMPERATURE`, `COMPANY_HTML_TEMPERATURE`: 模型温度参数。
    *   *确保 OpenRouter API Key 有效且有额度。*
4.  **运行开发服务器**: `npm run dev`
5.  **访问应用**: `http://localhost:3000`

## 5. 工作流程简述 (基于 OpenRouter)

1.  **图谱生成**:
    *   **用户请求 (Frontend)**: 选择/输入产业，点击生成。
    *   **启动后台任务**: 前端触发后台任务（具体机制待确认），传递产业名。
    *   **任务初始化**: 后台任务生成任务 ID，存入 Redis (状态: Pending)。
    *   **调用 OpenRouter**: 后台任务使用 `industryGraph.ts` Prompt 调用模型 (`GRAPH_MODEL_NAME`)。
    *   **结果存储**: 任务等待模型返回 JSON 图谱，存入 Redis (Key: 任务 ID)，更新 Redis 状态 (Completed/Failed)。
2.  **状态查询 (Frontend & `/api/status`)**: 前端轮询 `/api/status`，查询 Redis 中任务状态。
3.  **获取图谱 (Frontend & `/api/graph`)**: 任务完成后，前端请求 `/api/graph`，从 Redis 获取图谱数据。
4.  **图谱渲染 (Frontend)**: `IndustryChainChart.tsx` 渲染图谱。
5.  **公司分析 (HTML - `/api/company-analysis-html`)**:
    *   **用户请求 (Frontend)**: 点击公司，前端请求 `/api/company-analysis-html` (带公司名等信息)。
    *   **缓存检查 (API)**: 检查内存/Redis缓存。
    *   **调用 OpenRouter (API - 若无缓存)**: 使用 `companyAnalysisHTML.ts` Prompt 调用模型 (`COMPANY_HTML_MODEL`)。
    *   **结果处理 (API)**: 存储结果到缓存，返回 HTML 给前端。
    *   **前端展示**: `CompanyReportModal.tsx` 展示 HTML。
6.  **公司分析 (JSON/MD - `/api/company-analysis`)**:
    *   **用户请求 (Frontend)**: (若需要) 请求 `/api/company-analysis`。
    *   **调用 OpenRouter (API)**: 使用 `companyAnalysis.ts` Prompt 调用模型 (`COMPANY_ANALYSIS_MODEL_NAME`)。
    *   **结果处理 (API)**: 返回 JSON/Markdown 给前端。

*(注意: `/api/submit` 已部分弃用, `/api/webhook` 已禁用)*

## 6. 项目架构概览

本项目是一个基于 Next.js 的产业图谱生成和展示应用，**通过 OpenRouter 进行 AI 模型调用**。其主要架构如下：

- **`src/app`**: Next.js 应用核心目录。
    - **`page.tsx`**: 应用主页面。
    - **`graph/[id]/page.tsx`**: 图谱展示页面。
    - **`api/`**: 后端 API 路由。
        - **`submit/route.ts`**: (已部分弃用) 建议前端调整。
        - **`status/route.ts`**: 查询后台任务状态 (Redis)。
        - **`graph/route.ts`**: 获取图谱数据 (Redis)。
        - **`company-analysis/route.ts`**: 调用 OpenRouter 生成 JSON/MD 分析。
        - **`company-analysis-html/route.ts`**: 调用 OpenRouter 生成 HTML 分析 (含缓存)。
        - **`feedback/route.ts`**: 处理用户反馈。
        - **`webhook/route.ts`**: (已禁用)。
- **`src/components`**: 可复用 React 组件 (列表同上)。
- **`src/lib`**: 核心库和客户端。
    - **`redis.ts`**: Redis 客户端。
    - *(可能包含 OpenRouter 客户端/辅助函数)*
- **`src/prompts`**: AI 模型 Prompt 模板。
    - `industryGraph.ts`, `companyAnalysis.ts`, `companyAnalysisHTML.ts`
- **`src/types`**: TypeScript 类型定义。
- **`src/utils`**: 通用工具函数 (列表同上)。
- **`public/`**: 静态资源。
- **`scripts/`**: (推断) 辅助脚本。
- **`.env.*`**: 环境变量配置文件 (含 OpenRouter Keys, 模型名, Redis 配置)。
- **`next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`**: 项目配置文件。
