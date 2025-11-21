import "./App.css";
import { useState, useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { NotesList } from "./pages/NotesList";
import { Note } from "./components/Note";
import { TitleBar } from "./components/TitleBar";

function App() {
  // IMMEDIATE LOG - executes as soon as this component loads
  console.log("[App.tsx] App component is loading!");
  invoke('frontend_log', { message: '[App.tsx] App component is loading!' }).catch(console.error);

  const [isNoteWindow, setIsNoteWindow] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkWindowType = async () => {
      try {
        await invoke('frontend_log', { message: '[App.tsx] useEffect started' });

        const webviewWindow = getCurrentWebviewWindow();
        await invoke('frontend_log', { message: '[App.tsx] Got webview window' });

        const label = webviewWindow.label;
        await invoke('frontend_log', { message: `[App.tsx] Window label: ${label}` });
        await invoke('frontend_log', { message: `[App.tsx] Current URL: ${window.location.href}` });

        // 라벨이 'note_'로 시작하면 노트 윈도우
        if (label.startsWith('note_')) {
          const id = label.replace('note_', '');
          setIsNoteWindow(true);
          setNoteId(id);
          await invoke('frontend_log', { message: `[App.tsx] Rendering Note Window for ID: ${id}` });
        } else {
          setIsNoteWindow(false);
          setNoteId(null);
          await invoke('frontend_log', { message: `[App.tsx] Rendering Notes List Window` });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        await invoke('frontend_log', { message: `[App.tsx] ERROR in useEffect: ${errorMsg}` });
        await invoke('frontend_log', { message: `[App.tsx] Error stack: ${errorStack}` });
        console.error('Failed to get window info:', error);
      } finally {
        setLoading(false);
        await invoke('frontend_log', { message: '[App.tsx] useEffect completed' });
      }
    };

    checkWindowType();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Note 윈도우면 TitleBar + Note 컴포넌트
  if (isNoteWindow) {
    return (
      <div className="h-screen w-screen relative">
        <TitleBar onClose={handleClose} onMinimize={handleMinimize} />
        <Note noteId={noteId} />
      </div>
    );
  }

  // Notes List 윈도우
  return <NotesList />;
}

export default App;
