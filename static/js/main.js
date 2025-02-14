// 全局变量
let chart = null;

// 初始化函数
function initializeApp() {
    console.log('Initializing app...');
    
    // 初始化图表
    initializeChart();
}

// 处理搜索事件
async function handleSearch() {
    console.log('handleSearch called');
    const industryInput = document.getElementById('industry-input');
    const industryName = industryInput.value.trim();
    
    if (!industryName) {
        showError('请输入产业链名称');
        return;
    }
    
    console.log('Fetching data for industry:', industryName);
    startProgress();
    await fetchGraphData(industryName);
}

// 获取图谱数据
async function fetchGraphData(industryName) {
    console.log('fetchGraphData called with:', industryName);
    const searchPage = document.getElementById('search-page');
    const chartContainer = document.getElementById('chart-container');
    
    try {
        // 第一步：数据收集
        updateProgress(0, '正在收集产业链数据...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 发送请求
        const response = await fetch('/get_graph_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ industry_name: industryName })
        });

        // 第二步：结构分析
        updateProgress(1, '正在分析产业链结构...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || '获取数据失败');
        }

        // 第三步：图谱生成
        updateProgress(2, '正在生成产业链图谱...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 更新图表
        updateChart(data);
        
        // 显示完成状态
        updateProgress(2, '图谱生成完成！');
        
        // 等待一会儿再显示图表
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 隐藏搜索页面，显示图表
        if (searchPage && chartContainer) {
            searchPage.classList.add('hidden');
            chartContainer.classList.remove('hidden');
        }
        
        // 显示下载按钮
        showDownloadButton();
    } catch (error) {
        console.error('Error in fetchGraphData:', error);
        showError(error.message || '获取数据失败，请稍后重试');
        
        // 重置进度条
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }
}

// 初始化图表
function initializeChart() {
    const chartContainer = document.querySelector('.chart-wrapper');
    if (chartContainer && !chart) {
        chart = echarts.init(chartContainer);
        window.addEventListener('resize', () => {
            if (chart) {
                chart.resize();
            }
        });
    }
}

// 处理数据结构
function processData(data) {
    try {
        if (!data) {
            throw new Error('数据不能为空');
        }

        // 处理API直接返回的错误信息
        if (data.error) {
            throw new Error(data.error);
        }

        // 获取产业链名称
        const chainName = data.产业链 || data.name || '未知产业链';
        
        // 创建三个主要环节（上中下游）
        const mainSections = ['上游', '中游', '下游'];
        const processedData = {
            name: chainName,
            children: mainSections.map(section => ({
                name: section,
                children: []
            }))
        };

        // 处理环节数据
        const levels = data.环节 || data.children || [];
        levels.forEach(level => {
            const levelName = level.环节名称 || level.name;
            const sectionIndex = mainSections.findIndex(section => levelName.includes(section));
            
            if (sectionIndex !== -1) {
                const subLevels = level.子环节 || level.children || [];
                processedData.children[sectionIndex].children = subLevels.map(subLevel => {
                    const subLevelName = subLevel.子环节名称 || subLevel.name;
                    let companies = [];

                    if (subLevel.代表公司) {
                        if (typeof subLevel.代表公司 === 'string') {
                            companies = subLevel.代表公司.split(/[,、；;]/).map(c => c.trim()).filter(Boolean);
                        } else if (Array.isArray(subLevel.代表公司)) {
                            companies = subLevel.代表公司;
                        }
                    } else if (subLevel.children) {
                        companies = subLevel.children.map(c => c.name || '未知公司').filter(Boolean);
                    }

                    return {
                        name: subLevelName,
                        children: companies.map(company => ({
                            name: typeof company === 'string' ? company : company.name || '未知公司'
                        }))
                    };
                });
            }
        });

        return processedData;
    } catch (error) {
        console.error('数据处理错误:', error);
        showError(error.message || '数据格式无效');
        return {
            name: '数据处理错误',
            children: []
        };
    }
}

// 更新图表
function updateChart(data) {
    if (!chart) {
        initializeChart();
    }

    const processedData = processData(data);

    const option = {
        backgroundColor: '#ffffff',
        title: {
            text: processedData.name,
            left: 'center',
            top: 20,
            textStyle: {
                fontSize: 24,
                fontWeight: 'bold',
                color: '#333'
            }
        },
        graphic: []
    };

    // 定义三列的基本配置
    const columns = [
        { name: '上游', color: '#4477ee', left: '5%', width: '26%', title: '上游：基础设施与软件' },
        { name: '中游', color: '#44aa44', left: '37%', width: '26%', title: '中游：设备制造与集成' },
        { name: '下游', color: '#ee7744', left: '69%', width: '26%', title: '下游：应用服务' }
    ];

    // 计算每列的最大高度
    let maxHeight = 120;

    // 渲染每一列
    processedData.children.forEach((stream, columnIndex) => {
        const column = columns[columnIndex];
        let currentY = 120;

        // 添加列标题
        option.graphic.push({
            type: 'group',
            left: column.left,
            top: 70,
            children: [
                {
                    type: 'rect',
                    shape: {
                        width: column.width,
                        height: 40,
                        r: 4
                    },
                    style: {
                        fill: column.color,
                        opacity: 0.1
                    }
                },
                {
                    type: 'text',
                    style: {
                        text: column.title,
                        font: 'bold 16px sans-serif',
                        fill: column.color,
                        textAlign: 'left',
                        textVerticalAlign: 'middle'
                    },
                    left: 15,
                    top: 20
                }
            ]
        });

        // 渲染每个分类卡片
        stream.children.forEach((segment) => {
            const companyCount = segment.children.length;
            const cardHeight = 40 + (companyCount * 30) + 20;

            option.graphic.push({
                type: 'group',
                left: column.left,
                top: currentY,
                children: [
                    {
                        type: 'rect',
                        shape: {
                            width: column.width,
                            height: cardHeight,
                            r: 8
                        },
                        style: {
                            fill: '#ffffff',
                            stroke: column.color,
                            lineWidth: 1,
                            shadowBlur: 4,
                            shadowColor: 'rgba(0,0,0,0.1)',
                            shadowOffsetX: 0,
                            shadowOffsetY: 2
                        }
                    },
                    {
                        type: 'text',
                        left: 15,
                        top: 15,
                        style: {
                            text: segment.name,
                            font: 'bold 14px sans-serif',
                            fill: column.color,
                            textAlign: 'left'
                        }
                    },
                    ...segment.children.map((company, index) => ({
                        type: 'text',
                        left: 20,
                        top: 45 + (index * 30),
                        style: {
                            text: company.name,
                            font: '13px sans-serif',
                            fill: '#333333',
                            textAlign: 'left'
                        },
                        onclick: function() {
                            showCompanyAnalysis(company.name);
                        }
                    }))
                ]
            });

            currentY += cardHeight + 20;
        });

        maxHeight = Math.max(maxHeight, currentY);
    });

    // 添加顶部横条
    option.graphic.push({
        type: 'group',
        top: 70,
        left: '5%',
        children: [
            {
                type: 'rect',
                shape: {
                    width: '90%',
                    height: 40,
                    r: 0
                },
                style: {
                    fill: '#f0f2f5'
                }
            }
        ]
    });

    const chartContainer = document.querySelector('.chart-wrapper');
    chartContainer.style.height = `${maxHeight + 50}px`;

    chart.setOption(option);
    chart.resize();
}

// 错误提示函数
function showError(message) {
    console.log('Showing error:', message);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-500 ease-in-out';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // 添加动画
    setTimeout(() => errorDiv.style.transform = 'translateX(120%)', 3000);
    setTimeout(() => errorDiv.remove(), 3500);
}

// 显示下载按钮
function showDownloadButton() {
    console.log('Showing download button');
    const downloadBtn = document.getElementById('download-report-btn');
    if (downloadBtn) {
        downloadBtn.classList.remove('hidden');
    }
}

// 开始进度动画
function startProgress() {
    const searchPage = document.getElementById('search-page');
    const progressContainer = document.getElementById('progress-container');
    const logoContainer = document.getElementById('logo-container');
    const searchContainer = document.getElementById('search-container');
    
    // 显示进度容器
    progressContainer.classList.remove('hidden');
    
    // 移动搜索框和Logo到顶部
    logoContainer.style.transform = 'translateY(-200px)';
    searchContainer.style.transform = 'translateY(-180px)';
    
    // 初始化进度
    let currentStep = 0;
    const steps = [
        '正在收集产业链数据...',
        '正在分析产业链结构...',
        '正在生成产业链图谱...'
    ];
    
    // 更新第一步
    updateProgress(0, steps[0]);
    
    // 模拟进度更新
    const interval = setInterval(() => {
        currentStep++;
        if (currentStep < steps.length) {
            updateProgress(currentStep, steps[currentStep]);
        } else {
            clearInterval(interval);
        }
    }, 3000);
    
    return interval;
}

// 显示图表
function showChart(data) {
    const searchPage = document.getElementById('search-page');
    const chartContainer = document.getElementById('chart-container');
    const progressContainer = document.getElementById('progress-container');
    
    // 淡出搜索页面
    searchPage.style.opacity = '0';
    searchPage.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        // 隐藏搜索页面和进度条
        searchPage.style.display = 'none';
        progressContainer.style.display = 'none';
        
        // 显示图表容器
        chartContainer.classList.remove('hidden');
        chartContainer.style.opacity = '0';
        
        setTimeout(() => {
            // 淡入图表
            chartContainer.style.opacity = '1';
            chartContainer.style.transform = 'none';
            
            // 确保图表正确渲染
            if (chart) {
                chart.resize();
            }
        }, 50);
    }, 500);
}

