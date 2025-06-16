import React, { useState, useRef, useEffect } from 'react';
import { IoSendSharp } from 'react-icons/io5';
import { HiMiniPaperClip } from 'react-icons/hi2';
import { BsGlobe2 } from 'react-icons/bs';

// Define ThemeContext type
interface ThemeContextType {
  isDarkMode: boolean;
}

// Define useTheme hook type
interface UseTheme {
  isDarkMode: boolean;
}

// Mock ThemeContext for type safety
const useTheme = (): UseTheme => {
  const context = React.useContext<ThemeContextType>(React.createContext<ThemeContextType>({ isDarkMode: false }));
  return context;
};

interface AdminMessageInputProps {
  onSubmit: (message: string) => void;
  onFileUpload?: (files: FileList) => void;
  isLoading: boolean;
  currentGptName: string;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (enabled: boolean) => void;
  showWebSearchIcon: boolean;
}

const AdminMessageInput: React.FC<AdminMessageInputProps> = ({
  onSubmit,
  onFileUpload,
  isLoading,
  currentGptName,
  webSearchEnabled,
  setWebSearchEnabled,
  showWebSearchIcon
}) => {
  const [inputMessage, setInputMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDarkMode } = useTheme();

  // More robust auto-resize textarea
  const resizeTextarea = (): void => {
    if (textareaRef.current) {
      // Temporarily reset height to get accurate scrollHeight
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Define min and max heights
      const minHeight = 40;
      const maxHeight = 160;
      // Calculate new height, clamped between min and max
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
      // Add overflow-y: auto if maxHeight is reached
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  };

  // Auto-resize when input changes
  useEffect(() => {
    resizeTextarea();
  }, [inputMessage]);

  // Also resize on window resize
  useEffect(() => {
    window.addEventListener('resize', resizeTextarea);
    return () => window.removeEventListener('resize', resizeTextarea);
  }, []);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    // Prevent submission if loading or input is empty
    if (isLoading || !inputMessage.trim()) return;
    onSubmit(inputMessage);
    setInputMessage('');
    // Reset height after submitting
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }, 0);
  };

  // Function to handle click on the paperclip icon
  const handleUploadClick = (): void => {
    fileInputRef.current?.click();
  };

  // Function to handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files);
      e.target.value = '';
    }
  };

  // Function to toggle web search
  const toggleWebSearch = (): void => {
    setWebSearchEnabled(!webSearchEnabled);
  };

  return (
    <div className="w-full p-2 sm:p-4 bg-white dark:bg-black">
      <form onSubmit={handleSubmit}>
        <div className="bg-gray-100 dark:bg-[#1e1e1e] rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 relative group">
          <div className="flex flex-col px-3 sm:px-4 py-2 sm:py-3">
            <textarea
              ref={textareaRef}
              className="w-full bg-transparent border-0 outline-none text-black dark:text-white resize-none overflow-hidden min-h-[40px] text-sm sm:text-base placeholder-gray-500 dark:placeholder-gray-400 custom-scrollbar-dark dark:custom-scrollbar"
              placeholder="Ask anything..."
              value={inputMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputMessage(e.target.value)}
              rows={1}
              disabled={isLoading}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              style={{ height: '40px' }}
            />

            <div className="flex justify-between items-center mt-1.5 sm:mt-2">
              <div className="flex items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  multiple
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={handleUploadClick}
                  className={`text-gray-400 dark:text-gray-500 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                  aria-label="Attach file"
                  disabled={isLoading}
                >
                  <HiMiniPaperClip size={18} className="sm:text-[20px]" />
                </button>

                {showWebSearchIcon && (
                  <button
                    type="button"
                    onClick={toggleWebSearch}
                    className={`ml-1 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-colors ${
                      webSearchEnabled 
                        ? 'text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' 
                        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                    } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                    aria-label={webSearchEnabled ? "Disable web search" : "Enable web search"}
                    disabled={isLoading}
                  >
                    <BsGlobe2 size={16} className="sm:text-[18px]" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className={`rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-all duration-200 ${!inputMessage.trim() || isLoading
                  ? 'bg-white dark:bg-black text-black dark:text-white cursor-not-allowed'
                  : 'bg-white hover:bg-white/70 text-black'
                }`}
                disabled={!inputMessage.trim() || isLoading}
                aria-label="Send message"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <IoSendSharp size={16} className="sm:text-[18px] translate-x-[1px]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminMessageInput;