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
    // 파일 경로 상태 관리
    const [filePath, setFilePath] = useState<string | null>(null);
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
            if (filePath) {
                // 이미 파일 경로가 있으면 해당 경로에 저장
                await invoke('save_note', { path: filePath, content });
            } else {
                // 파일 경로가 없으면 다이얼로그 표시
                const path = await invoke<string>('save_note_with_dialog', { content });
                setFilePath(path); // 선택된 경로 저장
            }
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
            {/* 파일 경로 표시 */}
            <div className="text-xs text-gray-500 mb-2">
                {filePath ? filePath : 'Untitled'}
            </div>


            {mode === 'edit' ? (
                // 에디터 모드: 텍스트 입력 영역
                <textarea
                    className="w-full h-full bg-transparent resize-none outline-none font-sans text-gray-800 placeholder-gray-400 leading-relaxed"
                    placeholder="# Write your note here..."
                    autoFocus
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                />
            ) : (
                // 미리보기 모드: 마크다운 렌더링
                <div className="w-full h-full overflow-auto prose prose-sm max-w-none prose-headings:font-semibold prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