// 重置UI
function resetUI() {
    const searchPage = document.getElementById('search-page');
    const chartContainer = document.getElementById('chart-container');
    const progressContainer = document.getElementById('progress-container');
    const logoContainer = document.getElementById('logo-container');
    const searchContainer = document.getElementById('search-container');
    
    // 重置所有状态
    searchPage.style.display = 'flex';
    searchPage.style.opacity = '1';
    searchPage.style.transform = 'none';
    
    chartContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
    
    logoContainer.style.transform = 'none';
    searchContainer.style.transform = 'none';
    
    // 重置进度条
    const steps = document.querySelectorAll('.progress-step');
    const progressLine = document.querySelector('.progress-line');
    
    steps.forEach(step => {
        step.classList.remove('active');
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';
    });
    
    progressLine.style.width = '0';
}

// 显示企业分析
async function showCompanyAnalysis(companyName) {
    const modal = document.getElementById('company-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const loadingSpinner = document.getElementById('loading-spinner');
    const downloadBtn = document.getElementById('download-report-btn');
    
    modal.classList.remove('hidden');
    modalTitle.textContent = `${companyName} - 企业分析`;
    modalContent.innerHTML = '';
    loadingSpinner.classList.remove('hidden');
    downloadBtn.classList.add('hidden');
    
    try {
        const response = await fetch('/get_company_analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ company_name: companyName })
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            let formattedContent = '<div class="analysis-content p-8">';
            
            result.data.forEach(section => {
                formattedContent += `
                    <div class="analysis-section mb-8 bg-white rounded-lg shadow-sm">
                        <div class="section-title text-lg font-semibold mb-3 pb-2 border-b">
                            ${section.title}
                        </div>
                        <div class="section-content space-y-3 text-gray-700">
                            ${section.content}
                        </div>
                    </div>
                `;
            });
            
            formattedContent += '</div>';
            modalContent.innerHTML = formattedContent;
            
            downloadBtn.classList.remove('hidden');
            downloadBtn.onclick = () => {
                window.open(`/download_report/${encodeURIComponent(companyName)}`, '_blank');
            };
        } else {
            throw new Error(result.error || '获取数据失败');
        }
    } catch (error) {
        console.error('Error:', error);
        modalContent.innerHTML = `
            <div class="text-center py-8">
                <svg class="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-lg text-gray-600 mb-2">发生错误</p>
                <p class="text-sm text-gray-500">${error.message}</p>
            </div>
        `;
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

// 更新进度动画
function updateProgress(step, text) {
    console.log('Updating progress:', step, text);
    const steps = document.querySelectorAll('.progress-step');
    const progressLine = document.querySelector('.progress-line');
    const progressText = document.getElementById('progress-text');
    const progressContainer = document.getElementById('progress-container');

    // 显示进度容器
    if (progressContainer) {
        progressContainer.classList.remove('hidden');
    }

    // 更新进度文本
    if (progressText) {
        progressText.textContent = text;
    }

    // 更新进度条
    if (progressLine) {
        progressLine.style.width = `${(step / (steps.length - 1)) * 100}%`;
    }

    // 更新步骤状态
    steps.forEach((stepEl, index) => {
        if (index <= step) {
            stepEl.classList.add('active');
            stepEl.style.opacity = '1';
            stepEl.style.transform = 'translateY(0)';
        }
    });
}

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    const searchBtn = document.getElementById('search-btn');
    const industryInput = document.getElementById('industry-input');
    
    console.log('Search button:', searchBtn);
    console.log('Industry input:', industryInput);
    
    if (searchBtn && industryInput) {
        searchBtn.addEventListener('click', handleSearch);
        industryInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        console.log('Event listeners added successfully');
    } else {
        console.error('Could not find search button or industry input');
    }
});

function handleSearch() {
    console.log('handleSearch called');
    const industryInput = document.getElementById('industry-input');
    const industryName = industryInput.value.trim();
    
    if (!industryName) {
        showError('请输入产业链名称');
        return;
    }
    
    console.log('Fetching data for industry:', industryName);
    startProgress();
    fetchGraphData(industryName);
}