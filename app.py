from flask import Flask, render_template, jsonify, request, send_from_directory
import json
import os
import requests
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Dify API配置
DIFY_API_KEY = "app-VsZqtUHY2piGHBH7iqgXQ1uz"
DIFY_BASE_URL = "https://api.dify.ai/v1"

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
        "Authorization": f"Bearer {DIFY_API_KEY}",
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

# 添加CORS支持
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    app.run(debug=True)