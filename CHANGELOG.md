# Changelog

本文件记录妙语记账（MiaoChat）对外可感知的变更，便于 Alpha 测试对照。

## [v1.0.0-alpha] - 2026-08-13

首个 Alpha 内测版本。对应 `pubspec.yaml`：`1.0.0+1`。

### 后端

- 手机号 + 验证码登录（MVP 验证码 `123456`）
- 交易 CRUD、月度列表与汇总
- 预算 UPSERT / 查询 / 进度环口径（仅统计已设预算分类的已确认支出）
- 用户画像：`GET /users/me`、`PUT /users/personality`
- 交易 CSV 导出（UTF-8 BOM，Excel 中文不乱码）
- 鉴权 Header：`x-user-id`

### 前端（Flutter）

- **首页（妙语）**：语音/文字记账 → 规则解析 → 滑动确认卡 → `POST /transactions`；今日支出自动刷新
- **目标（梦想基金）**：进度环 + 分类进度条；无预算空状态
- **我的**：用户信息、人格切换（严师/闺蜜/佛系）、导出 CSV 分享
- 网络错误统一 Toast；Android / iOS / Web 基础适配

### 测试

- 前端：`flutter test` 19 项通过
- 后端：单元测试 29 项通过

### 已知限制（本轮不测或需真机）

- `local_db.service.dart` 仍为占位，尚未做本地缓存
- Vosk 长按录音需在 Android 真机/模拟器验证（Windows 桌面无法测麦克风）
- 登录仍为 MVP 硬编码 `userId`，未接正式会话体系

### 测试建议

1. 文字输入「中午吃面花了25」→ 确认卡 → 右滑入账
2. 左滑改分类后再确认
3. 目标页查看进度百分比与分类颜色（绿/橙/红/深红）
4. 我的页切换人格、导出 CSV 用 Excel 打开核对中文
5. Android 真机验证麦克风权限与语音记账
