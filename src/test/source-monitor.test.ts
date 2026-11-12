import {expect,it} from 'vitest';
import {sourceHealth,recentlyCompleted} from '@/lib/source-monitor';
it('flags a missed three-hour retrieval after a one-hour grace period',()=>{expect(sourceHealth('2026-11-12T12:00:00Z','success',new Date('2026-11-12T16:01:00Z')).state).toBe('missed');expect(sourceHealth('2026-11-12T12:00:00Z','success',new Date('2026-11-12T15:59:00Z')).state).toBe('healthy');});
it('does not call a recent failed run healthy',()=>expect(sourceHealth('2026-11-12T15:00:00Z','failed',new Date('2026-11-12T16:00:00Z')).state).toBe('attention'));
it('allows immediate recovery after partial ingestion',()=>expect(recentlyCompleted('2026-11-12T19:18:00Z','partial',new Date('2026-11-12T19:20:00Z'))).toBe(false));
it('allows immediate recovery after failed ingestion',()=>expect(recentlyCompleted('2026-11-12T19:18:00Z','failed',new Date('2026-11-12T19:20:00Z'))).toBe(false));
it('only throttles a successfully completed refresh for thirty minutes',()=>{expect(recentlyCompleted('2026-11-12T19:18:00Z','success',new Date('2026-11-12T19:47:00Z'))).toBe(true);expect(recentlyCompleted('2026-11-12T19:18:00Z','success',new Date('2026-11-12T19:48:00Z'))).toBe(false);});