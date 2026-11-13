import {describe,it,expect} from 'vitest';
import {distanceKm,yardDistance,nearestYards,RADIUS_OPTIONS} from '../lib/geography';
describe('verified-coordinate distance only',()=>{
 it('computes zero for the same supplied coordinate',()=>expect(distanceKm({latitude:15,longitude:75},{latitude:15,longitude:75})).toBe(0));
 it('distinguishes straight-line kilometres from road distance',()=>expect(distanceKm({latitude:0,longitude:0},{latitude:0,longitude:1})).toBeCloseTo(111.195,2));
 it('does not calculate a yard distance for approximate matching coordinates',()=>expect(yardDistance({latitude:15,longitude:75},{latitude:15,longitude:75,match_quality:'town_centre'})).toBeNull());
 it('permits measured straight-line distance only for a yard match',()=>expect(yardDistance({latitude:0,longitude:0},{latitude:0,longitude:1,match_quality:'market_yard'})).toBeCloseTo(111.195,2));
 it('offers search distances beyond 200 km up to 1000 km',()=>expect(RADIUS_OPTIONS.filter(x=>x>200)).toEqual([300,500,1000]));
 it('includes a 250 km yard only after choosing 300 km',()=>{const yards=[{latitude:0,longitude:2.25,match_quality:'market_yard',market:'Far'}];expect(nearestYards({latitude:0,longitude:0},yards,200)).toEqual([]);expect(nearestYards({latitude:0,longitude:0},yards,300).map(x=>x.market)).toEqual(['Far']);});
 it('returns nearest markets first',()=>{const yards=[{latitude:0,longitude:2,match_quality:'market_yard',market:'B'},{latitude:0,longitude:1,match_quality:'market_yard',market:'A'}];expect(nearestYards({latitude:0,longitude:0},yards,500).map(x=>x.market)).toEqual(['A','B']);});
});