import {describe,it,expect} from 'vitest';
import {distanceKm,yardDistance} from '../lib/geography';
describe('verified-coordinate distance only',()=>{
 it('computes zero for the same supplied coordinate',()=>expect(distanceKm({latitude:15,longitude:75},{latitude:15,longitude:75})).toBe(0));
 it('distinguishes straight-line kilometres from road distance',()=>expect(distanceKm({latitude:0,longitude:0},{latitude:0,longitude:1})).toBeCloseTo(111.195,2));
 it('does not calculate a yard distance for approximate matching coordinates',()=>expect(yardDistance({latitude:15,longitude:75},{latitude:15,longitude:75,match_quality:'town_centre'})).toBeNull());
 it('permits measured straight-line distance only for a yard match',()=>expect(yardDistance({latitude:0,longitude:0},{latitude:0,longitude:1,match_quality:'market_yard'})).toBeCloseTo(111.195,2));
});