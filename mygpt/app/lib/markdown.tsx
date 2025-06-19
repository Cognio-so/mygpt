import React from 'react';

// Ultra-simple, bulletproof markdown renderer for Cloudflare Workers
export const renderMarkdownSafely = (content: string): React.ReactNode => {
  if (!content) return null;

  try {
    return <div className="markdown-wrapper">{parseMarkdown(content)}</div>;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // Fallback to simple text formatting
    return (
      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    );
  }
};

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!line) {
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      const language = line.slice(3).trim();
      i++;
      
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      elements.push(
        <pre key={key++} className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto">
          <code className="text-sm font-mono whitespace-pre">
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      i++;
      continue;
    }

    // Headers
    if (line.startsWith('#')) {
      const headerMatch = line.match(/^(#{1,6})\s*(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
        const sizes = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
        
        elements.push(
          <HeaderTag 
            key={key++} 
            className={`${sizes[level - 1] || sizes[5]} font-bold mt-6 mb-4 text-gray-900 dark:text-white`}
          >
            {parseInline(text)}
          </HeaderTag>
        );
        i++;
        continue;
      }
    }

    // Lists
    const bulletMatch = line.match(/^[\*\-\+]\s+(.*)$/);
    const numberMatch = line.match(/^\d+\.\s+(.*)$/);
    
    if (bulletMatch || numberMatch) {
      const listItems: string[] = [];
      const isBullet = !!bulletMatch;
      
      // Collect all consecutive list items
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        const currentBullet = currentLine.match(/^[\*\-\+]\s+(.*)$/);
        const currentNumber = currentLine.match(/^\d+\.\s+(.*)$/);
        
        if ((isBullet && currentBullet) || (!isBullet && currentNumber)) {
          listItems.push((currentBullet || currentNumber)![1]);
          i++;
        } else if (!currentLine) {
          i++;
          break;
        } else {
          break;
        }
      }
      
      const ListTag = isBullet ? 'ul' : 'ol';
      const listClass = isBullet ? 'list-disc' : 'list-decimal';
      
      elements.push(
        <ListTag key={key++} className={`${listClass} pl-6 my-4 space-y-2`}>
          {listItems.map((item, idx) => (
            <li key={idx} className="text-gray-700 dark:text-gray-300">
              {parseInline(item)}
            </li>
          ))}
        </ListTag>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith('>')) {
      const quoteContent = line.slice(1).trim();
      elements.push(
        <blockquote 
          key={key++} 
          className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800 italic text-gray-600 dark:text-gray-400"
        >
          {parseInline(quoteContent)}
        </blockquote>
      );
      i++;
      continue;
    }

    // Horizontal rules
    if (line.match(/^[-*_]{3,}$/)) {
      elements.push(
        <hr key={key++} className="my-6 border-gray-300 dark:border-gray-600" />
      );
      i++;
      continue;
    }

    // Regular paragraphs
    elements.push(
      <p key={key++} className="my-3 leading-relaxed text-gray-700 dark:text-gray-300">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

function parseInline(text: string): React.ReactNode {
  if (!text) return text;

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Process patterns one by one to avoid conflicts
  const patterns = [
    // Bold (** or __)
    { regex: /\*\*([^*]+)\*\*/g, render: (match: string) => <strong key={key++} className="font-bold">{match}</strong> },
    { regex: /__([^_]+)__/g, render: (match: string) => <strong key={key++} className="font-bold">{match}</strong> },
    
    // Italic (* or _)
    { regex: /\*([^*]+)\*/g, render: (match: string) => <em key={key++} className="italic">{match}</em> },
    { regex: /_([^_]+)_/g, render: (match: string) => <em key={key++} className="italic">{match}</em> },
    
    // Inline code
    { regex: /`([^`]+)`/g, render: (match: string) => (
      <code key={key++} className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded px-1 py-0.5 text-sm font-mono">
        {match}
      </code>
    )},
    
    // Links
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, render: (text: string, url: string) => (
      <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline">
        {text}
      </a>
    )}
  ];

  // Simple sequential processing
  for (const pattern of patterns) {
    const newParts: React.ReactNode[] = [];
    
    for (const part of (parts.length > 0 ? parts : [remaining])) {
      if (typeof part === 'string') {
        let lastIndex = 0;
        let match;
        
        pattern.regex.lastIndex = 0; // Reset regex
        
        while ((match = pattern.regex.exec(part)) !== null) {
          // Add text before match
          if (match.index > lastIndex) {
            newParts.push(part.substring(lastIndex, match.index));
          }
          
          // Add formatted element
          if (pattern.regex.source.includes('\\[')) {
            // Link pattern
            newParts.push(pattern.render(match[1], match[2]));
          } else {
            // Other patterns
            newParts.push(pattern.render(match[1]));
          }
          
          lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < part.length) {
          newParts.push(part.substring(lastIndex));
        }
        
        pattern.regex.lastIndex = 0; // Reset again
      } else {
        newParts.push(part);
      }
    }
    
    if (newParts.length > 0) {
      parts.length = 0;
      parts.push(...newParts);
    }
  }

  return parts.length > 1 ? <>{parts}</> : parts[0] || text;
}

// Simple CSS styles
export const MarkdownStyles = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      .markdown-wrapper {
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.6;
      }
      
      .markdown-wrapper pre {
        white-space: pre-wrap;
        overflow-x: auto;
      }
      
      .markdown-wrapper code {
        word-break: break-all;
      }
      
      .markdown-wrapper a {
        word-wrap: break-word;
      }

      @media (max-width: 768px) {
        .markdown-wrapper {
          font-size: 14px;
        }
        
        .markdown-wrapper pre {
          font-size: 12px;
          padding: 8px;
        }
      }
    `
  }} />
); 