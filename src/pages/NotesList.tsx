import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
        try {
            const newNote = await invoke<NoteMetadata>('create_new_note');
            setNotes([newNote, ...notes]);
            // 새 메모 윈도우 열기
            await handleOpenNote(newNote.id);
        } catch (error) {
            console.error('Failed to create note:', error);
        }
    };

    // 메모 윈도우 열기
    const handleOpenNote = async (noteId: string) => {
        try {
            await invoke('open_note_window', { noteId });
        } catch (error) {
            console.error('Failed to open note:', error);
        }
    };

    useEffect(() => {
        loadNotes();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-500">Loading notes...</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-800">Sticky Notes</h1>
                <button
                    onClick={handleCreateNote}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                    import React, {useState, useEffect} from 'react';
                    import {invoke} from '@tauri-apps/api/core';
                    import type {NotesIndex, NoteMetadata} from '../types/note';

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
        try {
            const newNote = await invoke<NoteMetadata>('create_new_note');
                            setNotes([newNote, ...notes]);
                            // 새 메모 윈도우 열기
                            await handleOpenNote(newNote.id);
        } catch (error) {
                                console.error('Failed to create note:', error);
        }
    };

    // 메모 윈도우 열기
    const handleOpenNote = async (noteId: string) => {
        try {
                                await invoke('open_note_window', { noteId });
        } catch (error) {
                                console.error('Failed to open note:', error);
        }
    };

    useEffect(() => {
                                loadNotes();
    }, []);

                            if (loading) {
        return (
                            <div className="flex items-center justify-center h-screen">
                                <p className="text-gray-500">Loading notes...</p>
                            </div>
                            );
    }

                            return (
                            <div className="h-screen w-screen bg-gray-50 flex flex-col">
                                {/* Header */}
                                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                    <h1 className="text-2xl font-semibold text-gray-800">Sticky Notes</h1>
                                    <button
                                        onClick={handleCreateNote}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                                    >
                                        <span className="text-xl">+</span>
                                        <span>New Note</span>
                                    </button>
                                </div>

                                {/* Notes Grid */}
                                <div className="flex-1 overflow-auto p-6">
                                    {notes.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-gray-400 text-lg font-medium">No notes yet</p>
                                            <p className="text-gray-500 text-sm mt-2">Click "New Note" to create your first note</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {notes.map((note) => (
                                                <div
                                                    key={note.id}
                                                    className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 p-4 cursor-pointer border border-gray-200 hover:border-blue-300 hover:-translate-y-1"
                                                    onClick={() => handleOpenNote(note.id)}
                                                >
                                                    <h3 className="font-semibold text-gray-900 mb-2 truncate text-base">
                                                        {note.title}
                                                    </h3>
                                                    <div className="text-xs text-gray-500 space-y-1">
                                                        <p>Created: {new Date(note.createdAt).toLocaleDateString()}</p>
                                                        <p>Updated: {new Date(note.updatedAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            );
};
