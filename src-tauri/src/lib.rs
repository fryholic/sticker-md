use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::menu::ContextMenu;
use tauri::Emitter; // Emitter 트레이트 추가
use tauri::Manager; // ContextMenu 트레이트 추가
// use tauri::http::{Response, StatusCode}; // HTTP 관련 제거
// use percent_encoding::percent_decode_str; // URL 디코딩 제거

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

// UUID 생성 커맨드
#[tauri::command]
fn generate_new_note_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

// 노트 등록 커맨드 (저장 후 인덱스에 추가)
#[tauri::command]
fn register_note(
    app: tauri::AppHandle,
    id: String,
    title: String,
    file_path: String,
) -> Result<NoteMetadata, String> {
    use std::time::SystemTime;

    // 현재 시간 (ISO 8601 형식)
    let now: chrono::DateTime<chrono::Utc> = SystemTime::now().into();
    let now_str = now.to_rfc3339();

    let metadata = NoteMetadata {
        id,
        title,
        file_path,
        created_at: now_str.clone(),
        updated_at: now_str.clone(),
    };

    // 인덱스에 추가
    let mut index = read_index()?;
    // 이미 존재하는지 확인 (업데이트)
    if let Some(existing) = index.notes.iter_mut().find(|n| n.id == metadata.id) {
        existing.title = metadata.title.clone();
        existing.file_path = metadata.file_path.clone();
        existing.updated_at = now_str;
    } else {
        index.notes.push(metadata.clone());
    }

    write_index(&index)?;

    // 이벤트 발행: 노트 목록이 변경되었음을 알림
    let _ = app.emit("refresh-notes-list", ());

    Ok(metadata)
}

// 컨텍스트 메뉴 표시 커맨드
#[tauri::command]
fn show_context_menu(app: tauri::AppHandle, window: tauri::Window) -> Result<(), String> {
    use tauri::menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder};

    let is_always_on_top = window.is_always_on_top().unwrap_or(false);
    println!("Current always_on_top state: {}", is_always_on_top);

    let toggle_top = CheckMenuItemBuilder::new("Always on Top")
        .id("toggle_top")
        .checked(is_always_on_top)
        .build(&app)
        .map_err(|e| e.to_string())?;

    let colors = SubmenuBuilder::new(&app, "Change Color")
        .item(
            &MenuItemBuilder::new("Yellow")
                .id("color_#FFF7D1")
                .build(&app)
                .map_err(|e| e.to_string())?,
        )
        .item(
            &MenuItemBuilder::new("Blue")
                .id("color_#E0F7FA")
                .build(&app)
                .map_err(|e| e.to_string())?,
        )
        .item(
            &MenuItemBuilder::new("Green")
                .id("color_#E8F5E9")
                .build(&app)
                .map_err(|e| e.to_string())?,
        )
        .item(
            &MenuItemBuilder::new("Pink")
                .id("color_#FCE4EC")
                .build(&app)
                .map_err(|e| e.to_string())?,
        )
        .item(
            &MenuItemBuilder::new("Purple")
                .id("color_#F3E5F5")
                .build(&app)
                .map_err(|e| e.to_string())?,
        )
        .build()
        .map_err(|e| e.to_string())?;

    let menu = MenuBuilder::new(&app)
        .item(&toggle_top)
        .item(&colors)
        .build()
        .map_err(|e| e.to_string())?;

    menu.popup(window).map_err(|e| e.to_string())?;
    Ok(())
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

    let builder =
        tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App("index.html".into()))
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

// 파일 저장 커맨드
#[tauri::command]
fn save_note(path: String, content: String) -> Result<String, String> {
    fs::write(&path, &content).map_err(|e| e.to_string())?;
    Ok(format!("Saved to {}", path))
}

// 노트 내용 읽기 커맨드
#[tauri::command]
fn load_note_content(id: String) -> Result<String, String> {
    let index = read_index()?;
    let note = index
        .notes
        .iter()
        .find(|n| n.id == id)
        .ok_or("Note not found")?;

    let content = fs::read_to_string(&note.file_path).map_err(|e| e.to_string())?;
    Ok(content)
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

// 윈도우 '항상 위에 표시' 설정 변경 커맨드
#[tauri::command]
fn set_always_on_top(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window
        .set_always_on_top(enabled)
        .map_err(|e| e.to_string())?;
    Ok(())
}

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

// 프론트엔드 로그 출력용 커맨드
#[tauri::command]
fn frontend_log(message: String) {
    println!("[FRONTEND]: {}", message);
}

// 메인 윈도우 열기/포커스 커맨드
#[tauri::command]
fn open_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// 이미지 파일 바이너리 읽기
#[tauri::command]
fn read_image_binary(file_path: String) -> Result<Vec<u8>, String> {
    println!("Reading image binary: {}", file_path);
    let path = PathBuf::from(&file_path);

    // 보안 검사: 허용된 확장자만 접근 가능
    let allowed_extensions = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    if !allowed_extensions.contains(&extension.as_str()) {
        return Err(format!("Forbidden file extension: {}", extension));
    }

    // 파일 읽기
    match fs::read(&path) {
        Ok(data) => Ok(data),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_notes_list,
            generate_new_note_id,
            register_note,
            show_context_menu,
            open_note_window,
            open_main_window,
            save_note,
            load_note_content,
            save_note_with_dialog,
            set_always_on_top,
            close_window,
            minimize_window,
            frontend_log,
            read_image_binary
        ])
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            println!("Menu event: {}", id);
            let _ = app.emit("menu-event", id);
        })
        // .register_uri_scheme_protocol("sticker", |_app, request| { ... }) // Removed custom protocol
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
