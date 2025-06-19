import React from 'react';

// Simple, production-ready markdown renderer optimized for Cloudflare Workers
export const renderMarkdownSafely = (content: string): React.ReactNode => {
  if (!content) return null;

  try {
    // Process the content line by line with better error handling
    const lines = content.split('\n');
    const processedLines: React.ReactNode[] = [];
    let currentIndex = 0;
    let isInCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (!isInCodeBlock) {
          // Start of code block
          isInCodeBlock = true;
          codeLanguage = trimmedLine.substring(3).trim();
          codeBlockLines = [];
        } else {
          // End of code block
          isInCodeBlock = false;
          processedLines.push(
            <pre key={`code-${currentIndex++}`} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 text-sm">
              <code className={`language-${codeLanguage}`}>
                {codeBlockLines.join('\n')}
              </code>
            </pre>
          );
          codeBlockLines = [];
          codeLanguage = '';
        }
        continue;
      }

      if (isInCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }

      // Process different line types
      const processedLine = processLine(trimmedLine, currentIndex++);
      if (processedLine) {
        processedLines.push(processedLine);
      }
    }

    return (
      <div className="markdown-content space-y-2">
        {processedLines}
      </div>
    );
  } catch (error) {
    console.error('Markdown rendering error:', error);
    // Fallback to plain text
    return (
      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {content}
      </div>
    );
  }
};

// Process individual lines
const processLine = (line: string, index: number): React.ReactNode => {
  // Headers
  if (line.startsWith('#')) {
    const headerLevel = (line.match(/^#+/) || [''])[0].length;
    const headerText = line.replace(/^#+\s*/, '');
    const processedText = processInlineText(headerText);
    
    const headerClasses = {
      1: "text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-white",
      2: "text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-white", 
      3: "text-lg font-bold mt-4 mb-3 text-gray-900 dark:text-white",
      4: "text-base font-bold mt-3 mb-2 text-gray-900 dark:text-white",
      5: "text-sm font-bold mt-2 mb-2 text-gray-900 dark:text-white",
      6: "text-xs font-bold mt-2 mb-1 text-gray-900 dark:text-white"
    };
    
    const HeaderComponent = `h${Math.min(headerLevel, 6)}` as keyof JSX.IntrinsicElements;
    const className = headerClasses[headerLevel as keyof typeof headerClasses] || headerClasses[6];
    
    return React.createElement(HeaderComponent, { 
      key: `header-${index}`, 
      className 
    }, processedText);
  }

  // Unordered lists
  if (line.match(/^[\*\-\+]\s/)) {
    const content = line.substring(2).trim();
    return (
      <li key={`li-${index}`} className="ml-6 text-gray-700 dark:text-gray-300 list-disc">
        {processInlineText(content)}
      </li>
    );
  }

  // Ordered lists
  if (line.match(/^\d+\.\s/)) {
    const content = line.replace(/^\d+\.\s/, '');
    return (
      <li key={`oli-${index}`} className="ml-6 text-gray-700 dark:text-gray-300 list-decimal">
        {processInlineText(content)}
      </li>
    );
  }

  // Blockquotes
  if (line.startsWith('>')) {
    const content = line.substring(1).trim();
    return (
      <blockquote key={`quote-${index}`} className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800 italic text-gray-600 dark:text-gray-400">
        {processInlineText(content)}
      </blockquote>
    );
  }

  // Horizontal rules
  if (line.match(/^(---+|___+|\*\*\*+)$/)) {
    return (
      <hr key={`hr-${index}`} className="my-6 border-gray-300 dark:border-gray-600" />
    );
  }

  // Regular paragraphs
  return (
    <p key={`p-${index}`} className="my-3 leading-relaxed text-gray-700 dark:text-gray-300">
      {processInlineText(line)}
    </p>
  );
};

// Optimized inline text processing
const processInlineText = (text: string): React.ReactNode => {
  if (!text) return text;

  // Simple regex patterns that work reliably in Workers
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, component: 'strong', className: 'font-bold' },
    { regex: /\*([^*]+)\*/g, component: 'em', className: 'italic' },
    { regex: /`([^`]+)`/g, component: 'code', className: 'bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded px-1 py-0.5 text-sm font-mono' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, component: 'link', className: 'text-blue-500 hover:text-blue-700 underline' }
  ];

  let result: React.ReactNode = text;
  let keyCounter = 0;

  patterns.forEach(pattern => {
    if (typeof result === 'string') {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;

      while ((match = pattern.regex.exec(result)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          parts.push(result.substring(lastIndex, match.index));
        }

        // Add formatted element
        if (pattern.component === 'link') {
          parts.push(
            <a 
              key={`link-${keyCounter++}`}
              href={match[2]} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={pattern.className}
            >
              {match[1]}
            </a>
          );
        } else {
          parts.push(
            React.createElement(
              pattern.component === 'strong' ? 'strong' : 
              pattern.component === 'em' ? 'em' : 'code',
              { 
                key: `${pattern.component}-${keyCounter++}`, 
                className: pattern.className 
              },
              match[1]
            )
          );
        }

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < result.length) {
        parts.push(result.substring(lastIndex));
      }

      if (parts.length > 0) {
        result = <>{parts}</>;
      }

      // Reset regex
      pattern.regex.lastIndex = 0;
    }
  });

  return result;
};

// Simplified styles for production
export const MarkdownStyles = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      .markdown-content {
        line-height: 1.6;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .markdown-content pre {
        white-space: pre-wrap;
        word-break: break-all;
      }
      
      .markdown-content code {
        word-break: break-all;
      }
      
      .markdown-content a {
        word-break: break-all;
      }

      /* Responsive tables */
      .markdown-content table {
        max-width: 100%;
        overflow-x: auto;
        display: block;
        white-space: nowrap;
      }
      
      @media (max-width: 768px) {
        .markdown-content {
          font-size: 14px;
        }
        
        .markdown-content pre {
          font-size: 12px;
          padding: 8px;
        }
      }
    `
  }} />
); 