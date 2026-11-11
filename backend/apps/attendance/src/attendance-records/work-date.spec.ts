import { describe, expect, it } from 'vitest';
import { toWorkDate } from './work-date';

// WIB is UTC+7 all year (no daylight saving), so WIB midnight is 17:00 UTC of the day before.
describe('toWorkDate', () => {
  it('uses the WIB calendar date, not the UTC one', () => {
    // 01:30 WIB on 12 November is still 11 November in UTC.
    expect(toWorkDate(new Date('2026-11-11T18:30:00Z'))).toBe('2026-11-12');
  });

  it('keeps the last moment before WIB midnight on the same day', () => {
    expect(toWorkDate(new Date('2026-11-11T16:59:59.999Z'))).toBe('2026-11-11');
  });

  it('moves to the next day exactly at WIB midnight', () => {
    expect(toWorkDate(new Date('2026-11-11T17:00:00.000Z'))).toBe('2026-11-12');
  });

  it('agrees with UTC during the part of the day both share', () => {
    expect(toWorkDate(new Date('2026-11-11T05:00:00Z'))).toBe('2026-11-11');
  });

  it('crosses a year boundary correctly', () => {
    // 00:00 WIB on 1 January 2027.
    expect(toWorkDate(new Date('2026-12-31T17:00:00Z'))).toBe('2027-01-01');
  });

  it('always returns the YYYY-MM-DD format that the DATE column stores', () => {
    expect(toWorkDate(new Date('2026-03-04T03:00:00Z'))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});
