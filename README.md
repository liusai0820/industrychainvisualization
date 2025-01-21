# 产业链全景图谱分析系统

一个基于 Python 和 ECharts 的产业链可视化工具，能够自动生成和展示完整的产业链图谱。

## 功能特点

- 🔍 智能分析产业链结构
- 📊 自动生成交互式图谱
- 🎨 美观的可视化效果
- 📱 响应式设计，支持多设备访问
- 💾 支持图谱导出为PNG格式
- 🖱️ 支持图谱缩放和平移

## 在线演示

[在线体验地址](#) (即将上线)

## 快速开始

### 环境要求

- Python 3.8+
- pip

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

3. 运行应用
```bash
python app.py
```

4. 打开浏览器访问
```
http://localhost:5000
```

## 使用说明

1. 在输入框中输入想要分析的产业链名称（如：AI芯片、新能源汽车等）
2. 点击"生成图谱"按钮
3. 等待系统生成产业链图谱
4. 可以使用鼠标滚轮或触控板进行上下滚动查看完整图谱
5. 点击"下载图谱"按钮可以将图谱保存为PNG格式

## 示例产业链

- AI芯片
- 新能源汽车
- 光伏产业
- 机器人
- 半导体

## 技术栈

- 后端：Python + Flask
- 前端：HTML + JavaScript + ECharts
- UI：Tailwind CSS
- API：Dify.AI

## 项目结构

```
industrychainvisualization/
├── app.py              # 主应用文件
├── requirements.txt    # 项目依赖
├── templates/         
│   └── index.html     # 主页面模板
├── static/            
│   └── style.css      # 样式文件
└── README.md          # 项目文档
```

## 本地开发

1. 克隆项目到本地
2. 创建并激活虚拟环境（推荐）
```bash
python -m venv venv
source venv/bin/activate  # Unix/macOS
venv\Scripts\activate     # Windows
```
3. 安装依赖
4. 运行开发服务器

## 部署

支持多种部署方式：

- 传统服务器
- Docker 容器
- 云平台 (AWS, GCP, Azure 等)

详细部署文档请参考 [部署指南](#) (即将添加)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- 作者：[Your Name]
- Email：[Your Email]
- GitHub：[Your GitHub Profile]

## 致谢

- [ECharts](https://echarts.apache.org/) - 强大的图表库
- [Tailwind CSS](https://tailwindcss.com/) - 实用的 CSS 框架
- [Dify.AI](https://dify.ai/) - AI 接口服务 