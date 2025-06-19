import React, { useState, useEffect, useRef } from 'react';
import { useLoaderData, useFetcher, useNavigate, useSearchParams } from '@remix-run/react';
import AdminMessageInput from './AdminMessage';
import { IoPersonCircleOutline, IoSettingsOutline, IoPersonOutline, IoArrowBack, IoClose, IoAddCircleOutline } from 'react-icons/io5';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { FaRobot } from 'react-icons/fa6';
import { BiLogoMeta } from 'react-icons/bi';
import { RiOpenaiFill, RiSunFill, RiMoonFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import { useTheme } from '~/context/themeContext';
import { createSupabaseServerClient } from "~/lib/supabase.server";
import type { FileAttachment } from '~/lib/database.types';

// Define interfaces
interface User {
  _id?: string;
  name?: string;
  email: string;
  profilePic?: string;
  role?: string;
}

interface GptData {
  _id: string;
  name: string;
  description?: string;
  model?: string;
  instructions?: string;
  capabilities?: { webBrowsing?: boolean };
  knowledgeBase?: FileAttachment[];
  imageUrl?: string;
  conversationStarter?: string;
}

interface Message {
  id: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: FileAttachment[];
  isStreaming?: boolean;
  isProgress?: boolean;
  isError?: boolean;
}

interface FileObject {
  name: string;
  size?: number;
  type?: string;
  _fileRef?: File; // Store reference to actual File object
}

interface LoadingState {
  message: boolean;
  history: boolean;
}

const renderMarkdownSafely = (content: string) => {
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
          <code>{codeLines.join('\n')}</code>
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

  // Regex for inline elements
  const inlineRegex = /(\*\*.*?\*\*)|(__.*?__)|(\*.*?\*)|(_.*?_)|(`.*?`)|(\[.*?\]\(.*?\))/g;
  
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
      const linkMatch = fullMatch.match(/\[(.*?)\]\((.*?)\)/);
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

const MarkdownStyles = () => (
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
  `}} />
);

const modelIcons: { [key: string]: JSX.Element } = {
  'openrouter/auto': <TbRouter className="text-yellow-500" size={18} />,
  'GPT-4o': <TbRouter className="text-green-500" size={18} />,
  'GPT-4o-mini': <SiOpenai className="text-green-400" size={16} />,
  'Gemini-flash-2.5': <SiGooglegemini className="text-blue-400" size={16} />,
  'Gemini-pro-2.5': <SiGooglegemini className="text-blue-600" size={16} />,
  'Claude 3.5 Haiku': <FaRobot className="text-purple-400" size={16} />,
  'llama3-8b-8192': <BiLogoMeta className="text-blue-500" size={18} />,
  'Llama 4 Scout': <BiLogoMeta className="text-blue-700" size={18} />
};

const getDisplayModelName = (modelType: string): string => {
  if (modelType === 'openrouter/auto') return 'router-engine';
  return modelType;
};

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'txt':
      return '📄';
    case 'md':
      return '📝';
    default:
      return '📎';
  }
};

const AdminChat: React.FC = () => {
  const { gptData, user } = useLoaderData<{ gptData: GptData; user: User }>();
  const [searchParams] = useSearchParams();
  const fetcher = useFetcher();
  const uploadFetcher = useFetcher<{ files?: FileAttachment[]; error?: string }>();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme(); 
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ message: false, history: false });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileObject[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [webSearchEnabled, setWebSearchEnabled] = useState(gptData?.capabilities?.webBrowsing || false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationLoaded = useRef<boolean>(false);

  // Get conversation ID and loadHistory flag from URL
  const loadHistory = searchParams.get('loadHistory') === 'true';
  const conversationId = searchParams.get('conversationId');

  // Load conversation history
  useEffect(() => {
    const fetchConversationHistory = async () => {
      // Skip if already loaded or no conversation ID provided
      if (!loadHistory || !conversationId || conversationLoaded.current) return;
      
      try {
        setLoading(prev => ({ ...prev, history: true }));
        
        
        // Use browser fetch instead of getSupabaseClient since we're in a component
        const response = await fetch(`/api/chat-history?sessionId=${conversationId}`);
        if (!response.ok) {
          console.error('❌ AdminChat: Failed to fetch conversation history');
          return;
        }
        
        const data = await response.json() as { messages: any[] };
        if (data.messages && data.messages.length > 0) {
          
          // Format messages for display
          const formattedMessages: Message[] = data.messages.map((msg: any) => {
            let files: FileAttachment[] = [];
            
            // Parse user_docs if it exists
            if (msg.user_docs) {
              try {
                files = JSON.parse(msg.user_docs);
              } catch (parseError) {
                console.error('❌ AdminChat: Error parsing user_docs:', parseError);
              }
            }
            
            return {
              id: msg.id,
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
              timestamp: new Date(msg.created_at),
              files: files,
              isStreaming: false
            };
          });
          
          setMessages(formattedMessages);
          conversationLoaded.current = true;
        }
      } catch (error) {
        console.error('❌ AdminChat: Error loading conversation history:', error);
      } finally {
        setLoading(prev => ({ ...prev, history: false }));
      }
    };
    
    fetchConversationHistory();
  }, [loadHistory, conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleChatSubmit = async (message: string, files?: FileObject[]) => {
   

    if (!message.trim() && (!files || files.length === 0)) {
      return;
    }

    // Upload files to Python backend first if any
    let uploadedFileUrls: FileAttachment[] = [];
    const allFiles = [...(files || []), ...uploadedFiles];
    
    
    if (allFiles.length > 0) {
      setLoading(prev => ({ ...prev, message: true }));
      setIsUploading(true);
      
      try {
        const formData = new FormData();
        
        // Add files to FormData
        for (let i = 0; i < allFiles.length; i++) {
          const fileObj = allFiles[i];
          const actualFile = (fileObj as any)._fileRef || fileObj;
          
          formData.append('files', actualFile);
        }
        
        // Add required parameters for Python backend
        formData.append('user_email', user?.email || '');
        formData.append('gpt_id', gptData._id);
        formData.append('is_user_document', 'true'); // These are user-specific documents for chat

        // Show upload progress simulation
        const simulateProgress = () => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += 5;
            if (progress > 95) clearInterval(interval);
            setUploadProgress(progress);
          }, 100);
          return () => clearInterval(interval);
        };
        
        const stopProgress = simulateProgress();
        
        // Upload files via Remix API route (which forwards to Python backend)
        
        const uploadResponse = await fetch('/api/upload-documents', {
          method: 'POST',
          body: formData,
        });
        
        stopProgress();
        setUploadProgress(100);
        
        
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json() as { upload_results?: { filename: string; stored_url_or_key: string; status: string }[] };
          // Extract file URLs from Python backend response
          if (uploadResult.upload_results) {  
            uploadedFileUrls = uploadResult.upload_results
              .filter((result: any) => result.status === 'success')
              .map((result: any) => ({
                name: result.filename,
                url: result.stored_url_or_key,
                size: 0, // Python backend doesn't return size, but it's not critical
                type: 'application/octet-stream'
              }));
          }
          
        } else {
          const errorData = await uploadResponse.json();
          console.error("❌ AdminChat: Upload failed:", errorData);
          // Continue without files but show error
        }
      } catch (uploadError) {
        console.error("❌ AdminChat: File upload error:", uploadError);
        // Continue without files
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    }

    // Add user message to UI immediately (no Supabase saving here)
    const newUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      files: uploadedFileUrls
    };


    setMessages(prev => [...prev, newUserMessage]);
    setUploadedFiles([]);
    setLoading(prev => ({ ...prev, message: false }));

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

      try {
      const chatFormData = new FormData();
      chatFormData.append('intent', 'chat');
      chatFormData.append('message', message);
      chatFormData.append('gptId', gptData._id);
      chatFormData.append('model', gptData.model || 'gpt-4o');
      chatFormData.append('instructions', gptData.instructions || '');
      chatFormData.append('webSearch', webSearchEnabled.toString());
      
      const filesJsonString = JSON.stringify(uploadedFileUrls);
      
      chatFormData.append('files', filesJsonString);
      
      // Add conversation ID if we're continuing an existing conversation
      if (conversationId) {
        chatFormData.append('conversationId', conversationId);
        
      }
      const response = await fetch('/admin/chat-api', {
        method: 'POST',
        body: chatFormData,
        signal: abortController.signal
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ AdminChat: Chat API failed:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        
        try {
          const errorData = JSON.parse(errorText);
          console.error("❌ AdminChat: Chat API error details:", errorData);
          throw new Error(errorData.error || 'Failed to send message');
        } catch (parseError) {
          throw new Error(`Chat API error: ${response.status} - ${errorText}`);
        }
      }

      // Setup streaming response handling
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentStreamingMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      };

      setStreamingMessage(currentStreamingMessage);
      setLoading(prev => ({ ...prev, message: false }));


      // Process the stream
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
             
            if (buffer) {
              processChunk(buffer);
            }
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            processChunk(line);
          }
        }
      } catch (streamError) {
        if (streamError instanceof Error && streamError.name !== 'AbortError') {
          console.error('❌ AdminChat: Stream processing error:', streamError);
        }
      }

      // Finalize the message if needed
      if (currentStreamingMessage.content && currentStreamingMessage.isStreaming) {
       
        currentStreamingMessage.isStreaming = false;
        setStreamingMessage(null);
        setMessages(prev => [...prev, currentStreamingMessage]);
      }

      // Helper function to process chunks
      function processChunk(chunk: string) {
        if (!chunk.trim()) return;
        
        const dataMatch = chunk.match(/^data: (.*)/m);
        if (!dataMatch) return;
        
        try {
          const data = JSON.parse(dataMatch[1]);
          
          if (data.error) {
            console.error("❌ AdminChat: Stream error:", data.error);
            throw new Error(data.error);
          }

          if (data.type === 'content' || data.type === 'chunk') {
            const newContent = data.data || '';
            currentStreamingMessage = {
              ...currentStreamingMessage,
              content: currentStreamingMessage.content + newContent,
              isStreaming: true
            };
            setStreamingMessage({ ...currentStreamingMessage });
          } else if (data.type === 'end' || data.type === 'done') {
           
            currentStreamingMessage = {
              ...currentStreamingMessage,
              isStreaming: false
            };
            setStreamingMessage(null);
            setMessages(prev => [...prev, currentStreamingMessage]);
          }
        } catch (parseError) {
          console.warn('⚠️ AdminChat: Error parsing SSE data:', parseError, 'Chunk:', chunk);
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('❌ AdminChat: Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setStreamingMessage(null);
    } finally {
      setLoading(prev => ({ ...prev, message: false }));
      abortControllerRef.current = null;
    }
  };

  const handleFileUpload = (files: FileObject[]) => {
    
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewChat = () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear URL parameters for history
    navigate(`/admin/chat/${gptData._id}`);
    
    // Reset conversation state
    setMessages([]);
    setStreamingMessage(null);
    setUploadedFiles([]);
    conversationLoaded.current = false;
  };

  const handleGoBack = () => {
    // Cancel any ongoing request before navigating
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    navigate('/admin');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Update theme in server via form submission
    const formData = new FormData();
    formData.append('intent', 'updateTheme');
    formData.append('theme', newTheme);
    
    fetcher.submit(formData, { method: 'POST', action: '/admin/setting' });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const showWebSearchToggle = gptData?.capabilities?.webBrowsing || false;

  return (
    <>
      <MarkdownStyles />
      <div className={`flex flex-col h-screen ${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-black text-black dark:text-white overflow-hidden`}>
        <div className="flex-shrink-0 bg-white dark:bg-black px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleGoBack}
              className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10"
              aria-label="Go back"
            >
              <IoArrowBack size={20} />
            </button>
            
            <button
              className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10"
              aria-label="New Chat"
              onClick={handleNewChat}
            >
              <IoAddCircleOutline size={24} /> 
            </button>

            {gptData && (
              <div className="ml-2 text-sm md:text-base font-medium flex items-center">
                <span className="mr-2">{gptData.name}</span>
                {gptData.model && (
                  <div className="flex items-center ml-2 text-xs md:text-sm px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {modelIcons[gptData.model] || <FaRobot size={16} />}
                    <span className="ml-1">{getDisplayModelName(gptData.model)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? 
                <RiSunFill size={20} className="text-yellow-400" /> : 
                <RiMoonFill size={20} className="text-gray-700" />
              }
            </button>
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 dark:border-white/20 hover:border-blue-500 dark:hover:border-white/40 transition-colors"
              >
                {user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <IoPersonCircleOutline size={24} className="text-gray-500 dark:text-white" />
                  </div>
                )}
              </button>

              {isProfileOpen && (
                <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden z-30">
                  <div className="p-4 border-b border-gray-200 dark:border-white/10">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user?.name || 'Admin User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300">
                      <IoPersonOutline size={18} />
                      <span>Profile</span>
                    </button>
                    <button 
                      className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300" 
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <IoSettingsOutline size={18} />
                      <span>Settings</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-white dark:bg-black hide-scrollbar">
          <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col space-y-4 pb-4">
            {loading.history ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <span className="mt-4 text-sm">Loading conversation history...</span>
              </div>
            ) : messages.length === 0 && !streamingMessage ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                {gptData ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4 overflow-hidden">
                      {gptData.imageUrl ? (
                        <img src={gptData.imageUrl} alt={gptData.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-2xl text-white">{gptData.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{gptData.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">{gptData.description}</p>
                    
                    {gptData.conversationStarter && (
                      <div
                        onClick={() => handleChatSubmit(gptData.conversationStarter || '')}
                        className="mt-5 max-w-xs p-3 bg-gray-100 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-700/70 rounded-lg text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600/70 transition-colors"
                      >
                        <p className="text-gray-800 dark:text-white text-sm">
                          {gptData.conversationStarter.length > 40
                            ? gptData.conversationStarter.substring(0, 40) + '...'
                            : gptData.conversationStarter
                          }
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white'>Welcome to AI Agent</h1>
                    <span className='text-base sm:text-lg md:text-xl font-medium text-gray-500 dark:text-gray-400 mb-8 block'>How can I assist you today?</span>
                  </>
                )}
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`${message.role === 'user'
                        ? 'bg-black/10 dark:bg-white/80 text-black font-[16px] dark:text-black rounded-br-none max-w-max '
                        : 'assistant-message text-black font-[16px] dark:text-white rounded-bl-none w-full max-w-3xl'
                      } rounded-2xl px-4 py-2`}
                    >
                      {message.role === 'user' ? (
                        <>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {message.files && message.files.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.files.map((file: any, index: any) => (
                                <div
                                  key={`${file.name}-${index}`}
                                  className="flex items-center py-1 px-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700/50 max-w-fit"
                                >
                                  <div className="mr-1.5 text-gray-500 dark:text-gray-400">
                                    {getFileIcon(file.name)}
                                  </div>
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                                    {file.name}
                                  </span>
                                  {file.size && (
                                    <div className="text-[10px] text-gray-500 ml-1 whitespace-nowrap">
                                      {Math.round(file.size / 1024)} KB
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="markdown-content">
                          {renderMarkdownSafely(message.content)}
                        </div>
                      )}
                      <div className={`text-xs mt-2 text-right ${message.role === 'user' ? 'text-blue-50/80' : 'text-gray-400/80'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className={`w-full max-w-3xl rounded-2xl px-4 py-2 assistant-message text-black dark:text-white rounded-bl-none ${streamingMessage.isProgress ? 'progress-message' : ''}`}>
                      <div className="markdown-content">
                        {renderMarkdownSafely(streamingMessage.content)}
                        {streamingMessage.isStreaming && (
                          <div className="typing-animation mt-2 inline-flex items-center text-gray-400">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs mt-2 text-right text-gray-400/80">
                        {streamingMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )}

                {loading.message && !streamingMessage && (
                  <div className="flex justify-start items-end space-x-2">
                    <div className="w-full max-w-3xl rounded-2xl px-4 py-2 assistant-message text-black dark:text-white rounded-bl-none">
                      <div className="typing-animation inline-flex items-center text-gray-400">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 w-[95%] max-w-3xl mx-auto">
          {isUploading && (
            <div className="mb-2 px-2">
              <div className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="animate-spin w-5 h-5 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {uploadedFiles.length === 1
                      ? `Uploading ${uploadedFiles[0]?.name}`
                      : `Uploading ${uploadedFiles.length} files`}
                  </div>
                  <div className="mt-1 relative h-1.5 w-full bg-blue-100 dark:bg-blue-800/40 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploadedFiles.length > 0 && !isUploading && (
            <div className="mb-2 flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center py-1 px-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700/50 max-w-fit"
                >
                  <div className="mr-1.5 text-gray-500 dark:text-gray-400">
                    {getFileIcon(file.name)}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                    {file.name}
                  </span>
                  <button
                    onClick={() => handleRemoveUploadedFile(index)}
                    className="ml-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                    aria-label="Remove file"
                  >
                    <IoClose size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <AdminMessageInput
            onSubmit={handleChatSubmit}
            onFileUpload={handleFileUpload as any}
            isLoading={loading.message}
            currentGptName={gptData?.name}
            webSearchEnabled={webSearchEnabled}
            setWebSearchEnabled={setWebSearchEnabled}
            showWebSearchIcon={showWebSearchToggle}
          />
        </div>

        {isProfileOpen && (
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsProfileOpen(false)}
          />
        )}
    </div>
    </>
  );
};

export default AdminChat;