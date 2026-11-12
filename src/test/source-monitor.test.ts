import {expect,it} from 'vitest';
import {sourceHealth} from '@/lib/source-monitor';
it('flags a missed three-hour retrieval after a one-hour grace period',()=>{expect(sourceHealth('2026-11-12T12:00:00Z','success',new Date('2026-11-12T16:01:00Z')).state).toBe('missed');expect(sourceHealth('2026-11-12T12:00:00Z','success',new Date('2026-11-12T15:59:00Z')).state).toBe('healthy');});
it('does not call a recent failed run healthy',()=>expect(sourceHealth('2026-11-12T15:00:00Z','failed',new Date('2026-11-12T16:00:00Z')).state).toBe('attention'));