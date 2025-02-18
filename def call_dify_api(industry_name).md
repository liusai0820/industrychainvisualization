def call_dify_api(industry_name):
    """调用Dify API获取产业链数据"""
    try:
        logger.info(f"开始调用Dify API，产业名称: {industry_name}")
        
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
        
        logger.info(f"请求头: {headers}")
        logger.info(f"请求体: {payload}")
        
        retry_count = 3
        base_delay = 2
        max_timeout = 180
        
        for attempt in range(retry_count):
            try:
                if attempt > 0:
                    delay = base_delay * (2 ** (attempt - 1))
                    logger.info(f"等待 {delay} 秒后进行第 {attempt + 1} 次重试")
                    time.sleep(delay)
                
                logger.info("发送请求到 Dify API...")
                response = requests.post(
                    f"{DIFY_BASE_URL}/workflows/run", 
                    headers=headers,
                    json=payload,
                    timeout=max_timeout
                )
                
                logger.info(f"收到响应，状态码: {response.status_code}")
                logger.debug(f"响应内容: {response.text[:500]}...")  # 只记录前500个字符
                
                if response.status_code != 200:
                    error_msg = f"API request failed with status code: {response.status_code}"
                    if response.status_code == 500:
                        error_msg += " (服务器内部错误)"
                    elif response.status_code == 429:
                        error_msg += " (请求频率限制)"
                    elif response.status_code == 401:
                        error_msg += " (认证失败，请检查API Key)"
                    
                    logger.error(error_msg)
                    if attempt < retry_count - 1:
                        continue
                    return None
                
                result = response.json()
                logger.info("成功解析JSON响应")
                logger.debug(f"解析后的数据: {json.dumps(result, ensure_ascii=False)[:500]}...")
                
                # 获取并处理数据
                if 'data' in result and isinstance(result['data'], dict):
                    outputs = result['data'].get('outputs', {})
                    if isinstance(outputs, dict) and 'text' in outputs:
                        text_data = outputs['text']
                        logger.info("开始清理和解析text数据")
                        clean_data = sanitize_json_string(text_data)
                        
                        if clean_data and isinstance(clean_data, dict):
                            if '产业链' in clean_data and '环节' in clean_data:
                                logger.info("数据验证成功，返回清理后的数据")
                                return clean_data
                            else:
                                logger.error(f"数据结构不完整，缺少必要字段。当前字段: {list(clean_data.keys())}")
                        else:
                            logger.error(f"清理后的数据无效。类型: {type(clean_data)}")
                    else:
                        logger.error(f"outputs 结构不正确: {outputs}")
                else:
                    logger.error(f"响应结构不正确，缺少 data 字段或格式错误: {result}")
                
                return None
                    
            except requests.Timeout:
                logger.error(f"请求超时 (attempt {attempt + 1}/{retry_count})")
            except requests.RequestException as e:
                logger.error(f"请求异常: {str(e)}")
            except json.JSONDecodeError as e:
                logger.error(f"JSON解析错误: {str(e)}")
            except Exception as e:
                logger.error(f"未预期的错误: {str(e)}")
                logger.exception(e)
            
            if attempt < retry_count - 1:
                continue
            else:
                logger.error("所有重试都失败了")
                return None
                
    except Exception as e:
        logger.error(f"调用 Dify API 时发生错误: {str(e)}")
        logger.exception(e)
        return None