import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { Range } from "@codemirror/state";
import { loadLocalImage } from "../../utils/imageLoader";

// Decorations
const hideDecoration = Decoration.replace({});
const boldDecoration = Decoration.mark({ class: "cm-bold" });
const italicDecoration = Decoration.mark({ class: "cm-italic" });
const strikethroughDecoration = Decoration.mark({ class: "cm-strikethrough" });
const inlineCodeDecoration = Decoration.mark({ class: "cm-inline-code" });
const headerDecoration = (level: number) => Decoration.mark({ class: `cm-header-${level}` });
const normalWeightDecoration = Decoration.mark({ class: "cm-normal-weight" });
const blockquoteDecoration = Decoration.line({ class: "cm-blockquote" });
const tableDecoration = Decoration.line({ class: "cm-table" });

// Global cache for Blob URLs to prevent unnecessary re-fetching
const blobCache = new Map<string, string>();

// Widget for Checkbox
class CheckboxWidget extends WidgetType {
    constructor(readonly checked: boolean, readonly pos: number, readonly view: EditorView) {
        super();
    }

    eq(other: CheckboxWidget) {
        return this.checked === other.checked && this.pos === other.pos;
    }

    toDOM() {
        const wrap = document.createElement("span");
        wrap.className = "cm-checkbox-widget";
        wrap.style.marginRight = "0.5em";
        wrap.style.verticalAlign = "middle";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = this.checked;
        input.className = "cursor-pointer accent-violet-600";

        // Prevent editor selection when clicking checkbox
        input.onmousedown = (e) => e.preventDefault();

        input.onclick = (e) => {
            e.preventDefault(); // Prevent default browser behavior
            this.toggleCheckbox();
        };

        wrap.appendChild(input);
        return wrap;
    }

    toggleCheckbox() {
        const { view, pos, checked } = this;
        const after = checked ? "[ ]" : "[x]";

        view.dispatch({
            changes: { from: pos, to: pos + 3, insert: after }
        });
    }
}

// Widget for Horizontal Rule
class HRWidget extends WidgetType {
    toDOM() {
        const div = document.createElement("div");
        div.className = "cm-hr-widget";
        div.style.borderTop = "2px solid #E5E7EB"; // gray-200
        div.style.margin = "1em 0";
        return div;
    }
}

// Widget for Image
class ImageWidget extends WidgetType {
    constructor(readonly url: string, readonly alt: string) {
        super();
    }

    eq(other: ImageWidget) {
        return this.url === other.url && this.alt === other.alt;
    }

    toDOM() {
        const img = document.createElement("img");
        const url = this.url;

        img.className = "cm-image-widget max-w-full h-auto rounded-lg shadow-md my-2";
        img.alt = this.alt;

        // 웹 이미지나 Data URL은 그대로 사용
        if (url.startsWith("http") || url.startsWith("https") || url.startsWith("data:")) {
            img.src = url;
            return img;
        }

        // 로컬 이미지 처리
        // 1. 캐시 확인
        if (blobCache.has(url)) {
            img.src = blobCache.get(url)!;
            return img;
        }

        // 2. 캐시에 없으면 비동기 로드
        img.alt = "Loading...";

        loadLocalImage(url).then(blobUrl => {
            blobCache.set(url, blobUrl);
            // 이미지가 DOM에 여전히 붙어있는지 확인 후 src 업데이트
            img.src = blobUrl;
            img.alt = this.alt;
        }).catch(err => {
            console.error(`[LivePreview] Failed to load image ${url}:`, err);
            img.alt = "Image load failed";
            img.style.border = "1px solid red";
        });

        return img;
    }
}

// Helper to check if cursor is inside a range
function isCursorInside(selection: any, from: number, to: number): boolean {
    for (const range of selection.ranges) {
        if (range.from >= from && range.to <= to) {
            return true;
        }
    }
    return false;
}

const livePreviewPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.computeDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged || update.selectionSet) {
                this.decorations = this.computeDecorations(update.view);
            }
        }

        computeDecorations(view: EditorView): DecorationSet {
            const widgets: Range<Decoration>[] = [];
            const selection = view.state.selection;

            for (const { from, to } of view.visibleRanges) {
                syntaxTree(view.state).iterate({
                    from,
                    to,
                    enter: (node) => {
                        const typeName = node.name;

                        // Horizontal Rule
                        if (typeName === "HorizontalRule") {
                            if (!isCursorInside(selection, node.from, node.to)) {
                                widgets.push(
                                    Decoration.replace({
                                        widget: new HRWidget(),
                                        inclusive: false,
                                    }).range(node.from, node.to)
                                );
                            }
                        }
                        // Task List (TaskMarker)
                        else if (typeName === "TaskMarker") {
                            const text = view.state.sliceDoc(node.from, node.to);
                            const checked = text.includes("x") || text.includes("X");

                            if (isCursorInside(selection, node.from, node.to)) {
                                // Show raw text
                            } else {
                                widgets.push(
                                    Decoration.replace({
                                        widget: new CheckboxWidget(checked, node.from, view),
                                        inclusive: true,
                                    }).range(node.from, node.to)
                                );
                            }
                        }
                        // Image
                        else if (typeName === "Image") {
                            const text = view.state.sliceDoc(node.from, node.to);
                            const match = text.match(/!\[(.*?)\]\((.*?)\)/);

                            if (match) {
                                const alt = match[1];
                                const url = match[2];

                                if (isCursorInside(selection, node.from, node.to)) {
                                    // Show raw text
                                } else {
                                    widgets.push(
                                        Decoration.replace({
                                            widget: new ImageWidget(url, alt),
                                            inclusive: false,
                                        }).range(node.from, node.to)
                                    );
                                }
                            }
                        }
                        // ATX Heading (# H1)
                        else if (typeName.startsWith("ATXHeading")) {
                            const levelStr = typeName.match(/\d+$/);
                            const level = levelStr ? parseInt(levelStr[0]) : 1;

                            // Style the content
                            widgets.push(headerDecoration(level).range(node.from, node.to));

                            // Hide the hashes
                            const text = view.state.sliceDoc(node.from, node.to);
                            const hashMatch = text.match(/^#+[ \t]+/);
                            if (hashMatch) {
                                const hashEnd = node.from + hashMatch[0].length;
                                // Check if cursor is on the line
                                const line = view.state.doc.lineAt(node.from);
                                if (!isCursorInside(selection, line.from, line.to)) {
                                    widgets.push(hideDecoration.range(node.from, hashEnd));
                                }
                            }
                        }
                        // Setext Heading (H1\n===)
                        else if (typeName.startsWith("SetextHeading")) {
                            const level = typeName === "SetextHeading1" ? 1 : 2;
                            const text = view.state.sliceDoc(node.from, node.to);

                            // Check underline length
                            const match = text.match(/\n[ \t]*([-=]+)[ \t]*$/);
                            if (match) {
                                const underlineChars = match[1];
                                if (underlineChars.length >= 2) {
                                    // Valid Header: Apply H1/H2 style (adds fontSize & bold from livePreview class)
                                    widgets.push(headerDecoration(level).range(node.from, node.to));

                                    // Check if cursor is on EITHER line to decide whether to hide underline
                                    // match[0] starts with \n. We must NOT replace the newline.
                                    // So we start at index + 1.
                                    const underlineStart = node.from + match.index! + 1;
                                    const line = view.state.doc.lineAt(node.from); // First line (text)
                                    const line2 = view.state.doc.lineAt(node.to); // Second line (underline)

                                    if (!isCursorInside(selection, line.from, line2.to)) {
                                        widgets.push(hideDecoration.range(underlineStart, node.to));
                                    }
                                } else {
                                    // Invalid Header (length < 2): 
                                    // Just ensure it's not bold. fontSize is already normal (removed from markdownStyles).
                                    widgets.push(normalWeightDecoration.range(node.from, node.to));
                                }
                            }
                        }
                        // Blockquote (> Quote)
                        else if (typeName === "Blockquote") {
                            // Style the lines
                            if (!isCursorInside(selection, node.from, node.to)) {
                                for (let i = view.state.doc.lineAt(node.from).number; i <= view.state.doc.lineAt(node.to).number; i++) {
                                    const line = view.state.doc.line(i);
                                    widgets.push(blockquoteDecoration.range(line.from, line.from));

                                    // Hide the ">" marker
                                    const lineText = line.text;
                                    const quoteMatch = lineText.match(/^>[ \t]?/);
                                    if (quoteMatch) {
                                        widgets.push(hideDecoration.range(line.from, line.from + quoteMatch[0].length));
                                    }
                                }
                            }
                        }
                        // Fenced Code (```)
                        else if (typeName === "FencedCode") {
                            if (!isCursorInside(selection, node.from, node.to)) {
                                // Calculate indentation of the opening line
                                const startLineObj = view.state.doc.lineAt(node.from);
                                const startLineText = startLineObj.text;
                                const indentMatch = startLineText.match(/^([ \t]*)/);
                                const indent = indentMatch ? indentMatch[1].length : 0;
                                const indentStyle = `--indent: ${indent}ch`;

                                // Apply background style
                                const startLine = view.state.doc.lineAt(node.from).number;
                                const endLine = view.state.doc.lineAt(node.to).number;

                                for (let i = startLine; i <= endLine; i++) {
                                    const line = view.state.doc.line(i);
                                    let className = "cm-codeblock";
                                    if (i === startLine) className += " cm-codeblock-first";
                                    if (i === endLine) className += " cm-codeblock-last";

                                    widgets.push(Decoration.line({
                                        class: className,
                                        attributes: { style: indentStyle }
                                    }).range(line.from, line.from));
                                }

                                // Hide the backticks
                                const text = view.state.sliceDoc(node.from, node.to);
                                const openFenceMatch = text.match(/^[ \t]*`{3,}.*/);
                                const closeFenceMatch = text.match(/\n[ \t]*`{3,}[ \t]*$/);

                                if (openFenceMatch) {
                                    widgets.push(hideDecoration.range(node.from, node.from + openFenceMatch[0].length));
                                }
                                if (closeFenceMatch) {
                                    // closeFenceMatch includes the newline, be careful with range
                                    const closeStart = node.from + closeFenceMatch.index! + 1; // +1 for newline
                                    widgets.push(hideDecoration.range(closeStart, node.to));
                                }
                            }
                        }
                        // Inline Code (`code`)
                        else if (typeName === "InlineCode") {
                            if (!isCursorInside(selection, node.from, node.to)) {
                                const text = view.state.sliceDoc(node.from, node.to);
                                const match = text.match(/^(`+)([\s\S]*?)(`+)$/);
                                if (match) {
                                    const startTicks = match[1].length;
                                    const endTicks = match[3].length;

                                    widgets.push(hideDecoration.range(node.from, node.from + startTicks));
                                    widgets.push(hideDecoration.range(node.to - endTicks, node.to));
                                    widgets.push(inlineCodeDecoration.range(node.from + startTicks, node.to - endTicks));
                                }
                            }
                        }
                        // Table
                        else if (typeName === "Table") {
                            if (!isCursorInside(selection, node.from, node.to)) {
                                for (let i = view.state.doc.lineAt(node.from).number; i <= view.state.doc.lineAt(node.to).number; i++) {
                                    const line = view.state.doc.line(i);
                                    widgets.push(tableDecoration.range(line.from, line.from));
                                }
                            }
                        }
                        // Inline Styles
                        else if (typeName === "StrongEmphasis") {
                            if (!isCursorInside(selection, node.from, node.to)) {
                                widgets.push(hideDecoration.range(node.from, node.from + 2));
                                widgets.push(hideDecoration.range(node.to - 2, node.to));
                                widgets.push(boldDecoration.range(node.from + 2, node.to - 2));
                            }
                        }
                        else if (typeName === "Emphasis") {
                            if (!isCursorInside(selection, node.from, node.to)) {
                                widgets.push(hideDecoration.range(node.from, node.from + 1));
                                widgets.push(hideDecoration.range(node.to - 1, node.to));
                                widgets.push(italicDecoration.range(node.from + 1, node.to - 1));
                            }
                        }
                        else if (typeName === "Strikethrough") {
                            if (!isCursorInside(selection, node.from, node.to)) {
                                widgets.push(hideDecoration.range(node.from, node.from + 2));
                                widgets.push(hideDecoration.range(node.to - 2, node.to));
                                widgets.push(strikethroughDecoration.range(node.from + 2, node.to - 2));
                            }
                        }
                    },
                });
            }

            return Decoration.set(widgets.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide));
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);

