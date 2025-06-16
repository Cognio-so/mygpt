import { useState, useRef, useEffect } from 'react';
import { IoAddOutline, IoCloseOutline, IoPersonCircleOutline, IoInformationCircleOutline, IoSearchOutline, IoSparklesOutline, IoArrowBackOutline, IoGlobeOutline, IoDocumentTextOutline, IoTrashOutline, IoChevronDown } from 'react-icons/io5';
import { FaBox, FaUpload, FaGlobe, FaChevronDown, FaTrash } from 'react-icons/fa';
import { LuBrain } from 'react-icons/lu';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { BiLogoMeta } from 'react-icons/bi';
import { FaRobot } from 'react-icons/fa6';
import { RiOpenaiFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Form } from '@remix-run/react';

interface CreateCustomGptProps {
  onGoBack: () => void;
  editGptId?: string | null;
  onGptCreated?: () => void;
  actionData?: {
    error?: string;
    details?: any;
  };
  isSubmitting?: boolean;
  initialData?: any;
}

interface KnowledgeFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
}

// Fix the CodeProps interface to be compatible with react-markdown
interface CodeComponentProps {
  inline?: boolean;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

const CreateCustomGpt = ({
  onGoBack,
  editGptId = null,
  onGptCreated,
  actionData,
  isSubmitting = false,
  initialData
}: CreateCustomGptProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    instructions: initialData?.instructions || '',
    conversationStarter: initialData?.conversationStarter || '',
    model: initialData?.model || 'openrouter/auto',
    webBrowsing: initialData?.webBrowsing || false,
    imageUrl: initialData?.imageUrl || '',
    folder: initialData?.folder || '',
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.imageUrl || '');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingKnowledgeFiles, setExistingKnowledgeFiles] = useState<KnowledgeFile[]>(initialData?.knowledgeFiles || []);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  
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

  const promptTemplates = [
    {
      name: "Coding Expert",
      description: "Expert programmer template",
      content: "You are an expert programmer and software engineer. Help users with coding problems, debug issues, and provide best practices for various programming languages and frameworks."
    },
    {
      name: "Creative Writer",
      description: "Creative writing assistant template",
      content: "You are a creative writing assistant. Help users craft compelling stories, develop characters, improve their writing style, and provide feedback on their creative work."
    },
    {
      name: "Marketing Assistant",
      description: "Marketing assistant template",
      content: "You are a marketing expert. Help users create marketing strategies, write compelling copy, analyze market trends, and develop effective campaigns for their business."
    },
  ];

  // Add file upload states
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  // Handle profile image selection with validation
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (JPG, PNG, GIF, WebP).');
        e.target.value = '';
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image file size must not exceed 10MB. Please choose a smaller image.');
        e.target.value = '';
        return;
      }
      
      setSelectedImage(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      console.log("Image selected:", file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
  };

  // Handle knowledge files selection with validation
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validFiles: File[] = [];
      const errors: string[] = [];
      
      // Allowed file types for knowledge base
      const allowedTypes = [
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
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      
      filesArray.forEach(file => {
        // Check file size (100MB limit per file)
        if (file.size > 100 * 1024 * 1024) {
          errors.push(`${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is 100MB.`);
          return;
        }
        
        // Check file type
        if (!allowedTypes.includes(file.type)) {
          errors.push(`${file.name} has an unsupported file type. Please upload PDF, DOC, DOCX, TXT, MD, JSON, CSV, RTF, XLS, XLSX, PPT, or PPTX files.`);
          return;
        }
        
        validFiles.push(file);
      });
      
      if (errors.length > 0) {
        alert('Some files could not be added:\n\n' + errors.join('\n'));
      }
      
      if (validFiles.length > 0) {
        setSelectedFiles((prev: File[]) => [...prev, ...validFiles]);
        console.log(`Added ${validFiles.length} valid knowledge files`);
      }
      
      // Reset the input
      e.target.value = '';
    }
  };

  // Remove a knowledge file
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev: File[]) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateSelect = (template: typeof promptTemplates[0]) => {
    handleInputChange('instructions', template.content);
    setShowTemplates(false);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // No need to prevent default as we want the regular form submission to work
    // The route's action function will handle everything
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview && !initialData?.imageUrl) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, initialData]);

  // Add function to remove existing knowledge files
  const handleRemoveExistingFile = async (fileId: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to remove "${fileName}"?`)) {
      try {
        // Here you would typically make an API call to delete the file
        // For now, just remove from the local state
        setExistingKnowledgeFiles((prev: KnowledgeFile[]) => prev.filter(file => file.id !== fileId));
      } catch (error) {
        console.error('Error removing file:', error);
        alert('Failed to remove file. Please try again.');
      }
    }
  };

  const renderSystemPromptSection = () => (
    <div className="border border-gray-400 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-3 md:p-4 border-b border-gray-400 dark:border-gray-700">
            <div className="flex items-center mb-1 md:mb-2">
                <LuBrain className="text-purple-500 dark:text-purple-400 mr-2" size={16} />
                <h3 className="text-sm md:text-base font-medium text-gray-800 dark:text-gray-100">Model Instructions</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Set instructions for how your GPT should behave and respond.
                <span className="ml-1 italic">Supports Markdown formatting.</span>
            </p>
        </div>

        <div className="p-3 md:p-4">
            <div className="flex justify-between items-center mb-2 md:mb-3">
                <label className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300">System Prompt</label>
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
              onClick={() => setShowTemplates(!showTemplates)}
                        className="flex items-center text-xs text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        <IoSearchOutline className="mr-1" size={14} />
                        Templates
                    </button>
                </div>
            </div>

        {/* Template Dropdown */}
        {showTemplates && (
                <div className="relative mb-2 md:mb-3">
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto no-scrollbar">
                        <ul>
                {promptTemplates.map((template) => (
                  <li key={template.name}>
                                    <button
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                                        className="w-full text-left px-3 py-2 text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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

            {/* Edit/Preview Toggle */}
            <div className="flex rounded-t-md overflow-hidden mb-0 bg-gray-300 dark:bg-gray-800">
                <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className={`flex-1 py-1.5 text-xs md:text-sm font-medium ${
              !isPreviewMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-400 dark:bg-gray-600 text-gray-900 dark:text-white'
            }`}
                >
                    Edit
                </button>
                <button
            type="button"
            onClick={() => setIsPreviewMode(true)}
            className={`flex-1 py-1.5 text-xs md:text-sm font-medium ${
              isPreviewMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-400 dark:bg-gray-600 text-gray-900 dark:text-white'
            }`}
                >
                    Preview
                </button>
            </div>

        {/* Instructions Input/Preview */}
                <div className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 border-t-0 rounded-b-md px-3 py-2 text-xs md:text-sm text-gray-900 dark:text-white min-h-[120px] md:min-h-[200px] overflow-y-auto no-scrollbar">
          {isPreviewMode ? (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                p: (props) => <p className="mb-3 text-gray-900 dark:text-white" {...props} />,
                h1: (props) => <h1 className="text-xl font-bold mb-2 mt-3 text-gray-900 dark:text-white" {...props} />,
                h2: (props) => <h2 className="text-lg font-semibold mb-2 mt-3 text-gray-900 dark:text-white" {...props} />,
                h3: (props) => <h3 className="text-base font-medium mb-2 mt-2 text-gray-900 dark:text-white" {...props} />,
                ul: (props) => <ul className="list-disc pl-5 mb-3 text-gray-900 dark:text-white" {...props} />,
                ol: (props) => <ol className="list-decimal pl-5 mb-3 text-gray-900 dark:text-white" {...props} />,
                li: (props) => <li className="mb-1 text-gray-900 dark:text-white" {...props} />,
                code: ({ inline, children, ...props }: CodeComponentProps) =>
                  inline ? (
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-900 dark:text-white font-mono text-sm" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-gray-900 dark:text-white font-mono text-sm overflow-x-auto" {...props}>
                      {children}
                    </code>
                  ),
                pre: (props) => <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-3 overflow-x-auto" {...props} />,
                blockquote: (props) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-3 italic my-2" {...props} />,
                a: (props) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
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

        {/* Markdown Helper Buttons */}
        {!isPreviewMode && (
          <div className="mt-2 flex flex-wrap gap-1">
            <button 
              type="button" 
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `**${selection || 'bold text'}**` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 2;
                    textarea.selectionEnd = start + (selection ? selection.length + 2 : 9);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button 
              type="button"
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `*${selection || 'italic text'}*` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 1;
                    textarea.selectionEnd = start + (selection ? selection.length + 1 : 11);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="Italic"
            >
              <em>I</em>
            </button>
            <button 
              type="button"
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `\n## ${selection || 'Heading'}\n` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 4;
                    textarea.selectionEnd = start + (selection ? selection.length + 4 : 11);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="Heading"
            >
              H
            </button>
            <button 
              type="button"
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `\n- ${selection || 'List item'}\n` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 3;
                    textarea.selectionEnd = start + (selection ? selection.length + 3 : 12);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="List"
            >
              • List
            </button>
            <button 
              type="button"
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `\n\`\`\`\n${selection || 'code block'}\n\`\`\`\n` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 4;
                    textarea.selectionEnd = start + (selection ? selection.length + 4 : 14);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="Code Block"
            >
              {'</>'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Add validation checks before form submission
  const validateForm = () => {
    const errors = [];
    
    // Check required fields
    if (!formData.name) errors.push("Name is required");
    if (!formData.description) errors.push("Description is required");
    if (!formData.instructions) errors.push("Instructions are required");
    
    // Check field sizes
    if (formData.name.length > 255) errors.push("Name must be less than 255 characters");
    if (formData.description.length > 1000) errors.push("Description must be less than 1000 characters");
    
    // Instructions warning rather than error
    let instructionsWarning = null;
    if (formData.instructions.length > 50000) {
      instructionsWarning = "Instructions are very long and will be truncated to 50,000 characters";
    }
    
    return { errors, instructionsWarning };
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 dark:bg-[#1A1A1A] text-gray-900 dark:text-white overflow-hidden">
      <form 
        ref={formRef} 
        method="post" 
        encType="multipart/form-data" 
        className="flex flex-col md:flex-row flex-1 h-full"
      >
        {/* RIGHT SIDE - Preview */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full bg-gray-200 dark:bg-[#2A2A2A] flex flex-col">
          <div className="p-4 md:p-6 flex flex-col flex-1">
            <div className="mb-3 md:mb-4 flex justify-between items-center">
              <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">Preview</h2>
              <button type="button" className="flex items-center text-xs md:text-sm text-gray-600 dark:text-gray-300 px-2 md:px-3 py-1 rounded-md bg-gray-300 dark:bg-gray-800 hover:bg-gray-400 dark:hover:bg-gray-700">
                <IoInformationCircleOutline className="mr-1" size={14} />
                View Details
              </button>
            </div>

            {/* UserDashboard Preview */}
            <div className="flex-1 flex flex-col bg-white dark:bg-black rounded-lg overflow-hidden relative">
              {/* Mock Header with Profile Icon */}
              <div className="absolute top-2 md:top-4 right-2 md:right-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white/20 dark:border-white/20">
                  <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                    <IoPersonCircleOutline size={20} className="text-gray-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 flex flex-col p-4 md:p-6 items-center justify-center">
                <div className="text-center mb-2 md:mb-4">
                  <div className="flex justify-center mb-2 md:mb-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                      {imagePreview ? (
                        <img src={imagePreview} alt="GPT" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <FaBox size={20} className="text-gray-500 dark:text-gray-600" />
                      )}
                    </div>
                  </div>
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                    {formData.name || "Welcome to AI Agent"}
                  </h1>
                  <span className="text-sm md:text-base font-medium mt-1 md:mt-2 block text-gray-600 dark:text-gray-300">
                    {formData.description || "How can I assist you today?"}
                  </span>
                </div>

                {/* Conversation Starter */}
                {formData.conversationStarter && (
                  <div className="w-full max-w-xs md:max-w-md mx-auto mt-2 md:mt-4">
                    <div className="bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl border border-gray-300 dark:border-white/20 shadow-[0_0_15px_rgba(204,43,94,0.2)] rounded-xl p-2 md:p-3 text-left">
                      <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{formData.conversationStarter}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 md:p-4 border-t border-gray-300 dark:border-gray-800">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-gray-100 dark:bg-[#1A1A1A] border border-gray-400 dark:border-gray-700 rounded-lg px-3 md:px-4 py-2 md:py-3 pr-8 md:pr-10 text-gray-900 dark:text-white focus:outline-none text-sm placeholder-gray-500 dark:placeholder-gray-500"
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
        {/* LEFT SIDE - Configuration Panel */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full border-r border-gray-300 dark:border-gray-800 bg-white dark:bg-[#1A1A1A] overflow-y-auto">
          <div className="p-4 md:p-6">
            <div className="mb-4 md:mb-6 flex items-center">
              <button
                type="button"
                onClick={onGoBack}
                className="mr-3 md:mr-4 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Back to Dashboard"
              >
                <IoArrowBackOutline size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {editGptId ? 'Edit Custom GPT' : 'Custom GPT Builder'}
                </h1>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Configure your GPT on the left, test it on the right</p>
              </div>
            </div>

            {/* Error/Success Messages */}
            {actionData?.error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{actionData.error}</p>
                
                {/* Show technical details in development */}
                {process.env.NODE_ENV !== 'production' && actionData.details && (
                  <pre className="mt-2 text-xs text-red-500 dark:text-red-400 overflow-auto">
                    {JSON.stringify(actionData.details, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Add intent field */}
            <input type="hidden" name="intent" value={editGptId ? 'update' : 'create'} />
            {editGptId && <input type="hidden" name="gptId" value={editGptId} />}

            {/* Image Upload */}
            <div className="flex justify-center mb-5 md:mb-8">
              <label
                className="relative cursor-pointer group"
                onClick={() => imageInputRef.current?.click()}
              >
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-dashed ${imagePreview ? 'border-transparent' : 'border-gray-400 dark:border-gray-600'} flex items-center justify-center hover:opacity-90 relative overflow-hidden`}>
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

            {/* Basic Configuration Section */}
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Name *</label>
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

              {/* Description Field */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Description *</label>
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

              {/* Model Selection */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Model</label>
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

              {/* System Prompt Section */}
              {renderSystemPromptSection()}

              {/* Conversation Starter */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Conversation Starter</label>
                <input
                  type="text"
                  name="conversationStarter"
                  value={formData.conversationStarter}
                  onChange={(e) => handleInputChange('conversationStarter', e.target.value)}
                  className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="How can I help you today?"
                />
              </div>

              {/* Web Browsing */}
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

              {/* Knowledge Files Section - Updated */}
              <div className="border border-gray-400 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="p-3 md:p-4 border-b border-gray-400 dark:border-gray-700">
                  <div className="flex items-center mb-1 md:mb-2">
                    <IoDocumentTextOutline className="text-green-500 dark:text-green-400 mr-2" size={16} />
                    <h3 className="text-sm md:text-base font-medium text-gray-800 dark:text-gray-100">Knowledge Base</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload documents that your GPT can reference during conversations.
                  </p>
                </div>

                <div className="p-3 md:p-4">
                  {/* Existing Knowledge Files Display */}
                  {editGptId && existingKnowledgeFiles.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Knowledge Files:</h4>
                      <div className="space-y-2">
                        {existingKnowledgeFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <span className="text-sm text-blue-700 dark:text-blue-300 truncate">{file.file_name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingFile(file.id, file.file_name)}
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

                  {/* File Upload Input */}
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

                  {/* New Files to Upload */}
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

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#ffffff0d] backdrop-blur-md border border-[#ffffff1a] px-4 py-3 rounded-md font-medium hover:bg-[#ffffff1a] dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (editGptId ? 'Updating...' : 'Creating...') : (editGptId ? 'Update GPT' : 'Create GPT')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateCustomGpt;