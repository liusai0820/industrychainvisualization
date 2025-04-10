import { Document, Packer, Paragraph, AlignmentType, Footer, Header, TextRun, PageNumber } from 'docx';

interface AnalysisSection {
  title: string;
  content: string;
}

interface AnalysisResult {
  rawMarkdown: string;
  sections: AnalysisSection[];
}

interface GenerateDocxOptions {
  companyName: string;
  industryName?: string;
  analysisResult: AnalysisResult;
}

/**
 * 生成并下载公司研究报告Word文档
 * @param options 文档生成选项
 * @returns Promise<Blob> 返回生成的文档Blob对象
 */
export async function generateDocx({ companyName, industryName, analysisResult }: GenerateDocxOptions): Promise<Blob> {
  // 创建中文数字转换函数
  const toChineseNumber = (num: number): string => {
    const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (num <= 10) return chineseNumbers[num - 1];
    if (num < 20) return `十${num > 10 ? chineseNumbers[num - 11] : ''}`;
    const tens = Math.floor(num / 10);
    const remainder = num % 10;
    return `${chineseNumbers[tens - 1]}十${remainder > 0 ? chineseNumbers[remainder - 1] : ''}`;
  };

  // 创建报告标题
  const reportTitle = `${companyName}`;
  const reportSubTitle = "公司研究报告";

  // 创建文档对象，设置全局样式
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'FangSong', // 仿宋体
            size: 32, // 16pt (3号) (1pt = 2)
          },
          paragraph: {
            spacing: { 
              line: 560, // 固定行距28磅 (1磅 = 20)
              lineRule: "exact", // 确保使用固定行距而非多倍行距
              before: 0,
              after: 0 
            },
            indent: { 
              firstLine: 640 // 首行缩进2字符(320=1字符) 
            },
            alignment: AlignmentType.LEFT // 左对齐
          }
        }
      }
    },
    sections: [{
      // 设置页眉（报告标题）
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: {
                line: 560, // 行距28磅
                lineRule: "exact",
                before: 0,
                after: 0
              },
              children: [
                new TextRun({
                  text: `${reportTitle}${reportSubTitle}`,
                  font: "SimSun", // 宋体
                  size: 22 // 小5号(11pt)
                })
              ]
            })
          ]
        })
      },
      // 设置页脚（页码）
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: {
                line: 560, // 行距28磅
                lineRule: "exact",
                before: 0,
                after: 0
              },
              children: [
                new TextRun({
                  text: "第",
                  font: "SimSun", // 宋体
                  size: 18 // 小5号(9pt)
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: "SimSun", // 宋体
                  size: 18 // 小5号(9pt)
                }),
                new TextRun({
                  text: "页",
                  font: "SimSun", // 宋体
                  size: 18 // 小5号(9pt)
                })
              ]
            })
          ]
        })
      },
      properties: {
        page: {
          margin: {
            top: 1417, // 2.5cm (1cm = 567)
            right: 1588, // 2.8cm 
            bottom: 1417, // 2.5cm
            left: 1588 // 2.8cm
          },
          size: {
            width: 11906, // A4宽度 210mm (1mm = 56.7)
            height: 16838 // A4高度 297mm
          }
        }
      },
      children: [
        // 添加封面页
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            line: 560, // 固定行距28磅
            lineRule: "exact",
            before: 5000, // 上方留白空间
            after: 0
          },
          indent: { firstLine: 0 },
          children: [
            new TextRun({
              text: reportTitle,
              font: 'SimHei', // 黑体
              size: 44, // 小2号(22pt)
              bold: true
            })
          ]
        }),
        
        // 添加"公司研究报告"子标题
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            line: 560, // 固定行距28磅
            lineRule: "exact",
            before: 240, // 稍微空一点
            after: 0
          },
          indent: { firstLine: 0 },
          children: [
            new TextRun({
              text: reportSubTitle,
              font: 'SimHei', // 黑体
              size: 44, // 小2号(22pt)
              bold: true
            })
          ]
        }),
        
        // 添加行业信息
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            line: 560, // 固定行距28磅
            lineRule: "exact",
            before: 1000,
            after: 0
          },
          indent: { firstLine: 0 },
          children: [
            new TextRun({
              text: `行业: ${industryName || '未指定'}`,
              font: 'SimSun', // 宋体
              size: 32, // 3号(16pt)
            })
          ]
        }),
        
        // 添加日期 - 放在首页靠下的位置，但不要太靠下以免分页
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            line: 560, // 固定行距28磅
            lineRule: "exact",
            before: 3000, // 减小空间，确保在首页显示
            after: 0
          },
          indent: { firstLine: 0 },
          children: [
            new TextRun({
              text: `报告日期: ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
              font: 'SimSun', // 宋体
              size: 32, // 3号(16pt)
            })
          ]
        }),
        
        // 分页符
        new Paragraph({
          text: "",
          pageBreakBefore: true,
          spacing: {
            lineRule: "exact",
            before: 0,
            after: 0
          }
        }),
        
        // 添加目录标题
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            line: 560, // 固定行距28磅
            lineRule: "exact",
            before: 400,
            after: 400
          },
          indent: { firstLine: 0 },
          children: [
            new TextRun({
              text: "目录",
              font: 'SimHei', // 黑体
              size: 32, // 3号(16pt)
              bold: true
            })
          ]
        }),
        
        // 添加目录内容
        ...analysisResult.sections.map((section, index) => 
          new Paragraph({
            spacing: {
              line: 560, // 固定行距28磅
              lineRule: "exact",
              before: 120,
              after: 120
            },
            indent: { 
              firstLine: 0 
            },
            children: [
              new TextRun({
                text: `${toChineseNumber(index + 1)}、${section.title}`,
                font: 'FangSong', // 仿宋体
                size: 28, // 小4号(14pt)
              })
            ]
          })
        ),
        
        // 添加分页符
        new Paragraph({
          text: "",
          pageBreakBefore: true,
          spacing: {
            lineRule: "exact",
            before: 0,
            after: 0
          }
        }),
        
        // 添加报告内容
        ...analysisResult.sections.flatMap((section, index) => {
          const cleanedContent = cleanMarkdownForDocx(section.content);
          const paragraphs = splitContentIntoParagraphs(cleanedContent);
          
          // 查找小节标题
          const subSectionTitles: {title: string, level: number}[] = [];
          cleanedContent.split('\n').forEach(line => {
            // 匹配二级标题样式: (1)、(一)、（一）等
            if (/^\s*[（(]\s*[一二三四五六七八九十\d]+\s*[)）]/.test(line)) {
              subSectionTitles.push({title: line.trim(), level: 2});
            }
          });
          
          // 创建一级标题段落 (黑体3号，格式为"一、标题")
          const titleParagraph = new Paragraph({
            spacing: {
              line: 560, // 固定行距28磅
              lineRule: "exact",
              before: 240, 
              after: 120
            },
            indent: { firstLine: 640 }, // 首行缩进2字符(320=1字符)
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: `${toChineseNumber(index + 1)}、${section.title.replace(/^\d+[\.\s、]+/, '')}`,
                font: 'SimHei', // 黑体
                size: 32, // 3号(16pt)
                bold: false // 取消加粗效果
              })
            ],
            keepNext: true // 保持与下一段落在同一页
          });
          
          // 处理段落内容
          const processedParagraphs = paragraphs.map(para => {
            // 尝试从段落中获取文本，由于类型限制，这里使用类型断言
            let paraText = '';
            const children = (para as unknown as { children?: unknown[] }).children;
            
            if (children && Array.isArray(children) && children.length > 0) {
              // 假设第一个子元素是TextRun
              const firstChild = children[0];
              if (firstChild && typeof (firstChild as { text?: string }).text === 'string') {
                paraText = (firstChild as { text: string }).text;
              }
            }
            
            // 检查该段落是否为二级标题
            const isSubTitle = paraText && subSectionTitles.some(st => st.title && paraText.includes(st.title));
            
            if (isSubTitle) {
              // 二级标题使用楷体3号
              return new Paragraph({
                spacing: {
                  line: 560, // 固定行距28磅
                  lineRule: "exact",
                  before: 160,
                  after: 80
                },
                indent: { firstLine: 0 },
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: paraText,
                    font: 'KaiTi', // 楷体
                    size: 32, // 3号(16pt)
                    bold: false
                  })
                ]
              });
            } else {
              // 确保常规段落也有正确的行距设置
              if (para instanceof Paragraph) {
                // 使用类型断言访问内部属性
                const paraCopy = {...para};
                // 定义更具体的类型代替any
                interface SpacingProperties {
                  line?: number;
                  before?: number;
                  after?: number;
                  lineRule?: string;
                }
                const spacingProp = (paraCopy as unknown as {spacing?: SpacingProperties}).spacing;
                if (spacingProp) {
                  // 创建新的段落，复制原有属性并添加lineRule
                  return new Paragraph({
                    ...paraCopy,
                    spacing: {
                      ...spacingProp,
                      lineRule: "exact",
                      line: 560 // 固定行距28磅
                    }
                  });
                }
              }
              return para;
            }
          });
          
          // 返回标题和修改后的段落
          return [titleParagraph, ...processedParagraphs];
        })
      ]
    }]
  });

  // 生成文档Blob对象
  return await Packer.toBlob(doc);
}

/**
 * 增强Markdown清理函数，确保完全移除所有Markdown标记
 * 但保留加粗效果以便后续处理
 */
function cleanMarkdownForDocx(markdown: string): string {
  // 使用不太可能出现在实际文本中的特殊标记
  const boldMarker = '\uE000'; // 使用私有区域Unicode字符作为标记
  const endBoldMarker = '\uE001';
  
  // 用特殊标记替换加粗文本
  let processedText = markdown
    .replace(/\*\*(.*?)\*\*/g, `${boldMarker}$1${endBoldMarker}`)
    .replace(/__(.*?)__/g, `${boldMarker}$1${endBoldMarker}`);
  
  // 清理其他Markdown标记
  processedText = processedText
    .replace(/\*(.*?)\*/g, '$1')      // 移除斜体标记
    .replace(/~~(.*?)~~/g, '$1')      // 移除删除线标记
    .replace(/`(.*?)`/g, '$1')        // 移除行内代码标记
    .replace(/```[\s\S]*?```/g, '')   // 移除代码块
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // 移除链接，只保留文本
    .replace(/!\[(.*?)\]\((.*?)\)/g, '图片：$1') // 将图片替换为文本描述
    .replace(/#{1,6}\s+(.*?)$/gm, '$1') // 移除标题标记
    .replace(/^\s*[-*+]\s+/gm, '• ')  // 将无序列表项转换为简单的项目符号
    .replace(/^\s*\d+\.\s+/gm, '• ')  // 将有序列表项转换为简单的项目符号
    .replace(/\n\s*\n/g, '\n\n')      // 保留段落间的空行
    .replace(/\n---+\n/g, '\n\n')     // 移除水平分隔线
    .replace(/^\s*>\s+/gm, '')        // 移除引用符号(>)
    .replace(/&gt;/g, '>')            // 转换HTML实体
    .replace(/&lt;/g, '<')            
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
    
  return processedText;
}

/**
 * 检查文本是否是表格行
 */
function isTableRow(text: string): boolean {
  // 检查是否为表格行（包含 | 且至少有一个 | 在字符串中间）
  return text.includes('|') && 
         text.trim().startsWith('|') && 
         text.trim().endsWith('|') &&
         text.trim().split('|').length > 2; // 至少有一个单元格
}

/**
 * 将内容分割为段落并转换为Word段落对象
 */
function splitContentIntoParagraphs(content: string): Paragraph[] {
  // 识别表格块，预处理内容
  const tableBlocks: {start: number, end: number, content: string}[] = [];
  const contentLines = content.split('\n');
  
  // 识别内容中的表格块
  let inTable = false;
  let tableStart = 0;
  
  contentLines.forEach((line, index) => {
    const isTableLine = isTableRow(line);
    // 表格分隔符行（全是 -|）不计入实际表格行
    const isDividerLine = /^\s*\|[\s\-\|]+\|\s*$/.test(line);
    
    if (!inTable && isTableLine && !isDividerLine) {
      inTable = true;
      tableStart = index;
    } else if (inTable && (!isTableLine || index === contentLines.length - 1)) {
      // 表格结束（或达到内容末尾）
      inTable = false;
      const tableEnd = isTableLine ? index : index - 1;
      
      if (tableEnd >= tableStart) {
        tableBlocks.push({
          start: tableStart,
          end: tableEnd,
          content: contentLines.slice(tableStart, tableEnd + 1).join('\n')
        });
      }
    }
  });
  
  // 按空行分割非表格段落
  const paragraphs: Paragraph[] = [];
  let currentText = '';
  let lineIndex = 0;
  
  while (lineIndex < contentLines.length) {
    // 检查当前行是否在表格块中
    const tableBlock = tableBlocks.find(block => 
      lineIndex >= block.start && lineIndex <= block.end
    );
    
    if (tableBlock) {
      // 如果积累了文本，先添加为段落
      if (currentText.trim()) {
        paragraphs.push(...createTextParagraphs(currentText));
        currentText = '';
      }
      
      // 处理表格
      paragraphs.push(...createTableParagraphs(tableBlock.content));
      
      // 跳过整个表格块
      lineIndex = tableBlock.end + 1;
      continue;
    }
    
    // 处理非表格内容
    const line = contentLines[lineIndex];
    
    if (line.trim() === '') {
      // 遇到空行，结束当前段落
      if (currentText.trim()) {
        paragraphs.push(...createTextParagraphs(currentText));
        currentText = '';
      }
    } else {
      // 添加到当前文本
      currentText += (currentText ? '\n' : '') + line;
    }
    
    lineIndex++;
  }
  
  // 添加最后一个段落（如果有）
  if (currentText.trim()) {
    paragraphs.push(...createTextParagraphs(currentText));
  }
  
  return paragraphs;
}

/**
 * 创建文本段落
 */
function createTextParagraphs(text: string): Paragraph[] {
  // 处理标准情况，不需要再次声明boldMarker变量
  const cleanedText = text
    .replace(/\*(.*?)\*/g, '$1')      // 移除斜体标记
    .replace(/`(.*?)`/g, '$1')        // 移除代码标记
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // 移除链接，只保留文本
    .trim();
  
  // 检查是否为项目符号列表
  if (cleanedText.trim().startsWith('• ')) {
    return [new Paragraph({
      bullet: {
        level: 0
      },
      spacing: {
        line: 560, // 固定行距28磅
        lineRule: "exact",
        before: 80, 
        after: 80
      },
      children: createTextRunsWithBoldHighlights(cleanedText.trim())
    })];
  }
  
  // 检查是否为引用块
  if (cleanedText.startsWith('>')) {
    return [new Paragraph({
      spacing: {
        line: 560, // 固定行距28磅
        lineRule: "exact",
        before: 120, 
        after: 120
      },
      indent: { 
        left: 720, // 左侧缩进
        firstLine: 0
      },
      style: 'Quote', // 使用引用样式
      children: createTextRunsWithBoldHighlights(cleanedText.replace(/^>\s*/, '').trim())
    })];
  }
  
  // 普通段落
  return [new Paragraph({
    spacing: {
      line: 560, // 固定行距28磅
      lineRule: "exact",
      before: 0, 
      after: 0
    },
    indent: { 
      firstLine: 640 // 首行缩进2字符
    },
    children: createTextRunsWithBoldHighlights(cleanedText)
  })];
}

// 辅助函数：根据加粗标记创建多个TextRun
function createTextRunsWithBoldHighlights(text: string): TextRun[] {
  const boldMarker = '\uE000'; // 使用与cleanMarkdownForDocx相同的特殊标记
  const endBoldMarker = '\uE001';
  
  // 如果没有加粗标记，直接返回一个普通TextRun
  if (!text.includes(boldMarker)) {
    return [new TextRun({ text })];
  }
  
  const textRuns: TextRun[] = [];
  let currentPosition = 0;
  
  // 解析并处理文本中所有加粗片段
  while (currentPosition < text.length) {
    // 查找下一个加粗开始标记
    const boldStart = text.indexOf(boldMarker, currentPosition);
    
    // 如果没有找到加粗开始标记，添加剩余文本
    if (boldStart === -1) {
      const remainingText = text.substring(currentPosition).replace(new RegExp(endBoldMarker, 'g'), '');
      if (remainingText) {
        textRuns.push(new TextRun({ text: remainingText }));
      }
      break;
    }
    
    // 添加加粗标记前的普通文本
    const normalText = text.substring(currentPosition, boldStart);
    if (normalText) {
      textRuns.push(new TextRun({ text: normalText }));
    }
    
    // 查找加粗结束标记
    const boldEnd = text.indexOf(endBoldMarker, boldStart + boldMarker.length);
    if (boldEnd === -1) {
      // 如果没有找到结束标记，将剩余文本作为普通文本添加
      const remainingText = text.substring(boldStart).replace(new RegExp(boldMarker, 'g'), '');
      if (remainingText) {
        textRuns.push(new TextRun({ text: remainingText }));
      }
      break;
    }
    
    // 获取加粗文本内容
    const boldText = text.substring(boldStart + boldMarker.length, boldEnd);
    if (boldText) {
      textRuns.push(new TextRun({ 
        text: boldText,
        bold: true 
      }));
    }
    
    // 移动到加粗结束标记之后
    currentPosition = boldEnd + endBoldMarker.length;
  }
  
  return textRuns;
}

/**
 * 创建表格段落（转换为文本格式）
 */
function createTableParagraphs(tableContent: string): Paragraph[] {
  const rows = tableContent.split('\n').filter(row => 
    row.trim() !== '' && !(/^\s*\|[\s\-\|]+\|\s*$/.test(row)) // 过滤掉分隔符行
  );
  
  // 解析表格内容
  const tableParagraphs: Paragraph[] = [];
  
  // 添加表格标题
  tableParagraphs.push(new Paragraph({
    spacing: {
      line: 560, // 固定行距28磅
      lineRule: "exact",
      before: 160,
      after: 80
    },
    children: [
      new TextRun({
        text: '表格内容：',
        font: 'SimHei', // 黑体
        size: 28, // 小4号(14pt)
        bold: true
      })
    ]
  }));
  
  // 处理表格行
  rows.forEach((row, rowIndex) => {
    // 提取单元格
    const cells = row.split('|')
      .filter(cell => cell.trim() !== '') // 过滤空单元格（可能是两端的|）
      .map(cell => cell.trim());
    
    const isHeader = rowIndex === 0;
    
    const cellTexts = cells.map((cell, cellIndex) => 
      `${cellIndex + 1}.${cell}`
    ).join('  ');
    
    tableParagraphs.push(new Paragraph({
      spacing: {
        line: 560, // 固定行距28磅
        lineRule: "exact",
        before: isHeader ? 80 : 40,
        after: 40
      },
      indent: {
        left: 320 // 表格整体缩进
      },
      children: [
        new TextRun({
          text: cellTexts,
          font: isHeader ? 'SimHei' : 'FangSong', // 表头用黑体
          size: 28, // 小4号(14pt)
          bold: isHeader
        })
      ]
    }));
  });
  
  // 表格后添加一个空行
  tableParagraphs.push(new Paragraph({
    text: '',
    spacing: {
      lineRule: "exact",
      before: 80,
      after: 80
    }
  }));
  
  return tableParagraphs;
}

/**
 * 下载生成的Word文档
 * @param companyName 公司名称，用于文件命名
 * @param docBlob 文档Blob对象
 */
export function downloadDocx(companyName: string, docBlob: Blob): void {
  const url = URL.createObjectURL(docBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${companyName}-公司研究报告.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 