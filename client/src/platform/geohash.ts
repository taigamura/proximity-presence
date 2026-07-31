import ngeohash from 'ngeohash';
import { Geohash6 } from '../domain/types';

export function toGeohash6(latitude: number, longitude: number): Geohash6 {
  return ngeohash.encode(latitude, longitude, 6);
}
