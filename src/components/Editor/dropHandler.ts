import { EditorView } from "@codemirror/view";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

// 이미지 삽입 헬퍼 함수
const insertImageMarkdown = (view: EditorView, paths: string[]) => {
    const state = view.state;
    // 현재 커서 위치 사용
    const { from, to } = state.selection.main;

    // 이미지 파일 필터링 (간단한 확장자 체크, 웹 URL/Data URI는 통과)
    const imagePaths = paths.filter(path => {
        if (path.startsWith('http') || path.startsWith('data:')) return true;
        const ext = path.split('.').pop()?.toLowerCase();
        return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '');
    });

    if (imagePaths.length === 0) return;

    // 마크다운 이미지 문법 생성
    const insertText = imagePaths.map(path => `![image](${path})`).join('\n');

    // 트랜잭션 전송
    view.dispatch({
        changes: { from, to, insert: insertText },
        selection: { anchor: from + insertText.length }
    });

    // 포커스 유지
    view.focus();
};

export const setupDropHandler = (view: EditorView) => {
    const handleDrop = (event: any) => {
        console.log('[DropHandler] Raw event:', event);
        let paths: string[] = [];

        if (Array.isArray(event.payload)) {
            paths = event.payload;
        } else if (event.payload?.paths && Array.isArray(event.payload.paths)) {
            paths = event.payload.paths;
        }

        if (!paths || paths.length === 0) {
            console.log('[DropHandler] No paths found in payload');
            return;
        }

        console.log('[DropHandler] Processing paths:', paths);
        insertImageMarkdown(view, paths);
    };

    // Tauri v1/v2 호환성을 위해 여러 이벤트 리스닝
    const unlistenFileDrop = listen<any>('tauri://file-drop', handleDrop);
    const unlistenDragDrop = listen<any>('tauri://drag-drop', handleDrop);
    const unlistenDrop = listen<any>('tauri://drop', handleDrop);

    return Promise.all([unlistenFileDrop, unlistenDragDrop, unlistenDrop]).then(unlistenFns => {
        return () => unlistenFns.forEach(fn => fn());
    });
};

// DOM 핸들러를 export하여 CodeMirrorEditor에서 사용할 수 있게 함
export const dropEventHandler = EditorView.domEventHandlers({
    dragover(event, view) {
        event.preventDefault();
        return false; // Let CodeMirror handle cursor, but prevent default browser action
    },
    drop(event, view) {
        console.log('[DropHandler] DOM Drop detected');
        if (event.dataTransfer) {
            console.log('[DropHandler] Types:', event.dataTransfer.types);
            event.dataTransfer.types.forEach(type => {
                console.log(`[DropHandler] Data for ${type}:`, event.dataTransfer?.getData(type));
            });
        }

        // 1. URI List (Common for browser drags)
        const uriList = event.dataTransfer?.getData('text/uri-list');
        if (uriList) {
            const urls = uriList.split('\n').filter(u => u.trim().length > 0 && !u.startsWith('#'));
            console.log('[DropHandler] URI List detected:', urls);
            // Relaxed filter: Accept http/https/data or image extensions
            const imageUrls = urls.filter(u => u.startsWith('http') || u.startsWith('data:') || u.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i));
            if (imageUrls.length > 0) {
                event.preventDefault();
                insertImageMarkdown(view, imageUrls);
                return true;
            }
        }

        // 2. Web Image (img tag HTML)
        const html = event.dataTransfer?.getData('text/html');
        if (html) {
            console.log('[DropHandler] HTML detected');
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const img = doc.querySelector('img');
            if (img && img.src) {
                event.preventDefault();
                console.log('[DropHandler] Web image src extracted:', img.src);
                insertImageMarkdown(view, [img.src]);
                return true;
            }
        }

        // 3. Plain Text (URL)
        const text = event.dataTransfer?.getData('text/plain');
        if (text) {
            console.log('[DropHandler] Text detected:', text);
            // Relaxed filter
            if (text.startsWith('http') || text.startsWith('data:') || text.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
                event.preventDefault();
                insertImageMarkdown(view, [text]);
                return true;
            }
        }

        // 4. Local Files (HTML5 Drop)
        if (event.dataTransfer?.files?.length) {
            const file = event.dataTransfer.files[0];
            console.log('[DropHandler] File detected:', file);

            // Try to get path from Tauri's File object extension
            // @ts-ignore
            const path = file.path; // Tauri v2 might expose this if configured, or we might need another way

            if (path) {
                console.log('[DropHandler] File path found:', path);
                insertImageMarkdown(view, [path]);
                return true;
            } else {
                console.log('[DropHandler] File object has no path. Reading binary data and saving...');
                // Read file as ArrayBuffer
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const buffer = e.target?.result as ArrayBuffer;
                    if (buffer) {
                        try {
                            const bytes = Array.from(new Uint8Array(buffer));
                            // Invoke Rust command to save image
                            const savedPath = await invoke('save_image', {
                                name: file.name,
                                data: bytes
                            });
                            console.log('[DropHandler] Image saved to:', savedPath);
                            insertImageMarkdown(view, [savedPath]);
                        } catch (err) {
                            console.error('[DropHandler] Failed to save image:', err);
                            alert('Failed to save image: ' + err);
                        }
                    }
                };
                reader.readAsArrayBuffer(file);
                return true;
            }
        }

        return false;
    },
    paste(event, view) {
        console.log('[DropHandler] Paste detected');
        const items = event.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    console.log('[DropHandler] Image in clipboard detected');
                    event.preventDefault();

                    const file = item.getAsFile();
                    if (file) {
                        console.log('[DropHandler] Reading clipboard image:', file.name);
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            const buffer = e.target?.result as ArrayBuffer;
                            if (buffer) {
                                try {
                                    const bytes = Array.from(new Uint8Array(buffer));
                                    // Use a generic name for pasted images if name is generic "image.png"
                                    // But file.name from clipboard is often "image.png".
                                    // save_image handles UUID generation so name collision is fine.
                                    const savedPath = await invoke('save_image', {
                                        name: file.name || "pasted_image.png",
                                        data: bytes
                                    });
                                    console.log('[DropHandler] Pasted image saved to:', savedPath);
                                    insertImageMarkdown(view, [savedPath as string]);
                                } catch (err) {
                                    console.error('[DropHandler] Failed to save pasted image:', err);
                                    alert('Failed to save pasted image: ' + err);
                                }
                            }
                        };
                        reader.readAsArrayBuffer(file);
                        return true;
                    }
                }
            }
        }
        return false;
    }
});
