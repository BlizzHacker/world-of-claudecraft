import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/db', () => ({
  accountForToken: vi.fn(),
  pool: { query: vi.fn() },
}));

import { maybeHandleExchangeApi } from '../server/exchange/api';

function response(): any {
  return {
    status: 0,
    body: '',
    writeHead(status: number) {
      this.status = status;
    },
    end(body: string) {
      this.body = body;
    },
  };
}

describe('Exchange write-process guard', () => {
  beforeEach(() => {
    delete process.env.CR_CROSS_REALM;
  });

  it.each([
    ['/api/exchange/listings', 'POST'],
    ['/api/exchange/listings/ex-1/cancel', 'POST'],
    ['/api/exchange/listings/ex-1/settle', 'POST'],
    ['/api/exchange/listings/ex-1/reverse', 'POST'],
  ])('rejects %s on a normal realm process', async (pathname, method) => {
    const req = { method, headers: {}, url: pathname } as any;
    const res = response();
    expect(await maybeHandleExchangeApi(req, res, pathname)).toBe(true);
    expect(res.status).toBe(503);
    expect(JSON.parse(res.body).error).toContain('Exchange realm');
  });
});
