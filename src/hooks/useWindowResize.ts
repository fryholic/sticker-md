import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const useWindowResize = (id: string | null) => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleResize = async () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(async () => {
                try {
                    const window = getCurrentWindow();
                    const size = await window.innerSize();

                    console.log(`Saving window state for ${id || 'main'}: ${size.width}x${size.height}`);

                    await invoke('save_window_state', {
                        id: id,
                        width: Number(size.width),
                        height: Number(size.height)
                    });
                } catch (error) {
                    console.error('Failed to save window state:', error);
                }
            }, 1000); // 1 second debounce
        };

        const unlistenPromise = getCurrentWindow().onResized(handleResize);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            unlistenPromise.then(unlisten => unlisten());
        };
    }, [id]);
};
