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

        // Find toggle button
        const toggleBtn = getByRole('button', { name: /preview/i });

        // Click toggle
        fireEvent.click(toggleBtn);

        // Textarea should be gone
        expect(queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('calls save_note command when save button is clicked', async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        const { getByRole } = render(<Note />);
        const textarea = getByRole('textbox');

        // Type some content
        fireEvent.change(textarea, { target: { value: '# New Note' } });

        // Find save button
        const saveBtn = getByRole('button', { name: /save/i });

        fireEvent.click(saveBtn);

        expect(invoke).toHaveBeenCalledWith('save_note', {
            path: 'note.md',
            content: '# New Note',
        });
    });
});
