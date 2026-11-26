import { describe, expect, it } from 'vitest';
import { adjacentChapter, chapterIndex, CHAPTERS } from './chapters';

describe('presentation chapters (FR-27)', () => {
  it('tells the story in pitch order', () => {
    expect(CHAPTERS.map((c) => c.path)).toEqual([
      '/services',
      '/destinations',
      '/finder',
      '/shortlist',
      '/journey',
    ]);
  });

  it('keeps the parent chapter lit on detail routes', () => {
    expect(chapterIndex('/welcome')).toBe(-1);
    expect(chapterIndex('/')).toBe(-1);
    expect(chapterIndex('/c/uk')).toBe(1);
    expect(chapterIndex('/u/abc')).toBe(1);
    expect(chapterIndex('/k/xyz')).toBe(2);
    expect(chapterIndex('/shortlist')).toBe(3);
  });

  it('steps forward and back like a presentation clicker', () => {
    expect(adjacentChapter('/welcome', 1)).toBe('/services');
    expect(adjacentChapter('/welcome', -1)).toBeNull();
    expect(adjacentChapter('/services', -1)).toBe('/welcome');
    expect(adjacentChapter('/c/uk', 1)).toBe('/finder');
    expect(adjacentChapter('/journey', 1)).toBeNull();
  });
});
