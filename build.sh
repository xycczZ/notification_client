#!/bin/bash

echo "构建通知告警系统..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 安装依赖
echo "安装依赖..."
npm install

# 构建应用
echo "构建应用..."
npm run build

echo "构建完成！"
