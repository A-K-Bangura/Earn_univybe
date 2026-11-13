import { beforeEach, describe, expect, it } from 'vitest';
import { consumeReturnPath, rememberReturnPath, safeReturnPath } from './returnPath';
describe('Earn return paths', () => {
  beforeEach(() => sessionStorage.clear());
  it('keeps canonical feature links and filters across account setup', () => {
    expect(safeReturnPath('/opportunities?type=internship')).toBe('/opportunities?type=internship');
    rememberReturnPath('/gigs/42'); expect(consumeReturnPath()).toBe('/gigs/42'); expect(consumeReturnPath()).toBe('/discover');
  });
  it.each(['https://example.com','//example.com','/\\example.com','/courses/5','/auth/login','/feed/not-a-numeric-id','/gigs/../auth/login','/gigs/%2e%2e/auth/login'])('rejects unsafe or obsolete target %s', value => expect(safeReturnPath(value)).toBeNull());
});
