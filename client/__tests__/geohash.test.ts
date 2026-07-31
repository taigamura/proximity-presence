import { toGeohash6 } from '../src/platform/geohash';

describe('toGeohash6', () => {
  it('returns a 6-character geohash string', () => {
    const result = toGeohash6(35.6812, 139.7671); // Tokyo
    expect(result).toHaveLength(6);
    expect(typeof result).toBe('string');
  });

  it('produces the same bucket for coordinates within the same cell', () => {
    const a = toGeohash6(35.68120, 139.76710);
    const b = toGeohash6(35.68125, 139.76715);
    expect(a).toBe(b);
  });

  it('produces different buckets for coordinates ~1.5km apart', () => {
    const a = toGeohash6(35.6812, 139.7671);
    const b = toGeohash6(35.6947, 139.7671); // ~1.5km north
    expect(a).not.toBe(b);
  });
});
