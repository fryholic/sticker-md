import React from 'react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onColorChange: (color: string) => void;
    onAlwaysOnTopToggle: () => void;
    isAlwaysOnTop: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    onClose,
    onColorChange,
    onAlwaysOnTopToggle,
    isAlwaysOnTop,
}) => {
    const colors = [
        '#FFF7D1', // 노란색
        '#FFE4E1', // 연한 빨간색
        '#E1F5FE', // 연한 파란색
        '#E8F5E9', // 연한 초록색
        '#F3E5F5', // 연한 보라색
    ];

    return (
        <>
            {/* 배경 클릭 시 메뉴 닫기 */}
            <div
                className="fixed inset-0 z-50"
                onClick={onClose}
                onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            />

            {/* 메뉴 본문 */}
            <div
                className="fixed z-50 bg-white/90 backdrop-blur-sm shadow-lg rounded-lg p-2 min-w-[150px] border border-gray-200"
                style={{ top: y, left: x }}
            >
                <div className="text-xs text-gray-500 mb-2 px-2">Colors</div>
                <div className="flex gap-2 px-2 mb-3">
                    {colors.map((color) => (
                        <button
                            key={color}
                            className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                                onColorChange(color);
                                onClose();
                            }}
                            aria-label={`Change color to ${color}`}
                        />
                    ))}
                </div>

                <div className="h-px bg-gray-200 my-1" />

                <button
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center justify-between"
                    onClick={() => {
                        onAlwaysOnTopToggle();
                        onClose();
                    }}
                >
                    <span>Always on Top</span>
                    {isAlwaysOnTop && <span className="text-blue-500">✓</span>}
                </button>
            </div>
        </>
    );
};
