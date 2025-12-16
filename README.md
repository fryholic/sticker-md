# Sticker-MD

![logo](public/logo.png)

**Sticker-MD** is a modern, lightweight sticky notes application built with [Tauri](https://tauri.app/), [React](https://reactjs.org/), and [TypeScript](https://www.typescriptlang.org/). It combines the simplicity of classic sticky notes with the power of Markdown formatting.

## Features

- **Markdown Support**: Write notes using standard Markdown syntax.
- **Multiple Windows**: Create and manage multiple independent note windows.
- **Color Themes**: Customize your notes with various pastel color themes (Yellow, Blue, Green, Pink, Purple).
- **Always on Top**: Keep important notes visible above other windows.
- **Local Storage**: Notes are saved locally as Markdown files in your Documents folder (`~/Documents/StickerMD/notes`).
- **Cross-Platform**: Built on Tauri for a lightweight and secure desktop experience (currently optimized for Windows).

## Tech Stack

- **Frontend**:
  - React 19
  - TypeScript
  - TailwindCSS (Styling)
  - Lucide React (Icons)
- **Backend**:
  - Rust (Tauri v2)
  - `tauri-plugin-fs` (File System)
  - `tauri-plugin-dialog` (Native Dialogs)

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (for Windows development)

## Installation & Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/fryholic/sticker-md.git
    cd sticker-md
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run in development mode**
    This command will start the Vite frontend server and the Tauri application window.
    ```bash
    npm run tauri dev
    ```

## Building for Production

To create a production-ready executable:

```bash
npm run tauri build
```
The executable will be located in `src-tauri/target/release/bundle/`.

## Project Structure

- `src/`: React frontend source code.
  - `components/`: UI components (Note, TitleBar, etc.).
  - `pages/`: Main application pages (NotesList).
  - `hooks/`: Custom React hooks.
- `src-tauri/`: Rust backend source code.
  - `src/lib.rs`: Main Rust logic and Tauri commands.
  - `tauri.conf.json`: Tauri configuration file.

## License
