import {it,expect} from 'vitest';
import {currentNearbyReports} from '../lib/geography';
it('nearby current prices exclude historical and future reports',()=>{
 expect(currentNearbyReports([{date:'2026-11-12'},{date:'2026-04-18'},{date:'2026-11-14'}],new Date('2026-11-13T06:21:00Z'))).toEqual([{date:'2026-11-12'}]);
});