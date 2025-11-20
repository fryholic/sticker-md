export interface NoteState {
    content: string;
    updatedAt: Date;
}

// 서버 동기화 스텁 함수: 실제 서버 통신 대신 콘솔에 로그를 출력합니다.
export const syncNote = async (note: NoteState): Promise<boolean> => {
    console.log('Syncing note to server:', note);
    // 성공적으로 동기화되었다고 가정하고 true 반환
    return Promise.resolve(true);
};
