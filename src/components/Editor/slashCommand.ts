import { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import { EditorView } from "@codemirror/view";

// Define menu items
const options: Completion[] = [
    { label: "Text", detail: "일반 텍스트", type: "text", apply: (view, _completion, from, to) => replaceLine(view, from, to, "") },
    { label: "Heading 1", detail: "제목 1", type: "keyword", apply: (view, _completion, from, to) => replaceLine(view, from, to, "# ") },
    { label: "Heading 2", detail: "제목 2", type: "keyword", apply: (view, _completion, from, to) => replaceLine(view, from, to, "## ") },
    { label: "Heading 3", detail: "제목 3", type: "keyword", apply: (view, _completion, from, to) => replaceLine(view, from, to, "### ") },
    { label: "Bullet List", detail: "글머리 기호 목록", type: "list", apply: (view, _completion, from, to) => replaceLine(view, from, to, "- ") },
    { label: "Numbered List", detail: "번호 매기기 목록", type: "list", apply: (view, _completion, from, to) => replaceLine(view, from, to, "1. ") },
    { label: "Task List", detail: "할 일 목록", type: "list", apply: (view, _completion, from, to) => replaceLine(view, from, to, "- [ ] ") },
    { label: "Quote", detail: "인용구", type: "text", apply: (view, _completion, from, to) => replaceLine(view, from, to, "> ") },
    { label: "Code Block", detail: "코드 블록", type: "class", apply: (view, _completion, from, to) => insertCodeBlock(view, from, to) },
    { label: "Divider", detail: "구분선", type: "keyword", apply: (view, _completion, from, to) => insertDivider(view, from, to) },
    { label: "Image", detail: "이미지", type: "text", apply: (view, _completion, from, to) => replaceLine(view, from, to, "![Alt](url) ") },
];

function replaceLine(view: EditorView, from: number, to: number, text: string) {
    view.dispatch({
        changes: { from: from, to: to, insert: text },
        selection: { anchor: from + text.length }
    });
}

function insertCodeBlock(view: EditorView, from: number, to: number) {
    const text = "```\n\n```";
    view.dispatch({
        changes: { from: from, to: to, insert: text },
        selection: { anchor: from + 4 } // Position cursor inside the block
    });
}

function insertDivider(view: EditorView, from: number, to: number) {
    const text = "\n---\n";
    view.dispatch({
        changes: { from: from, to: to, insert: text },
        selection: { anchor: from + text.length }
    });
}

export function slashCommand(context: CompletionContext): CompletionResult | null {
    // Match "/" followed by optional characters
    let word = context.matchBefore(/\/[\w]*$/);

    if (!word) return null;

    // Check if it's at the start of the line or preceded by whitespace
    if (word.from > 0 && !/^\s/.test(context.state.sliceDoc(word.from - 1, word.from))) {
        return null;
    }

    return {
        from: word.from,
        options: options,
        filter: false // We handle filtering manually if needed, or let CodeMirror handle it based on 'label'
    };
}
