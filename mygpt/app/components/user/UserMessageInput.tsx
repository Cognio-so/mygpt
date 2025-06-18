import React, { useState, useRef, useCallback } from 'react';
import { IoSend, IoAttach, IoClose, IoGlobeOutline } from 'react-icons/io5';

interface FileObject {
  name: string;
  size?: number;
  type?: string;
}

interface UserMessageInputProps {
  onSubmit: (message: string, files?: FileObject[]) => void;
  onFileUpload?: (files: FileObject[]) => void;
  isLoading?: boolean;
  currentGptName?: string;
  webSearchEnabled?: boolean;
  setWebSearchEnabled?: (enabled: boolean) => void;
  showWebSearchIcon?: boolean;
}

const UserMessageInput: React.FC<UserMessageInputProps> = ({
  onSubmit,
  onFileUpload,
  isLoading = false,
  currentGptName,
  webSearchEnabled,
  setWebSearchEnabled,
  showWebSearchIcon = false
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileObject[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
      textarea.style.height = `${scrollHeight}px`;
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!message.trim() && files.length === 0) return;
    if (isLoading) return;

    onSubmit(message, files);
    setMessage('');
    setFiles([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));

    setFiles(prev => [...prev, ...fileArray]);
    if (onFileUpload) {
      onFileUpload(fileArray);
    }
  };

  const handleFileRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'txt': return '📄';
      case 'md': return '📝';
      default: return '📎';
    }
  };

  return (
    <div className="bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 p-4">
      {/* File attachments */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center py-1 px-2 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 max-w-fit"
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
              <button
                onClick={() => handleFileRemove(index)}
                className="ml-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Remove file"
              >
                <IoClose size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`relative rounded-lg border transition-colors ${
          isDragOver 
            ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-end p-3 gap-3">
          {/* Web Search Toggle */}
          {showWebSearchIcon && (
            <button
              onClick={() => setWebSearchEnabled?.(!webSearchEnabled)}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                webSearchEnabled
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title={webSearchEnabled ? 'Web search enabled' : 'Enable web search'}
            >
              <IoGlobeOutline size={18} />
            </button>
          )}

          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Attach files"
          >
            <IoAttach size={18} />
          </button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${currentGptName || 'GPT'}...`}
              className="w-full px-3 py-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-none outline-none resize-none min-h-[20px] max-h-[200px]"
              style={{ height: 'auto' }}
              disabled={isLoading}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={(!message.trim() && files.length === 0) || isLoading}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              (!message.trim() && files.length === 0) || isLoading
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
            }`}
            title="Send message"
          >
            <IoSend size={18} />
          </button>
        </div>

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <IoAttach size={24} className="text-blue-500 dark:text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Drop files here</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        accept=".pdf,.doc,.docx,.txt,.md,.csv,.json"
      />
    </div>
  );
};

export default UserMessageInput;
