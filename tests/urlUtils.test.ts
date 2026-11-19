import { describe, expect, it } from 'vitest';
import {
  extractDomain,
  formatDisplayUrl,
  getMonogramLetter,
  isBookmarkletUrl,
  isRestrictedBrowserUrl,
  normalizeUrl,
} from '../src/engine/urlUtils';

describe('urlUtils', () => {
  it('normalizes protocol, www prefix, trailing slashes, and tracking query params', () => {
    const a = normalizeUrl(
      'http://www.Docs.Stripe.com/webhooks/signatures/?utm_source=newsletter&utm_medium=email&version=2'
    );
    const b = normalizeUrl('https://docs.stripe.com/webhooks/signatures?version=2&fbclid=xyz123');
    expect(a).toBe('https://docs.stripe.com/webhooks/signatures?version=2');
    expect(b).toBe(a);
  });

  it('preserves meaningful hash fragments so distinct SPA routes or doc sections stay distinct', () => {
    const rolesUrl = normalizeUrl('https://us-east-1.console.aws.amazon.com/iam/home#/roles');
    const usersUrl = normalizeUrl('https://us-east-1.console.aws.amazon.com/iam/home#/users');
    expect(rolesUrl).not.toBe(usersUrl);
    expect(rolesUrl).toContain('#/roles');
  });

  it('handles browser internal schemes and javascript bookmarklets safely', () => {
    expect(isRestrictedBrowserUrl('chrome://extensions/?id=abc')).toBe(true);
    expect(isBookmarkletUrl('javascript:(function(){alert(1)})()')).toBe(true);
    expect(extractDomain('javascript:void(0)')).toBe('bookmarklet');
    expect(extractDomain('https://www.github.com/vitejs/vite')).toBe('github.com');
    expect(formatDisplayUrl('https://www.figma.com/file/123/Design/')).toBe(
      'figma.com/file/123/Design'
    );
    expect(getMonogramLetter('docs.stripe.com')).toBe('S');
    expect(getMonogramLetter('us-east-1.console.aws.amazon.com')).toBe('A');
  });
});
