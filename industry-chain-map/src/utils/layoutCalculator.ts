import { MainSection } from '@/types';

interface LayoutMetrics {
    contentWeight: number;    // 内容权重
    depth: number;           // 层级深度
    childrenCount: number;   // 子节点数量
    companiesCount: number;  // 公司数量
}

interface SectionLayout {
    width: string;          // CSS宽度值
    layout: 'column' | 'row';  // 布局方式
    order: number;          // 显示顺序
}

export interface LayoutConfig {
    width: string;
    layout: 'column' | 'row';
    order: number;
}

// 计算内容权重
function calculateContentWeight(section: MainSection): LayoutMetrics {
    let depth = 1;
    let childrenCount = 0;
    let companiesCount = 0;

    section.children?.forEach(subSection => {
        childrenCount += 1;
        subSection.children?.forEach(subSubSection => {
            childrenCount += 1;
            companiesCount += subSubSection.children?.length || 0;
        });
    });

    // 计算深度
    if (section.children?.length) {
        depth += 1;
        if (section.children[0].children?.length) {
            depth += 1;
        }
    }

    return {
        contentWeight: childrenCount * 0.3 + companiesCount * 0.7, // 公司数量权重更高
        depth,
        childrenCount,
        companiesCount
    };
}

// 判断是否需要混合布局
function shouldUseHybridLayout(metrics: LayoutMetrics[]): boolean {
    const totalWeight = metrics.reduce((sum, m) => sum + m.contentWeight, 0);
    const avgWeight = totalWeight / metrics.length;
    
    // 如果任何一个部分的权重超过平均值的2倍，使用混合布局
    return metrics.some(m => m.contentWeight > avgWeight * 2);
}

// 计算最佳宽度比例
function calculateWidthRatio(metrics: LayoutMetrics[]): string[] {
    const totalWeight = metrics.reduce((sum, m) => sum + m.contentWeight, 0);
    
    return metrics.map(m => {
        const ratio = Math.max(25, Math.min(50, (m.contentWeight / totalWeight) * 100));
        return `${Math.round(ratio)}%`;
    });
}

// 导出布局计算函数
export function calculateOptimalLayout(sections: MainSection[]): SectionLayout[] {
    // 计算每个部分的内容指标
    const metrics = sections.map(calculateContentWeight);
    
    // 判断是否使用混合布局
    const useHybrid = shouldUseHybridLayout(metrics);
    
    if (useHybrid) {
        // 找出内容最多的部分
        const maxWeightIndex = metrics.reduce((maxIdx, curr, idx, arr) => 
            curr.contentWeight > arr[maxIdx].contentWeight ? idx : maxIdx, 0);
            
        // 为内容最多的部分分配更多空间
        return metrics.map((m, index) => ({
            width: index === maxWeightIndex ? '45%' : '27.5%',
            layout: 'column',
            order: index
        }));
    } else {
        // 使用动态比例的三栏布局
        const widths = calculateWidthRatio(metrics);
        return metrics.map((_, index) => ({
            width: widths[index],
            layout: 'column',
            order: index
        }));
    }
} 