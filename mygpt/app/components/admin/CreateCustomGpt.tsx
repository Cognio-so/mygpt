import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { IoAddOutline, IoPersonCircleOutline, IoInformationCircleOutline, IoSearchOutline, IoSparklesOutline, IoArrowBackOutline, IoGlobeOutline, IoDocumentTextOutline, IoTrashOutline, IoChevronDown } from 'react-icons/io5';
import { FaBox, FaUpload, FaTrash } from 'react-icons/fa';
import { LuBrain } from 'react-icons/lu';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { BiLogoMeta } from 'react-icons/bi';
import { FaRobot } from 'react-icons/fa6';
import { RiOpenaiFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Form } from '@remix-run/react';
import type { FileAttachment } from '~/lib/database.types';

// Define interfaces
interface FormData {
  name: string;
  description: string;
  instructions: string;
  conversationStarter: string;
  model: string;
  webBrowsing: boolean;
  imageUrl: string;
  folder: string;
}

interface PromptTemplate {
  name: string;
  description: string;
  content: string;
}

interface CodeComponentProps {
  inline?: boolean;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

interface CreateCustomGptProps {
  onGoBack: () => void;
  editGptId?: string | null;
  onGptCreated?: () => void;
  actionData?: {
    error?: string;
    details?: any;
  };
  isSubmitting?: boolean;
  initialData?: Partial<FormData> & { knowledgeFiles?: FileAttachment[] };
}

// Memoized component to prevent unnecessary re-renders
const CreateCustomGpt = memo(({
  onGoBack,
  editGptId = null,
  onGptCreated,
  actionData,
  isSubmitting = false,
  initialData,
}: CreateCustomGptProps) => {
  // Initialize form state
  const initialFormData = useRef({
    name: initialData?.name || '',
    description: initialData?.description || '',
    instructions: initialData?.instructions || '',
    conversationStarter: initialData?.conversationStarter || '',
    model: initialData?.model || 'openrouter/auto',
    webBrowsing: initialData?.webBrowsing || false,
    imageUrl: initialData?.imageUrl || '',
    folder: initialData?.folder || '',
  }).current;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.imageUrl || '');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingKnowledgeFiles, setExistingKnowledgeFiles] = useState<FileAttachment[]>(initialData?.knowledgeFiles || []);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevImagePreview = useRef<string>(initialData?.imageUrl || '');
  const [localIsSubmitting, setLocalIsSubmitting] = useState<boolean>(false);

