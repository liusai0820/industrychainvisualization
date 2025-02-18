# 产业链全景图谱分析系统

一个基于AI技术的产业链分析工具，能够智能生成完整的产业链图谱，并提供深度的企业分析报告。

## 功能特点

- **智能产业链分析**：自动生成完整的产业链图谱，包括上中下游各环节及其代表企业
- **交互式可视化**：采用树状图展示产业链结构，支持缩放、平移等交互操作
- **企业深度分析**：点击企业节点即可获取AI生成的详细分析报告，包括：
  - 投资亮点分析
  - 核心技术优势
  - 市场竞争格局
  - 风险提示分析
  - 发展前景展望
- **报告导出功能**：
  - 支持导出产业链图谱为高清PNG图片
  - 支持导出企业分析报告为Markdown格式
- **智能缓存机制**：
  - 自动缓存已生成的企业分析报告
  - 二次查看无需重新生成，响应更快
- **响应式设计**：完美适配各种屏幕尺寸，提供最佳的用户体验

## 在线演示

访问 [产业链图谱分析系统](https://your-demo-url.com) 体验完整功能。

## 快速开始

1. 克隆项目到本地：
```bash
git clone https://github.com/liusai0820/industrychainvisualization.git
cd industrychainvisualization
```

2. 安装依赖：
```bash
pip install -r requirements.txt
```

3. 运行应用：
```bash
python app.py
```

4. 打开浏览器访问：`http://localhost:5001`

## 使用说明

1. **生成产业链图谱**：
   - 在搜索框中输入产业链名称（如：AI芯片、新能源汽车等）
   - 点击"生成图谱"按钮或按回车键
   - 等待几秒钟，系统将自动生成完整的产业链图谱

2. **查看企业分析**：
   - 在产业链图谱中点击任意企业节点
   - 系统将弹出该企业的详细分析报告
   - 首次生成可能需要等待几秒钟

3. **导出功能**：
   - 点击"下载图谱"按钮可导出当前产业链图谱为PNG图片
   - 在企业分析报告中点击"下载报告"可将分析内容导出为Markdown文件

## 技术栈

- 后端：Python + Flask
- 前端：HTML + JavaScript + Tailwind CSS
- 可视化：ECharts
- AI接口：Dify API

## 项目结构

```
industrychainvisualization/
├── app.py                 # 主应用程序
├── requirements.txt       # 项目依赖
├── README.md             # 项目文档
├── LICENSE               # 开源协议
└── templates/            # 前端模板
    └── index.html        # 主页面
```

## 本地开发

1. 确保已安装Python 3.8+
2. 安装项目依赖：`pip install -r requirements.txt`
3. 设置环境变量（可选）：
   ```bash
   export FLASK_ENV=development
   export FLASK_DEBUG=1
   ```
4. 运行开发服务器：`python app.py`

## 部署

支持多种部署方式：
- Docker容器化部署
- 云服务器直接部署
- Serverless部署

## 贡献指南

欢迎提交Issue和Pull Request。

## 开源协议

本项目采用 MIT 许可证，查看 [LICENSE](LICENSE) 了解更多信息。

## 联系方式

- 作者：liusai
- 邮箱：liusai64@gmail.com
- GitHub：[github.com/liusai0820](https://github.com/liusai0820)

## 更新日志

### v2.0.0 (2024-03-19)
- 🎉 重大更新：全面升级技术架构
- 🔄 将前端框架迁移至 Streamlit，提供更流畅的用户体验
- ⚡️ 优化后端性能，提升响应速度
- 🎨 重新设计用户界面，提供更直观的操作体验
- 📊 改进产业链图谱展示效果
- 🔍 增强数据分析能力
- 🛠️ 更新核心依赖包版本

### v1.1.0 (2024-01-22)
- 新增企业分析报告功能
- 优化图谱显示效果
- 添加报告导出功能
- 改进用户界面交互

### v1.0.0 (2024-01-21)
- 首次发布
- 基础产业链分析功能
- 可视化图谱展示

## 致谢

感谢以下开源项目：
- [Flask](https://flask.palletsprojects.com/)
- [ECharts](https://echarts.apache.org/)
- [Tailwind CSS](https://tailwindcss.com/)

## 示例产业链

- AI芯片产业链
- 新能源汽车产业链
- 光伏产业链
- 工业机器人产业链
- 半导体产业链
- 新能源电池产业链
- 智能手机产业链
- 云计算产业链

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

### v1.1.0 (2024-01-22)
- 新增企业分析功能
- 优化图谱展示效果
- 添加图谱导出功能
- 改进用户界面交互

### v1.0.0 (2024-01-21)
- 🎉 首次发布
- ✨ 基础产业链分析功能
- 🎨 可视化图谱展示
- 💾 图谱导出功能 