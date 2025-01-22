from flask import Flask, render_template, jsonify, request, send_from_directory, make_response
import json
import os
import requests
import logging
import re
from datetime import datetime

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Dify API配置
DIFY_BASE_URL = "https://api.dify.ai/v1"
INDUSTRY_CHAIN_API_KEY = "app-VsZqtUHY2piGHBH7iqgXQ1uz"  # 产业链分析应用的API Key
COMPANY_ANALYSIS_API_KEY = "app-3NxlGN8GQFPH8ud5L9e9GTUY"  # 企业分析应用的API Key

# 添加缓存字典
company_analysis_cache = {}

def extract_json_from_markdown(text):
    """从Markdown代码块中提取JSON字符串"""
    try:
        # 如果文本包含markdown代码块标记
        if text.startswith('```') and '```' in text[3:]:
            # 删除开头的 ```json\n
            start_index = text.find('\n', 3) + 1
            # 删除结尾的 \n```
            end_index = text.rfind('```')
            # 提取JSON内容
            json_str = text[start_index:end_index].strip()
            return json_str
        return text
    except Exception as e:
        logger.error(f"Error extracting JSON from markdown: {e}")
        return text

def sanitize_json_string(s):
    """清理和修复JSON字符串"""
    try:
        if isinstance(s, dict):
            return s
            
        # 如果输入是bytes，先解码
        if isinstance(s, bytes):
            s = s.decode('utf-8')
        
        # 处理markdown代码块
        s = extract_json_from_markdown(s)
        
        # 如果字符串以引号开始和结束，去掉外层引号
        if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
            s = s[1:-1]
            
        # 尝试直接解析
        try:
            return json.loads(s)
        except json.JSONDecodeError as e:
            logger.debug(f"First JSON parse attempt failed: {e}")
            
        # 处理转义字符
        s = s.replace('\\\\', '\\')
        s = s.replace('\\"', '"')
        s = s.encode('utf-8').decode('unicode_escape')
        
        # 再次尝试解析
        return json.loads(s)
            
    except Exception as e:
        logger.error(f"Error sanitizing JSON string: {e}")
        logger.error(f"Original string: {s}")
        return None

