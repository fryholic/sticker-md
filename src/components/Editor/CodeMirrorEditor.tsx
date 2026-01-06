import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { indentUnit } from '@codemirror/language';
import { highlightActiveLine, dropCursor } from '@codemirror/view';
import { autocompletion } from '@codemirror/autocomplete';
import { markdownStyles } from './markdownStyles';
import { livePreview } from './livePreview';
import { slashCommand } from './slashCommand';
import { setupDropHandler, dropEventHandler } from './dropHandler';

interface CodeMirrorEditorProps {
    initialContent: string;
    onChange: (content: string) => void;
    className?: string;
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
    initialContent,
    onChange,
    className,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        // ... (Theme definition and startState creation) ...
        // Theme definition
        const theme = EditorView.theme({
            '&': {
                height: '100%',
                backgroundColor: 'transparent',
                fontFamily: 'inherit',
            },
            '.cm-content': {
                fontFamily: 'inherit',
                padding: '0', // Remove default padding to match textarea feel
                textRendering: 'auto', // Fix for IME candidate window position issue
            },
            '.cm-scroller': {
                fontFamily: 'inherit',
                overflow: 'auto',
            },
            '&.cm-focused': {
                outline: 'none',
            },
            '.cm-line': {
                padding: '0',
            },
            '.cm-tooltip-autocomplete': {
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                backgroundColor: 'white',
                padding: '4px',
            },
            '.cm-tooltip-autocomplete > ul > li': {
                padding: '6px 10px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            },
            '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
                backgroundColor: '#F3F4F6',
                color: 'black',
            },
            '.cm-completionLabel': {
                fontWeight: '500',
            },
            '.cm-completionDetail': {
                color: '#9CA3AF',
                fontSize: '12px',
                marginLeft: 'auto',
            },
        });

        // Initial State
        const startState = EditorState.create({
            doc: initialContent,
            extensions: [
                keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
                history(),
                indentUnit.of("    "), // 4 spaces
                EditorState.tabSize.of(4),
                EditorView.lineWrapping,
                markdown({
                    base: markdownLanguage,
                    codeLanguages: languages,
                    addKeymap: true,
                }), // GFM is enabled by default in @codemirror/lang-markdown
                markdownStyles,
                livePreview, // Enable Live Preview
                autocompletion({ override: [slashCommand] }), // Enable Slash Command
                theme,
                highlightActiveLine(),
                dropCursor(),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                }),
                EditorView.contentAttributes.of({ spellcheck: 'false' }),
                dropEventHandler, // Add DOM drop event handler
            ],
        });

        // Create View
        const view = new EditorView({
            state: startState,
            parent: editorRef.current,
        });

        viewRef.current = view;

        // Focus on mount
        view.focus();

        // Setup Drop Handler
        const unlistenDropPromise = setupDropHandler(view);

        return () => {
            unlistenDropPromise.then(unlisten => unlisten());
            view.destroy();
        };
    }, []); // Run only once on mount

    // Note: We don't update the doc when initialContent changes to avoid overwriting user edits.
    // The parent component should handle key-based re-mounting if it needs to reset content completely.

    return <div ref={editorRef} className={`h-full w-full ${className}`} />;
};
