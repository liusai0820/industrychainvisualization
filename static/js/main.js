// DOM元素
const domElements = {
    searchBtn: null,
    industryInput: null,
    searchPage: null,
    chartContainer: null,
    logoContainer: null,
    searchContainer: null,
    particlesCanvas: null,
    downloadChartBtn: null,
    progressContainer: null,
    progressLine: null,
    progressStages: null,
    progressText: null,
    progressDetail: null,
    progressPercentage: null
};

// 初始化DOM元素
function initializeDOMElements() {
    console.log('Initializing DOM elements...');
    
    domElements.searchBtn = document.getElementById('search-btn');
    domElements.industryInput = document.getElementById('industry-input');
    domElements.searchPage = document.getElementById('search-page');
    domElements.chartContainer = document.getElementById('chart-container');
    domElements.logoContainer = document.getElementById('logo-container');
    domElements.searchContainer = document.getElementById('search-container');
    domElements.particlesCanvas = document.getElementById('particles-canvas');
    domElements.downloadChartBtn = document.getElementById('download-chart-btn');
    domElements.progressContainer = document.getElementById('progress-container');
    domElements.progressLine = document.getElementById('progress-line');
    domElements.progressStages = document.querySelectorAll('.progress-stage');
    domElements.progressText = document.getElementById('progress-text');
    domElements.progressDetail = document.getElementById('progress-detail');
    domElements.progressPercentage = document.querySelector('.progress-percentage');
    
    // 创建并添加下载图谱按钮
    const downloadChartBtn = document.createElement('button');
    downloadChartBtn.id = 'download-chart-btn';
    downloadChartBtn.className = 'fixed top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors z-50 flex items-center space-x-1';
    downloadChartBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        <span class="text-sm">下载图谱</span>
    `;
    downloadChartBtn.style.display = 'none';
    document.body.appendChild(downloadChartBtn);
    domElements.downloadChartBtn = downloadChartBtn;
    
    // 验证必要的DOM元素
    const requiredElements = ['searchBtn', 'industryInput', 'searchPage', 'chartContainer', 'progressContainer'];
    requiredElements.forEach(elementName => {
        if (!domElements[elementName]) {
            console.error(`Required DOM element not found: ${elementName}`);
        }
    });
    
    console.log('DOM elements initialized');
}

// 全局变量和DOM元素缓存
let chart = null;

// 粒子动画系统
const ParticleSystem = {
    particles: [],
    particleCount: 50,
    ctx: null,

    initialize() {
        if (!domElements.particlesCanvas) return;
        
        this.ctx = domElements.particlesCanvas.getContext('2d');
        this.resizeCanvas();
        this.createParticles();
        this.startAnimation();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    },

    resizeCanvas() {
        if (!domElements.particlesCanvas) return;
        domElements.particlesCanvas.width = window.innerWidth;
        domElements.particlesCanvas.height = window.innerHeight;
    },

    createParticles() {
        this.particles = Array.from({ length: this.particleCount }, () => ({
            x: Math.random() * domElements.particlesCanvas.width,
            y: Math.random() * domElements.particlesCanvas.height,
            size: Math.random() * 3 + 1,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 2 - 1,
            opacity: Math.random() * 0.5 + 0.2
        }));
    },

    updateParticles() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, domElements.particlesCanvas.width, domElements.particlesCanvas.height);
        
        this.particles.forEach(particle => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            if (particle.x < 0 || particle.x > domElements.particlesCanvas.width) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > domElements.particlesCanvas.height) particle.speedY *= -1;

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(37, 99, 235, ${particle.opacity})`;
            this.ctx.fill();
        });

        requestAnimationFrame(() => this.updateParticles());
    },

    startAnimation() {
        this.updateParticles();
    }
};

