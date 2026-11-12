import {describe,it,expect} from 'vitest';
import {normaliseRecord} from '@/lib/mandi-sync.server';
const row={date:'2024-01-02',state:'Karnataka',district:'Dharwad',market:'Hubli',commodity:'Maize',variety:'Local',grade:'FAQ',min_price:1800,max_price:2200,modal_price:2000};
describe('official report date validation',()=>{
 it('preserves a 2024 reporting date when retrieved in November 2026',()=>{
  const result=normaliseRecord(row,'2026-11-12T17:50:00Z','2026-11-12');
  expect(result?.date).toBe('2024-01-02');expect(result?.retrieved_at).toBe('2026-11-12T17:50:00Z');
 });
 it('rejects future reports rather than rewriting their date',()=>{
  expect(normaliseRecord({...row,date:'2026-11-13'},'2026-11-12T17:50:00Z','2026-11-12')).toBeNull();
 });
});