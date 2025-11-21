import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs'; // Import readFile
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

    // 모드 전환 시 콘텐츠 로그 출력
    useEffect(() => {
        if (mode === 'preview') {
            console.log('Preview Mode Content:', content);
            invoke('frontend_log', { message: `Preview Mode Content: ${content}` }).catch(() => {});
        }
    }, [mode, content]);

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

        let newText = '';
        let newSelectionStart = start;
        let newSelectionEnd = end;

        // 1. 선택된 텍스트 자체가 태그로 감싸져 있는 경우 (예: **text**) -> 태그 제거
        if (selectedText.startsWith(startTag) && selectedText.endsWith(endTag) && selectedText.length >= startTag.length + endTag.length) {
             const unwrap = selectedText.substring(startTag.length, selectedText.length - endTag.length);
             newText = text.substring(0, start) + unwrap + text.substring(end);
             newSelectionEnd = start + unwrap.length;
        } 
        // 2. 선택된 텍스트 주변이 태그로 감싸져 있는 경우 (예: |**text**|) -> 태그 제거
        else {
             const before = text.substring(0, start);
             const after = text.substring(end);
             
             if (before.endsWith(startTag) && after.startsWith(endTag)) {
                 newText = text.substring(0, start - startTag.length) + selectedText + text.substring(end + endTag.length);
                 newSelectionStart = start - startTag.length;
                 newSelectionEnd = end - startTag.length;
             } else {
                 // 3. 태그 추가
                 newText = text.substring(0, start) + startTag + selectedText + endTag + text.substring(end);
                 newSelectionStart = start + startTag.length;
                 newSelectionEnd = end + startTag.length;
             }
        }
        
        handleContentChange(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
        }, 0);
    };

    // 이미지 삽입 핸들러
    const handleImageInsert = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Images',
                    extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
                }]
            });

            if (selected && typeof selected === 'string') {
                // Test reading the file to verify permissions
                try {
                    console.log(`Attempting to read file: ${selected}`);
                    await invoke('frontend_log', { message: `Attempting to read file: ${selected}` });
                    const contents = await readFile(selected);
                    console.log(`File read success, size: ${contents.length}`);
                    await invoke('frontend_log', { message: `File read success, size: ${contents.length}` });
                } catch (e) {
                    console.error(`File read failed:`, e);
                    await invoke('frontend_log', { message: `File read failed: ${e}` });
                }

                // 로컬 경로를 그대로 사용
                const filename = selected.split(/[\\/]/).pop() || 'image';
                // Windows 경로의 백슬래시를 이스케이프 처리하고, 공백이 있는 경우를 대비해 URL 인코딩
                // 마크다운에서 괄호가 포함된 경로는 문제가 될 수 있으므로 주의 필요
                // 여기서는 백슬래시 이스케이프만 우선 적용
                const escapedPath = selected.replace(/\\/g, '/'); // 백슬래시를 슬래시로 변경하는 것이 가장 안전함
                const imageMarkdown = `![${filename}](${escapedPath})`;
                
                if (!textareaRef.current) return;
                const textarea = textareaRef.current;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                
                const newText = text.substring(0, start) + imageMarkdown + text.substring(end);
                handleContentChange(newText);
                
                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
                }, 0);
            }
        } catch (err) {
            console.error('Failed to insert image:', err);
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
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            urlTransform={(url) => url}
                            components={{
                                img: ({node, ...props}) => {
                                    const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
                                    
                                    useEffect(() => {
                                        const load = async () => {
                                            const log = (msg: string) => {
                                                console.log(msg);
                                                invoke('frontend_log', { message: msg }).catch(() => {});
                                            };

                                            log(`[Img Component] Props: ${JSON.stringify(props)}`);
                                            log(`[Img Component] useEffect for: ${props.src}`);
                                            
                                            if (!props.src) {
                                                log(`[Img Component] No src prop`);
                                                return;
                                            }

                                            if (props.src.startsWith('http') || props.src.startsWith('data:') || props.src.startsWith('blob:')) {
                                                setImgSrc(props.src);
                                                return;
                                            }
                                            
                                            // Local path
                                            try {
                                                // Decode and normalize path
                                                let path = decodeURIComponent(props.src);
                                                // Remove file:// prefix if present
                                                if (path.startsWith('file://')) {
                                                    path = path.slice(7);
                                                }
                                                // Handle Windows drive letters with leading slash (e.g. /C:/...)
                                                if (path.match(/^\/[a-zA-Z]:/)) {
                                                    path = path.slice(1);
                                                }
                                                
                                                // Windows path normalization for Tauri scope matching
                                                // Force backslashes for Windows
                                                const systemPath = path.replace(/\//g, '\\');
                                                
                                                log(`[Img Component] Loading local image: ${path}`);
                                                log(`[Img Component] System path (Backslash): ${systemPath}`);
                                                
                                                // Try reading with systemPath (Backslashes)
                                                let contents: Uint8Array;
                                                try {
                                                    const readPromise = readFile(systemPath);
                                                    const timeoutPromise = new Promise((_, reject) => 
                                                        setTimeout(() => reject(new Error('Timeout reading file')), 5000)
                                                    );
                                                    contents = await Promise.race([readPromise, timeoutPromise]) as Uint8Array;
                                                } catch (err) {
                                                    log(`[Img Component] Failed with backslash path: ${err}`);
                                                    // Retry with forward slashes if backslash fails
                                                    const forwardSlashPath = path.replace(/\\/g, '/');
                                                    log(`[Img Component] Retrying with forward slash path: ${forwardSlashPath}`);
                                                    
                                                    try {
                                                        const readPromise = readFile(forwardSlashPath);
                                                        const timeoutPromise = new Promise((_, reject) => 
                                                            setTimeout(() => reject(new Error('Timeout reading file')), 5000)
                                                        );
                                                        contents = await Promise.race([readPromise, timeoutPromise]) as Uint8Array;
                                                    } catch (err2) {
                                                        log(`[Img Component] Failed with forward slash path: ${err2}`);
                                                        throw err2;
                                                    }
                                                }
                                                log(`[Img Component] File read success: ${contents.length} bytes`);
                                                
                                                // Guess mime type
                                                const ext = path.split('.').pop()?.toLowerCase();
                                                const mimeType = ext === 'png' ? 'image/png' : 
                                                                 ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                                                                 ext === 'gif' ? 'image/gif' :
                                                                 ext === 'webp' ? 'image/webp' :
                                                                 ext === 'svg' ? 'image/svg+xml' : 'application/octet-stream';
                                                
                                                const blob = new Blob([contents as any], { type: mimeType });
                                                const url = URL.createObjectURL(blob);
                                                log(`[Img Component] Blob URL created: ${url}`);
                                                setImgSrc(url);
                                                
                                                return () => URL.revokeObjectURL(url);
                                            } catch (e) {
                                                const errorMsg = e instanceof Error ? e.message : String(e);
                                                console.error('Failed to load image:', e);
                                                log(`[Img Component] Failed to load image ${props.src}: ${errorMsg}`);
                                                
                                                // Fallback to convertFileSrc
                                                try {
                                                    let path = decodeURIComponent(props.src);
                                                    if (path.startsWith('file://')) path = path.slice(7);
                                                    if (path.match(/^\/[a-zA-Z]:/)) path = path.slice(1);
                                                    
                                                    const assetUrl = convertFileSrc(path);
                                                    log(`[Img Component] Fallback to convertFileSrc: ${assetUrl}`);
                                                    setImgSrc(assetUrl);
                                                } catch (fallbackErr) {
                                                    log(`[Img Component] Fallback failed: ${fallbackErr}`);
                                                }
                                            }
                                        };
                                        
                                        const cleanupPromise = load();
                                        return () => {
                                            cleanupPromise.then(cleanup => cleanup && cleanup());
                                        };
                                    }, [props.src]);

                                    if (!imgSrc) return <span className="text-gray-400 text-xs" title={props.src}>[Loading Image...]</span>;
                                    return <img {...props} src={imgSrc} />;
                                },
                                // 디버깅을 위해 p 태그 렌더링 로그 추가
                                p: ({node, ...props}) => {
                                    return <p {...props} />;
                                }
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {/* 하단 툴바 (편집 모드일 때만 표시) */}
            <div 
                className="absolute bottom-0 left-0 right-0 h-10 px-4 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity duration-200"
                style={{ backgroundColor: 'transparent' }}
            >
                {mode === 'edit' ? (
                    <div className="flex gap-1">
                        <button 
                            onClick={() => insertFormat('**')} 
                            className="hover:bg-black/10 rounded" 
                            title="Bold"
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                padding: 0,
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                            </svg>
                        </button>
                        <button 
                            onClick={() => insertFormat('*')} 
                            className="hover:bg-black/10 rounded" 
                            title="Italic"
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                padding: 0,
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                <line x1="19" y1="4" x2="10" y2="4"></line>
                                <line x1="14" y1="20" x2="5" y2="20"></line>
                                <line x1="15" y1="4" x2="9" y2="20"></line>
                            </svg>
                        </button>
                        <button 
                            onClick={() => insertFormat('<u>', '</u>')} 
                            className="hover:bg-black/10 rounded" 
                            title="Underline"
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                padding: 0,
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
                                <line x1="4" y1="21" x2="20" y2="21"></line>
                            </svg>
                        </button>
                        <button 
                            onClick={() => insertFormat('~~')} 
                            className="hover:bg-black/10 rounded" 
                            title="Strikethrough"
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                padding: 0,
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                <path d="M16 4H9a3 3 0 0 0-2.83 4"></path>
                                <path d="M14 12a4 4 0 0 1 0 8H6"></path>
                                <line x1="4" y1="12" x2="20" y2="12"></line>
                            </svg>
                        </button>
                        <button 
                            onClick={handleImageInsert} 
                            className="hover:bg-black/10 rounded" 
                            title="Image"
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                padding: 0,
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div /> /* Spacer */
                )}

                {/* 모드 전환 토글 */}
                <button
                    onClick={() => {
                        const newMode = mode === 'edit' ? 'preview' : 'edit';
                        console.log(`Switching to ${newMode} mode`);
                        invoke('frontend_log', { message: `Switching to ${newMode} mode` }).catch(console.error);
                        setMode(newMode);
                    }}
                    className="hover:bg-black/10 rounded flex items-center gap-1"
                    title={mode === 'edit' ? 'Switch to Preview' : 'Switch to Edit'}
                    style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        padding: 0,
                    }}
                >
                    {mode === 'edit' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};
