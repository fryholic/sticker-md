import React from 'react';
import { X, Minus } from 'lucide-react';

interface TitleBarProps {
    onClose: () => void;
    onMinimize: () => void;
}

// 타이틀바 컴포넌트: 닫기/최소화 버튼을 포함하며 드래그 가능 영역
export const TitleBar: React.FC<TitleBarProps> = ({ onClose, onMinimize }) => {
    return (
        <div
            data-tauri-drag-region
            className="h-8 flex items-center justify-end px-2 bg-transparent group relative"
        >
            {/* 버튼 그룹 - 기본 숨김, 호버 시 표시 */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {/* 최소화 버튼 */}
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // 드래그 이벤트 방지
                        onMinimize();
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
                    aria-label="Minimize"
                >
                    <Minus className="w-4 h-4 text-gray-700" />
                </button>

                {/* 닫기 버튼 */}
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // 드래그 이벤트 방지
                        onClose();
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <X className="w-4 h-4 text-gray-700" />
                </button>
            </div>
        </div>
    );
};
