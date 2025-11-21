import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { NotesIndex } from '../types/note';
import { TitleBar } from './TitleBar';
import { Bold, Italic, Underline, Strikethrough, Image as ImageIcon, Eye, Pencil } from 'lucide-react';

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
    // 항상 위에 표시 상태 관리 (초기값 false로 변경)
    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false);
    // 저장되지 않은 변경사항 상태 관리
    const [isDirty, setIsDirty] = useState<boolean>(false);
    // 파일 경로 상태 관리
    const [filePath, setFilePath] = useState<string | null>(null);
    // 텍스트 영역 Ref
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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
                    console.log(`Toggling Always on Top: ${prev} -> ${newState}`);
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

    // 윈도우 닫기 핸들러
    const handleClose = async () => {
        try {
            await invoke('close_window');
        } catch (error) {
            console.error('Failed to close window:', error);
        }
    };

    // 윈도우 최소화 핸들러
    const handleMinimize = async () => {
        try {
            await invoke('minimize_window');
        } catch (error) {
            console.error('Failed to minimize window:', error);
        }
    };

    // 메인 윈도우 열기 핸들러
    const handleOpenMain = async () => {
        try {
            await invoke('open_main_window');
        } catch (error) {
            console.error('Failed to open main window:', error);
        }
    };

    // 텍스트 포맷팅 핸들러
    const insertFormat = (startTag: string, endTag: string = startTag) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        const newText = text.substring(0, start) + startTag + selectedText + endTag + text.substring(end);
        
        // React state update
        handleContentChange(newText);

        // Restore selection/cursor
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + startTag.length, end + startTag.length);
        }, 0);
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
            className="h-full w-full flex flex-col relative transition-colors duration-300"
            style={{ backgroundColor: bgColor }}
            onContextMenu={handleContextMenu}
        >
            <TitleBar 
                onClose={handleClose} 
                onMinimize={handleMinimize} 
                onOpenMain={handleOpenMain}
                onSave={handleSave}
            />

            <div className="flex-grow overflow-hidden relative mt-8 mb-10 mx-4">
                {mode === 'edit' ? (
                    // 에디터 모드: 텍스트 입력 영역
                    <textarea
                        ref={textareaRef}
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
            </div>

            {/* 하단 툴바 (편집 모드일 때만 표시) */}
            <div className="absolute bottom-0 left-0 right-0 h-10 px-4 flex items-center justify-between bg-black/5 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity duration-200">
                {mode === 'edit' ? (
                    <div className="flex gap-1">
                        <button onClick={() => insertFormat('**')} className="p-1.5 hover:bg-black/10 rounded text-gray-700" title="Bold">
                            <Bold size={16} />
                        </button>
                        <button onClick={() => insertFormat('*')} className="p-1.5 hover:bg-black/10 rounded text-gray-700" title="Italic">
                            <Italic size={16} />
                        </button>
                        <button onClick={() => insertFormat('<u>', '</u>')} className="p-1.5 hover:bg-black/10 rounded text-gray-700" title="Underline">
                            <Underline size={16} />
                        </button>
                        <button onClick={() => insertFormat('~~')} className="p-1.5 hover:bg-black/10 rounded text-gray-700" title="Strikethrough">
                            <Strikethrough size={16} />
                        </button>
                        <button onClick={() => insertFormat('![](', ')')} className="p-1.5 hover:bg-black/10 rounded text-gray-700" title="Image">
                            <ImageIcon size={16} />
                        </button>
                    </div>
                ) : (
                    <div /> /* Spacer */
                )}

                {/* 모드 전환 토글 */}
                <button
                    onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
                    className="p-1.5 hover:bg-black/10 rounded text-gray-700 flex items-center gap-1"
                    title={mode === 'edit' ? 'Switch to Preview' : 'Switch to Edit'}
                >
                    {mode === 'edit' ? <Eye size={16} /> : <Pencil size={16} />}
                </button>
            </div>
        </div>
    );
};
