import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Define the custom highlight style
export const markdownHighlightStyle = HighlightStyle.define([
    // Headers
    { tag: tags.heading, fontWeight: 'bold', color: '#111827' }, // gray-900
    { tag: tags.heading1, fontSize: '1.5em' }, // Optional: visual distinction
    { tag: tags.heading2, fontSize: '1.25em' },

    // Emphasis
    { tag: tags.strong, fontWeight: 'bold', color: '#7C3AED' }, // violet-600 (Accent)
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through', color: '#6B7280' }, // gray-500

    // Lists
    { tag: tags.list, color: '#7C3AED' }, // violet-600 (Bullets)

    // Blockquotes
    { tag: tags.quote, fontStyle: 'italic', color: '#6B7280' }, // gray-500

    // Links
    { tag: tags.link, color: '#2563EB', textDecoration: 'underline' }, // blue-600
    { tag: tags.url, color: '#9CA3AF' }, // gray-400 (URL text)

    // Code
    { tag: tags.monospace, fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace', backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: '3px', padding: '0 2px' },

    // Horizontal Rule
    { tag: tags.contentSeparator, color: '#D1D5DB', fontWeight: 'bold' }, // gray-300
]);

// Export the extension
export const markdownStyles = syntaxHighlighting(markdownHighlightStyle);
