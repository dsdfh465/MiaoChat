/**
 * @fileoverview 健康检查响应体单元测试
 * @module tests/health
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildHealthResponse } from '../src/utils/health';

describe('buildHealthResponse', () => {
  it('returns the expected health payload', () => {
    const payload = buildHealthResponse();
    assert.deepEqual(payload, {
      status: 'ok',
      service: 'miaochat-backend',
      version: '1.0.0',
    });
  });
});
