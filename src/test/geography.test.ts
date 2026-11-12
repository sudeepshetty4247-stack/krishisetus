import {describe,it,expect} from 'vitest';
import {distanceKm} from '../lib/geography';
describe('verified-coordinate distance only',()=>{
 it('computes zero for the same supplied coordinate',()=>expect(distanceKm({latitude:15,longitude:75},{latitude:15,longitude:75})).toBe(0));
 it('distinguishes straight-line kilometres from road distance',()=>expect(distanceKm({latitude:0,longitude:0},{latitude:0,longitude:1})).toBeCloseTo(111.195,2));
});