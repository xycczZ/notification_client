#!/usr/bin/env python3
import requests
import json
import time

# 后端地址
BASE_URL = "http://localhost:3002"
AUTH_CODE = "slkdg_aokgl"

def send_log_notification():
    """发送日志通知"""
    url = f"{BASE_URL}/logs?code={AUTH_CODE}"
    data = {
        "message": "Test error message",
        "level_name": "ERROR",
        "channel": "test",
        "timestamp": int(time.time())
    }

    try:
        response = requests.post(url, json=data)
        print(f"发送日志通知: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"发送失败: {e}")

def send_custom_notification():
    """发送自定义通知"""
    url = f"{BASE_URL}/notifications?code={AUTH_CODE}"
    data = {
        "title": "系统告警",
        "content": "服务器CPU使用率超过90%"
    }

    try:
        response = requests.post(url, json=data)
        print(f"发送自定义通知: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"发送失败: {e}")

if __name__ == "__main__":
    print("开始发送测试通知...")
    send_log_notification()
    time.sleep(1)
    send_custom_notification()
    print("测试完成")
