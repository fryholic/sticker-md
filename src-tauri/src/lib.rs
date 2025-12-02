use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::menu::ContextMenu;
use tauri::Emitter; // Emitter 트레이트 추가
use tauri::Manager; // ContextMenu 트레이트 추가

#[derive(Serialize, Deserialize, Clone)]
struct NoteMetadata {
    id: String,
    title: String,
    file_path: String,
    created_at: String,
    updated_at: String,
    width: Option<f64>,
    height: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone)]
struct WindowSize {
    width: f64,
    height: f64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NotesIndex {
    notes: Vec<NoteMetadata>,
    main_window: Option<WindowSize>,
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
        return Ok(NotesIndex {
            notes: vec![],
            main_window: None,
        });
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
            Ok(NotesIndex {
                notes: vec![],
                main_window: None,
            })
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
        // 최대 50자로 제한 (멀티바이트 문자 안전 처리)
        if title.chars().count() > 50 {
            let truncated: String = title.chars().take(50).collect();
            format!("{}...", truncated)
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
        width: Some(400.0),
        height: Some(400.0),
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

    // 저장된 크기 불러오기
    let index = read_index()?;
    let note = index.notes.iter().find(|n| n.id == note_id);

    let (width, height) = if let Some(n) = note {
        (n.width.unwrap_or(400.0), n.height.unwrap_or(400.0))
    } else {
        (400.0, 400.0)
    };

    println!("Restoring window size: {}x{}", width, height);

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
            .inner_size(width, height)
            .min_inner_size(300.0, 100.0)
            .decorations(false) // 테두리 없음
            .transparent(false) // 투명도 없음 (일단)
            .disable_drag_drop_handler(); // HTML5 Drag&Drop 사용을 위해 Tauri 핸들러 비활성화

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

    let content_bytes = fs::read(&note.file_path).map_err(|e| e.to_string())?;
    let content = String::from_utf8_lossy(&content_bytes).to_string();
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
async fn open_main_window(app: tauri::AppHandle) -> Result<(), String> {
    log_to_file("open_main_window: Called");

    // 1. 모든 윈도우를 순회하며 'main' 관련 윈도우 확인
    let windows = app.webview_windows();
    for (label, window) in windows {
        if label == "main" || label.starts_with("main_window") {
            log_to_file(&format!(
                "open_main_window: Found existing window '{}'",
                label
            ));
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    // 2. 없으면 새로 생성 (유니크 라벨 사용)
    let new_label = format!("main_window_{}", uuid::Uuid::new_v4());
    log_to_file(&format!(
        "open_main_window: Creating new window '{}'...",
        new_label
    ));

    // 저장된 크기 불러오기
    let index = read_index()?;
    let (width, height) = if let Some(size) = index.main_window {
        (size.width, size.height)
    } else {
        (600.0, 800.0)
    };

    log_to_file(&format!(
        "open_main_window: Target size {}x{}",
        width, height
    ));

    let builder = tauri::WebviewWindowBuilder::new(
        &app,
        &new_label,
        tauri::WebviewUrl::App("".into()), // 루트 경로 사용
    )
    .title("Sticky Notes")
    .inner_size(width, height)
    .min_inner_size(400.0, 200.0)
    .decorations(false)
    .transparent(false)
    .resizable(true);

    match builder.build() {
        Ok(window) => {
            log_to_file("open_main_window: Window built successfully");
            if let Err(e) = window.center() {
                log_to_file(&format!("open_main_window: Failed to center - {}", e));
            }

            if let Err(e) = window.show() {
                log_to_file(&format!("open_main_window: Failed to show - {}", e));
                return Err(e.to_string());
            }

            if let Err(e) = window.set_focus() {
                log_to_file(&format!("open_main_window: Failed to set focus - {}", e));
                return Err(e.to_string());
            }

            log_to_file("open_main_window: Window setup complete");
            Ok(())
        }
        Err(e) => {
            log_to_file(&format!("open_main_window: Failed to build window - {}", e));
            Err(e.to_string())
        }
    }
}

// 이미지 파일 바이너리 읽기
#[tauri::command]
fn read_image_binary(file_path: String) -> Result<Vec<u8>, String> {
    println!("Reading image binary: {}", file_path);
    let path = PathBuf::from(&file_path);

    // 보안 검사: 허용된 확장자만 접근 가능
    let allowed_extensions = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    if !allowed_extensions.contains(&extension.as_str()) {
        return Err(format!("Forbidden file extension: {}", extension));
    }

    match fs::read(&path) {
        Ok(data) => Ok(data),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

// 이미지 파일 저장 (Drag & Drop용)
#[tauri::command]
fn save_image(name: String, data: Vec<u8>) -> Result<String, String> {
    println!("Saving image: {} ({} bytes)", name, data.len());

    let notes_dir = get_notes_dir()?;
    let images_dir = notes_dir.join("images");

    if !images_dir.exists() {
        fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
    }

    // 이름 중복 방지를 위해 UUID 추가
    let ext = std::path::Path::new(&name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    let new_name = format!(
        "{}_{}.{}",
        name.trim_end_matches(&format!(".{}", ext)),
        uuid::Uuid::new_v4().simple(),
        ext
    );
    let file_path = images_dir.join(&new_name);

    fs::write(&file_path, data).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

// 윈도우 상태 저장 커맨드
#[tauri::command]
fn save_window_state(id: Option<String>, width: f64, height: f64) -> Result<(), String> {
    let mut index = read_index()?;

    if let Some(note_id) = id {
        // 노트 윈도우
        if let Some(note) = index.notes.iter_mut().find(|n| n.id == note_id) {
            note.width = Some(width);
            note.height = Some(height);
        }
    } else {
        // 메인 윈도우
        index.main_window = Some(WindowSize { width, height });
    }

    write_index(&index)?;
    Ok(())
}

fn log_to_file(msg: &str) {
    use std::io::Write;
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("C:\\Users\\lee\\.gemini\\sticker_debug.log")
    {
        let _ = writeln!(file, "[{}] {}", chrono::Utc::now(), msg);
    }
}

// 파일 경로로 열기 (CLI, Drag&Drop 공용)
#[tauri::command]
async fn open_file_from_path(app: tauri::AppHandle, path: String) -> Result<String, String> {
    use std::time::SystemTime;

    let path_str = path.clone();
    let mut index = read_index()?;

    // 1. 이미 등록된 파일인지 확인
    if let Some(existing_note) = index.notes.iter().find(|n| n.file_path == path_str) {
        log_to_file(&format!("File already registered: {}", path_str));

        // 윈도우가 열려있는지 확인하고 포커스
        let label = format!("note_{}", existing_note.id);
        if let Some(window) = app.get_webview_window(&label) {
            log_to_file(&format!("Window {} exists, focusing...", label));
            let _ = window.set_focus();
        } else {
            log_to_file(&format!(
                "Window {} not open, doing nothing (just registered).",
                label
            ));
        }

        return Ok(existing_note.id.clone());
    }

    // 2. 등록되지 않은 경우 새로 등록
    log_to_file(&format!("Registering new file: {}", path_str));
    let new_id = uuid::Uuid::new_v4().to_string();

    // 파일 내용 읽어서 제목 추출 (lossy utf8 처리)
    let content_bytes = fs::read(&path).map_err(|e| e.to_string())?;
    let content = String::from_utf8_lossy(&content_bytes).to_string();
    let title = extract_title(&content);

    let now: chrono::DateTime<chrono::Utc> = SystemTime::now().into();
    let now_str = now.to_rfc3339();

    let new_note = NoteMetadata {
        id: new_id.clone(),
        title,
        file_path: path_str,
        created_at: now_str.clone(),
        updated_at: now_str,
        width: Some(400.0),
        height: Some(400.0),
    };

    index.notes.push(new_note);
    write_index(&index)?;

    // 목록 갱신 이벤트 발행
    let _ = app.emit("refresh-notes-list", ());

    Ok(new_id)
}

// 파일 열기 다이얼로그 및 등록 커맨드
#[tauri::command]
async fn open_file_with_dialog(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};

    // 1. 파일 선택 다이얼로그
    let file_path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .blocking_pick_file();

    match file_path {
        Some(FilePath::Path(path)) => {
            let path_str = path.to_string_lossy().to_string();
            // 재사용 가능한 로직 호출
            open_file_from_path(app, path_str).await
        }
        _ => Err("No file selected".to_string()),
    }
}

// 노트 삭제 커맨드
#[tauri::command]
fn delete_note(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut index = read_index()?;

    // 해당 노트 찾기
    if let Some(pos) = index.notes.iter().position(|n| n.id == id) {
        let note = &index.notes[pos];
        let file_path = PathBuf::from(&note.file_path);

        // 파일 삭제
        if file_path.exists() {
            fs::remove_file(&file_path).map_err(|e| e.to_string())?;
        }

        // 인덱스에서 제거
        index.notes.remove(pos);
        write_index(&index)?;

        // 열린 윈도우 닫기
        let label = format!("note_{}", id);
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }

        // 목록 갱신 이벤트 발행
        let _ = app.emit("refresh-notes-list", ());

        Ok(())
    } else {
        Err("Note not found".to_string())
    }
}

// 노트 목록에서만 제거하는 커맨드
#[tauri::command]
fn remove_note_from_index(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut index = read_index()?;

    // 해당 노트 찾기
    if let Some(pos) = index.notes.iter().position(|n| n.id == id) {
        // 인덱스에서 제거 (파일 삭제 안 함)
        index.notes.remove(pos);
        write_index(&index)?;

        // 열린 윈도우 닫기
        let label = format!("note_{}", id);
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }

        // 목록 갱신 이벤트 발행
        let _ = app.emit("refresh-notes-list", ());

        Ok(())
    } else {
        Err("Note not found".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            log_to_file(&format!("Single instance callback: {:?}", args));

            let mut window_found = false;
            let windows = app.webview_windows();

            // 모든 윈도우를 순회하며 메인 윈도우 찾기
            for (label, window) in windows {
                if label == "main" || label.starts_with("main_window") {
                    log_to_file(&format!(
                        "Single instance: Found existing window '{}'",
                        label
                    ));
                    let _ = window.set_focus();
                    window_found = true;
                    break;
                }
            }

            // 윈도우가 없으면 새로 생성 (비동기 호출)
            if !window_found {
                log_to_file("Single instance: No main window found, creating new one...");
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = open_main_window(app_handle).await;
                });
            }

            if args.len() > 1 {
                // println!("Single instance args: {:?}", args);
                for arg in args.iter().skip(1) {
                    let path = std::path::Path::new(arg);
                    if path.exists() && path.is_file() {
                        if let Some(ext) = path.extension() {
                            if ext == "md" || ext == "markdown" {
                                log_to_file(&format!("Opening file from single instance: {}", arg));
                                let app_handle = app.clone();
                                let arg_path = arg.clone();
                                tauri::async_runtime::spawn(async move {
                                    let _ = open_file_from_path(app_handle, arg_path).await;
                                });
                                break;
                            }
                        }
                    }
                }
            }
        }))
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
            read_image_binary,
            save_image,
            save_window_state,
            delete_note,
            remove_note_from_index,
            open_file_with_dialog,
            open_file_from_path
        ])
        .setup(|app| {
            // 앱 시작 시 메인 윈도우 크기 복원
            let index = read_index().unwrap_or(NotesIndex {
                notes: vec![],
                main_window: None,
            });

            if let Some(size) = index.main_window {
                if let Some(window) = app.get_webview_window("main") {
                    println!("Restoring main window size: {}x{}", size.width, size.height);
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width: size.width as u32,
                        height: size.height as u32,
                    }));
                }
            }

