import React, { useState, useEffect, useRef } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import UserMessageInput from './UserMessageInput';
import { IoPersonCircleOutline, IoSettingsOutline, IoPersonOutline, IoArrowBack, IoClose, IoAddCircleOutline } from 'react-icons/io5';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { FaRobot } from 'react-icons/fa6';
import { BiLogoMeta } from 'react-icons/bi';
import { TbRouter } from 'react-icons/tb';
import { useTheme } from '~/context/themeContext';
import type { FileAttachment } from '~/lib/database.types';
import { renderMarkdownSafely, MarkdownStyles } from '~/lib/markdown';

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
  _fileRef?: File;
}

interface LoadingState {
  message: boolean;
  history: boolean;
}

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

const UserChat: React.FC = () => {
  const { gptData, user } = useLoaderData<{ gptData: GptData; user: User }>();
  const [searchParams] = useSearchParams();
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

  const conversationId = searchParams.get('conversationId');
  const loadHistory = searchParams.get('loadHistory') === 'true';

  // Load conversation history
  useEffect(() => {
    const fetchConversationHistory = async () => {
      // Skip if already loaded or no conversation ID provided
      if (!loadHistory || !conversationId || conversationLoaded.current) return;
      
      try {
        console.log('🔄 UserChat: Loading conversation history for:', conversationId);
        setLoading(prev => ({ ...prev, history: true }));
        
        // Use browser fetch to get conversation history
        const response = await fetch(`/api/chat-history?sessionId=${conversationId}`);
        if (!response.ok) {
          console.error('❌ UserChat: Failed to fetch conversation history');
          return;
        }
        
        const data = await response.json() as { messages: any[] };
        if (data.messages && data.messages.length > 0) {
          console.log('✅ UserChat: Loaded', data.messages.length, 'messages from history');
          
          // Format messages for display
          const formattedMessages: Message[] = data.messages.map((msg: any) => {
            let files: FileAttachment[] = [];
            
            // Parse user_docs if it exists
            if (msg.user_docs) {
              try {
                files = JSON.parse(msg.user_docs);
              } catch (parseError) {
                console.error('❌ UserChat: Error parsing user_docs:', parseError);
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
          console.log('✅ UserChat: Conversation history loaded successfully');
        }
      } catch (error) {
        console.error('❌ UserChat: Error loading conversation history:', error);
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

  const handleChatSubmit = async (message: string, files: FileObject[] = []) => {
    console.log("🚀 UserChat: handleChatSubmit called", { 
      messageLength: message.length, 
      filesCount: files.length,
    });

    if (!message.trim() && files.length === 0) {
      console.log("❌ UserChat: No message or files provided");
      return;
    }

    let uploadedFileAttachments: FileAttachment[] = [];
    if (files.length > 0) {
      setLoading(prev => ({ ...prev, message: true }));
      setIsUploading(true);
      
      try {
        const uploadFormData = new FormData();
        files.forEach(file => {
          uploadFormData.append('files', file as any);
        });

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
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        stopProgress();
        setUploadProgress(100);
        
        if (!uploadResponse.ok) throw new Error('File upload failed');

        const uploadResult = await uploadResponse.json() as { files: FileAttachment[] };
        uploadedFileAttachments = uploadResult.files || [];
        console.log("✅ UserChat: Files uploaded successfully:", uploadedFileAttachments);
      } catch (uploadError) {
        console.error("❌ UserChat: File upload error:", uploadError);
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    }

    const newUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      files: uploadedFileAttachments,
    };

    setMessages(prev => [...prev, newUserMessage]);
    setUploadedFiles([]);
    setLoading(prev => ({ ...prev, message: false }));

    if (abortControllerRef.current) abortControllerRef.current.abort();
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
      chatFormData.append('files', JSON.stringify(uploadedFileAttachments));
      
      if (conversationId) chatFormData.append('conversationId', conversationId);

      const response = await fetch('/user/chat-api', {
        method: 'POST',
        body: chatFormData,
        signal: abortController.signal
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(JSON.parse(errorText).error || 'Failed to send message');
      }

      const reader = response.body.getReader();
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content' && data.data) {
                currentStreamingMessage.content += data.data;
                setStreamingMessage({ ...currentStreamingMessage });
              } else if (data.type === 'conversation_id' && data.id) {
                // Update URL with new conversation ID for new conversations
                if (!conversationId) {
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.set('conversationId', data.id);
                  window.history.replaceState({}, '', newUrl.toString());
                }
              } else if (data.type === 'done') {
                currentStreamingMessage.isStreaming = false;
                setMessages(prev => [...prev, currentStreamingMessage]);
                setStreamingMessage(null);
                return;
              }
            } catch (e) {
              console.warn('⚠️ UserChat: Error parsing SSE data:', e, 'Chunk:', line);
            }
          }
        }
      }

      if (currentStreamingMessage.content && currentStreamingMessage.isStreaming) {
        currentStreamingMessage.isStreaming = false;
        setStreamingMessage(null);
        setMessages(prev => [...prev, currentStreamingMessage]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('ℹ️ UserChat: Chat request was aborted');
        return;
      }
      console.error('❌ UserChat: Error sending message:', error);
    } finally {
      setLoading(prev => ({ ...prev, message: false }));
      abortControllerRef.current = null;
    }
  };

  const handleFileUpload = (incomingFiles: FileObject[]) => {
    setUploadedFiles(prev => [...prev, ...incomingFiles]);
  };

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewChat = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    navigate(`/user/chat/${gptData._id}`);
    setMessages([]);
    setStreamingMessage(null);
    setUploadedFiles([]);
    conversationLoaded.current = false;
  };

  const handleGoBack = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    navigate('/user');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const showWebSearchToggle = gptData?.capabilities?.webBrowsing || false;

  return (
    <>
      <MarkdownStyles />
      <div className={`flex flex-col h-screen ${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-black text-black dark:text-white overflow-hidden`}>
        <div className="flex-shrink-0 bg-white dark:bg-black px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button onClick={handleGoBack} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10" aria-label="Go back">
              <IoArrowBack size={20} />
            </button>
            <button className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10" aria-label="New Chat" onClick={handleNewChat}>
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
              {theme === 'dark' ? (
                <svg 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-5 h-5 text-yellow-400"
                >
                  <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z" />
                </svg>
              ) : (
                <svg 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-5 h-5 text-gray-700"
                >
                  <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 21.75a.75.75 0 0 1-.75-.75v-2.25a.75.75 0 0 1 1.5 0V21a.75.75 0 0 1-.75.75ZM5.106 17.834a.75.75 0 0 0 1.06 1.06l1.591-1.59a.75.75 0 1 0-1.06-1.061l-1.591 1.59ZM2.25 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75ZM6.166 5.106a.75.75 0 0 0-1.06 1.06l1.59 1.591a.75.75 0 0 0 1.061-1.06l-1.59-1.591Z" />
                </svg>
              )}
            </button>
            <div className="relative">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 dark:border-white/20 hover:border-blue-500 dark:hover:border-white/40 transition-colors">
                {user?.profilePic ? <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><IoPersonCircleOutline size={24} className="text-gray-500 dark:text-white" /></div>}
              </button>
              {isProfileOpen && (
                <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden z-30">
                  <div className="p-4 border-b border-gray-200 dark:border-white/10">
                    <p className="font-medium text-gray-900 dark:text-white">{user?.name || 'User'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"><IoPersonOutline size={18} /><span>Profile</span></button>
                    <button className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300" onClick={() => navigate('/user/setting')}><IoSettingsOutline size={18} /><span>Settings</span></button>
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
                      {gptData.imageUrl ? <img src={gptData.imageUrl} alt={gptData.name} className="w-full h-full object-cover rounded-full" /> : <span className="text-2xl text-white">{gptData.name?.charAt(0) || '?'}</span>}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{gptData.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">{gptData.description}</p>
                    {gptData.conversationStarter && (
                      <div onClick={() => handleChatSubmit(gptData.conversationStarter || '')} className="mt-5 max-w-xs p-3 bg-gray-100 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-700/70 rounded-lg text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600/70 transition-colors">
                        <p className="text-gray-800 dark:text-white text-sm">{gptData.conversationStarter.length > 40 ? gptData.conversationStarter.substring(0, 40) + '...' : gptData.conversationStarter}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white'>Welcome to AI Assistant</h1>
                    <span className='text-base sm:text-lg md:text-xl font-medium text-gray-500 dark:text-gray-400 mb-8 block'>How can I assist you today?</span>
                  </>
                )}
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${message.role === 'user' ? 'bg-black/10 dark:bg-white/80 text-black font-[16px] dark:text-black rounded-br-none max-w-max ' : 'assistant-message text-black font-[16px] dark:text-white rounded-bl-none w-full max-w-3xl'} rounded-2xl px-4 py-2`}>
                      {message.role === 'user' ? (
                        <>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          {message.files && message.files.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.files.map((file: any, index: any) => (
                                <div key={`${file.name}-${index}`} className="flex items-center py-1 px-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700/50 max-w-fit">
                                  <div className="mr-1.5 text-gray-500 dark:text-gray-400">{getFileIcon(file.name)}</div>
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{file.name}</span>
                                  {file.size && (
                                    <div className="text-[10px] text-gray-500 ml-1 whitespace-nowrap">{Math.round(file.size / 1024)} KB</div>
                                  )}
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-600 text-xs" title="Download file">📎</a>
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
                      <div className={`text-xs mt-2 text-right ${message.role === 'user' ? 'text-blue-50/80' : 'text-gray-400/80'}`}>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className={`w-full max-w-3xl rounded-2xl px-4 py-2 assistant-message text-black dark:text-white rounded-bl-none`}>
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
                <div key={`${file.name}-${index}`} className="flex items-center py-1 px-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700/50 max-w-fit">
                  <div className="mr-1.5 text-gray-500 dark:text-gray-400">{getFileIcon(file.name)}</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{file.name}</span>
                  <button onClick={() => handleRemoveUploadedFile(index)} className="ml-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors" aria-label="Remove file">
                    <IoClose size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UserMessageInput onSubmit={handleChatSubmit} onFileUpload={handleFileUpload} isLoading={loading.message} currentGptName={gptData?.name} webSearchEnabled={webSearchEnabled} setWebSearchEnabled={setWebSearchEnabled} showWebSearchIcon={showWebSearchToggle} />
        </div>
        {isProfileOpen && (
          <div className="fixed inset-0 z-20" onClick={() => setIsProfileOpen(false)} />
        )}
      </div>
    </>
  );
};

export default UserChat; 