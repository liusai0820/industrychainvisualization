'use client';

import { IndustryCategory, PresetIndustry } from '@/types';
import PresetIndustryCard from './PresetIndustryCard';

interface PresetIndustrySectionProps {
    category: IndustryCategory;
    onIndustryClick: (industry: PresetIndustry) => void;
}

export default function PresetIndustrySection({ category, onIndustryClick }: PresetIndustrySectionProps) {
    return (
        <section className="mb-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
                {category.industries.map((industry) => (
                    <PresetIndustryCard
                        key={industry.id}
                        industry={industry}
                        onClick={onIndustryClick}
                    />
                ))}
            </div>
        </section>
    );
} 