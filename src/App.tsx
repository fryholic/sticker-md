import "./App.css";
import { Note } from "./components/Note";
import { TitleBar } from "./components/TitleBar";
import { invoke } from "@tauri-apps/api/core";

function App() {
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

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* 타이틀바 */}
      <TitleBar onClose={handleClose} onMinimize={handleMinimize} />

      {/* 메모 영역 */}
      <div className="flex-1 overflow-hidden">
        <Note />
      </div>
    </div>
  );
}

export default App;
