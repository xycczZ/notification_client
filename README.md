# 通知告警系统客户端

基于 Tauri 2 + Vue 3 + TypeScript 的桌面通知告警客户端应用。

## 功能特性

- **起始界面**: 配置后端服务器地址和认证码
- **WebSocket 连接**: 实时接收后端推送的通知消息
- **图表展示**: 统计各类型通知的数量
- **实时通知列表**: 以聊天框形式展示告警信息
- **系统通知**: 通过系统通知弹窗提醒用户

## 开发环境

### 前置要求

- Node.js 18+
- Rust (用于 Tauri)
- Bun (可选，用于替代 npm)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

前端开发服务器将运行在 http://localhost:1420

### 构建应用

```bash
npm run tauri build
```

## 后端配置

应用需要连接到通知告警后端服务。后端默认地址为 `http://localhost:3002`。

### 后端 API

- **WebSocket**: `/ws?code=<auth_code>` - 实时通知推送
- **日志接收**: `POST /logs` - 接收 logstash 日志
- **通知接收**: `POST /notifications` - 接收自定义通知

### WebSocket 消息格式

#### 客户端发送

```json
{
  "type": "last",
  "data": {
    "last_id": 0,
    "page_size": 20
  }
}
```

#### 服务器推送

```json
{
  "type": "response",
  "data": {
    "message": "Error message",
    "level_name": "ERROR",
    "channel": "app"
  }
}
```

```json
{
  "type": "aggregate",
  "title": "Error title",
  "content": "5分钟内出现了 5 次",
  "count": 5
}
```

```json
{
  "type": "history",
  "data": [
    {
      "id": 1,
      "digest": "d41d8cd98f00b204e9800998ecf8427e",
      "title": "Error title",
      "content": "Error content",
      "level_name": "ERROR",
      "created_at": "2026-06-12T10:00:00",
      "updated_at": "2026-06-12T10:00:00"
    }
  ]
}
```

## 项目结构

```
src/
├── components/       # Vue 组件
├── views/            # 页面视图
│   ├── SetupView.vue    # 起始界面
│   └── DashboardView.vue # 首页仪表盘
├── services/         # 服务层
│   └── websocket.ts    # WebSocket 服务
├── stores/           # Pinia 状态管理
│   └── notification.ts # 通知状态
├── types/            # TypeScript 类型定义
│   └── notification.ts # 通知相关类型
├── router/           # Vue Router 路由
│   └── index.ts        # 路由配置
├── App.vue           # 根组件
└── main.ts           # 入口文件
```

## 使用说明

1. 启动应用后，首先进入起始界面
2. 输入后端服务器地址（如 `http://localhost:3002`）
3. 输入认证码（如有）
4. 点击"连接"按钮
5. 连接成功后自动跳转到首页仪表盘
6. 首页显示通知统计图表和实时通知列表
7. 新通知会实时推送到通知列表

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **桌面框架**: Tauri 2
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **图表**: Chart.js + vue-chartjs
