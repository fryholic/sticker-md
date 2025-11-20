import { describe, it, expect, vi } from 'vitest';
import { syncNote } from './sync';

describe('Sync API', () => {
    it('logs to console and returns true', async () => {
        const consoleSpy = vi.spyOn(console, 'log');
        const note = { content: 'test', updatedAt: new Date() };

        const result = await syncNote(note);

        expect(consoleSpy).toHaveBeenCalledWith('Syncing note to server:', note);
        expect(result).toBe(true);

        consoleSpy.mockRestore();
    });
});
