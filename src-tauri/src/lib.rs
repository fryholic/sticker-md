use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone)]
struct NoteMetadata {
    id: String,
    title: String,
    file_path: String,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NotesIndex {
    notes: Vec<NoteMetadata>,
}

// 메모 디렉토리 경로 가져오기
fn get_notes_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let notes_dir = home.join("Documents").join("StickerMD").join("notes");

    // 디렉토리가 없으면 생성
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    }

    Ok(notes_dir)
}

// index.json 경로 가져오기
fn get_index_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없습니다")?;
    let sticker_dir = home.join("Documents").join("StickerMD");

    if !sticker_dir.exists() {
        fs::create_dir_all(&sticker_dir).map_err(|e| e.to_string())?;
    }

    Ok(sticker_dir.join("index.json"))
}

// 인덱스 파일 읽기
fn read_index() -> Result<NotesIndex, String> {
    let index_path = get_index_path()?;

    if !index_path.exists() {
        // index.json이 없으면 빈 인덱스 반환
        return Ok(NotesIndex { notes: vec![] });
    }

    let content = fs::read_to_string(&index_path).map_err(|e| e.to_string())?;

    // 파싱 실패 시 빈 인덱스 반환 (오래된 데이터 형식 처리)
    match serde_json::from_str(&content) {
        Ok(index) => Ok(index),
        Err(e) => {
            println!(
                "Warning: Failed to parse index.json ({}), creating fresh index",
                e
            );
            // 오래된 파일을 백업하고 새로 시작
            let backup_path = index_path.with_extension("json.backup");
            let _ = fs::rename(&index_path, backup_path);
            Ok(NotesIndex { notes: vec![] })
        }
    }
}

// 인덱스 파일 쓰기
fn write_index(index: &NotesIndex) -> Result<(), String> {
    let index_path = get_index_path()?;
    let content = serde_json::to_string_pretty(index).map_err(|e| e.to_string())?;
    fs::write(&index_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

// 메모 제목 추출 (마크다운 첫 줄)
fn extract_title(content: &str) -> String {
    let first_line = content.lines().next().unwrap_or("");
    let title = first_line.trim_start_matches('#').trim();

    if title.is_empty() {
        "Untitled Note".to_string()
    } else {
        // 최대 50자로 제한
        if title.len() > 50 {
            format!("{}...", &title[..50])
        } else {
            title.to_string()
        }
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 메모 목록 조회
#[tauri::command]
fn get_notes_list() -> Result<NotesIndex, String> {
    read_index()
}

// 새 메모 생성
#[tauri::command]
fn create_new_note() -> Result<NoteMetadata, String> {
    use std::time::SystemTime;
    use uuid::Uuid;

    // UUID 생성
    let id = Uuid::new_v4().to_string();
    println!("Creating new note with ID: {}", id);

    // 현재 시간 (ISO 8601 형식)
    let now: chrono::DateTime<chrono::Utc> = SystemTime::now().into();
    let now_str = now.to_rfc3339();

    // 파일 경로
    let notes_dir = get_notes_dir()?;
    let file_path = notes_dir.join(format!("{}.md", id));

    // 빈 파일 생성
    fs::write(&file_path, "").map_err(|e| e.to_string())?;

    // 메타데이터 생성
    let metadata = NoteMetadata {
        id: id.clone(),
        title: "Untitled Note".to_string(),
        file_path: file_path.to_string_lossy().to_string(),
        created_at: now_str.clone(),
        updated_at: now_str.clone(),
    };

    println!("DEBUG: Created metadata struct");
    println!("  id: {}", metadata.id);
    println!("  title: {}", metadata.title);
    println!("  file_path: {}", metadata.file_path);
    println!("  created_at: {}", metadata.created_at);
    println!("  updated_at: {}", metadata.updated_at);

    // 인덱스에 추가
    let mut index = read_index()?;
    index.notes.push(metadata.clone());
    write_index(&index)?;

    // DEBUG: Print the actual JSON being returned
    let json = serde_json::to_string_pretty(&metadata).unwrap();
    println!("Returning JSON:\n{}", json);

    Ok(metadata)
}

// 메모 윈도우 열기
#[tauri::command]
async fn open_note_window(app: tauri::AppHandle, note_id: String) -> Result<(), String> {
    println!("Opening note window for ID: {}", note_id);

    let label = format!("note_{}", note_id);

    // 이미 열려있는지 확인
    if let Some(window) = app.get_webview_window(&label) {
        println!("Window {} already exists, focusing...", label);
        let _ = window.set_focus();
        return Ok(());
    }

    println!("Creating new window: {}", label);

    let builder = tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title(&format!("Note"))
    .inner_size(400.0, 400.0)
    .decorations(false) // 테두리 없음
    .transparent(false); // 투명도 없음 (일단)

    println!("Builder created, building window...");

    match builder.build() {
        Ok(_) => {
            println!("Window {} created successfully", label);
            Ok(())
        }
        Err(e) => {
            println!("Failed to build window: {}", e);
            Err(e.to_string())
        }
    }
}

// 파일 저장 커맨드: 지정된 경로에 내용을 저장합니다.
#[tauri::command]
fn save_note(path: String, content: String) -> Result<String, String> {
    fs::write(&path, &content).map_err(|e| e.to_string())?;
    Ok(format!("Saved to {}", path))
}

// 노트 내용 읽기 커맨드
#[tauri::command]
fn load_note_content(id: String) -> Result<String, String> {
    let index = read_index()?;
    let note = index.notes.iter().find(|n| n.id == id).ok_or("Note not found")?;
    
    let content = fs::read_to_string(&note.file_path).map_err(|e| e.to_string())?;
    Ok(content)
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
// 윈도우 닫기 커맨드
#[tauri::command]
fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())?;
    Ok(())
}

// 윈도우 최소화 커맨드
#[tauri::command]
fn minimize_window(window: tauri::Window) -> Result<(), String> {
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

// 프론트엔드 로그 출력용 커맨드
#[tauri::command]
fn frontend_log(message: String) {
    println!("[FRONTEND]: {}", message);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_notes_list,
            create_new_note,
            open_note_window,
            save_note,
            load_note_content, // Add this
            save_note_with_dialog,
            set_always_on_top,
            close_window,
            minimize_window,
            frontend_log
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
