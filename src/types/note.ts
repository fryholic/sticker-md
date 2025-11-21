// 메모 메타데이터 타입 정의
export interface NoteMetadata {
    id: string;           // UUID
    title: string;        // 메모 제목 (첫 줄에서 추출)
    file_path: string;    // 절대 경로
    created_at: string;   // ISO 8601 string
    updated_at: string;   // ISO 8601 string
}

// 메모 인덱스 타입 정의
export interface NotesIndex {
    notes: NoteMetadata[];
}
