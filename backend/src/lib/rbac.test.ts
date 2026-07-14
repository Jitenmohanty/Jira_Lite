import { describe, expect, it } from 'vitest';
import { roleSatisfies } from './rbac';

describe('roleSatisfies', () => {
  it('owner satisfies every role', () => {
    expect(roleSatisfies('owner', 'owner')).toBe(true);
    expect(roleSatisfies('owner', 'admin')).toBe(true);
    expect(roleSatisfies('owner', 'member')).toBe(true);
  });

  it('admin satisfies admin and member but not owner', () => {
    expect(roleSatisfies('admin', 'owner')).toBe(false);
    expect(roleSatisfies('admin', 'admin')).toBe(true);
    expect(roleSatisfies('admin', 'member')).toBe(true);
  });

  it('member satisfies only member', () => {
    expect(roleSatisfies('member', 'owner')).toBe(false);
    expect(roleSatisfies('member', 'admin')).toBe(false);
    expect(roleSatisfies('member', 'member')).toBe(true);
  });
});