// 进度系统
const ProgressSystem = {
    currentStep: 0,
    currentProgress: 0,
    targetProgress: 0,
    animationFrame: null,
    
    progressStages: [
        { name: '数据采集', progress: 30, detail: '正在智能采集产业链数据' },
        { name: '分析处理', progress: 60, detail: '正在深度分析产业关联' },
        { name: '图谱构建', progress: 100, detail: '正在构建产业链图谱' }
    ],
    
    async start() {
        console.log('Starting progress system...');
        this.currentStep = 0;
        this.currentProgress = 0;
        this.targetProgress = 0;
        this.show();
        await this.updateProgress(0, true);
    },

    show() {
        if (domElements.progressContainer) {
            domElements.progressContainer.classList.remove('hidden');
        }
    },

    hide() {
        if (domElements.progressContainer) {
            domElements.progressContainer.classList.add('hidden');
        }
    },

    animateProgress() {
        if (this.currentProgress < this.targetProgress) {
            // 使用缓动函数使动画更自然
            const diff = this.targetProgress - this.currentProgress;
            const step = Math.max(0.5, diff * 0.1); // 根据差值调整步长
            
            this.currentProgress = Math.min(this.targetProgress, this.currentProgress + step);
            this.updateStageUI(this.currentProgress);
            
            if (this.currentProgress < this.targetProgress) {
                this.animationFrame = requestAnimationFrame(() => this.animateProgress());
            }
        }
    },

    updateStageUI(progress) {
        if (!domElements.progressStages) return;
        
        // 更新进度线
        if (domElements.progressLine) {
            domElements.progressLine.style.width = `${progress}%`;
        }

        // 更新百分比显示
        if (domElements.progressPercentage) {
            domElements.progressPercentage.textContent = `${Math.round(progress)}%`;
        }
        
        // 更新各阶段状态
        domElements.progressStages.forEach((stage, index) => {
            const stageProgress = parseInt(stage.dataset.progress);
            if (progress >= stageProgress) {
                stage.classList.add('active');
            } else {
                stage.classList.remove('active');
            }
        });
    },

    async updateProgress(step, isDetailedProgress = false) {
        if (step < this.currentStep) return; // 防止进度回退
        
        this.currentStep = step;
        const stage = this.progressStages[step];
        
        // 更新进度文本
        if (domElements.progressText) {
            domElements.progressText.textContent = stage.detail;
        }

        // 设置目标进度并启动动画
        if (step === this.progressStages.length - 1) {
            // 如果是最后一步，先到99%
            this.targetProgress = 99;
            this.animateProgress();
            
            // 等待一段时间后再到100%
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.targetProgress = stage.progress;
            this.animateProgress();
        } else {
            this.targetProgress = stage.progress;
            this.animateProgress();
        }

        // 添加适当的延迟，让用户能看清进度
        await new Promise(resolve => setTimeout(resolve, 800));
    },

    reset() {
        this.currentStep = 0;
        this.currentProgress = 0;
        this.targetProgress = 0;
        
        // 取消正在进行的动画
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        this.hide();
        
        if (domElements.progressLine) {
            domElements.progressLine.style.width = '0';
        }
        
        if (domElements.progressPercentage) {
            domElements.progressPercentage.textContent = '0%';
        }
        
        if (domElements.progressStages) {
            domElements.progressStages.forEach(stage => {
                stage.classList.remove('active');
            });
        }
        
        if (domElements.progressText) {
            domElements.progressText.textContent = this.progressStages[0].detail;
        }
        if (domElements.progressDetail) {
            domElements.progressDetail.textContent = '';
        }
    }
};

