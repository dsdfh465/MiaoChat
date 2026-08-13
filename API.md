# 妙语记账 API

## GET /health

健康检查。

响应：

```json
{"status":"ok","service":"miaochat-backend","version":"1.0.0"}
```

## POST /api/v1/auth/login

手机号 + 验证码登录。MVP 阶段验证码固定为 `123456`，用户不存在时自动注册。

请求：

```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "13800138000",
      "personality": "gentle",
      "created_at": "2026-08-13T00:00:00.000Z"
    },
    "is_new_user": true
  }
}
```

失败响应（验证码错误）：

```json
{
  "code": 40002,
  "message": "验证码错误",
  "data": null
}
```

## 账目接口鉴权

MVP 阶段不使用 JWT。所有 `/api/v1/transactions` 与 `/api/v1/budgets` 请求需携带：

```
x-user-id: {用户 UUID}
```

未提供返回 `401` / `40101`「未提供用户标识」；用户不存在返回 `401` / `40102`「用户不存在」。

金额一律以「分」为单位的整数；创建时必须大于 0。

## POST /api/v1/transactions

创建一笔交易。未提供 `category_name` 时默认「其他」；已有系统/用户分类则匹配，新名称会创建用户自定义分类。`source` 固定为 `voice`。

请求：

```json
{
  "amount": 2500,
  "category_name": "餐饮",
  "note": "中午吃面",
  "recorded_at": "2026-08-13T12:30:00Z"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "category_id": "uuid",
    "category_name": "餐饮",
    "category_icon": "🍜",
    "amount": 2500,
    "amount_yuan": "25.00",
    "note": "中午吃面",
    "recorded_at": "2026-08-13T12:30:00Z",
    "source": "voice",
    "is_confirmed": true
  }
}
```

## GET /api/v1/transactions

查询交易列表。支持 `month=YYYY-MM`、`category_id`、`limit`、`offset`。按 `recorded_at` 倒序。

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "transactions": [],
    "pagination": { "limit": 20, "offset": 0, "total": 0 }
  }
}
```

## GET /api/v1/transactions/summary/monthly

月度汇总。必填查询参数 `month=YYYY-MM`。

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "month": "2026-08",
    "total_income": 0,
    "total_expense": 2500,
    "net_amount": -2500,
    "category_breakdown": [
      { "category_name": "餐饮", "category_icon": "🍜", "total": 2500, "count": 1 }
    ]
  }
}
```

## GET /api/v1/transactions/{id}

查询单笔交易。不存在或不属于当前用户时返回 `404` / `40401`。

## PUT /api/v1/transactions/{id}

更新交易。所有字段可选：`amount`、`category_name`、`note`、`is_confirmed`。

## DELETE /api/v1/transactions/{id}

物理删除交易。

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

## POST /api/v1/budgets

设置或更新某分类的月度预算（UPSERT）。`limit_amount` 单位为分，必须大于 0。分类须为系统分类或当前用户自定义分类。

请求：

```json
{
  "category_id": "uuid",
  "month": "2026-09",
  "limit_amount": 200000
}
```

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "category_id": "uuid",
    "category_name": "餐饮",
    "category_icon": "🍜",
    "month": "2026-09",
    "limit_amount": 200000,
    "limit_yuan": "2000.00"
  }
}
```

## GET /api/v1/budgets?month=2026-09

查询某月所有分类预算。

## GET /api/v1/budgets/progress?month=2026-09

目标页核心接口。`overview` 驱动顶部进度环，`categories` 驱动下方分类进度条。

计算口径（前后端必须一致）：

- 金额单位：分（整数）；`*_yuan` 为两位小数的字符串，可直接展示
- 只统计 `is_confirmed = true` 且 `amount > 0` 的支出
- `overview.total_spent` = 各已设预算分类 `spent_amount` 之和（未设预算的分类支出不计入进度环）
- `overview.total_remaining` = `total_budget - total_spent`，超支时为负数
- `progress_percentage` / `percentage`：保留一位小数的数字，例如 `16.2`、`70`、`96`、`125`
- 未设置任何预算时：`categories = []`，`total_budget = 0`，`progress_percentage = 0`，`status = "normal"`

状态枚举（含边界，左闭右开直到 exceeded）：

| status | 条件 |
|---|---|
| `normal` | 进度 &lt; 70% |
| `warning` | 70% ≤ 进度 &lt; 90% |
| `danger` | 90% ≤ 进度 &lt; 100% |
| `exceeded` | 进度 ≥ 100%（百分比可大于 100） |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "month": "2026-09",
    "overview": {
      "total_budget": 250000,
      "total_budget_yuan": "2500.00",
      "total_spent": 80450,
      "total_spent_yuan": "804.50",
      "total_remaining": 169550,
      "total_remaining_yuan": "1695.50",
      "progress_percentage": 32.2,
      "status": "normal"
    },
    "categories": [
      {
        "category_id": "uuid",
        "category_name": "餐饮",
        "category_icon": "🍜",
        "limit_amount": 200000,
        "limit_yuan": "2000.00",
        "spent_amount": 32450,
        "spent_yuan": "324.50",
        "remaining_amount": 167550,
        "remaining_yuan": "1675.50",
        "percentage": 16.2,
        "status": "normal"
      },
      {
        "category_id": "uuid",
        "category_name": "娱乐",
        "category_icon": "🎮",
        "limit_amount": 50000,
        "limit_yuan": "500.00",
        "spent_amount": 48000,
        "spent_yuan": "480.00",
        "remaining_amount": 2000,
        "remaining_yuan": "20.00",
        "percentage": 96,
        "status": "danger"
      }
    ]
  }
}
```

