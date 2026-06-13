#!/bin/bash

echo "测试通知告警系统应用..."

# 检查开发服务器是否运行
if curl -s http://localhost:1420 > /dev/null 2>&1; then
    echo "✓ 开发服务器正在运行 (http://localhost:1420)"
else
    echo "✗ 开发服务器未运行"
    echo "请运行 'npm run dev' 启动开发服务器"
    exit 1
fi

# 检查后端服务器是否运行
if curl -s http://localhost:3002 > /dev/null 2>&1; then
    echo "✓ 后端服务器正在运行 (http://localhost:3002)"
else
    echo "✗ 后端服务器未运行"
    echo "请启动后端服务器"
fi

echo ""
echo "应用功能测试:"
echo "1. 打开浏览器访问 http://localhost:1420"
echo "2. 在起始界面输入后端服务器地址 (如 http://localhost:3002)"
echo "3. 输入认证码 (如有)"
echo "4. 点击'连接'按钮"
echo "5. 连接成功后会自动跳转到首页仪表盘"
echo ""
echo "测试完成！"
