# Sticker-MD

![logo](public/logo.png)

**Sticker-MD** is a modern, lightweight sticky notes application built with [Tauri](https://tauri.app/), [React](https://reactjs.org/), and [TypeScript](https://www.typescriptlang.org/). It combines the simplicity of classic sticky notes with the power of Markdown formatting.

## Features

- **Markdown Support**: Write notes using standard Markdown syntax (CommonMark + GFM).
- **Multiple Windows**: Create and manage multiple independent note windows simultaneously.
- **Image Support**: Drag and drop / Copy and paste images directly into your notes.
- **Customizable UI**: Choose from various pastel color themes and toggle "Always on Top" mode.
- **Persistent Storage**: Notes are automatically saved to your local file system as Markdown files.

## Tech Stack

- **Frontend**:
  - React 19
  - TypeScript
  - TailwindCSS v4
  - Lucide React (Icons)
  - React Markdown / Remark GFM
- **Backend**:
  - Rust (Tauri v2)
  - Plugins: `fs`, `dialog`, `opener`

## Prerequisites

Before getting started, ensure you have the following installed on your system:

1.  **Node.js**: Version 18 or higher is required.
    - [Download Node.js](https://nodejs.org/)
2.  **Rust**: The Tauri backend requires Rust.
    - Install via [Rustup](https://rustup.rs/) (recommended).
3.  **C++ Build Tools** (Windows users):
    - Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
    - During installation, ensure the **"Desktop development with C++"** workload is selected.

## Installation & Development

Follow these steps to set up the project locally:

1.  **Clone the repository**
    Open your terminal and run:
    ```bash
    git clone https://github.com/fryholic/sticker-md.git
    cd sticker-md
    ```

2.  **Install Frontend Dependencies**
    Install the Node.js packages required for the React frontend:
    ```bash
    npm install
    ```
    *This creates a `node_modules` folder in your project directory.*

3.  **Run in Development Mode**
    Start the application in development mode:
    ```bash
    npm run tauri dev
    ```
    **What happens next:**
    - The command will first compile the Rust backend (this may take a few minutes on the first run).
    - Then, it will start the Vite frontend server.
    - Finally, the **Sticker-MD** application window will open.

    > **Troubleshooting Tip**: If you encounter errors related to `WebView2`, ensure you have the [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) installed (pre-installed on Windows 10/11).

## Building for Production

To create a standalone executable for your operating system:

```bash
npm run tauri build
```
- The output (e.g., `.msi` or `.exe` on Windows) will be generated in `src-tauri/target/release/bundle/`.

## Project Structure

- `src/`: React frontend source code.
  - `components/`: UI components (Note, TitleBar, etc.).
  - `pages/`: Main application pages.
  - `hooks/`: Custom React hooks.
  - `api/`: Backend communication logic.
  - `types/`: TypeScript type definitions.
- `src-tauri/`: Rust backend source code.
  - `src/lib.rs`: Main Rust logic and Tauri commands.
  - `tauri.conf.json`: Tauri configuration file.