// 图表系统
const ChartSystem = {
    chart: null,
    
    initialize() {
        console.log('Initializing chart system...');
        if (!domElements.chartContainer) {
            console.error('Chart container not found');
            return;
        }

        // 初始化ECharts实例
        const chartWrapper = domElements.chartContainer.querySelector('.chart-wrapper');
        if (!chartWrapper) {
            console.error('Chart wrapper not found');
            return;
        }

        // 设置容器样式
        chartWrapper.style.width = '100%';
        chartWrapper.style.height = '100vh';
        chartWrapper.style.position = 'relative';

        this.chart = echarts.init(chartWrapper, null, {
            renderer: 'canvas',
            width: 'auto',
            height: 'auto'
        });

        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            if (this.chart) {
                this.chart.resize();
            }
        });

        console.log('Chart initialized');
    },

    async show(data) {
        console.log('Showing chart with data:', data);
        if (!this.chart) {
            console.error('Chart not initialized');
        return;
    }

    try {
            // 隐藏搜索页面
            if (domElements.searchPage) {
                domElements.searchPage.style.display = 'none';
            }

            // 显示图表容器
            if (domElements.chartContainer) {
                domElements.chartContainer.classList.remove('hidden');
                domElements.chartContainer.style.display = 'block';
                
                // 创建一个包含整个图谱的容器
                const chartWrapper = domElements.chartContainer.querySelector('.chart-wrapper');
                if (chartWrapper) {
                    // 设置包装器样式
                    chartWrapper.style.cssText = `
                        width: 100%;
                        height: auto;
                        min-height: 100vh;
                        margin: 0 auto;
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        padding: 20px;
                        position: relative;
                        overflow-y: auto;
                    `;
                    
                    // 计算实际内容高度
                    const contentHeight = this.calculateTotalHeight(data);
                    chartWrapper.style.height = `${contentHeight}px`;
                    
                    // 确保容器至少有视口高度
                    const minHeight = Math.max(contentHeight, window.innerHeight);
                    chartWrapper.style.minHeight = `${minHeight}px`;
                }
            }

            // 生成并设置图表配置
            const option = this.generateChartOption(data);
            console.log('Chart option generated:', option);
            
            // 设置图表配置
            await this.chart.setOption(option, true);
            console.log('Chart option set successfully');
            
            // 重新调整大小以适应内容
            this.chart.resize({
                width: 'auto',
                height: this.calculateTotalHeight(data)
            });
            
            // 显示下载按钮
            if (domElements.downloadChartBtn) {
                domElements.downloadChartBtn.style.display = 'flex';
            }
            
        } catch (error) {
            console.error('Error showing chart:', error);
            UISystem.showError('图表显示失败：' + error.message);
        }
    },

    generateChartOption(data) {
        // 获取视口大小
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 计算基础缩放比例
        const baseScale = Math.min(viewportWidth / 1920, viewportHeight / 1080);
        
        // 调整字体大小和间距
        const fontSize = {
            title: Math.max(20, Math.floor(24 * baseScale)),
            mainSection: Math.max(14, Math.floor(16 * baseScale)),
            subSection: Math.max(12, Math.floor(14 * baseScale)),
            subSubSection: Math.max(11, Math.floor(12 * baseScale)),
            company: Math.max(10, Math.floor(11 * baseScale))
        };
        
        // 调整间距
        const spacing = {
            section: Math.max(12, Math.floor(15 * baseScale)),
            card: Math.max(10, Math.floor(12 * baseScale)),
            text: Math.max(6, Math.floor(8 * baseScale)),
            lineHeight: Math.max(14, Math.floor(16 * baseScale))
        };

        // 计算每个区域所需的最大高度
        const calculateSectionHeight = (section) => {
            let height = spacing.section * 4; // 顶部和底部间距
            height += fontSize.mainSection * 3; // 主标题高度

            if (Array.isArray(section.children)) {
                section.children.forEach(subSection => {
                    let subSectionHeight = spacing.card * 4; // 子区域内边距
                    subSectionHeight += fontSize.subSection * 1.5; // 子标题高度

                    if (Array.isArray(subSection.children)) {
                        subSection.children.forEach(subSubSection => {
                            let itemHeight = fontSize.subSubSection * 1.5; // 子子标题高度
                            itemHeight += spacing.text; // 标题和内容间距

                            // 计算公司列表高度
                            if (Array.isArray(subSubSection.children)) {
                                const companyText = subSubSection.children
                                    .map(company => company.name)
                                    .filter(Boolean)
                                    .join('、');
                                
                                const maxWidth = (viewportWidth / 3) - spacing.section * 8;
                                const wrappedText = this.wrapText(companyText, maxWidth, fontSize.company);
                                itemHeight += wrappedText.length * spacing.lineHeight;
                            }

                            subSectionHeight += itemHeight + spacing.text * 2;
                        });
                    }

                    height += subSectionHeight + spacing.card * 2;
                });
            }

            return height;
        };

        // 计算所有区域的最大高度
        let maxSectionHeight = 0;
        data.children.forEach(section => {
            maxSectionHeight = Math.max(maxSectionHeight, calculateSectionHeight(section));
        });

        // 确保最小高度不小于视口高度
        maxSectionHeight = Math.max(maxSectionHeight, viewportHeight - 100);

        return {
            backgroundColor: '#ffffff',
            title: {
                text: data.name || '产业链全景图谱',
                left: 'center',
                top: 15,
                textStyle: {
                    color: '#1F2937',
                    fontSize: fontSize.title,
                    fontWeight: 'bold'
                }
            },
            grid: {
                top: 60,
                bottom: 20,
                left: 20,
                right: 20,
                containLabel: true
            },
            xAxis: {
                show: false,
                type: 'value',
                min: 0,
                max: 100
            },
            yAxis: {
                show: false,
                type: 'value',
                min: 0,
                max: maxSectionHeight
            },
            series: [{
                type: 'custom',
                renderItem: (params, api) => {
                    const coordSys = params.coordSys;
                    const width = coordSys.width;
                    const sectionWidth = width / 3;
                    
                    // 颜色方案
                    const colors = {
                        upstream: {
                            bg: '#EBF3FF',
                            border: '#2563eb',
                            title: '#2563eb'
                        },
                        midstream: {
                            bg: '#F0FDF4',
                            border: '#059669',
                            title: '#059669'
                        },
                        downstream: {
                            bg: '#FFF7ED',
                            border: '#EA580C',
                            title: '#EA580C'
                        }
                    };

                    const sections = [];
                    
                    // 渲染三个主要区域
                    data.children.forEach((mainSection, index) => {
                        const x = coordSys.x + index * sectionWidth;
                        const y = coordSys.y;
                        const colorScheme = index === 0 ? colors.upstream :
                                          index === 1 ? colors.midstream : colors.downstream;
                        
                        // 主区域背景
                        sections.push({
                            type: 'rect',
                            shape: {
                                x: x + spacing.section,
                                y: y + spacing.section,
                                width: sectionWidth - spacing.section * 2,
                                height: maxSectionHeight - spacing.section * 2,
                                r: 8
                            },
                            style: {
                                fill: colorScheme.bg,
                                stroke: colorScheme.border,
                                lineWidth: 2,
                                shadowBlur: 10,
                                shadowColor: 'rgba(0, 0, 0, 0.1)',
                                shadowOffsetY: 4
                            }
                        });

                        // 主区域标题
                        sections.push({
                            type: 'rect',
                            shape: {
                                x: x + sectionWidth * 0.1,
                                y: y + spacing.section * 2,
                                width: sectionWidth * 0.8,
                                height: fontSize.mainSection * 2,
                                r: 4
                            },
                            style: {
                                fill: '#FFFFFF',
                                stroke: colorScheme.border,
                                lineWidth: 1
                            }
                        });

                        sections.push({
                            type: 'text',
                            style: {
                                text: mainSection.name,
                                textAlign: 'center',
                                textVerticalAlign: 'middle',
                                fontSize: fontSize.mainSection,
                                fontWeight: 'bold',
                                fill: colorScheme.title,
                                x: x + sectionWidth / 2,
                                y: y + spacing.section * 2 + fontSize.mainSection
                            }
                        });

                        // 渲染子环节
                        let currentY = y + spacing.section * 4 + fontSize.mainSection * 2;
                        
                        if (Array.isArray(mainSection.children)) {
                            mainSection.children.forEach(subSection => {
                                const cardX = x + spacing.section * 2;
                                const cardWidth = sectionWidth - spacing.section * 4;
                                let cardHeight = spacing.card * 2;

                                // 计算卡片实际高度
                                if (Array.isArray(subSection.children)) {
                                    subSection.children.forEach(subSubSection => {
                                        cardHeight += fontSize.subSubSection * 1.5 + spacing.text;
                                        
                                        if (Array.isArray(subSubSection.children)) {
                                            const companyText = subSubSection.children
                                                .map(company => company.name)
                                                .filter(Boolean)
                                                .join('、');
                                            
                                            const maxWidth = cardWidth - spacing.card * 4;
                                            const wrappedText = this.wrapText(companyText, maxWidth, fontSize.company);
                                            cardHeight += wrappedText.length * spacing.lineHeight + spacing.text;
                                        }
                                    });
                                }

                                // 卡片背景
                                sections.push({
                                    type: 'rect',
                                    shape: {
                                        x: cardX,
                                        y: currentY,
                                        width: cardWidth,
                                        height: cardHeight + spacing.card * 2,
                                        r: 6
                                    },
                                    style: {
                                        fill: '#FFFFFF',
                                        stroke: '#E5E7EB',
                                        lineWidth: 1,
                                        shadowBlur: 6,
                                        shadowColor: 'rgba(0, 0, 0, 0.05)',
                                        shadowOffsetY: 2
                                    }
                                });

                                // 子环节标题
                                sections.push({
                                    type: 'text',
                                    style: {
                                        text: subSection.name,
                                        textAlign: 'left',
                                        textVerticalAlign: 'middle',
                                        fontSize: fontSize.subSection,
                                        fontWeight: 'bold',
                                        fill: '#1F2937',
                                        x: cardX + spacing.card,
                                        y: currentY + spacing.card + fontSize.subSection
                                    }
                                });

                                let contentY = currentY + spacing.card * 2 + fontSize.subSection;

                                // 渲染子子环节和公司列表
                                if (Array.isArray(subSection.children)) {
                                    subSection.children.forEach(subSubSection => {
                                        contentY += spacing.text;

                                        // 子子环节标题
                                        sections.push({
                                            type: 'text',
                                            style: {
                                                text: subSubSection.name,
                                                textAlign: 'left',
                                                textVerticalAlign: 'middle',
                                                fontSize: fontSize.subSubSection,
                                                fill: '#374151',
                                                x: cardX + spacing.card * 2,
                                                y: contentY
                                            }
                                        });

                                        contentY += fontSize.subSubSection * 1.5;

                                        // 公司列表
                                        if (Array.isArray(subSubSection.children)) {
                                            const companyText = subSubSection.children
                                                .map(company => company.name)
                                                .filter(Boolean)
                                                .join('、');
                                            
                                            const maxWidth = cardWidth - spacing.card * 4;
                                            const wrappedText = this.wrapText(companyText, maxWidth, fontSize.company);
                                            
                                            wrappedText.forEach((line, lineIndex) => {
                                                sections.push({
                                                    type: 'text',
                                                    style: {
                                                        text: line,
                                                        textAlign: 'left',
                                                        textVerticalAlign: 'middle',
                                                        fontSize: fontSize.company,
                                                        fill: '#6B7280',
                                                        x: cardX + spacing.card * 2,
                                                        y: contentY + lineIndex * spacing.lineHeight
                                                    }
                                                });
                                            });
                                            
                                            contentY += wrappedText.length * spacing.lineHeight + spacing.text;
                                        }
                                    });
                                }

                                currentY = contentY + spacing.card * 3;
                            });
                        }
                    });

                    return {
                        type: 'group',
                        children: sections
                    };
                },
                data: [0]
            }]
        };
    },

    // 文本自动换行辅助函数
    wrapText(text, maxWidth, fontSize) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px sans-serif`;

        const words = text.split('、');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = context.measureText(currentLine + '、' + word).width;
            if (width < maxWidth) {
                currentLine += '、' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        return lines;
    },

    processDataForGraph(data) {
        const nodes = [];
        const fixedWidth = 1920;
        const fixedHeight = 1080;
        const padding = {
            top: 80,
            bottom: 60,
            left: 160,
            right: 160
        };

        // 计算可用空间
        const availableWidth = fixedWidth - padding.left - padding.right;
        const availableHeight = fixedHeight - padding.top - padding.bottom;
        const sectionWidth = availableWidth / 3;
        const sectionPadding = 40;

        // 添加主标题
        nodes.push({
            id: 'main-title',
            name: data.name,
            x: fixedWidth / 2,
            y: padding.top / 2,
            symbolSize: 0,
            label: {
                show: true,
                fontSize: 32,
                fontWeight: 'bold',
                color: '#1F2937',
                position: 'center'
            }
        });

        // 颜色方案
        const colors = {
            upstream: {
                bg: '#EBF3FF',
                border: '#2563eb',
                title: '#2563eb'
            },
            midstream: {
                bg: '#F0FDF4',
                border: '#059669',
                title: '#059669'
            },
            downstream: {
                bg: '#FFF7ED',
                border: '#EA580C',
                title: '#EA580C'
            }
        };

        // 处理每个主环节（上中下游）
        data.children.forEach((mainSection, index) => {
            const sectionLeft = padding.left + index * sectionWidth;
            const colorScheme = index === 0 ? colors.upstream : 
                              index === 1 ? colors.midstream : colors.downstream;
            
            // 主区域背景
            nodes.push({
                id: `section_bg_${index}`,
                name: '',
                x: sectionLeft + sectionWidth / 2,
                y: padding.top + availableHeight / 2,
                symbolSize: 0,
                itemStyle: {
                    color: colorScheme.bg,
                    borderColor: colorScheme.border,
                    borderWidth: 2,
                    borderRadius: 12,
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.1)',
                    shadowOffsetX: 0,
                    shadowOffsetY: 4
                },
                z: -1,
                width: sectionWidth - sectionPadding,
                height: availableHeight,
                shape: 'rect'
            });

            // 主区域标题
            nodes.push({
                id: `section_${index}`,
                name: mainSection.name,
                x: sectionLeft + sectionWidth / 2,
                y: padding.top + 40,
                symbolSize: 0,
                label: {
                    show: true,
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: colorScheme.title,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 4,
                    padding: [8, 16],
                    position: 'center'
                }
            });

            // 处理子环节
            if (Array.isArray(mainSection.children)) {
                let currentY = padding.top + 100;
                
                mainSection.children.forEach((subSection, subIndex) => {
                    const cardWidth = sectionWidth - sectionPadding * 2;
                    const cardLeft = sectionLeft + sectionPadding;
                    
                    // 子环节卡片背景
                    const subCardNode = {
                        id: `sub_section_bg_${index}_${subIndex}`,
                        name: '',
                        x: cardLeft + cardWidth / 2,
                        y: currentY,
                        symbolSize: 0,
                        itemStyle: {
                            color: '#FFFFFF',
                            borderColor: '#E5E7EB',
                            borderWidth: 1,
                            borderRadius: 8,
                            shadowBlur: 6,
                            shadowColor: 'rgba(0, 0, 0, 0.05)',
                            shadowOffsetX: 0,
                            shadowOffsetY: 2
                        },
                        z: -0.5,
                        width: cardWidth,
                        height: 0,
                        shape: 'rect'
                    };
                    nodes.push(subCardNode);

                    // 子环节标题
                    nodes.push({
                        id: `sub_section_${index}_${subIndex}`,
                        name: subSection.name,
                        x: cardLeft + 20,
                        y: currentY + 25,
                        symbolSize: 0,
                        label: {
                            show: true,
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: '#1F2937',
                            position: 'left'
                        }
                    });

                    let contentHeight = 60;

                    // 处理子-子环节和公司列表
                    if (Array.isArray(subSection.children)) {
                        subSection.children.forEach((subSubSection, subSubIndex) => {
                            // 子-子环节标题
                            nodes.push({
                                id: `sub_sub_section_${index}_${subIndex}_${subSubIndex}`,
                                name: subSubSection.name,
                                x: cardLeft + 40,
                                y: currentY + contentHeight,
                                symbolSize: 0,
                                label: {
                                    show: true,
                                    fontSize: 14,
                                    color: '#374151',
                                    position: 'left'
                                }
                            });

                            contentHeight += 30;

                            // 处理公司列表
                            if (Array.isArray(subSubSection.children)) {
                                const companyNames = subSubSection.children
                                    .map(company => company.name)
                                    .filter(name => name && typeof name === 'string')
                                    .join('、');

                                if (companyNames) {
                                    const maxWidth = cardWidth - 80;
                                    const fontSize = 12;
                                    const lineHeight = 20;
                                    
                                    // 计算文本行数
                                    const charsPerLine = Math.floor(maxWidth / (fontSize * 1.2));
                                    const lines = Math.ceil(companyNames.length / charsPerLine);
                                    const textHeight = lines * lineHeight;

                                    nodes.push({
                                        id: `companies_${index}_${subIndex}_${subSubIndex}`,
                                        name: companyNames,
                                        x: cardLeft + 40,
                                        y: currentY + contentHeight,
                                        symbolSize: 0,
                                        label: {
                                            show: true,
                                            fontSize: fontSize,
                                            color: '#6B7280',
                                            position: 'left',
                                            width: maxWidth,
                                            overflow: 'break',
                                            lineHeight: lineHeight
                                        }
                                    });

                                    contentHeight += textHeight + 20;
                                }
                            }
                        });
                    }

                    // 更新卡片高度和位置
                    subCardNode.height = contentHeight + 20;
                    subCardNode.y = currentY + contentHeight / 2;
                    currentY += contentHeight + 40;
                });
            }
        });

        return { nodes, links: [] };
    },

    processLinksForGraph(data) {
        // 不需要连接线，返回空数组
        return [];
    },

    // 计算总高度的辅助方法
    calculateTotalHeight(data) {
        // 基础高度（标题和顶部间距）
        let baseHeight = 80; // 减少顶部间距
        
        if (data.children && Array.isArray(data.children)) {
            // 计算实际内容高度
            const contentHeights = data.children.map(section => {
                let sectionHeight = 60; // 减少主标题高度
                
                if (section.children && Array.isArray(section.children)) {
                    section.children.forEach(subSection => {
                        let cardHeight = 50; // 减少子标题高度
                        
                        if (subSection.children && Array.isArray(subSection.children)) {
                            subSection.children.forEach(subSubSection => {
                                let itemHeight = 40; // 减少子子标题高度
                                
                                // 计算公司列表实际所需高度
                                if (subSubSection.children && Array.isArray(subSubSection.children)) {
                                    const companyText = subSubSection.children
                                        .map(company => company.name)
                                        .filter(Boolean)
                                        .join('、');
                                    
                                    const maxWidth = (window.innerWidth / 3) - 80; // 减少边距
                                    const lines = this.wrapText(companyText, maxWidth, 12);
                                    itemHeight += lines.length * 20; // 减少行高
                                }
                                
                                cardHeight += itemHeight + 20; // 减少内部间距
                            });
                        }
                        
                        sectionHeight += cardHeight + 30; // 减少卡片间距
                    });
                }
                
                return sectionHeight;
            });
            
            // 找出最大高度并添加适当的边距
            const maxContentHeight = Math.max(...contentHeights);
            baseHeight += maxContentHeight + 60; // 减少底部边距
        }
        
        return baseHeight;
    },

    calculateContentHeight(data) {
        let height = 100; // 标题和顶部间距
        
        if (data.children && Array.isArray(data.children)) {
            const maxSectionHeight = data.children.reduce((max, section) => {
                let sectionHeight = 80; // 主标题高度
                
                if (section.children && Array.isArray(section.children)) {
                    section.children.forEach(subSection => {
                        let subSectionHeight = 60; // 子标题高度
                        
                        if (subSection.children && Array.isArray(subSection.children)) {
                            subSection.children.forEach(subSubSection => {
                                let itemHeight = 40; // 子子标题高度
                                
                                if (subSubSection.children && Array.isArray(subSubSection.children)) {
                                    const companyCount = subSubSection.children.length;
                                    itemHeight += Math.ceil(companyCount / 3) * 25; // 估算公司列表高度
                                }
                                
                                subSectionHeight += itemHeight;
                            });
                        }
                        
                        sectionHeight += subSectionHeight + 40; // 添加间距
                    });
                }
                
                return Math.max(max, sectionHeight);
            }, 0);
            
            height += maxSectionHeight;
        }
        
        return height + 100; // 添加底部间距
    },

    // 修改下载图表方法
    downloadChart() {
        if (this.chart) {
            try {
                // 显示加载提示
                UISystem.showError('正在生成图片，请稍候...');

                // 获取当前图表配置
                const option = this.chart.getOption();
                
                // 获取图表实例的DOM容器
                const chartDom = this.chart.getDom();
                
                // 获取实际内容的边界
                const chartRect = chartDom.getBoundingClientRect();
                const chartComponents = chartDom.querySelectorAll('canvas');
                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;
                
                chartComponents.forEach(canvas => {
                    const rect = canvas.getBoundingClientRect();
                    minX = Math.min(minX, rect.left - chartRect.left);
                    maxX = Math.max(maxX, rect.right - chartRect.left);
                    minY = Math.min(minY, rect.top - chartRect.top);
                    maxY = Math.max(maxY, rect.bottom - chartRect.top);
                });
                
                // 计算实际内容尺寸
                const contentWidth = maxX - minX;
                const contentHeight = maxY - minY;
                
                // 创建临时容器
                const tempContainer = document.createElement('div');
                tempContainer.style.cssText = `
                    position: fixed;
                    top: -9999px;
                    left: -9999px;
                    width: ${contentWidth}px;
                    height: ${contentHeight}px;
                    background: white;
                    z-index: -1;
                `;
                document.body.appendChild(tempContainer);

                // 创建临时图表实例
                const tempChart = echarts.init(tempContainer, null, {
                    renderer: 'canvas',
                    width: contentWidth,
                    height: contentHeight
                });

                // 调整配置以适应导出
                const exportOption = {
                    ...option,
                    title: {
                        ...option.title,
                        top: 20
                    },
                    grid: {
                        top: 80,
                        bottom: 20,
                        left: 20,
                        right: 20,
                        containLabel: true
                    },
                    backgroundColor: '#ffffff'
                };

                // 设置图表配置
                tempChart.setOption(exportOption);

                // 等待图表渲染完成
                setTimeout(() => {
                    try {
                        // 使用 ECharts 的 getDataURL 方法获取图片
                        const url = tempChart.getDataURL({
                            type: 'png',
                            pixelRatio: 2,
                            backgroundColor: '#fff',
                            excludeComponents: ['toolbox']
                        });

                        // 下载图片
                        const link = document.createElement('a');
                        link.download = `${option.title[0].text || '产业链图谱'}.png`;
                        link.href = url;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        // 清理资源
                        tempChart.dispose();
                        document.body.removeChild(tempContainer);

                        UISystem.showError('图谱已成功下载');
                    } catch (error) {
                        console.error('Error generating chart image:', error);
                        UISystem.showError('生成图片失败，请重试');
                        tempChart.dispose();
                        document.body.removeChild(tempContainer);
                    }
                }, 1000);

            } catch (error) {
                console.error('Error downloading chart:', error);
                UISystem.showError('下载图谱失败，请重试');
            }
        }
    }
};

// UI系统
const UISystem = {
    showError(message) {
        console.log('Showing error:', message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-500 ease-in-out';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.style.transform = 'translateX(120%)', 3000);
        setTimeout(() => errorDiv.remove(), 3500);
    },

    showDownloadButton() {
        console.log('Showing download button');
        if (domElements.downloadChartBtn) {
            domElements.downloadChartBtn.classList.remove('hidden');
        }
    },

    resetUI() {
        if (domElements.searchPage) {
            domElements.searchPage.style.display = 'flex';
            domElements.searchPage.style.opacity = '1';
            domElements.searchPage.style.transform = 'none';
        }

        if (domElements.chartContainer) {
            domElements.chartContainer.classList.add('hidden');
        }

        if (domElements.logoContainer) {
            domElements.logoContainer.style.transform = 'none';
        }

        if (domElements.searchContainer) {
            domElements.searchContainer.style.transform = 'none';
        }

        ProgressSystem.reset();
    }
};

// 数据处理系统
const DataSystem = {
    async fetchGraphData(industryName) {
        try {
            console.log('开始获取产业链数据:', industryName);
            
            await ProgressSystem.updateProgress(0, true);
            
            console.log('发送请求到后端...');
            const response = await fetch('/get_graph_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ industry_name: industryName })
            });

            console.log('收到后端响应:', response.status, response.statusText);
            
            // 检查响应状态
            if (!response.ok) {
                let errorMessage = `请求失败 (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    console.error('解析错误响应失败:', e);
                }
                throw new Error(errorMessage);
            }
            
            await ProgressSystem.updateProgress(1, true);
            
            console.log('开始解析响应数据...');
            const data = await response.json();
            console.log('解析后的数据:', data);
            
            // 验证数据结构
            if (!data || typeof data !== 'object') {
                throw new Error('返回的数据格式无效');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            await ProgressSystem.updateProgress(2, true);
            
            console.log('开始生成图表...');
            await ChartSystem.show(data);
            
            console.log('图表生成完成');
            await ProgressSystem.updateProgress(2, true);
            
        } catch (error) {
            console.error('获取产业链数据失败:', error);
            let errorMessage = error.message || '获取数据失败，请稍后重试';
            
            // 根据错误类型提供更具体的错误信息
            if (error instanceof TypeError && error.message.includes('fetch')) {
                errorMessage = '网络连接失败，请检查网络连接';
            } else if (error.message.includes('timeout')) {
                errorMessage = '请求超时，请稍后重试';
            } else if (error.message.includes('JSON')) {
                errorMessage = '数据格式错误，请联系管理员';
            }
            
            UISystem.showError(errorMessage);
            ProgressSystem.reset();
        }
    },

    async fetchCompanyAnalysis(companyName) {
        try {
            const response = await fetch('/get_company_analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ company_name: companyName })
            });
            
            const result = await response.json();
            return result;
            
    } catch (error) {
            console.error('Error in fetchCompanyAnalysis:', error);
            throw error;
        }
    }
};

