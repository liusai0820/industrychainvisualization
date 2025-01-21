# 产业链全景图谱分析系统

一个基于 Python 和 ECharts 的产业链可视化工具，能够自动生成和展示完整的产业链图谱。本系统利用 AI 技术，帮助用户快速理解和分析不同行业的产业链结构。

## 功能特点

- 🔍 智能分析产业链结构
- 📊 自动生成交互式图谱
- 🎨 美观的可视化效果
- 📱 响应式设计，支持多设备访问
- 💾 支持图谱导出为PNG格式
- 🖱️ 支持图谱缩放和平移
- 🤖 基于AI的智能分析
- 🔄 实时数据更新

## 在线演示

[在线体验地址](#) (即将上线)

## 快速开始

### 环境要求

- Python 3.8+
- pip
- 现代浏览器（Chrome, Firefox, Safari, Edge 等）

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/liusai0820/industrychainvisualization.git
cd industrychainvisualization
```

2. 安装依赖
```bash
pip install -r requirements.txt
```

3. 设置环境变量（可选）
```bash
export DIFY_API_KEY="your_api_key"  # Linux/macOS
set DIFY_API_KEY=your_api_key       # Windows
```

4. 运行应用
```bash
python app.py
```

5. 打开浏览器访问
```
http://localhost:5000
```

## 使用说明

1. 在输入框中输入想要分析的产业链名称（如：AI芯片、新能源汽车等）
2. 点击"生成图谱"按钮
3. 等待系统生成产业链图谱（通常需要 5-10 秒）
4. 可以使用鼠标滚轮或触控板进行上下滚动查看完整图谱
5. 点击"下载图谱"按钮可以将图谱保存为PNG格式

### 最佳实践
- 输入具体的产业链名称会得到更好的结果
- 建议使用全屏模式查看大型产业链图谱
- 可以使用浏览器的缩放功能调整整体视图

## 示例产业链

- AI芯片产业链
- 新能源汽车产业链
- 光伏产业链
- 工业机器人产业链
- 半导体产业链
- 新能源电池产业链
- 智能手机产业链
- 云计算产业链

## 技术栈

- 后端：Python + Flask
- 前端：HTML + JavaScript + ECharts
- UI：Tailwind CSS
- API：Dify.AI
- 数据处理：JSON
- 版本控制：Git

## 项目结构

```
industrychainvisualization/
├── app.py              # 主应用文件
├── requirements.txt    # 项目依赖
├── templates/         
│   └── index.html     # 主页面模板
├── static/            
│   └── style.css      # 样式文件
├── README.md          # 项目文档
└── LICENSE            # MIT许可证
```

## 本地开发

1. 克隆项目到本地
2. 创建并激活虚拟环境（推荐）
```bash
python -m venv venv
source venv/bin/activate  # Unix/macOS
venv\Scripts\activate     # Windows
```
3. 安装开发依赖
```bash
pip install -r requirements.txt
```
4. 运行开发服务器
```bash
python app.py
```

## 部署

支持多种部署方式：

- 传统服务器
- Docker 容器
- 云平台 (AWS, GCP, Azure 等)

详细部署文档请参考 [部署指南](#) (即将添加)

### 注意事项
- 确保服务器有足够的内存（建议至少 1GB）
- 需要配置正确的 CORS 策略
- 建议使用 HTTPS 协议
- 注意 API 密钥的安全存储

## 常见问题

1. Q: 为什么图谱生成较慢？
   A: 图谱生成涉及 AI 分析，通常需要 5-10 秒，属于正常现象。

2. Q: 如何处理大规模产业链？
   A: 系统会自动调整布局，建议使用全屏模式查看。

3. Q: 是否支持自定义主题？
   A: 目前使用预设主题，自定义主题功能正在开发中。

## 贡献指南

欢迎提交 Issue 和 Pull Request！提交时请：

1. Fork 本仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- 作者：liusai
- Email：liusai64@gmail.com
- GitHub：[liusai0820](https://github.com/liusai0820)

## 致谢

- [ECharts](https://echarts.apache.org/) - 强大的图表库
- [Tailwind CSS](https://tailwindcss.com/) - 实用的 CSS 框架
- [Dify.AI](https://dify.ai/) - AI 接口服务
- 所有贡献者和用户

## 更新日志

### v1.0.0 (2024-01-21)
- 🎉 首次发布
- ✨ 基础产业链分析功能
- 🎨 可视化图谱展示
- 💾 图谱导出功能 