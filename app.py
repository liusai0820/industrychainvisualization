from flask import Flask, render_template, jsonify, request
import json
import os

app = Flask(__name__)

def load_sample_data():
    """加载示例数据"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        sample_data_path = os.path.join(current_dir, 'static', 'sample_data.json')
        
        with open(sample_data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading sample data: {str(e)}")
        return None

def transform_to_tree(data):
    """将原始数据转换为树形结构"""
    
    # 处理代表公司字符串为数组
    def parse_companies(companies_str):
        return [company.strip() for company in companies_str.split(',') if company.strip()]

    # 创建根节点
    root = {
        "name": data["产业链"] + "产业链图谱",
        "children": []
    }
    
    # 添加各个环节
    for link in data["环节"]:
        link_node = {
            "name": link["环节名称"],
            "children": []
        }
        
        # 添加子环节
        for sub_link in link["子环节"]:
            sub_node = {
                "name": sub_link["子环节名称"],
                "children": []
            }
            
            # 添加代表公司
            companies = parse_companies(sub_link["代表公司"])
            for company in companies:
                sub_node["children"].append({
                    "name": company
                })
            
            link_node["children"].append(sub_node)
            
        root["children"].append(link_node)
    
    return root

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_graph_data', methods=['POST'])
def get_graph_data():
    try:
        data = request.get_json()
        if not data:
            data = load_sample_data()
            if not data:
                return jsonify({"error": "No data available"}), 400
        
        tree_data = transform_to_tree(data)
        return jsonify(tree_data)
        
    except Exception as e:
        print(f"Error in get_graph_data: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)