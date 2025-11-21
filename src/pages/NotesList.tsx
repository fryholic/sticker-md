import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { NotesIndex, NoteMetadata } from '../types/note';

export const NotesList: React.FC = () => {
    const [notes, setNotes] = useState<NoteMetadata[]>([]);
    const [loading, setLoading] = useState(true);

    // 메모 목록 로드
    const loadNotes = async () => {
        try {
            const index = await invoke<NotesIndex>('get_notes_list');
            setNotes(index.notes);
        } catch (error) {
            console.error('Failed to load notes:', error);
        } finally {
            setLoading(false);
        }
    };

    // 새 메모 생성
    const handleCreateNote = async () => {
        await invoke('frontend_log', { message: "Create Note Clicked" });
        try {
            // 1. UUID 생성
            const newId = await invoke<string>('generate_new_note_id');
            await invoke('frontend_log', { message: `Generated ID: ${newId}` });
            
            // 2. 새 메모 윈도우 열기 (파일은 아직 생성되지 않음)
            await handleOpenNote(newId);
        } catch (error) {
            await invoke('frontend_log', { message: `Failed to create note: ${error}` });
            alert(`Failed to create note: ${error}`);
        }
    };

    // Manual drag handler
    const handleDrag = async (e: React.MouseEvent) => {
        // Prevent drag if clicking on buttons (though buttons stop propagation, this is a safety check)
        if ((e.target as HTMLElement).closest('button')) return;

        console.log("Starting drag...");
        try {
            await getCurrentWindow().startDragging();
            console.log("Drag started");
        } catch (e) {
            console.error("Drag failed:", e);
        }
    };

    // 메모 윈도우 열기
    const handleOpenNote = async (noteId: string) => {
        await invoke('frontend_log', { message: `Attempting to open note window for ID: ${noteId}` });
        try {
            // Tauri expects camelCase 'noteId' in the invoke call
            await invoke('open_note_window', { noteId: noteId });
            await invoke('frontend_log', { message: `Successfully invoked open_note_window for ID: ${noteId}` });
        } catch (error) {
            await invoke('frontend_log', { message: `Failed to open note: ${error}` });
            alert(`Failed to open note window: ${error}`);
        }
    };

    // useEffect to load notes on mount
    useEffect(() => {
        loadNotes();
    }, []);

    // 윈도우 닫기
    const handleClose = async () => {
        try {
            await invoke('close_window');
        } catch (error) {
            console.error('Failed to close window:', error);
        }
    };

    // 윈도우 최소화
    const handleMinimize = async () => {
        try {
            await invoke('minimize_window');
        } catch (error) {
            console.error('Failed to minimize window:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-500">Loading notes...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[#F6F6F6] flex flex-col border border-gray-300 rounded-lg overflow-hidden shadow-xl">
            {/* Header Area - Draggable */}
            <div
                className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 select-none cursor-move"
                onMouseDown={handleDrag}
            >
                {/* 1. Left: Title */}
                <h1 className="text-lg font-semibold text-gray-800 mr-4 pointer-events-none">Sticky Notes</h1>

                {/* Spacer to push controls to right */}
                <div className="flex-grow" />

                {/* 3. Right: Controls */}
                <div className="flex items-center gap-2 ml-4">
                    {/* New Note Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleCreateNote(); }}
                        className="w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors shadow-sm active:scale-95 cursor-pointer z-50"
                        title="New Note"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <span className="text-xl font-bold leading-none">+</span>
                    </button>

                    <div className="w-px h-4 bg-gray-300 mx-1"></div>

                    {/* Window Controls */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-md text-gray-600 transition-colors cursor-pointer z-50"
                        title="Minimize"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        &minus;
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleClose(); }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white rounded-md text-gray-600 transition-colors cursor-pointer z-50"
                        title="Close"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        &times;
                    </button>
                </div>
            </div>

            {/* Notes Grid Area */}
            <div className="flex-1 overflow-auto p-6">
                {notes.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-400 text-lg font-medium">No notes yet</p>
                        <p className="text-gray-500 text-sm mt-2">Click "+" to create your first note</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notes.map((note) => (
                            <div
                                key={note.id}
                                className="bg-[#FFF7D1] rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 cursor-pointer border border-gray-200/50 hover:border-blue-400 group"
                                onClick={() => handleOpenNote(note.id)}
                            >
                                <h3 className="font-semibold text-gray-900 mb-2 truncate text-base group-hover:text-blue-600 transition-colors">
                                    {note.title}
                                </h3>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p>Created: {note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown'}</p>
                                    <p>Updated: {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : 'Unknown'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
