import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu } from './ContextMenu';
import { describe, it, expect, vi } from 'vitest';

describe('ContextMenu Component', () => {
    const defaultProps = {
        x: 100,
        y: 100,
        onClose: vi.fn(),
        onColorChange: vi.fn(),
        onAlwaysOnTopToggle: vi.fn(),
        isAlwaysOnTop: false,
    };

    it('renders at the correct position', () => {
        render(<ContextMenu {...defaultProps} />);
        const menu = screen.getByText('Colors').closest('div');
        // Note: We are checking the style prop on the second div (the menu itself)
        // The first div is the backdrop.
        // A more robust way is to find by test id or class, but structure is simple.
        expect(menu).toHaveStyle({ top: '100px', left: '100px' });
    });

    it('calls onColorChange when a color is clicked', () => {
        render(<ContextMenu {...defaultProps} />);
        const colorBtn = screen.getByLabelText('Change color to #FFF7D1');
        fireEvent.click(colorBtn);
        expect(defaultProps.onColorChange).toHaveBeenCalledWith('#FFF7D1');
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onAlwaysOnTopToggle when the option is clicked', () => {
        render(<ContextMenu {...defaultProps} />);
        const toggleBtn = screen.getByText('Always on Top').closest('button');
        fireEvent.click(toggleBtn!);
        expect(defaultProps.onAlwaysOnTopToggle).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('shows checkmark when isAlwaysOnTop is true', () => {
        render(<ContextMenu {...defaultProps} isAlwaysOnTop={true} />);
        expect(screen.getByText('✓')).toBeInTheDocument();
    });
});
