import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { invoke } from '@tauri-apps/api/core';
import { ContextMenu } from './ContextMenu';

export const Note = () => {
    // 편집 모드와 미리보기 모드 상태 관리 ('edit' | 'preview')
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');
    // 메모 내용 상태 관리
    const [content, setContent] = useState<string>('');
    // 배경색 상태 관리
    const [bgColor, setBgColor] = useState<string>('#FFF7D1');
    // 항상 위에 표시 상태 관리
    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(true);
    // 저장되지 않은 변경사항 상태 관리
    const [isDirty, setIsDirty] = useState<boolean>(false);
    // 컨텍스트 메뉴 상태
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    // 내용 변경 핸들러
    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        setIsDirty(true); // 내용이 변경되면 isDirty를 true로 설정
    };

    // 파일 저장 핸들러
    const handleSave = async () => {
        try {
            // Rust 백엔드의 'save_note' 커맨드 호출
            await invoke('save_note', { path: 'note.md', content });
            console.log('Saved successfully');
            setIsDirty(false); // 저장 후 isDirty를 false로 설정
        } catch (error) {
            console.error('Failed to save:', error);
        }
    };

    // 우클릭 핸들러
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    // 항상 위에 표시 토글 핸들러
    const toggleAlwaysOnTop = async () => {
        const newState = !isAlwaysOnTop;
        setIsAlwaysOnTop(newState);
        try {
            await invoke('set_always_on_top', { enabled: newState });
        } catch (error) {
            console.error('Failed to toggle always on top:', error);
        }
    };

    return (
        <div
            className="h-full w-full p-4 flex flex-col relative transition-colors duration-300"
            style={{ backgroundColor: bgColor }}
            onContextMenu={handleContextMenu}
        >
            {mode === 'edit' ? (
                // 에디터 모드: 텍스트 입력 영역
                <textarea
                    className="w-full h-full bg-transparent resize-none outline-none font-mono text-gray-800 placeholder-gray-500"
                    placeholder="# Write your note here..."
                    autoFocus
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                />
            ) : (
                // 미리보기 모드: 마크다운 렌더링
                <div className="w-full h-full overflow-auto prose prose-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
            )}

            {/* 하단 컨트롤 버튼 영역 */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                    onClick={handleSave}
                    className={`p-2 rounded transition-colors ${isDirty
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                    aria-label="Save"
                >
                    Save
                </button>
                <button
                    onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
                    className="p-2 bg-white/50 rounded hover:bg-white/80 transition-colors"
                    aria-label={mode === 'edit' ? 'Preview' : 'Edit'}
                >
                    {mode === 'edit' ? 'Preview' : 'Edit'}
                </button>
            </div>

            {/* 컨텍스트 메뉴 렌더링 */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onColorChange={setBgColor}
                    onAlwaysOnTopToggle={toggleAlwaysOnTop}
                    isAlwaysOnTop={isAlwaysOnTop}
                />
            )}
        </div>
    );
};
