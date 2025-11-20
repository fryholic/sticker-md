// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use std::path::Path;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 파일 저장 커맨드: 지정된 경로에 내용을 저장합니다.
#[tauri::command]
fn save_note(path: String, content: String) -> Result<String, String> {
    fs::write(&path, &content).map_err(|e| e.to_string())?;
    Ok(format!("Saved to {}", path))
}

// 윈도우 '항상 위에 표시' 설정 변경 커맨드
#[tauri::command]
fn set_always_on_top(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    window
        .set_always_on_top(enabled)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// 윈도우 닫기 커맨드
#[tauri::command]
fn close_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    window.close().map_err(|e| e.to_string())?;
    Ok(())
}

// 윈도우 최소화 커맨드
#[tauri::command]
fn minimize_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    window.minimize().map_err(|e| e.to_string())?;
    Ok(())
}

// 파일 다이얼로그를 통한 저장 커맨드
#[tauri::command]
async fn save_note_with_dialog(app: tauri::AppHandle, content: String) -> Result<String, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};

    // 파일 저장 다이얼로그 표시
    let file_path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md"])
        .set_file_name("note.md")
        .blocking_save_file();

    match file_path {
        Some(FilePath::Path(path)) => {
            // 파일 저장
            fs::write(&path, &content).map_err(|e| e.to_string())?;
            Ok(path.to_string_lossy().to_string())
        }
        _ => Err("No file selected".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_note,
            save_note_with_dialog,
            set_always_on_top,
            close_window,
            minimize_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

    #[test]
    fn test_save_note() {
        let path = "test_note.md";
        let content = "# Hello Rust";

        // 테스트 전 파일 정리
        if Path::new(path).exists() {
            fs::remove_file(path).unwrap();
        }

        // 파일 저장 실행
        let result = save_note(path.to_string(), content.to_string());
        assert!(result.is_ok());

        // 저장된 내용 확인
        let mut file = fs::File::open(path).unwrap();
        let mut saved_content = String::new();
        file.read_to_string(&mut saved_content).unwrap();

        assert_eq!(saved_content, content);

        // 테스트 후 파일 정리
        fs::remove_file(path).unwrap();
    }
}
