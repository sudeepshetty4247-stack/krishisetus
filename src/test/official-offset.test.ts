import {describe,expect,it} from 'vitest';
import {nextOfficialOffset} from '@/lib/mandi-sync.server';
describe('official page cursor',()=>{
 it('advances by the rows received',()=>expect(nextOfficialOffset(0,1000,16785)).toBe(1000));
 it('restarts after the last page',()=>expect(nextOfficialOffset(16000,785,16785)).toBe(0));
 it('restarts when a page is empty',()=>expect(nextOfficialOffset(5000,0,16785)).toBe(0));
});
