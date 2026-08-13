-- 资产账户模块：asset_accounts / asset_transactions / credit_card_bills
-- 在 Supabase Dashboard -> SQL Editor 中执行本文件
-- 对应：supabase/migrations/20260814_add_asset_accounts.sql

CREATE TABLE IF NOT EXISTS asset_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
  icon VARCHAR(10) NOT NULL DEFAULT '💰',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_positive BOOLEAN NOT NULL DEFAULT true,
  stock_code VARCHAR(20),
  market VARCHAR(10),
  shares INTEGER NOT NULL DEFAULT 0,
  cost_basis INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT asset_accounts_type_check CHECK (type IN ('deposit', 'credit', 'fund', 'stock', 'other')),
  CONSTRAINT asset_accounts_other_positive_check CHECK (type <> 'other' OR is_positive IS NOT NULL),
  CONSTRAINT asset_accounts_stock_fields_check CHECK (
    type <> 'stock' OR (stock_code IS NOT NULL AND market IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS asset_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES asset_accounts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  note VARCHAR(200),
  happened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT asset_transactions_type_check CHECK (
    type IN ('income', 'expense', 'interest', 'repayment', 'buy', 'sell', 'dividend')
  )
);

CREATE TABLE IF NOT EXISTS credit_card_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES asset_accounts(id) ON DELETE CASCADE,
  bill_month DATE NOT NULL,
  total_amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_card_bills_status_check CHECK (status IN ('unpaid', 'partial', 'paid'))
);

CREATE INDEX IF NOT EXISTS idx_asset_accounts_user_id ON asset_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_accounts_user_active ON asset_accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_account_id ON asset_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_happened_at ON asset_transactions(account_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_account_id ON credit_card_bills(account_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE asset_accounts, asset_transactions, credit_card_bills TO anon, authenticated;
