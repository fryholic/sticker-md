import React, { useState } from 'react';

interface TitleBarProps {
    onClose: () => void;
    onMinimize: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onClose, onMinimize }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="fixed top-0 left-0 right-0 h-8 flex items-center justify-between z-50">
            {/* 1. Left Spacer (Drag Handle) */}
            <div
                className="flex-grow h-full"
                data-tauri-drag-region
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />

            {/* 2. Right Controls (Clickable, No Drag) */}
            <div
                className={`flex gap-1 pr-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <button
                    onClick={onMinimize}
                    className="w-6 h-6 flex items-center justify-center bg-white/50 hover:bg-white/80 rounded text-gray-700 text-sm transition-colors shadow-sm backdrop-blur-sm"
                    aria-label="Minimize"
                >
                    &minus;
                </button>
                <button
                    onClick={onClose}
                    className="w-6 h-6 flex items-center justify-center bg-white/50 hover:bg-red-500 hover:text-white rounded text-gray-700 text-sm transition-colors shadow-sm backdrop-blur-sm"
                    aria-label="Close"
                >
                    &times;
                </button>
            </div>
        </div>
    );
};
