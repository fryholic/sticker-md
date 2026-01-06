import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Define the custom highlight style
export const markdownHighlightStyle = HighlightStyle.define([
    // Headers
    { tag: tags.heading, color: '#111827' }, // gray-900

    // Emphasis
    { tag: tags.strong, fontWeight: 'bold', color: '#111827' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through', color: '#6B7280' }, // gray-500

    // Lists
    { tag: tags.list, color: '#4B5563' }, // gray-600

    // Blockquotes
    { tag: tags.quote, fontStyle: 'italic', color: '#6B7280' }, // gray-500

    // Links
    { tag: tags.link, color: '#2563EB', textDecoration: 'underline' }, // blue-600
    { tag: tags.url, color: '#9CA3AF' }, // gray-400

    // Horizontal Rule
    { tag: tags.contentSeparator, color: '#D1D5DB', fontWeight: 'bold' }, // gray-300

    // Code (One Dark Theme Colors for Dark Navy Background)
    { tag: tags.comment, color: '#7F848E', fontStyle: 'italic' }, // Light Gray for comments
    { tag: tags.string, color: '#98C379' }, // Green
    { tag: tags.variableName, color: '#E06C75' }, // Red (often used for variables in One Dark)
    { tag: tags.number, color: '#D19A66' }, // Orange
    { tag: tags.bool, color: '#D19A66' }, // Orange
    { tag: tags.keyword, color: '#C678DD' }, // Purple
    { tag: tags.operator, color: '#56B6C2' }, // Cyan
    { tag: tags.className, color: '#E5C07B' }, // Yellow
    { tag: tags.definition(tags.typeName), color: '#E5C07B' }, // Yellow
    { tag: tags.typeName, color: '#E5C07B' }, // Yellow
    { tag: tags.angleBracket, color: '#ABB2BF' }, // Foreground
    { tag: tags.tagName, color: '#E06C75' }, // Red
    { tag: tags.attributeName, color: '#D19A66' }, // Orange

    // Inline Code (Still Light Background, but usually no syntax highlighting inside)
    { tag: tags.monospace, fontFamily: "'D2Coding', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace", backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: '3px', padding: '0 2px' },
]);

// Export the extension
export const markdownStyles = syntaxHighlighting(markdownHighlightStyle);
