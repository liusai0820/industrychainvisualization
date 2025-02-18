'use client';

import { PresetIndustry } from '@/types';

interface PresetIndustryCardProps {
    industry: PresetIndustry;
    onClick: (industry: PresetIndustry) => void;
}

export default function PresetIndustryCard({ industry, onClick }: PresetIndustryCardProps) {
    return (
        <div
            className="flex items-center p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200
                     transition-all duration-200 cursor-pointer gap-3 hover:shadow-md group"
            onClick={() => onClick(industry)}
        >
            <div className="text-xl group-hover:scale-110 transition-transform duration-200">
                {industry.icon}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                    {industry.name}
                </h3>
            </div>
        </div>
    );
} 