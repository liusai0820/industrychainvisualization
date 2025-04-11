import { IndustryCategory } from '@/types';

export const PRESET_INDUSTRIES: IndustryCategory[] = [
    {
        id: 'strategic',
        name: '战略性新兴产业',
        description: '深圳重点发展的20个战略性新兴产业',
        industries: [
            {
                id: 'network-comm',
                name: '网络与通信',
                category: 'strategic',
                icon: '📡',
                description: '新一代通信网络技术与设备'
            },
            {
                id: 'semiconductor',
                name: '半导体与集成电路',
                category: 'strategic',
                icon: '🔲',
                description: '芯片设计与制造'
            },
            {
                id: 'ultra-hd',
                name: '超高清视频显示',
                category: 'strategic',
                icon: '🖥️',
                description: '新型显示技术与设备'
            },
            {
                id: 'smart-terminal',
                name: '智能终端',
                category: 'strategic',
                icon: '📳',
                description: '智能手机及智能硬件'
            },
            {
                id: 'smart-sensor',
                name: '智能传感器',
                category: 'strategic',
                icon: '🔍',
                description: '新型传感技术与设备'
            },
            {
                id: 'software',
                name: '软件与信息服务',
                category: 'strategic',
                icon: '📲',
                description: '软件开发与信息服务'
            },
            {
                id: 'digital-creative',
                name: '数字创意',
                category: 'strategic',
                icon: '🎨',
                description: '数字内容与创意设计'
            },
            {
                id: 'modern-fashion',
                name: '现代时尚',
                category: 'strategic',
                icon: '👗',
                description: '时尚设计与制造'
            },
            {
                id: 'industrial-machine',
                name: '工业母机',
                category: 'strategic',
                icon: '🏭',
                description: '高端工业装备'
            },
            {
                id: 'smart-robot',
                name: '智能机器人',
                category: 'strategic',
                icon: '🤖',
                description: '机器人研发与制造'
            },
            {
                id: 'laser-manufacturing',
                name: '激光与增材制造',
                category: 'strategic',
                icon: '⚡',
                description: '3D打印与激光技术'
            },
            {
                id: 'precision-instrument',
                name: '精密仪器设备',
                category: 'strategic',
                icon: '🔬',
                description: '精密测量与控制设备'
            },
            {
                id: 'new-energy',
                name: '新能源',
                category: 'strategic',
                icon: '☀️',
                description: '清洁能源技术与设备'
            },
            {
                id: 'energy-saving',
                name: '安全节能环保',
                category: 'strategic',
                icon: '♻️',
                description: '节能环保技术与设备'
            },
            {
                id: 'smart-vehicle',
                name: '智能网联汽车',
                category: 'strategic',
                icon: '🚗',
                description: '智能汽车与车联网'
            },
            {
                id: 'new-material',
                name: '新材料',
                category: 'strategic',
                icon: '🔮',
                description: '先进材料研发与制造'
            },
            {
                id: 'medical-device',
                name: '高端医疗器械',
                category: 'strategic',
                icon: '🏥',
                description: '医疗设备研发与制造'
            },
            {
                id: 'bio-medicine',
                name: '生物医药',
                category: 'strategic',
                icon: '💊',
                description: '生物制药与医药研发'
            },
            {
                id: 'healthcare',
                name: '大健康',
                category: 'strategic',
                icon: '💆',
                description: '健康服务与管理'
            },
            {
                id: 'marine',
                name: '海洋产业',
                category: 'strategic',
                icon: '🌊',
                description: '海洋资源开发与利用'
            }
        ]
    },
    {
        id: 'future',
        name: '未来产业',
        description: '深圳布局的8个未来产业',
        industries: [
            {
                id: 'synthetic-bio',
                name: '合成生物',
                category: 'future',
                icon: '🧬',
                description: '合成生物技术研发'
            },
            {
                id: 'blockchain',
                name: '区块链技术',
                category: 'future',
                icon: '₿',
                description: '区块链技术研发与应用'
            },
            {
                id: 'cell-gene',
                name: '细胞与基因技术',
                category: 'future',
                icon: '🦠',
                description: '细胞与基因治疗技术'
            },
            {
                id: 'aerospace',
                name: '空天技术',
                category: 'future',
                icon: '🚀',
                description: '航空航天技术研发'
            },
            {
                id: 'brain-science',
                name: '脑科学与类脑智能',
                category: 'future',
                icon: '🧠',
                description: '脑科学研究与应用'
            },
            {
                id: 'deep-tech',
                name: '深地深海技术',
                category: 'future',
                icon: '🌊',
                description: '深地深海资源开发'
            },
            {
                id: 'light-computing',
                name: '可见光通信与光计算',
                category: 'future',
                icon: '💡',
                description: '光通信与光计算技术'
            },
            {
                id: 'quantum',
                name: '量子信息',
                category: 'future',
                icon: '⚛️',
                description: '量子计算与通信'
            }
        ]
    }
]; 