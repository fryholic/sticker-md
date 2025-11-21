import React, { useState } from 'react';
import { List, Save, Minus, X } from 'lucide-react';

interface TitleBarProps {
    onClose: () => void;
    onMinimize: () => void;
    onOpenMain?: () => void;
    onSave?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onClose, onMinimize, onOpenMain, onSave }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className="fixed top-0 left-0 right-0 h-8 flex items-center justify-between z-50 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Drag Handle (takes up remaining space) */}
            <div
                className="flex-grow h-full"
                data-tauri-drag-region
            />

            {/* Right Controls */}
            <div className={`flex gap-1 pr-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                {onOpenMain && (
                    <button
                        onClick={onOpenMain}
                        className="w-6 h-6 flex items-center justify-center bg-white/50 hover:bg-white/80 rounded text-black transition-colors shadow-sm backdrop-blur-sm cursor-pointer"
                        aria-label="Open List"
                        title="Open List"
                    >
                        <List size={16} color="#000000" strokeWidth={2.5} />
                    </button>
                )}
                {onSave && (
                    <button
                        onClick={onSave}
                        className="w-6 h-6 flex items-center justify-center bg-white/50 hover:bg-white/80 rounded text-black transition-colors shadow-sm backdrop-blur-sm cursor-pointer"
                        aria-label="Save"
                        title="Save"
                    >
                        <Save size={16} color="#000000" strokeWidth={2.5} />
                    </button>
                )}
                <button
                    onClick={onMinimize}
                    className="w-6 h-6 flex items-center justify-center bg-white/50 hover:bg-white/80 rounded text-black transition-colors shadow-sm backdrop-blur-sm cursor-pointer"
                    aria-label="Minimize"
                    title="Minimize"
                >
                    <Minus size={16} color="#000000" strokeWidth={2.5} />
                </button>
                <button
                    onClick={onClose}
                    className="w-6 h-6 flex items-center justify-center bg-white/50 hover:bg-red-500 hover:text-white rounded text-black transition-colors shadow-sm backdrop-blur-sm cursor-pointer group/close"
                    aria-label="Close"
                    title="Close"
                >
                    <X size={16} className="text-black group-hover/close:text-white" strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
};
