// DOM元素
const domElements = {
    searchBtn: null,
    industryInput: null,
    searchPage: null,
    chartContainer: null,
    logoContainer: null,
    searchContainer: null,
    particlesCanvas: null,
    modal: null,
    modalTitle: null,
    modalContent: null,
    loadingSpinner: null,
    downloadBtn: null,
    progressContainer: null,
    progressText: null,
    progressSteps: null,
    progressLine: null,
    chatButton: null,
    chatModal: null,
    closeChat: null,
    chatInput: null,
    sendMessage: null,
    chatMessages: null
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
    domElements.modal = document.getElementById('company-modal');
    domElements.modalTitle = document.getElementById('modal-title');
    domElements.modalContent = document.getElementById('modal-content');
    domElements.loadingSpinner = document.getElementById('loading-spinner');
    domElements.downloadBtn = document.getElementById('download-report-btn');
    domElements.progressContainer = document.getElementById('progress-container');
    domElements.progressText = document.getElementById('progress-text');
    domElements.progressSteps = document.getElementsByClassName('progress-step');
    domElements.progressLine = document.getElementById('progress-line');
    domElements.chatButton = document.getElementById('chat-button');
    domElements.chatModal = document.getElementById('chat-modal');
    domElements.closeChat = document.getElementById('close-chat');
    domElements.chatInput = document.getElementById('chat-input');
    domElements.sendMessage = document.getElementById('send-message');
    domElements.chatMessages = document.getElementById('chat-messages');
    
    // 验证必要的DOM元素
    const requiredElements = ['searchBtn', 'industryInput', 'searchPage', 'chartContainer'];
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
    totalSteps: 3,
    
    async start() {
        console.log('Starting progress system...');
        this.currentStep = 0;
        this.show();
        this.moveUIForProgress();
        await this.updateProgress(0, '正在收集产业链数据...');
    },

    show() {
        console.log('Showing progress container');
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
        } else {
            console.error('Progress container not found');
        }
    },

    hide() {
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    },

    moveUIForProgress() {
        console.log('Moving UI elements for progress');
        const logoContainer = document.getElementById('logo-container');
        const searchContainer = document.getElementById('search-container');

        if (logoContainer) {
            logoContainer.style.transform = 'translateY(-200px)';
        }
        if (searchContainer) {
            searchContainer.style.transform = 'translateY(-180px)';
        }
    },

    async updateProgress(step, text) {
        console.log('Updating progress:', step, text);
        this.currentStep = step;

        // 更新进度文本
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = text;
        }

        // 更新进度线
        const progressLine = document.getElementById('progress-line');
        if (progressLine) {
            const percentage = (step / (this.totalSteps - 1)) * 100;
            progressLine.style.width = `${percentage}%`;
            console.log('Progress line width set to:', `${percentage}%`);
        } else {
            console.error('Progress line element not found');
        }

        // 更新进度步骤
        const steps = document.getElementsByClassName('progress-step');
        if (steps && steps.length > 0) {
            Array.from(steps).forEach((stepEl, index) => {
                if (index <= step) {
                    stepEl.classList.add('active');
                    stepEl.style.opacity = '1';
                    stepEl.style.transform = 'translateY(0)';
                }
            });
        } else {
            console.error('Progress steps not found');
        }

        // 添加延迟以显示进度动画
        await new Promise(resolve => setTimeout(resolve, 1000));
    },

    reset() {
        console.log('Resetting progress system');
        this.currentStep = 0;
        this.hide();
        
        const steps = document.getElementsByClassName('progress-step');
        if (steps) {
            Array.from(steps).forEach(step => {
                step.classList.remove('active');
                step.style.opacity = '0';
                step.style.transform = 'translateY(20px)';
            });
        }
        
        const progressLine = document.getElementById('progress-line');
        if (progressLine) {
            progressLine.style.width = '0';
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
        this.chart = echarts.init(domElements.chartContainer.querySelector('.chart-wrapper'));
        console.log('Chart initialized');
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            if (this.chart) {
                this.chart.resize();
            }
        });
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
                // 确保图表容器有正确的尺寸
                domElements.chartContainer.style.height = '100vh';
                domElements.chartContainer.style.width = '100vw';
                this.chart.resize();
            }

            // 生成并设置图表配置
            const option = this.generateChartOption(data);
            console.log('Chart option generated:', option);
            
            // 设置图表配置
            this.chart.setOption(option, true);
            console.log('Chart option set successfully');
            
        } catch (error) {
            console.error('Error showing chart:', error);
            UISystem.showError('图表显示失败：' + error.message);
        }
    },

    generateChartOption(data) {
        console.log('Generating chart option with data:', data);
        
        // 确保数据有效性
        if (!data || !data.children || !Array.isArray(data.children)) {
            console.error('Invalid data structure:', data);
            throw new Error('数据结构无效');
        }

        // 处理数据
        const { nodes, links } = this.processData(data);
        console.log('Processed nodes:', nodes);
        console.log('Processed links:', links);

        return {
            backgroundColor: '#061831',
            tooltip: {
                show: true,
                formatter: '{b}'
            },
            series: [{
                type: 'graph',
                layout: 'force',
                force: {
                    repulsion: 200,
                    gravity: 0.1,
                    edgeLength: 100,
                    layoutAnimation: true
                },
                data: nodes,
                links: links,
                roam: true,
                draggable: true,
                symbolSize: 30,
                itemStyle: {
                    color: '#4b7bec',
                    borderColor: '#fff',
                    borderWidth: 2
                },
                lineStyle: {
                    color: '#4b7bec',
                    width: 1,
                    opacity: 0.6
                },
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{b}',
                    fontSize: 12,
                    color: '#fff',
                    backgroundColor: 'transparent'
                },
                emphasis: {
                    focus: 'adjacency',
                    lineStyle: {
                        width: 2
                    }
                }
            }]
        };
    },

    processData(data) {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();

        // 处理每个部分
        data.children.forEach((section, sectionIndex) => {
            if (!section.children) return;

            section.children.forEach((category, categoryIndex) => {
                if (!category.name) return;

                // 添加类别节点
                const categoryId = `category_${sectionIndex}_${categoryIndex}`;
                nodes.push({
                    id: categoryId,
                    name: category.name,
                    value: category.name,
                    category: 0
                });
                nodeMap.set(category.name, categoryId);

                // 处理公司节点
                if (category.children && Array.isArray(category.children)) {
                    category.children.forEach((company, companyIndex) => {
                        if (!company.name) return;

                        const companyId = `company_${sectionIndex}_${categoryIndex}_${companyIndex}`;
                        nodes.push({
                            id: companyId,
                            name: company.name,
                            value: company.name,
                            category: 1
                        });
                        nodeMap.set(company.name, companyId);

                        // 添加连接
                        links.push({
                            source: categoryId,
                            target: companyId
                        });
                    });
                }
            });
        });

        return { nodes, links };
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
        if (domElements.downloadBtn) {
            domElements.downloadBtn.classList.remove('hidden');
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
            
            await ProgressSystem.updateProgress(0, '正在收集产业链数据...');
            
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
            
            await ProgressSystem.updateProgress(1, '正在分析产业链结构...');
            
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

            await ProgressSystem.updateProgress(2, '正在生成产业链图谱...');
            
            console.log('开始生成图表...');
            await ChartSystem.show(data);
            
            console.log('图表生成完成');
            await ProgressSystem.updateProgress(2, '图谱生成完成！');
            
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
        
        // 搜索相关事件
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

        // 图表点击事件
        if (ChartSystem.chart) {
            ChartSystem.chart.on('click', async (params) => {
                if (params.data && !params.data.children) {
                    await this.handleCompanyClick(params.data.name);
                }
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
    },

    async handleCompanyClick(companyName) {
        try {
            if (!companyName) {
                throw new Error('公司名称不能为空');
            }
            
            // 显示加载动画
            if (domElements.loadingSpinner) {
                domElements.loadingSpinner.classList.remove('hidden');
            }
            
            const result = await DataSystem.fetchCompanyAnalysis(companyName);
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // 更新模态框内容
            if (domElements.modalTitle) {
                domElements.modalTitle.textContent = `${companyName} - 企业分析报告`;
            }
            
            if (domElements.modalContent) {
                domElements.modalContent.innerHTML = '';
                result.data.forEach(section => {
                    const sectionDiv = document.createElement('div');
                    sectionDiv.className = 'analysis-section mb-6';
                    sectionDiv.innerHTML = `
                        <h3 class="section-title">${section.title}</h3>
                        <div class="section-content">${section.content}</div>
                    `;
                    domElements.modalContent.appendChild(sectionDiv);
                });
            }
            
            // 显示模态框
            if (domElements.modal) {
                domElements.modal.classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Company analysis error:', error);
            UISystem.showError(error.message || '获取公司分析失败');
        } finally {
            // 隐藏加载动画
            if (domElements.loadingSpinner) {
                domElements.loadingSpinner.classList.add('hidden');
            }
        }
    }
};

// 聊天系统
const ChatSystem = {
    currentConversationId: null,

    initialize() {
        if (!domElements.chatButton || !domElements.chatModal) return;

        // 绑定事件监听器
        domElements.chatButton.addEventListener('click', () => this.toggleChat());
        domElements.closeChat.addEventListener('click', () => this.hideChat());
        domElements.sendMessage.addEventListener('click', () => this.sendMessage());
        domElements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        console.log('Chat system initialized');
    },

    toggleChat() {
        domElements.chatModal.classList.toggle('hidden');
        if (!domElements.chatModal.classList.contains('hidden')) {
            domElements.chatInput.focus();
        }
    },

    hideChat() {
        domElements.chatModal.classList.add('hidden');
    },

    renderMarkdown(text) {
        // 处理标题
        text = text.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>');
        text = text.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mb-3">$1</h2>');
        text = text.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>');

        // 处理加粗
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // 处理斜体
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // 处理序号列表
        text = text.replace(/^\d+\. (.+)$/gm, '<div class="ml-4 mb-2">• $1</div>');

        // 处理无序列表
        text = text.replace(/^- (.+)$/gm, '<div class="ml-4 mb-2">• $1</div>');

        // 处理段落
        text = text.replace(/^(?!<[h|d]).+$/gm, '<p class="mb-4">$&</p>');

        // 处理空行
        text = text.replace(/^\s*$/gm, '<div class="h-4"></div>');

        return text;
    },

    addMessage(content, isUser = false) {
        const messageHtml = `
            <div class="flex items-start space-x-2 ${isUser ? 'justify-end' : ''}">
                ${!isUser ? `
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                ` : ''}
                <div class="bg-${isUser ? 'blue' : 'gray'}-100 rounded-lg p-3 max-w-xs">
                    <p class="text-sm text-gray-800">${content}</p>
                </div>
            </div>
        `;
        domElements.chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        this.scrollToBottom();
    },

    showLoading() {
        const loadingHtml = `
            <div class="flex items-start space-x-2 loading-message">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg class="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                </div>
                <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
                    <p class="text-sm text-gray-500">正在思考...</p>
                </div>
            </div>
        `;
        domElements.chatMessages.insertAdjacentHTML('beforeend', loadingHtml);
        this.scrollToBottom();
    },

    removeLoading() {
        const loadingMessage = domElements.chatMessages.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    },

    scrollToBottom() {
        domElements.chatMessages.scrollTop = domElements.chatMessages.scrollHeight;
    },

    async sendMessage() {
        const message = domElements.chatInput.value.trim();
        if (!message) return;

        // 清空输入框
        domElements.chatInput.value = '';

        // 添加用户消息
        this.addMessage(message, true);
        
        try {
            // 显示加载状态
            this.showLoading();

            // 创建AI回复的消息容器
            const aiMessageContainer = document.createElement('div');
            aiMessageContainer.className = 'flex items-start space-x-2';
            aiMessageContainer.innerHTML = `
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
                    <p class="text-sm text-gray-800"></p>
                </div>
            `;

            // 发送请求到后端
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversation_id: this.currentConversationId
                })
            });

            // 移除加载状态
            this.removeLoading();

            if (!response.ok) {
                throw new Error('网络请求失败');
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiMessageContent = '';

            // 添加AI消息容器到聊天界面
            domElements.chatMessages.appendChild(aiMessageContainer);
            const aiMessageText = aiMessageContainer.querySelector('p');

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.error) {
                                aiMessageText.textContent = `错误: ${data.error}`;
                                break;
                            }

                            if (data.event === 'message') {
                                aiMessageContent += data.answer || '';
                                aiMessageText.innerHTML = this.renderMarkdown(aiMessageContent);
                                this.currentConversationId = data.conversation_id;
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
                this.scrollToBottom();
            }

        } catch (error) {
            console.error('Error:', error);
            this.removeLoading();
            this.addMessage('发生错误，请稍后重试');
        }
    }
};

// 应用初始化
function initializeApp() {
    console.log('Initializing app...');
    
    // 初始化DOM元素
    initializeDOMElements();
    
    // 初始化各个系统
    ParticleSystem.initialize();
    ChartSystem.initialize();
    EventSystem.initialize();
    ChatSystem.initialize();
    
    console.log('App initialization completed');
}

// 确保DOM加载完成后再初始化应用
document.addEventListener('DOMContentLoaded', initializeApp);