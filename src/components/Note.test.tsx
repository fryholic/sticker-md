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

    it('shows unsaved indicator when content is modified', () => {
        const { getByRole } = render(<Note />);
        const textarea = getByRole('textbox');
        const saveBtn = getByRole('button', { name: /save/i });

        // 초기 상태: 저장되지 않은 변경사항 없음
        expect(saveBtn.className).not.toContain('bg-blue-500');

        // 내용 변경
        fireEvent.change(textarea, { target: { value: '# Changed' } });

        // 저장되지 않은 변경사항 표시 확인
        expect(saveBtn.className).toContain('bg-blue-500');
    });

    it('clears unsaved indicator after saving', async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        const { getByRole } = render(<Note />);
        const textarea = getByRole('textbox');
        const saveBtn = getByRole('button', { name: /save/i });

        // 내용 변경
        fireEvent.change(textarea, { target: { value: '# Changed' } });
        expect(saveBtn.className).toContain('bg-blue-500');

        // 저장
        fireEvent.click(saveBtn);

        // 저장 후 표시 제거 확인
        expect(saveBtn.className).not.toContain('bg-blue-500');
    });
});
