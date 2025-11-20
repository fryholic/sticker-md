// 메모 메타데이터 타입 정의
export interface NoteMetadata {
    id: string;           // UUID
    title: string;        // 메모 제목 (첫 줄에서 추출)
    filePath: string;     // 절대 경로
    createdAt: number;    // Unix timestamp (ms)
    updatedAt: number;    // Unix timestamp (ms)
}

// 메모 인덱스 타입 정의
export interface NotesIndex {
    notes: NoteMetadata[];
}