            // CLI 인자 처리 (파일 연결)
            let args: Vec<String> = std::env::args().collect();
            log_to_file(&format!("Setup args: {:?}", args));

            if let Ok(cwd) = std::env::current_dir() {
                log_to_file(&format!("CWD: {:?}", cwd));
            }

            if args.len() > 1 {
                // 첫 번째 인자는 실행 파일 경로이므로 두 번째부터 확인
                for arg in args.iter().skip(1) {
                    let path = std::path::Path::new(arg);
                    let mut abs_path = if path.is_absolute() {
                        path.to_path_buf()
                    } else {
                        std::env::current_dir().unwrap_or_default().join(path)
                    };

                    // 개발 환경 지원: src-tauri에서 실행 시 상위 디렉토리 확인
                    if !abs_path.exists() {
                        if let Ok(cwd) = std::env::current_dir() {
                            if let Some(parent) = cwd.parent() {
                                let parent_path = parent.join(path);
                                if parent_path.exists() {
                                    abs_path = parent_path;
                                }
                            }
                        }
                    }

                    log_to_file(&format!(
                        "Checking path: {:?} (exists: {})",
                        abs_path,
                        abs_path.exists()
                    ));

                    if abs_path.exists() && abs_path.is_file() {
                        if let Some(ext) = abs_path.extension() {
                            if ext == "md" || ext == "markdown" {
                                log_to_file(&format!("Opening file from args: {:?}", abs_path));
                                let app_handle = app.handle().clone();
                                let arg_path = abs_path.to_string_lossy().to_string();
                                tauri::async_runtime::spawn(async move {
                                    let _ = open_file_from_path(app_handle, arg_path).await;
                                });
                                break; // 첫 번째 유효한 파일만 처리
                            }
                        }
                    }
                }
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            println!("Menu event: {}", id);
            let _ = app.emit("menu-event", id);
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;
    use std::path::Path;

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
    #[test]
    fn test_extract_title_korean() {
        let content = "# 한글 제목 테스트입니다. 이 제목은 50자가 넘지 않지만 멀티바이트 처리를 테스트합니다.";
        let title = extract_title(content);
        assert_eq!(
            title,
            "한글 제목 테스트입니다. 이 제목은 50자가 넘지 않지만 멀티바이트 처리를 테스트합니다."
        );

        let long_content = "# ".to_string() + &"가".repeat(100);
        let title = extract_title(&long_content);
        assert_eq!(title.chars().count(), 53); // 50 chars + "..."
        assert!(title.ends_with("..."));
    }
}
