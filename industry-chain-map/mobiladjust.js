// 在IndustryChainChart.tsx中修改
const MobileView = ({ data, options, onCompanyClick }) => {
    // 移动端视图的折叠/展开逻辑
    const [expandedSection, setExpandedSection] = useState(null);
    const [expandedSubSection, setExpandedSubSection] = useState(null);
    
    return (
      <div className="pt-16 pb-24">
        {/* 折叠式导航结构 */}
        {data.children?.map((section, index) => (
          <div key={section.name} className="mb-4">
            <div 
              className={`p-3 rounded-lg font-medium ${getBackgroundColor(index)} cursor-pointer`}
              onClick={() => setExpandedSection(expandedSection === index ? null : index)}
            >
              {section.name}
              <span className="float-right">{expandedSection === index ? '▼' : '▶'}</span>
            </div>
            
            {expandedSection === index && section.children?.map((subSection, subIndex) => (
              <div key={subSection.name} className="ml-4 mt-2">
                <div 
                  className={`p-2 rounded-md ${getSubBackgroundColor(index)} cursor-pointer`}
                  onClick={() => setExpandedSubSection(expandedSubSection === `${index}-${subIndex}` ? null : `${index}-${subIndex}`)}
                >
                  {subSection.name}
                  <span className="float-right">{expandedSubSection === `${index}-${subIndex}` ? '▼' : '▶'}</span>
                </div>
                
                {expandedSubSection === `${index}-${subIndex}` && (
                  <div className="grid grid-cols-1 gap-2 mt-2 ml-4">
                    {subSection.children?.map(subSubSection => (
                      <div key={subSubSection.name} className="bg-white rounded-md p-2 shadow-sm">
                        <div className="font-medium text-sm mb-1">{subSubSection.name}</div>
                        <div className="grid grid-cols-2 gap-1">
                          {subSubSection.children?.map(company => (
                            <div 
                              key={company.name}
                              className="text-xs p-1 bg-gray-50 rounded text-blue-600 truncate"
                              onClick={() => onCompanyClick(company.name)}
                            >
                              {company.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  // 修改主组件渲染逻辑
  export default function IndustryChainChart({ data, options }) {
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    
    // 检测设备尺寸
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);
  
    return (
      <>
        {isMobile ? (
          <MobileView 
            data={data} 
            options={options}
            onCompanyClick={(name) => setSelectedCompany({name, industryName: data.name})} 
          />
        ) : (
          <div className="min-h-screen bg-white pt-16">
            {/* 原来的桌面端代码 */}
          </div>
        )}
        
        {/* 公司报告模态框 */}
        {selectedCompany && (
          <CompanyReportModal
            isOpen={!!selectedCompany}
            onClose={() => setSelectedCompany(null)}
            companyName={selectedCompany.name}
            industryName={selectedCompany.industryName}
          />
        )}
      </>
    );
  }