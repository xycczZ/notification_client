# 快速启动指南

## 一键启动

```bash
# 启动开发服务器
./start.sh

# 或者手动启动
npm install
npm run dev
```

## 测试应用

```bash
# 测试应用是否正常运行
./test-app.sh
```

## 构建应用

```bash
# 构建生产版本
./build.sh

# 或者手动构建
npm run build
```

## 启动后端

确保后端服务器正在运行：

```bash
# 进入后端目录
cd /Users/invoker/code/clojure/notification

# 启动后端服务器
clj -M -m com.henglisec.notify.main
```

## 访问应用

1. 打开浏览器访问 http://localhost:1420
2. 输入后端服务器地址 (如 http://localhost:3002)
3. 输入认证码 (如有)
4. 点击"连接"按钮
5. 连接成功后会自动跳转到首页仪表盘

## 发送测试通知

```bash
# 运行Python测试脚本
python3 test-send-notification.py
```

## 停止服务

```bash
# 停止开发服务器
pkill -f "npm run dev"

# 停止后端服务器
pkill -f "com.henglisec.notify.main"
```
