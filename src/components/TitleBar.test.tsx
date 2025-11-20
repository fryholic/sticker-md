import { render, screen, fireEvent } from '@testing-library/react';
import { TitleBar } from './TitleBar';
import { describe, it, expect, vi } from 'vitest';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('TitleBar Component', () => {
    const defaultProps = {
        onClose: vi.fn(),
        onMinimize: vi.fn(),
    };

    it('renders close and minimize buttons', () => {
        render(<TitleBar {...defaultProps} />);

        // 닫기 버튼 확인
        const closeBtn = screen.getByLabelText('Close');
        expect(closeBtn).toBeInTheDocument();

        // 최소화 버튼 확인
        const minimizeBtn = screen.getByLabelText('Minimize');
        expect(minimizeBtn).toBeInTheDocument();
    });

    it('has drag region attribute on container', () => {
        const { container } = render(<TitleBar {...defaultProps} />);
        const titleBar = container.firstChild as HTMLElement;

        // data-tauri-drag-region 속성 확인
        expect(titleBar).toHaveAttribute('data-tauri-drag-region');
    });

    it('calls onClose when close button is clicked', () => {
        render(<TitleBar {...defaultProps} />);

        const closeBtn = screen.getByLabelText('Close');
        fireEvent.click(closeBtn);

        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onMinimize when minimize button is clicked', () => {
        render(<TitleBar {...defaultProps} />);

        const minimizeBtn = screen.getByLabelText('Minimize');
        fireEvent.click(minimizeBtn);

        expect(defaultProps.onMinimize).toHaveBeenCalledTimes(1);
    });

    it('buttons have hover effect classes', () => {
        render(<TitleBar {...defaultProps} />);

        const closeBtn = screen.getByLabelText('Close');
        const minimizeBtn = screen.getByLabelText('Minimize');

        // 호버 효과를 위한 opacity transition 클래스 확인
        expect(closeBtn.className).toContain('opacity');
        expect(minimizeBtn.className).toContain('opacity');
    });
});