## GET /api/v1/users/me

获取当前用户信息。需 Header `x-user-id`。

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "phone": "13800138000",
    "personality": "gentle",
    "created_at": "2026-08-13T08:00:00Z"
  }
}
```

## PUT /api/v1/users/personality

更新人格。可选值：`strict`（严师）、`gentle`（闺蜜）、`buddha`（佛系）。

请求：

```json
{
  "personality": "strict"
}
```

非法值返回 `400` / `40003`「人格值无效，允许值：strict, gentle, buddha」。

## GET /api/v1/transactions/export

用户主动导出交易 CSV。可选查询参数 `month=YYYY-MM`、`category_id`。

响应头：

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="miaochat_export_YYYY-MM-DD.csv"
```

响应体为 UTF-8 CSV，**文件开头必须带 BOM（`\\uFEFF`）**，列顺序：

记账时间,分类,分类图标,金额（元）,备注,来源,确认状态,类型,交易ID

金额以元显示、保留两位小数；按 `recorded_at` 倒序。无数据时仍返回表头，不报错。月份格式错误返回 `400` / `40004`。

## 资产账户鉴权

所有 `/api/v1/asset-accounts` 与 `/api/v1/credit-bills` 请求需携带 `x-user-id`。

金额单位：分（整数）。`credit` 余额一般为负数（欠款）；总资产 = 各类型按规则汇总。

错误码：`40005` 类型无效 · `40006` 余额不足 · `40007` 还款超限 · `40008` other 缺 is_positive · `40009` stock 缺 stock_code/market · `40404` 账户不存在 · `40405` 账单不存在 · `40901` 有流水不可删。

## POST /api/v1/asset-accounts

创建资产账户。`type`：`deposit` / `credit` / `fund` / `stock` / `other`。

```json
{
  "name": "招商银行工资卡",
  "type": "deposit",
  "icon": "💳",
  "initial_balance": 100000
}
```

`other` 必须传 `is_positive`；`stock` 必须传 `stock_code`、`market`。

## GET /api/v1/asset-accounts

返回 `accounts`、`total_assets`、`total_assets_yuan`、`summary`（deposit/credit/fund/stock/other）。

可选查询：`include_inactive=true|false`。

## GET /api/v1/asset-accounts/:accountId

账户详情 + 分页流水（`limit`/`offset`）。

## POST /api/v1/asset-accounts/:accountId/transactions

记录变动。`type`：`income` / `expense` / `interest` / `repayment` / `buy` / `sell` / `dividend`。股票买卖可附 `shares`。

## DELETE /api/v1/asset-accounts/:accountId

逻辑删除（`is_active=false`）。有流水返回 `40901`。

## POST /api/v1/asset-accounts/:accountId/credit-bills

```json
{
  "bill_month": "2026-08",
  "total_amount": 300000,
  "due_date": "2026-08-25"
}
```

## GET /api/v1/asset-accounts/:accountId/credit-bills

查询信用卡账单列表。

## PUT /api/v1/credit-bills/:billId/repay

```json
{ "amount": 100000 }
```

还款超过未还金额返回 `40007`。

