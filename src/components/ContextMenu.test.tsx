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
        // The second div is the menu container (first is backdrop)
        // We can find it by looking for the "Colors" text and getting the parent's parent or similar,
        // or better, add a data-testid to the component. 
        // For now, let's rely on the structure: backdrop is fixed inset-0, menu is fixed with top/left.
        const menuText = screen.getByText('Colors');
        const menuContainer = menuText.parentElement;
        expect(menuContainer).toHaveStyle({ top: '100px', left: '100px' });
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