export const livePreview = [
    livePreviewPlugin,
    EditorView.baseTheme({
        ".cm-bold": { fontWeight: "bold" },
        ".cm-italic": { fontStyle: "italic" },
        ".cm-strikethrough": { textDecoration: "line-through" },
        ".cm-normal-weight": { fontWeight: "normal !important", textDecoration: "none" },
        ".cm-header-1": { fontSize: "1.6em", fontWeight: "bold" },
        ".cm-header-2": { fontSize: "1.4em", fontWeight: "bold" },
        ".cm-header-3": { fontSize: "1.2em", fontWeight: "bold" },
        ".cm-header-4": { fontSize: "1.1em", fontWeight: "bold" },
        ".cm-header-5": { fontSize: "1em", fontWeight: "bold" },
        ".cm-header-6": { fontSize: "1em", fontWeight: "bold", color: "#6B7280" },
        ".cm-blockquote": { borderLeft: "4px solid #E5E7EB", paddingLeft: "1em", color: "#6B7280" },
        ".cm-codeblock": {
            position: "relative",
            fontFamily: "'D2Coding', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace",
            color: "#E5E7EB", // gray-200 (Default Text Color for Code Block)
        },
        ".cm-codeblock::before": {
            content: '""',
            position: "absolute",
            top: "0",
            bottom: "0",
            left: "var(--indent, 0)",
            right: "0",
            backgroundColor: "#1E293B", // slate-800(Dark Navy)
            zIndex: "-1",
        },
        ".cm-codeblock-first::before": {
            borderTopLeftRadius: "0.375em",
            borderTopRightRadius: "0.375em",
            paddingTop: "0.2em"
        },
        ".cm-codeblock-last::before": {
            borderBottomLeftRadius: "0.375em",
            borderBottomRightRadius: "0.375em",
            paddingBottom: "0.2em"
        },
        ".cm-inline-code": {
            backgroundColor: "#F3F4F6",
            borderRadius: "0.25em",
            fontFamily: "'D2Coding', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace",
            padding: "0.1em 0.3em",
        },
        ".cm-table": { /* Add table specific styling here if needed, e.g., border-collapse */ }
    }),
];
