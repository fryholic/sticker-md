import { render, screen, fireEvent } from '@testing-library/react';
import { Note } from './Note';
import { describe, it, expect, vi } from 'vitest';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('Note Component', () => {
    it('renders the textarea in edit mode by default', () => {
        render(<Note />);
        const textarea = screen.getByRole('textbox');
        expect(textarea).toBeInTheDocument();
    });

    it('toggles to preview mode and renders markdown', () => {
        const { getByRole, queryByRole } = render(<Note />);

        const toggleBtn = getByRole('button', { name: /preview/i });
        fireEvent.click(toggleBtn);

        expect(queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows unsaved indicator when content is modified', () => {
        const { getByRole } = render(<Note />);
        const textarea = getByRole('textbox');
        const saveBtn = getByRole('button', { name: /save/i });

        expect(saveBtn.className).not.toContain('bg-blue-500');

        fireEvent.change(textarea, { target: { value: '# Changed' } });

        expect(saveBtn.className).toContain('bg-blue-500');
    });

    it('clears unsaved indicator after saving', async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        (invoke as any).mockResolvedValueOnce('/path/to/note.md');

        const { getByRole } = render(<Note />);
        const textarea = getByRole('textbox');
        const saveBtn = getByRole('button', { name: /save/i });

        fireEvent.change(textarea, { target: { value: '# Changed' } });
        expect(saveBtn.className).toContain('bg-blue-500');

        fireEvent.click(saveBtn);

        expect(saveBtn.className).not.toContain('bg-blue-500');
    });

    it('displays Untitled initially', () => {
        const { getByText } = render(<Note />);
        expect(getByText(/untitled/i)).toBeInTheDocument();
    });

    it('calls save_note_with_dialog when no file path exists', async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        (invoke as any).mockResolvedValueOnce('/path/to/note.md');

        const { getByRole } = render(<Note />);
        const textarea = getByRole('textbox');
        const saveBtn = getByRole('button', { name: /save/i });

        fireEvent.change(textarea, { target: { value: '# Test' } });
        fireEvent.click(saveBtn);

        expect(invoke).toHaveBeenCalledWith('save_note_with_dialog', {
            content: '# Test',
        });
    });
});
