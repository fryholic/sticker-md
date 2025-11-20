import "./App.css";
import { useState, useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { NotesList } from "./pages/NotesList";
import { Note } from "./components/Note";

function App() {
  const [isNoteWindow, setIsNoteWindow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkWindowType = async () => {
      try {
        const window = getCurrentWebviewWindow();
        const label = window.label;

        // note-{id} 형식이면 Note 윈도우
        setIsNoteWindow(label.startsWith('note-'));
      } catch (error) {
        console.error('Failed to get window info:', error);
      } finally {
        setLoading(false);
      }
    };

    checkWindowType();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Note 윈도우면 Note 컴포넌트, 아니면 NotesList
  if (isNoteWindow) {
    return <Note />;
  }

  return <NotesList />;
}

export default App;