def call_dify_api(industry_name):
    """调用Dify API获取产业链数据"""
    headers = {
        "Authorization": f"Bearer {INDUSTRY_CHAIN_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": {
            "value_chain": industry_name
        },
        "response_mode": "blocking",
        "user": "default"
    }
    
    try:
        response = requests.post(
            f"{DIFY_BASE_URL}/workflows/run", 
            headers=headers,
            json=payload,
            timeout=30
        )
        
        logger.debug(f"API Response Status Code: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"API request failed with status code: {response.status_code}")
            return None
            
        result = response.json()
        logger.debug(f"Parsed response: {json.dumps(result, ensure_ascii=False)}")
        
        # 获取并处理数据
        if 'data' in result and isinstance(result['data'], dict):
            outputs = result['data'].get('outputs', {})
            if isinstance(outputs, dict) and 'text' in outputs:
                text_data = outputs['text']
                # 清理并解析text数据
                clean_data = sanitize_json_string(text_data)
                logger.debug(f"Cleaned data: {json.dumps(clean_data, ensure_ascii=False)}")
                
                if clean_data and isinstance(clean_data, dict):
                    if '产业链' in clean_data and '环节' in clean_data:
                        return clean_data
                    
            logger.error("Data structure validation failed")
            logger.debug(f"Outputs structure: {outputs}")
        else:
            logger.error("Invalid response structure")
        
        return None
            
    except Exception as e:
        logger.error(f"Error in call_dify_api: {str(e)}")
        logger.exception(e)
        return None

def transform_to_tree(data):
    """将原始数据转换为树形结构"""
    if not isinstance(data, dict):
        logger.error(f"Invalid data type: {type(data)}")
        return None

    try:
        root = {
            "name": f"{data['产业链']}产业链图谱",
            "children": []
        }
        
        for link in data.get('环节', []):
            if not isinstance(link, dict):
                continue
                
            link_node = {
                "name": link.get('环节名称', ''),
                "children": []
            }
            
            for sub_link in link.get('子环节', []):
                if not isinstance(sub_link, dict):
                    continue
                    
                sub_node = {
                    "name": sub_link.get('子环节名称', ''),
                    "children": []
                }
                
                companies = sub_link.get('代表公司', [])
                
                # 统一处理公司列表
                if isinstance(companies, str):
                    # 处理可能的分隔符
                    for sep in [',', '、', ';', '；']:
                        if sep in companies:
                            companies = [c.strip() for c in companies.split(sep) if c.strip()]
                            break
                    else:
                        companies = [companies]
                elif not isinstance(companies, list):
                    companies = []
                
                # 添加公司节点
                for company in companies:
                    if company and isinstance(company, str):
                        sub_node["children"].append({
                            "name": company.strip()
                        })
                
                if sub_node["children"]:  # 只添加有公司的子环节
                    link_node["children"].append(sub_node)
            
            if link_node["children"]:  # 只添加有子环节的环节
                root["children"].append(link_node)
        
        if not root["children"]:
            logger.error("No valid data in tree")
            return None
            
        return root
        
    except Exception as e:
        logger.error(f"Error transforming data: {str(e)}")
        logger.exception(e)
        return None

def clean_html_content(text):
    """清理和转义HTML内容"""
    # 基本HTML转义
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    text = text.replace("'", '&#39;')
    
    # 移除可能导致问题的特殊字符
    text = text.replace('\u2028', ' ')  # 行分隔符
    text = text.replace('\u2029', ' ')  # 段落分隔符
    text = text.replace('\u200b', '')   # 零宽空格
    text = text.replace('\ufeff', '')   # 零宽不换行空格
    
    # 统一换行符
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    return text

def call_company_analysis_api(company_name):
    """调用Dify API获取企业分析数据"""
    # 检查缓存
    if company_name in company_analysis_cache:
        logger.info(f"Using cached analysis for company: {company_name}")
        return company_analysis_cache[company_name]
    
    headers = {
        "Authorization": f"Bearer {COMPANY_ANALYSIS_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": {
            "company_name": company_name  # 使用与产业链分析相同的参数名
        },
        "response_mode": "blocking",
        "user": "default"
    }
    
    retry_count = 3
    timeout_seconds = 60
    
    for attempt in range(retry_count):
        try:
            response = requests.post(
                f"{DIFY_BASE_URL}/workflows/run",
                headers=headers,
                json=payload,
                timeout=timeout_seconds
            )
            
            logger.debug(f"Company Analysis API Response Status Code: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"Company Analysis API request failed with status code: {response.status_code}")
                if attempt < retry_count - 1:
                    logger.info(f"Retrying... Attempt {attempt + 2} of {retry_count}")
                    continue
                return None
            
            result = response.json()
            logger.debug(f"Company Analysis Parsed response: {json.dumps(result, ensure_ascii=False)}")
            
            if 'data' in result and isinstance(result['data'], dict):
                outputs = result['data'].get('outputs', {})
                if isinstance(outputs, dict) and 'text' in outputs:
                    # 清理和处理文本
                    text = clean_html_content(outputs['text'])
                    # 存入缓存
                    company_analysis_cache[company_name] = text
                    return text
            
            logger.error("Company Analysis Data structure validation failed")
            return None
            
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout occurred on attempt {attempt + 1} of {retry_count}")
            if attempt < retry_count - 1:
                continue
            logger.error("All retry attempts failed due to timeout")
            return None
        except Exception as e:
            logger.error(f"Error in call_company_analysis_api: {str(e)}")
            logger.exception(e)
            return None
    
    return None

def process_company_analysis(text):
    """处理企业分析文本，将markdown格式转换为结构化文本"""
    try:
        # 移除多余的空行
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # 处理段落
        paragraphs = []
        current_section = None
        current_content = []
        
        for line in lines:
            # 检查是否是标题行（数字开头）
            if re.match(r'^\d+\.', line) or re.match(r'^\*\*\d+\.', line):
                # 如果有之前的段落，保存它
                if current_section and current_content:
                    paragraphs.append({
                        'title': current_section.replace('*', '').strip(),
                        'content': '\n'.join(current_content)
                    })
                current_section = line.replace('*', '').strip()
                current_content = []
            else:
                # 处理markdown格式
                # 处理加粗
                line = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', line)
                # 处理列表项
                if line.startswith('*   '):
                    line = '• ' + line[4:]
                elif line.startswith('    *   '):
                    line = '  • ' + line[8:]
                # 处理其他格式
                line = line.replace('【', '<strong>').replace('】', '</strong>')
                line = line.replace('（', '<span class="text-gray-500">（').replace('）', '）</span>')
                
                if line.strip():  # 只添加非空行
                    current_content.append(line)
        
        # 添加最后一个段落
        if current_section and current_content:
            paragraphs.append({
                'title': current_section.replace('*', '').strip(),
                'content': '\n'.join(current_content)
            })
        
        return paragraphs
        
    except Exception as e:
        logger.error(f"Error processing company analysis text: {str(e)}")
        logger.exception(e)
        return []

def convert_table_to_html(table_lines):
    """将Markdown表格转换为HTML表格"""
    if len(table_lines) < 3:  # 至少需要表头、分隔线和一行数据
        return '\n'.join(table_lines)
        
    html_lines = ['<div class="table-container"><table>']
    
    # 处理表头
    headers = [cell.strip() for cell in table_lines[0].split('|')[1:-1]]
    html_lines.append('<thead><tr>')
    for header in headers:
        html_lines.append(f'<th>{header}</th>')
    html_lines.append('</tr></thead>')
    
    # 处理数据行
    html_lines.append('<tbody>')
    for line in table_lines[2:]:
        if not line.strip():
            continue
        cells = [cell.strip() for cell in line.split('|')[1:-1]]
        html_lines.append('<tr>')
        for cell in cells:
            html_lines.append(f'<td>{cell}</td>')
        html_lines.append('</tr>')
    html_lines.append('</tbody>')
    
    html_lines.append('</table></div>')
    return '\n'.join(html_lines)

# 静态文件路由
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# 主页路由
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_graph_data', methods=['POST'])
def get_graph_data():
    try:
        # 打印请求信息
        logger.debug(f"Request Method: {request.method}")
        logger.debug(f"Request Headers: {dict(request.headers)}")
        logger.debug(f"Request Body: {request.get_data(as_text=True)}")
        
        # 检查 Content-Type
        if not request.is_json:
            logger.error("Request Content-Type is not application/json")
            return jsonify({"error": "请求必须是JSON格式"}), 400

        data = request.get_json()
        logger.debug(f"Parsed JSON data: {data}")

        if not data:
            logger.error("Empty request body")
            return jsonify({"error": "无效的请求数据"}), 400
            
        industry_name = data.get('industry_name', '').strip()
        logger.debug(f"Extracted industry_name: {industry_name}")

        if not industry_name:
            logger.error("Missing or empty industry_name")
            return jsonify({"error": "请输入产业链名称"}), 400
        
        logger.debug(f"Processing request for industry: {industry_name}")
        
        chain_data = call_dify_api(industry_name)
        if not chain_data:
            logger.error("Failed to get data from Dify API")
            return jsonify({"error": "无法获取该产业链数据"}), 400
            
        tree_data = transform_to_tree(chain_data)
        if not tree_data:
            logger.error("Failed to transform data to tree structure")
            return jsonify({"error": "数据处理失败"}), 500
            
        return jsonify(tree_data)
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        logger.exception(e)
        return jsonify({"error": str(e)}), 500

@app.route('/get_company_analysis', methods=['POST'])
def get_company_analysis():
    try:
        data = request.get_json()
        company_name = data.get('company_name')
        
        if not company_name:
            return jsonify({'error': '公司名称不能为空'}), 400
        
        # 调用企业分析API获取分析结果
        response = call_company_analysis_api(company_name)
        
        if not response:
            return jsonify({'error': '获取企业分析数据失败'}), 500
        
        # 处理markdown格式
        processed_text = process_company_analysis(response)
        
        return jsonify({
            'success': True,
            'data': processed_text
        })
        
    except Exception as e:
        logger.error(f"Error in get_company_analysis: {str(e)}")
        return jsonify({'error': '获取企业分析数据失败'}), 500

@app.route('/download_report/<company_name>', methods=['GET'])
def download_report(company_name):
    try:
        if company_name not in company_analysis_cache:
            return jsonify({'error': '报告不存在'}), 404
        
        # 获取缓存的报告内容
        report_content = company_analysis_cache[company_name]
        processed_text = process_company_analysis(report_content)
        
        # 生成下载文件内容
        download_content = []
        for section in processed_text:
            # 移除HTML标签
            title = re.sub(r'<[^>]+>', '', section['title'])
            content = re.sub(r'<[^>]+>', '', section['content'])
            download_content.append(f"# {title}\n\n")
            download_content.append(f"{content}\n\n")
        
        # 创建响应
        response = make_response('\n'.join(download_content))
        response.headers['Content-Type'] = 'text/markdown; charset=utf-8'
        
        # URL编码文件名
        encoded_filename = company_name.encode('utf-8').decode('latin1')
        response.headers['Content-Disposition'] = f"attachment; filename*=UTF-8''{encoded_filename}_analysis_report.md"
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return jsonify({'error': '生成报告失败'}), 500

# 添加CORS支持
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    app.run(debug=True, port=5001)