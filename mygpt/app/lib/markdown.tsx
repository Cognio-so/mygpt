import React from 'react';

// Cloudflare Workers-compatible markdown renderer
export const renderMarkdownSafely = (content: string): React.ReactNode => {
  if (!content) return null;

  // Split content into lines for processing
  const lines = content.split('\n');
  const result: JSX.Element[] = [];
  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }

    // Code blocks
    if (trimmedLine.startsWith('```')) {
      const language = trimmedLine.substring(3).trim();
      const codeLines: string[] = [];
      i++; // Move to next line
      
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      result.push(
        <pre key={`code-${currentIndex++}`} className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto my-4 font-mono text-sm">
          <code className={language ? `language-${language}` : ''}>
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      continue;
    }

    // Headers
    if (trimmedLine.startsWith('#')) {
      const headerLevel = trimmedLine.match(/^#+/)?.[0].length || 1;
      const headerText = trimmedLine.replace(/^#+\s*/, '');
      const processedText = processInlineMarkdown(headerText);
      
      const headerClasses = [
        "text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-white",
        "text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-white",
        "text-lg font-bold mt-4 mb-3 text-gray-900 dark:text-white",
        "text-base font-bold mt-3 mb-2 text-gray-900 dark:text-white",
        "text-sm font-bold mt-2 mb-2 text-gray-900 dark:text-white",
        "text-xs font-bold mt-2 mb-1 text-gray-900 dark:text-white"
      ];
      
      const HeaderTag = `h${Math.min(headerLevel, 6)}` as keyof JSX.IntrinsicElements;
      
      result.push(
        <HeaderTag key={`header-${currentIndex++}`} className={headerClasses[headerLevel - 1] || headerClasses[5]}>
          {processedText}
        </HeaderTag>
      );
      continue;
    }

    // Unordered lists
    if (trimmedLine.match(/^[\*\-\+]\s/)) {
      const listItems: string[] = [];
      
      while (i < lines.length && lines[i].trim().match(/^[\*\-\+]\s/)) {
        listItems.push(lines[i].trim().substring(2));
        i++;
      }
      i--; // Adjust for the outer loop increment
      
      result.push(
        <ul key={`ul-${currentIndex++}`} className="list-disc pl-6 space-y-1 my-3">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-gray-700 dark:text-gray-300">
              {processInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered lists
    if (trimmedLine.match(/^\d+\.\s/)) {
      const listItems: string[] = [];
      
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      i--; // Adjust for the outer loop increment
      
      result.push(
        <ol key={`ol-${currentIndex++}`} className="list-decimal pl-6 space-y-1 my-3">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-gray-700 dark:text-gray-300">
              {processInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquotes
    if (trimmedLine.startsWith('>')) {
      const quoteLines: string[] = [];
      
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().substring(1).trim());
        i++;
      }
      i--; // Adjust for the outer loop increment
      
      result.push(
        <blockquote key={`quote-${currentIndex++}`} className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800 italic">
          {quoteLines.map((quoteLine, idx) => (
            <p key={idx} className="text-gray-600 dark:text-gray-400">
              {processInlineMarkdown(quoteLine)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Horizontal rules
    if (trimmedLine.match(/^(---+|___+|\*\*\*+)$/)) {
      result.push(
        <hr key={`hr-${currentIndex++}`} className="my-6 border-gray-300 dark:border-gray-600" />
      );
      continue;
    }

    // Tables (basic support)
    if (trimmedLine.includes('|')) {
      const tableRows: string[] = [];
      
      while (i < lines.length && lines[i].trim().includes('|')) {
        tableRows.push(lines[i].trim());
        i++;
      }
      i--; // Adjust for the outer loop increment

      // Skip separator row (if present)
      const filteredRows = tableRows.filter(row => !row.match(/^\|[\s\-\|:]+\|$/));
      
      if (filteredRows.length > 0) {
        const [headerRow, ...bodyRows] = filteredRows;
        const headerCells = headerRow.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
        
        result.push(
          <div key={`table-${currentIndex++}`} className="overflow-x-auto my-4">
            <table className="min-w-full border border-gray-300 dark:border-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {headerCells.map((cell, cellIdx) => (
                    <th key={cellIdx} className="px-4 py-2 text-left font-medium text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">
                      {processInlineMarkdown(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {bodyRows.map((row, rowIdx) => {
                  const cells = row.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
                  return (
                    <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      {cells.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                          {processInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Regular paragraphs
    result.push(
      <p key={`p-${currentIndex++}`} className="my-3 leading-relaxed text-gray-700 dark:text-gray-300">
        {processInlineMarkdown(trimmedLine)}
      </p>
    );
  }

  return <div className="markdown-content space-y-2">{result}</div>;
};

// Process inline markdown (bold, italic, code, links)
const processInlineMarkdown = (text: string): React.ReactNode => {
  if (!text) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  // Regex for inline elements - improved to handle nested cases
  const inlineRegex = /(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;
  
  let match;
  while ((match = inlineRegex.exec(text)) !== null) {
    const [fullMatch] = match;
    const index = match.index;

    // Add text before the match
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }

    // Process the match
    if (fullMatch.startsWith('**') || fullMatch.startsWith('__')) {
      // Bold
      parts.push(
        <strong key={`bold-${keyCounter++}`} className="font-bold">
          {fullMatch.slice(2, -2)}
        </strong>
      );
    } else if (fullMatch.startsWith('*') || fullMatch.startsWith('_')) {
      // Italic
      parts.push(
        <em key={`italic-${keyCounter++}`} className="italic">
          {fullMatch.slice(1, -1)}
        </em>
      );
    } else if (fullMatch.startsWith('`')) {
      // Inline code
      parts.push(
        <code key={`code-${keyCounter++}`} className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded px-1 py-0.5 text-sm font-mono">
          {fullMatch.slice(1, -1)}
        </code>
      );
    } else if (fullMatch.startsWith('[')) {
      // Links
      const linkMatch = fullMatch.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [, linkText, url] = linkMatch;
        parts.push(
          <a 
            key={`link-${keyCounter++}`}
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-500 hover:text-blue-700 underline"
          >
            {linkText}
          </a>
        );
      }
    }

    lastIndex = index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 1 ? <>{parts}</> : parts[0] || text;
};

// Styles component for markdown rendering
export const MarkdownStyles = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      .markdown-content {
          line-height: 1.6;
          width: 100%;
      }
      
      .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
      }
      
      .hide-scrollbar::-webkit-scrollbar {
          display: none;
      }

      .progress-message {
          border-left: 3px solid #3498db;
          padding-left: 10px;
          color: #555;
          background-color: rgba(52, 152, 219, 0.05);
      }

      .progress-item {
          animation: fadeIn 0.5s ease-in-out;
      }

      @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
      }

      .typing-animation span {
          width: 5px;
          height: 5px;
          background-color: currentColor;
          border-radius: 50%;
          display: inline-block;
          margin: 0 1px;
          animation: typing 1.3s infinite ease-in-out;
      }

      .typing-animation span:nth-child(1) {
          animation-delay: 0s;
      }

      .typing-animation span:nth-child(2) {
          animation-delay: 0.2s;
      }

      .typing-animation span:nth-child(3) {
          animation-delay: 0.4s;
      }

      @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
      }

      /* Basic syntax highlighting */
      .language-javascript,
      .language-js {
          background: #1e1e1e;
          color: #dcdcdc;
      }

      .language-python {
          background: #1e1e1e;
          color: #dcdcdc;
      }

      .language-json {
          background: #1e1e1e;
          color: #dcdcdc;
      }

      .language-html {
          background: #1e1e1e;
          color: #dcdcdc;
      }

      .language-css {
          background: #1e1e1e;
          color: #dcdcdc;
      }

      /* General code highlighting */
      pre code {
          background: transparent !important;
          color: inherit !important;
      }
  `}} />
); 