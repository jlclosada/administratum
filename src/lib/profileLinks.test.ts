import { describe, expect, it } from 'vitest';
import { linkLabel, normalizeUrl, profileLinks } from './profileLinks';

describe('normalizeUrl', () => {
  it('adds https to bare domains', () => {
    expect(normalizeUrl('instagram.com/pintor')).toBe('https://instagram.com/pintor');
  });
  it('keeps explicit protocols', () => {
    expect(normalizeUrl('http://blog.example.org')).toBe('http://blog.example.org/');
  });
  it('rejects non-URLs and empty input', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('hola que tal')).toBeNull();
  });
});

describe('linkLabel', () => {
  it('prefers the label, else host + path without www', () => {
    expect(linkLabel({ label: 'Mi blog', url: 'https://x.com' })).toBe('Mi blog');
    expect(linkLabel({ label: '', url: 'https://www.youtube.com/@pintor/' })).toBe('youtube.com/@pintor');
  });
});

describe('profileLinks', () => {
  it('falls back to the legacy website field', () => {
    expect(profileLinks({ links: [], website: 'https://a.com/' })).toEqual([{ label: '', url: 'https://a.com/' }]);
    expect(profileLinks({ links: [], website: null })).toEqual([]);
  });
});
