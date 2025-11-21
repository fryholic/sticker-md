import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { NotesIndex } from '../types/note';

interface NoteProps {
    noteId?: string | null;
}

export const Note = ({ noteId }: NoteProps) => {
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

    // 메뉴 이벤트 리스너
    useEffect(() => {
        const unlistenPromise = listen<string>('menu-event', (event) => {
            // 포커스가 있는 경우에만 처리 (간단한 구분)
            if (!document.hasFocus()) return;

            const id = event.payload;
            console.log('Menu event received:', id);

            if (id === 'toggle_top') {
                // 상태 업데이트 함수형으로 처리하여 최신 상태 보장
                setIsAlwaysOnTop(prev => {
                    const newState = !prev;
                    invoke('set_always_on_top', { enabled: newState }).catch(console.error);
                    return newState;
                });
            } else if (id.startsWith('color_')) {
                const color = id.replace('color_', '');
                setBgColor(color);
            }
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    // 노트 데이터 로드
    useEffect(() => {
        const loadNote = async () => {
            if (!noteId) return;

            try {
                console.log(`Loading note data for ID: ${noteId}`);
                // Load content
                const content = await invoke<string>('load_note_content', { id: noteId });
                setContent(content);
                setIsDirty(false);

                // Load metadata to get filePath
                const index = await invoke<NotesIndex>('get_notes_list');
                const note = index.notes.find(n => n.id === noteId);
                if (note) {
                    setFilePath(note.file_path);
                    console.log(`Loaded file path: ${note.file_path}`);
                }
            } catch (error) {
                console.log('New note or failed to load:', error);
                // New note case: do nothing, start empty
            }
        };

        loadNote();
    }, [noteId]);

    // 내용 변경 핸들러
    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        setIsDirty(true); // 내용이 변경되면 isDirty를 true로 설정
    };

    // 파일 저장 핸들러
    const handleSave = async () => {
        try {
            let currentPath = filePath;
            
            if (!currentPath) {
                // 파일 경로가 없으면 다이얼로그 표시
                currentPath = await invoke<string>('save_note_with_dialog', { content });
                setFilePath(currentPath); // 선택된 경로 저장
            } else {
                // 이미 파일 경로가 있으면 해당 경로에 저장
                await invoke('save_note', { path: currentPath, content });
            }

            // 인덱스 등록/업데이트
            if (noteId && currentPath) {
                const title = content.split('\n')[0]?.replace(/^#+\s*/, '').trim().substring(0, 50) || 'Untitled Note';
                await invoke('register_note', { 
                    id: noteId, 
                    title: title, 
                    filePath: currentPath 
                });
            }

            console.log('Saved successfully');
            setIsDirty(false); // 저장 후 isDirty를 false로 설정
        } catch (error) {
            console.error('Failed to save:', error);
        }
    };

    // 우클릭 핸들러 (Native Menu)
    const handleContextMenu = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            await invoke('show_context_menu');
        } catch (error) {
            console.error('Failed to show context menu:', error);
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
            )}

            {/* 하단 컨트롤 버튼 영역 */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                    onClick={handleSave}
                    className={`px-3 py-1.5 rounded-md transition-all duration-200 font-medium text-sm ${isDirty
                        ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
                        : 'bg-white/70 hover:bg-white/90 text-gray-700 shadow-sm'
                        }`}
                    aria-label="Save"
                >
                    Save
                </button>
                <button
                    onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
                    className="px-3 py-1.5 bg-white/70 hover:bg-white/90 text-gray-700 rounded-md shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm"
                    aria-label={mode === 'edit' ? 'Preview' : 'Edit'}
                >
                    {mode === 'edit' ? 'Preview' : 'Edit'}
                </button>
            </div>
        </div>
    );
};
