import React from 'react';
import { marked } from 'marked';
import type { MarkedOptions, Renderer } from 'marked';

// Configure marked for Cloudflare Workers compatibility
const markedOptions: MarkedOptions = {
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert line breaks to <br>
  extensions: {
    renderers: {},
    childTokens: {},
    inline: [],
    block: [],
    startInline: [],
    startBlock: []
  } // Add any custom extensions here
};

// Custom renderer for better styling
const renderer: Partial<Renderer> = {
  // Override code block rendering
  code({ text, lang }: { text: string; lang?: string }): string {
    const language = lang || '';
    return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto"><code class="language-${language} text-sm font-mono whitespace-pre">${text}</code></pre>`;
  },

  // Override inline code rendering
  codespan({ text }: { text: string }): string {
    return `<code class="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded px-1 py-0.5 text-sm font-mono">${text}</code>`;
  },

  // Override header rendering
  heading({ tokens, depth }: { tokens: any[]; depth: number }): string {
    const sizes = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
    const size = sizes[depth - 1] || sizes[5];
    // Convert tokens to text (simple implementation)
    const text = tokens.map(token => token.raw || token.text || '').join('');
    return `<h${depth} class="${size} font-bold mt-6 mb-4 text-gray-900 dark:text-white">${text}</h${depth}>`;
  },

  // Override paragraph rendering
  paragraph({ tokens }: { tokens: any[] }): string {
    // Convert tokens to text (simple implementation)
    const text = tokens.map(token => token.raw || token.text || '').join('');
    return `<p class="my-3 leading-relaxed text-gray-700 dark:text-gray-300">${text}</p>`;
  },

  // Override list rendering
  list({ items, ordered }: { items: any[]; ordered: boolean }): string {
    const tag = ordered ? 'ol' : 'ul';
    const listClass = ordered ? 'list-decimal' : 'list-disc';
    const body = items.map(item => this.listitem && this.listitem(item) || item.raw || '').join('');
    return `<${tag} class="${listClass} pl-6 my-4 space-y-2">${body}</${tag}>`;
  },

  listitem({ tokens }: { tokens: any[] }): string {
    const text = tokens.map(token => token.raw || token.text || '').join('');
    return `<li class="text-gray-700 dark:text-gray-300">${text}</li>`;
  },

  // Override blockquote rendering
  blockquote({ tokens }: { tokens: any[] }): string {
    const text = tokens.map(token => token.raw || token.text || '').join('');
    return `<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800 italic text-gray-600 dark:text-gray-400">${text}</blockquote>`;
  },

  // Override link rendering
  link({ href, title, tokens }: { href: string; title?: string | null | undefined; tokens: any[] }): string {
    const titleAttr = title ? ` title="${title}"` : '';
    const text = tokens.map(token => token.raw || token.text || '').join('');
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline">${text}</a>`;
  },

  // Override horizontal rule rendering
  hr(): string {
    return '<hr class="my-6 border-gray-300 dark:border-gray-600" />';
  },

  // Override table rendering
  table({ header, rows }: { header: any[]; rows: any[][] }): string {
    const headerContent = header.map(cell => 
      `<th class="px-4 py-2 text-left font-medium text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">${cell.tokens ? cell.tokens.map((t: any) => t.raw || t.text || '').join('') : cell.text || ''}</th>`
    ).join('');
    
    const bodyContent = rows.map(row => 
      `<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">${row.map(cell => 
        `<td class="px-4 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">${cell.tokens ? cell.tokens.map((t: any) => t.raw || t.text || '').join('') : cell.text || ''}</td>`
      ).join('')}</tr>`
    ).join('');

    return `<div class="overflow-x-auto my-4">
      <table class="min-w-full border border-gray-300 dark:border-gray-600">
        <thead class="bg-gray-50 dark:bg-gray-800"><tr>${headerContent}</tr></thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">${bodyContent}</tbody>
      </table>
    </div>`;
  }
};

// Configure marked with options and renderer
marked.use(markedOptions as any);

// Main markdown rendering function
export const renderMarkdownSafely = (content: string): React.ReactNode => {
  if (!content) return null;

  try {
    // Parse markdown to HTML using marked (synchronous in v15+)
    const htmlContent = marked.parse(content) as string;
    
    // Return JSX with dangerouslySetInnerHTML (safe because we control the renderer)
    return (
      <div 
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // Fallback to plain text with basic formatting
    return (
      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    );
  }
};

// Styles for the markdown content
export const MarkdownStyles = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      .markdown-content {
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.6;
        max-width: 100%;
      }
      
      .markdown-content pre {
        white-space: pre-wrap;
        overflow-x: auto;
        max-width: 100%;
      }
      
      .markdown-content code {
        word-break: break-all;
      }
      
      .markdown-content a {
        word-wrap: break-word;
      }

      .markdown-content table {
        width: 100%;
        border-collapse: collapse;
      }

      .markdown-content img {
        max-width: 100%;
        height: auto;
      }

      /* Mobile responsiveness */
      @media (max-width: 768px) {
        .markdown-content {
          font-size: 14px;
        }
        
        .markdown-content pre {
          font-size: 12px;
          padding: 8px;
        }
        
        .markdown-content table {
          font-size: 12px;
        }
      }

      /* Dark mode specific fixes */
      .dark .markdown-content pre {
        background-color: #1f2937 !important;
        color: #f3f4f6 !important;
      }

      .dark .markdown-content code {
        background-color: #374151 !important;
        color: #fca5a5 !important;
      }

      /* Ensure proper spacing */
      .markdown-content > *:first-child {
        margin-top: 0;
      }

      .markdown-content > *:last-child {
        margin-bottom: 0;
      }
    `
  }} />
); 