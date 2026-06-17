#!/bin/bash
set -e

echo "构建通知告警系统..."

# 检查 Bun 是否安装（项目使用 bun.lock）
if ! command -v bun &> /dev/null; then
    echo "错误: 未找到 Bun，请先安装 Bun (https://bun.sh)"
    exit 1
fi

# 检查 Rust 是否安装（Tauri 后端构建依赖）
if ! command -v cargo &> /dev/null; then
    echo "错误: 未找到 cargo，请先安装 Rust (https://rustup.rs)"
    exit 1
fi

# 安装前端依赖
echo "安装前端依赖..."
bun install

# 构建并打包桌面应用（tauri build 会自动执行 bun run build 构建前端，再编译 Rust 后端）
echo "打包桌面应用..."
bun run tauri build

echo "构建完成！"
echo "安装包位于: src-tauri/target/release/bundle/"
