import { invoke } from '@tauri-apps/api/core';

/**
 * 로컬 이미지 파일을 읽어 Blob URL로 변환합니다.
 * @param filePath 로컬 파일 경로
 * @returns Blob URL (blob:http://localhost:...)
 */
export async function loadLocalImage(filePath: string): Promise<string> {
    try {
        console.log(`[ImageLoader] Loading image from: ${filePath}`);
        
        // Rust 커맨드 호출하여 바이너리 데이터 수신
        const response = await invoke<number[] | Uint8Array>('read_image_binary', { filePath });
        
        // Tauri invoke가 Vec<u8>을 number[]로 반환할 수 있으므로 Uint8Array로 변환
        const bytes = response instanceof Uint8Array ? response : new Uint8Array(response);
        
        if (!bytes || bytes.length === 0) {
            throw new Error('Received empty data');
        }

        console.log(`[ImageLoader] Received ${bytes.length} bytes`);

        // MIME 타입 추론 (확장자 기반)
        const ext = filePath.split('.').pop()?.toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'gif') mimeType = 'image/gif';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'svg') mimeType = 'image/svg+xml';

        // Blob 생성
        const blob = new Blob([bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        console.log(`[ImageLoader] Created Blob URL: ${url}`);
        return url;
    } catch (error) {
        console.error(`[ImageLoader] Failed to load image: ${error}`);
        throw error;
    }
}
