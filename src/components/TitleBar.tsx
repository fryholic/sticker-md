import React, { useState } from 'react';

interface TitleBarProps {
    onClose: () => void;
    onMinimize: () => void;
    onOpenMain?: () => void;
    onSave?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onClose, onMinimize, onOpenMain, onSave }) => {
    const [isHovered, setIsHovered] = useState(false);

    // 공통 버튼 스타일 (인라인 스타일로 강제 적용)
    const buttonStyle: React.CSSProperties = {
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        padding: 0,
        color: '#000000', // 텍스트 색상 강제
    };

    return (
        <div
            className="fixed top-0 left-0 right-0 h-8 flex items-center justify-between z-50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ backgroundColor: 'transparent' }} // TitleBar 자체 배경 투명
        >
            {/* Drag Handle (takes up remaining space) */}
            <div
                className="flex-grow h-full"
                data-tauri-drag-region
            />

            {/* Right Controls */}
            <div
                className="flex gap-1 pr-1"
                style={{
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.2s ease-in-out'
                }}
            >
                {onOpenMain && (
                    <button
                        onClick={onOpenMain}
                        style={buttonStyle}
                        aria-label="Open List"
                        title="Open List"
                        className="hover:bg-gray-500 rounded group"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#000000"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ display: 'block' }}
                            className="group-hover:stroke-gray-300"
                        >
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                    </button>
                )}
                {onSave && (
                    <button
                        onClick={onSave}
                        style={buttonStyle}
                        aria-label="Save"
                        title="Save"
                        className="hover:bg-gray-500 rounded group"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#000000"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ display: 'block' }}
                            className="group-hover:stroke-gray-300"
                        >
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                    </button>
                )}
                <button
                    onClick={onMinimize}
                    style={buttonStyle}
                    aria-label="Minimize"
                    title="Minimize"
                    className="hover:bg-gray-500 rounded group"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#000000"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ display: 'block' }}
                        className="group-hover:stroke-gray-300"
                    >
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                <button
                    onClick={onClose}
                    style={buttonStyle}
                    aria-label="Close"
                    title="Close"
                    className="hover:bg-red-500 hover:text-white rounded group/close"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#000000"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ display: 'block' }}
                        className="group-hover/close:stroke-gray-300"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};
