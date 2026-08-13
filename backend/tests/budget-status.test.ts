/**
 * @fileoverview 预算进度百分比与状态枚举的边界测试
 * @module tests/budget-status
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BudgetStatus,
  calcBudgetPercentage,
  resolveBudgetStatus,
} from '../src/utils/budget-status';

describe('budget status helpers', () => {
  it('returns 0 percent when budget limit is 0', () => {
    assert.equal(calcBudgetPercentage(100, 0), 0);
  });

  it('rounds percentage to one decimal place', () => {
    assert.equal(calcBudgetPercentage(32450, 200000), 16.2);
    assert.equal(calcBudgetPercentage(48000, 50000), 96);
    assert.equal(calcBudgetPercentage(80450, 250000), 32.2);
  });

  it('maps every status enum at inclusive thresholds', () => {
    assert.equal(resolveBudgetStatus(0), BudgetStatus.NORMAL);
    assert.equal(resolveBudgetStatus(69.9), BudgetStatus.NORMAL);
    assert.equal(resolveBudgetStatus(70), BudgetStatus.WARNING);
    assert.equal(resolveBudgetStatus(89.9), BudgetStatus.WARNING);
    assert.equal(resolveBudgetStatus(90), BudgetStatus.DANGER);
    assert.equal(resolveBudgetStatus(99.9), BudgetStatus.DANGER);
    assert.equal(resolveBudgetStatus(100), BudgetStatus.EXCEEDED);
    assert.equal(resolveBudgetStatus(125), BudgetStatus.EXCEEDED);
  });
});