  // Constants
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/json',
    'text/csv',
    'application/rtf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  const modelIcons = {
    'openrouter/auto': <TbRouter className="text-yellow-500 mr-2" size={18} />,
    'GPT-4o': <RiOpenaiFill className="text-green-500 mr-2" size={18} />,
    'GPT-4o-mini': <SiOpenai className="text-green-400 mr-2" size={16} />,
    'Gemini-flash-2.5': <SiGooglegemini className="text-blue-400 mr-2" size={16} />,
    'Gemini-pro-2.5': <SiGooglegemini className="text-blue-600 mr-2" size={16} />,
    'Claude 3.5 Haiku': <FaRobot className="text-purple-400 mr-2" size={16} />,
    'llama3-8b-8192': <BiLogoMeta className="text-blue-500 mr-2" size={18} />,
    'Llama 4 Scout': <BiLogoMeta className="text-blue-700 mr-2" size={18} />,
  };

  const promptTemplates: PromptTemplate[] = [
    {
      name: "Coding Expert",
      description: "Expert programmer template",
      content: "You are an expert programmer and software engineer. Help users with coding problems, debug issues, and provide best practices for various programming languages and frameworks.",
    },
    {
      name: "Creative Writer",
      description: "Creative writing assistant template",
      content: "You are a creative writing assistant. Help users craft compelling stories, develop characters, improve their writing style, and provide feedback on their creative work.",
    },
    {
      name: "Marketing Assistant",
      description: "Marketing assistant template",
      content: "You are a marketing expert. Help users create marketing strategies, write compelling copy, analyze market trends, and develop effective campaigns for their business.",
    },
  ];

  // Optimize input change handler
  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Optimize image selection with validation
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("📷 Frontend: No file selected");
      return;
    }

    console.log("📷 Frontend: Image selected:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Check if the selected file is the same as before
    if (selectedImage && selectedImage.name === file.name && selectedImage.size === file.size) {
      console.log("📷 Frontend: Same image selected, ignoring duplicate");
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, GIF, WebP).');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image file size must not exceed 10MB.');
      e.target.value = '';
      return;
    }

    // Revoke previous preview URL to prevent memory leaks
    if (prevImagePreview.current && prevImagePreview.current !== initialData?.imageUrl) {
      URL.revokeObjectURL(prevImagePreview.current);
    }
    
    setSelectedImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    prevImagePreview.current = previewUrl;
    
    console.log("📷 Frontend: Image state updated, preview URL created");
    
    // Clear the input value to ensure onChange fires again even if same file is selected
    e.target.value = '';
  }, [initialData?.imageUrl, selectedImage, MAX_IMAGE_SIZE]);

  // Optimize file selection with validation
  const handleFilesSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Create robust duplicate detection
    const existingFileNames = new Set();
    
    // Build a set of existing file names for quick lookup
    existingKnowledgeFiles.forEach(file => existingFileNames.add(file.name));
    selectedFiles.forEach(file => existingFileNames.add(file.name));
    
    // Keep track of previously processed files in this batch to prevent duplicates 
    // from the same selection
    const currentBatchNames = new Set();
    
    // Filter valid files
    const validFiles = files.filter(file => {
      // Size validation
      if (file.size > MAX_FILE_SIZE) {
        console.log(`File ${file.name} exceeds size limit`);
        return false;
      }
      
      // Type validation
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        console.log(`File ${file.name} has unsupported type`);
        return false;
      }
      
      // Duplicate check (both from existing files and current batch)
      if (existingFileNames.has(file.name) || currentBatchNames.has(file.name)) {
        console.log(`Skipping duplicate file: ${file.name}`);
        return false;
      }
      
      // Track this file name for the current batch
      currentBatchNames.add(file.name);
      return true;
    });

    // Add valid files to state
    if (validFiles.length) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
    
    // Clear input value to ensure onChange fires again even if same file is selected
    e.target.value = '';
  }, [selectedFiles, existingKnowledgeFiles, MAX_FILE_SIZE, ALLOWED_FILE_TYPES]);

  // Optimize file removal
  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Optimize existing file removal
  const handleRemoveExistingFile = useCallback(async (fileName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${fileName}"?`)) return;

    try {
      setExistingKnowledgeFiles(prev => prev.filter(file => file.name !== fileName));
    } catch (error) {
      console.error('Error removing file:', error);
      alert('Failed to remove file.');
    }
  }, []);

  // Optimize template selection
  const handleTemplateSelect = useCallback((template: PromptTemplate) => {
    handleInputChange('instructions', template.content);
    setShowTemplates(false);
  }, [handleInputChange]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors: string[] = [];
    if (!formData.name) errors.push("Name is required");
    if (!formData.description) errors.push("Description is required");
    if (!formData.instructions) errors.push("Instructions are required");
    if (formData.name.length > 255) errors.push("Name must be less than 255 characters");
    if (formData.description.length > 1000) errors.push("Description must be less than 1000 characters");

    const instructionsWarning = formData.instructions.length > 50000
      ? "Instructions are very long and will be truncated to 50,000 characters"
      : null;

    return { errors, instructionsWarning };
  }, [formData]);

  // Use either the prop or local state
  const currentlySubmitting = isSubmitting || localIsSubmitting;

  // When updating the submission state, check if we can modify locally
  const updateSubmittingState = useCallback((state: boolean) => {
    // If isSubmitting is passed as a prop, we might not be able to modify it
    // So we'll track it locally as well
    setLocalIsSubmitting(state);
  }, []);

  // Form submission with proper FormData handling
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setLocalIsSubmitting(true);
    
    const { errors, instructionsWarning } = validateForm();

    if (errors.length) {
      alert(`Please fix the following errors:\n\n${errors.join('\n')}`);
      setLocalIsSubmitting(false);
      return;
    }

    if (instructionsWarning) {
      alert(instructionsWarning);
    }

    const formData = new FormData(e.currentTarget);
    
    // IMPORTANT: Explicitly append the selected image
    if (selectedImage && selectedImage instanceof File) {
      console.log("📷 Frontend: Appending profile image to FormData:", {
        name: selectedImage.name,
        size: selectedImage.size,
        type: selectedImage.type
      });
      
      // Remove any existing profileImage entry and add the new one
      formData.delete('profileImage');
      formData.append('profileImage', selectedImage);
    } else {
      console.log("📷 Frontend: No profile image selected");
    }
    
    // Add existing knowledge files as JSON
    if (existingKnowledgeFiles.length > 0) {
      // Make sure each file has a string URL, not an object
      const sanitizedFiles = existingKnowledgeFiles.map(file => ({
        ...file,
        url: typeof file.url === 'string' ? file.url : ''
      }));
      
      formData.append('existingKnowledgeFiles', JSON.stringify(sanitizedFiles));
    }
    
    // Only append new files that aren't already in the existing knowledge base
    const existingFileNames = existingKnowledgeFiles.map(file => file.name);
    selectedFiles.forEach(file => {
      if (!existingFileNames.includes(file.name)) {
        formData.append('knowledgeFiles', file);
      }
    });

    // Debug: Log what's in the FormData
    console.log("📝 Frontend: FormData entries:");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}:`, {
          name: value.name,
          size: value.size,
          type: value.type
        });
      } else {
        console.log(`  ${key}:`, typeof value === 'string' && value.length > 100 ? 
          value.substring(0, 100) + '...' : value);
      }
    }

    try {
      const response = await fetch(e.currentTarget.action || window.location.pathname, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        onGptCreated?.();
        window.location.href = '/admin';
      } else {
        const data = await response.json() as { error?: string };
        alert(`Error: ${data.error || 'Unknown error'}`);
        setLocalIsSubmitting(false);
      }
    } catch (error) {
      console.error('Form submission failed:', error);
      alert(`Form submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLocalIsSubmitting(false);
    }
  }, [validateForm, selectedImage, selectedFiles, existingKnowledgeFiles, onGptCreated]);

  // Clean up object URLs only when necessary
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview !== initialData?.imageUrl) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, initialData?.imageUrl]);

  // Memoized System Prompt Section
  const SystemPromptSection = memo(() => (
    <div className="border border-gray-400 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-400 dark:border-gray-700">
        <div className="flex items-center mb-2">
          <LuBrain className="text-purple-500 dark:text-purple-400 mr-2" size={16} />
          <h3 className="text-base font-medium text-gray-800 dark:text-gray-100">Model Instructions</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Set instructions for how your GPT should behave and respond.
          <span className="ml-1 italic">Supports Markdown formatting.</span>
        </p>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">System Prompt</label>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => handleTemplateSelect(promptTemplates[0])}
              className="flex items-center text-xs text-white px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-700"
            >
              <IoSparklesOutline className="mr-1" size={14} />
              Generate
            </button>
            <button
              type="button"
              onClick={() => setShowTemplates(prev => !prev)}
              className="flex items-center text-xs text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <IoSearchOutline className="mr-1" size={14} />
              Templates
            </button>
          </div>
        </div>

        {showTemplates && (
          <div className="relative mb-3">
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
              <ul>
                {promptTemplates.map(template => (
                  <li key={template.name}>
                    <button
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{template.description}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex rounded-t-md overflow-hidden mb-0 bg-gray-300 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className={`flex-1 py-1.5 text-sm font-medium ${!isPreviewMode ? 'bg-purple-600 text-white' : 'bg-gray-400 dark:bg-gray-600 text-gray-900 dark:text-white'}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewMode(true)}
            className={`flex-1 py-1.5 text-sm font-medium ${isPreviewMode ? 'bg-purple-600 text-white' : 'bg-gray-400 dark:bg-gray-600 text-gray-900 dark:text-white'}`}
          >
            Preview
          </button>
        </div>

        <div className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 border-t-0 rounded-b-md px-3 py-2 text-sm text-gray-900 dark:text-white min-h-[200px] overflow-y-auto">
          {isPreviewMode ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-3 text-gray-900 dark:text-white">{children}</p>,
                h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3 text-gray-900 dark:text-white">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 text-gray-900 dark:text-white">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-medium mb-2 mt-2 text-gray-900 dark:text-white">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 text-gray-900 dark:text-white">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 text-gray-900 dark:text-white">{children}</ol>,
                li: ({ children }) => <li className="mb-1 text-gray-900 dark:text-white">{children}</li>,
                code: ({ inline, children, className }: CodeComponentProps) => inline ? (
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-900 dark:text-white font-mono text-sm">{children}</code>
                ) : (
                  <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-gray-900 dark:text-white font-mono text-sm overflow-x-auto">{children}</code>
                ),
                pre: ({ children }) => <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-3 overflow-x-auto">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-3 italic my-2">{children}</blockquote>,
                a: ({ children, href }) => <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline">{children}</a>,
              }}
            >
              {formData.instructions || "Enter instructions to see preview..."}
            </ReactMarkdown>
          ) : (
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={(e) => handleInputChange('instructions', e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none resize-none font-mono"
              placeholder="Enter detailed instructions for your AI agent..."
              style={{ minHeight: '200px' }}
              required
            />
          )}
        </div>

        {!isPreviewMode && (
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              { format: '**', label: 'B', title: 'Bold', placeholder: 'bold text', offset: 2 },
              { format: '*', label: 'I', title: 'Italic', placeholder: 'italic text', offset: 1 },
              { format: '## ', label: 'H', title: 'Heading', placeholder: 'Heading', offset: 3, prefix: '\n' },
              { format: '- ', label: '• List', title: 'List', placeholder: 'List item', offset: 2, prefix: '\n' },
              { format: '```\n', label: '</>', title: 'Code Block', placeholder: 'code block', offset: 4, suffix: '\n```', prefix: '\n' },
            ].map(({ format, label, title, placeholder, offset, prefix = '', suffix = '' }) => (
              <button
                key={title}
                type="button"
                onClick={() => {
                  const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selection = textarea.value.substring(start, end);
                    const newText = textarea.value.substring(0, start) + prefix + `${format}${selection || placeholder}${suffix || format}` + textarea.value.substring(end);
                    handleInputChange('instructions', newText);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.selectionStart = start + prefix.length + offset;
                      textarea.selectionEnd = start + prefix.length + (selection ? selection.length + offset : placeholder.length + offset);
                    }, 0);
                  }
                }}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                title={title}
              >
                {label === 'B' ? <strong>B</strong> : label === 'I' ? <em>I</em> : label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  ));

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 dark:bg-[#1A1A1A] text-gray-900 dark:text-white overflow-hidden">
      <Form
        ref={formRef}
        method="post"
        encType="multipart/form-data"
        className="flex flex-col md:flex-row flex-1 h-full"
        onSubmit={handleSubmit}
      >
        {/* Right Side - Preview */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full bg-gray-200 dark:bg-[#2A2A2A] flex flex-col">
          <div className="p-6 flex flex-col flex-1">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Preview</h2>
              <button type="button" className="flex items-center text-sm text-gray-600 dark:text-gray-300 px-3 py-1 rounded-md bg-gray-300 dark:bg-gray-800 hover:bg-gray-400 dark:hover:bg-gray-700">
                <IoInformationCircleOutline className="mr-1" size={14} />
                View Details
              </button>
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-black rounded-lg overflow-hidden relative">
              <div className="absolute top-4 right-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                  <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                    <IoPersonCircleOutline size={20} className="text-gray-800 dark:text-white" />
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col p-6 items-center justify-center">
                <div className="text-center mb-4">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                      {imagePreview ? (
                        <img src={imagePreview} alt="GPT" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <FaBox size={20} className="text-gray-500 dark:text-gray-600" />
                      )}
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formData.name || "Welcome to AI Agent"}
                  </h1>
                  <span className="text-base font-medium mt-2 block text-gray-600 dark:text-gray-300">
                    {formData.description || "How can I assist you today?"}
                  </span>
                </div>

                {formData.conversationStarter && (
                  <div className="w-full max-w-md mx-auto mt-4">
                    <div className="bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl border border-gray-300 dark:border-white/20 rounded-xl p-3 text-left">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{formData.conversationStarter}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-300 dark:border-gray-800">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-gray-100 dark:bg-[#1A1A1A] border border-gray-400 dark:border-gray-700 rounded-lg px-4 py-3 pr-10 text-gray-900 dark:text-white focus:outline-none text-sm placeholder-gray-500 dark:placeholder-gray-500"
                    placeholder="Ask anything"
                    disabled
                  />
                  <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-500">
                    <IoAddOutline size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Side - Configuration Panel */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full border-r border-gray-300 dark:border-gray-800 bg-white dark:bg-[#1A1A1A] overflow-y-auto">
          <div className="p-6">
            <div className="mb-6 flex items-center">
              <button
                type="button"
                onClick={onGoBack}
                className="mr-4 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Back to Dashboard"
              >
                <IoArrowBackOutline size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editGptId ? 'Edit Custom GPT' : 'Custom GPT Builder'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure your GPT on the left, test it on the right</p>
              </div>
            </div>

            {actionData?.error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{actionData.error}</p>
                {process.env.NODE_ENV !== 'production' && actionData.details && (
                  <pre className="mt-2 text-xs text-red-500 dark:text-red-400 overflow-auto">
                    {JSON.stringify(actionData.details, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <input type="hidden" name="intent" value={editGptId ? 'update' : 'create'} />
            {editGptId && <input type="hidden" name="gptId" value={editGptId} />}

            <div className="flex justify-center mb-8">
              <label className="relative cursor-pointer group" onClick={() => imageInputRef.current?.click()}>
                <div className={`w-24 h-24 rounded-full border-2 border-dashed ${imagePreview ? 'border-transparent' : 'border-gray-400 dark:border-gray-600'} flex items-center justify-center hover:opacity-90 relative overflow-hidden`}>
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Profile" className="w-full h-full object-cover rounded-full" />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <IoAddOutline size={24} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <IoAddOutline size={24} className="text-gray-500 dark:text-gray-500" />
                  )}
                </div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Max 10MB</span>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  name="profileImage"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="My Custom GPT"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Description *</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="A helpful assistant that can answer questions about various topics."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Model</label>
                <div className="relative">
                  <select
                    name="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                  >
                    <option value="openrouter/auto">🌟 Open-Engine ⭐preferred</option>
                    <option value="GPT-4o">GPT-4o</option>
                    <option value="GPT-4o-mini">GPT-4o-mini</option>
                    <option value="Gemini-flash-2.5">Gemini-flash-2.5</option>
                    <option value="Gemini-pro-2.5">Gemini-pro-2.5</option>
                    <option value="Claude-3.5-sonnet">Claude-3.5-sonnet</option>
                    <option value="Claude-3-haiku">Claude-3-haiku</option>
                    <option value="Llama-3.1-405b">Llama-3.1-405b</option>
                    <option value="Llama-3.3-70b">Llama-3.3-70b</option>
                  </select>
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <SiOpenai size={16} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <IoChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>

              <SystemPromptSection />

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Conversation Starter</label>
                <input
                  type="text"
                  name="conversationStarter"
                  value={formData.conversationStarter}
                  onChange={(e) => handleInputChange('conversationStarter', e.target.value)}
                  className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="How can I help you today?"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-700 rounded-md">
                <div className="flex items-center">
                  <IoGlobeOutline size={20} className="text-blue-500 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Web Browsing</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Enable web search capabilities</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="webBrowsing"
                    checked={formData.webBrowsing}
                    onChange={(e) => handleInputChange('webBrowsing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="border border-gray-400 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-400 dark:border-gray-700">
                  <div className="flex items-center mb-2">
                    <IoDocumentTextOutline className="text-green-500 dark:text-green-400 mr-2" size={16} />
                    <h3 className="text-base font-medium text-gray-800 dark:text-gray-100">Knowledge Base</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload documents that your GPT can reference during conversations.
                  </p>
                </div>

                <div className="p-4">
                  {editGptId && existingKnowledgeFiles.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Knowledge Files:</h4>
                      <div className="space-y-2">
                        {existingKnowledgeFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <span className="text-sm text-blue-700 dark:text-blue-300 truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingFile(file.name)}
                              className="text-red-500 hover:text-red-700 ml-2"
                              title="Remove file"
                            >
                              <IoTrashOutline size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-green-400 dark:hover:border-green-500 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="knowledgeFiles"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.md,.json,.csv,.rtf,.xls,.xlsx,.ppt,.pptx"
                      onChange={handleFilesSelect}
                      className="hidden"
                    />
                    <FaUpload className="mx-auto text-gray-400 dark:text-gray-500 mb-2" size={24} />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {editGptId ? 'Add more knowledge files' : 'Upload knowledge files'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      PDF, DOC, DOCX, TXT, MD, JSON, CSV, RTF, XLS, XLSX, PPT, PPTX (max 100MB each)
                    </p>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">New files to upload:</h4>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <IoTrashOutline size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={currentlySubmitting}
                  className="w-full bg-[#ffffff0d] backdrop-blur-md border border-[#ffffff1a] px-4 py-3 rounded-md font-medium hover:bg-[#ffffff1a] dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {currentlySubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editGptId ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    editGptId ? 'Update GPT' : 'Create GPT'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
});

CreateCustomGpt.displayName = 'CreateCustomGpt';

export default CreateCustomGpt;