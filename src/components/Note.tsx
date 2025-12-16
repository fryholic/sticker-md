import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { NotesIndex } from '../types/note';
import { TitleBar } from './TitleBar';
import { useWindowResize } from '../hooks/useWindowResize';
import { CodeMirrorEditor } from './Editor/CodeMirrorEditor';

interface NoteProps {
    noteId?: string | null;
}

export const Note = ({ noteId }: NoteProps) => {
    // 메모 내용 상태 관리
    const [content, setContent] = useState<string>('');
    // 배경색 상태 관리
    const [bgColor, setBgColor] = useState<string>('#FFF7D1');
    // 항상 위에 표시 상태 관리
    const [_isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false);
    // 저장되지 않은 변경사항 상태 관리
    const [isDirty, setIsDirty] = useState<boolean>(false);
    // 파일 경로 상태 관리
    const [filePath, setFilePath] = useState<string | null>(null);

    // Refs for Event Handlers (Always access latest state)
    const contentRef = useRef(content);
    const isDirtyRef = useRef(isDirty);
    const filePathRef = useRef(filePath);

    // Sync Refs
    useEffect(() => { contentRef.current = content; }, [content]);
    useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
    useEffect(() => { filePathRef.current = filePath; }, [filePath]);
    // 데이터 로드 상태
    const [isLoaded, setIsLoaded] = useState<boolean>(false);

    // Window Resize Handler
    useWindowResize(noteId || null);

    // 메뉴 이벤트 리스너
    useEffect(() => {
        const unlistenPromise = listen<string>('menu-event', (event) => {
            if (!document.hasFocus()) return;

            const id = event.payload;
            console.log('Menu event received:', id);

            if (id === 'toggle_top') {
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

        // Global Drag & Drop handling for Web Images
        const handleGlobalDragOver = (e: DragEvent) => {
            e.preventDefault(); // Essential for allowing drops
        };

        document.addEventListener('dragover', handleGlobalDragOver);

        return () => {
            unlistenPromise.then(unlisten => unlisten());
            document.removeEventListener('dragover', handleGlobalDragOver);
        };
    }, []);

    // 노트 데이터 로드
    useEffect(() => {
        const loadNote = async () => {
            if (!noteId) {
                setIsLoaded(true);
                return;
            }

            try {
                console.log(`Loading note data for ID: ${noteId}`);
                // Load content
                const loadedContent = await invoke<string>('load_note_content', { id: noteId });
                setContent(loadedContent);
                setIsDirty(false);

                // Load metadata to get filePath
                const index = await invoke<NotesIndex>('get_notes_list');
                const note = index.notes.find(n => n.id === noteId);
                if (note) {
                    setFilePath(note.file_path);
                    console.log(`Loaded file path: ${note.file_path}`);
                }
                setIsLoaded(true);
            } catch (error) {
                console.log('New note or failed to load:', error);
                setIsLoaded(true);
            }
        };

        setIsLoaded(false);
        loadNote();
    }, [noteId]);

    // 내용 변경 핸들러
    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        setIsDirty(true);
    };

    // 파일 저장 핸들러 (Ref 기반)
    const handleSave = async () => {
        try {
            const currentContent = contentRef.current;
            let currentPath = filePathRef.current;

            if (!currentPath) {
                // 새 파일: 다이얼로그로 저장
                console.log('New file, showing dialog...');
                try {
                    currentPath = await invoke<string>('save_note_with_dialog', { content: currentContent });
                } catch (dialogErr) {
                    console.error('Dialog failed or cancelled:', dialogErr);
                    return false;
                }

                if (currentPath) {
                    setFilePath(currentPath);
                } else {
                    return false;
                }
            } else {
                // 기존 파일: 즉시 저장
                await invoke('save_note', { path: currentPath, content: currentContent });
            }

            // 인덱스 등록/갱신
            if (noteId && currentPath) {
                const title = currentContent.split('\n')[0]?.replace(/^#+\s*/, '').trim().substring(0, 50) || 'Untitled Note';
                await invoke('register_note', {
                    id: noteId,
                    title: title,
                    filePath: currentPath
                });
            }

            console.log('Saved successfully');
            setIsDirty(false);
            return true;
        } catch (error) {
            console.error('Failed to save:', error);
            return false;
        }
    };

    // Ctrl+S Keydown Handler
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                console.log('Ctrl+S pressed');
                await handleSave();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [noteId]);

    // Window Close Request Handler
    useEffect(() => {
        const unlistenPromise = getCurrentWindow().onCloseRequested(async (event) => {
            if (isDirtyRef.current) {
                console.log('Window close requested, but unsaved changes exist.');
                event.preventDefault();

                // 저장 시도
                const saved = await handleSave();

                if (saved) {
                    console.log('Auto-saved successfully. Closing window...');
                    isDirtyRef.current = false;
                    await getCurrentWindow().close();
                } else {
                    console.log('Save cancelled or failed. Window remains open.');
                }
            }
        });

        return () => {
            unlistenPromise.then(unlisten => {
                unlisten();
            });
        };
    }, []);

    // 윈도우 컨트롤 핸들러들
    const handleClose = async () => {
        try { await invoke('close_window'); } catch (error) { console.error(error); }
    };

    const handleMinimize = async () => {
        try { await invoke('minimize_window'); } catch (error) { console.error(error); }
    };

    const handleOpenMain = async () => {
        try { await invoke('open_main_window'); } catch (error) { console.error(error); }
    };

    // 우클릭 핸들러
    const handleContextMenu = async (e: React.MouseEvent) => {
        e.preventDefault();
        try { await invoke('show_context_menu'); } catch (error) { console.error(error); }
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

            <div className="flex-grow overflow-hidden relative mt-8 mb-4 mx-4">
                {isLoaded && (
                    <CodeMirrorEditor
                        initialContent={content}
                        onChange={handleContentChange}
                        className="text-gray-800"
                    />
                )}
            </div>
        </div>
    );
};