// 事件处理系统
const EventSystem = {
    initialize() {
        console.log('Initializing event system...');
        
        if (!domElements.searchBtn || !domElements.industryInput) {
            console.error('Search elements not found');
            return;
        }

        console.log('Adding search event listeners...');
        
        // 搜索按钮点击事件
        domElements.searchBtn.addEventListener('click', async () => {
            console.log('Search button clicked');
            await this.handleSearch();
        });

        // 输入框回车事件
        domElements.industryInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                console.log('Enter key pressed');
                await this.handleSearch();
            }
        });

        // 添加下载图谱按钮事件
        if (domElements.downloadChartBtn) {
            domElements.downloadChartBtn.addEventListener('click', () => {
                ChartSystem.downloadChart();
            });
        }

        console.log('Event listeners added successfully');
    },

    async handleSearch() {
        try {
            const value = domElements.industryInput.value.trim();
            if (!value) {
                UISystem.showError('请输入产业链名称');
                return;
            }

            console.log('Starting search for:', value);
            await ProgressSystem.start();
            await DataSystem.fetchGraphData(value);
        } catch (error) {
            console.error('Search error:', error);
            UISystem.showError(error.message || '搜索过程中发生错误');
            ProgressSystem.reset();
        }
    }
};

// 初始化系统
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    initializeDOMElements();
    ParticleSystem.initialize();
    ChartSystem.initialize();
    EventSystem.initialize();
});