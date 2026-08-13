# 妙语记账后端

Express + TypeScript 服务，默认监听 `3000` 端口。

## 环境变量

复制 `.env.example` 为 `.env`，填写 Supabase 项目 URL 与 anon key。

## 开发

```bash
npm run dev
```

- 健康检查：`GET http://localhost:3000/health`
- 登录：`POST http://localhost:3000/api/v1/auth/login`
- 账目：`/api/v1/transactions`（Header `x-user-id`）
- 预算：`/api/v1/budgets`（Header `x-user-id`）
- 我的：`GET /api/v1/users/me`、`PUT /api/v1/users/personality`
- 导出：`GET /api/v1/transactions/export`
- 数据库探测：`npm run db:ping`

建表 SQL：`sql/001_init.sql`；系统分类种子：`sql/002_system_categories.sql`（后端启动时也会自动补齐）。

## 测试

```bash
npm test
```

## 构建

```bash
npm run build
npm start
```
