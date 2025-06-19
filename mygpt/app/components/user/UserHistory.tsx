import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { FiSearch, FiMessageSquare, FiClock, FiCalendar, FiTrash2, FiXCircle, FiExternalLink, FiArrowRight } from 'react-icons/fi';
import { IoEllipse, IoPersonCircleOutline, IoSparkles, IoClose } from 'react-icons/io5';
import { useNavigate, useLoaderData, useActionData } from '@remix-run/react';
import { useFetcher } from '@remix-run/react';
import { useTheme } from '~/context/themeContext';         
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';

// Define interfaces
interface ConversationData {
  id: string;
  gptId: string;
  gptName: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  model: string;
  summary?: string;
  messages: any[];
}

interface UserData {
  _id: string;
  email: string;
  name: string;
}

interface LoaderData {
  user: UserData;
  conversations: ConversationData[];
  theme: 'light' | 'dark';
  error?: string;
}

interface ActionData {
  success: boolean;
  error?: string;
}

// Memoized Conversation Item Component
const ConversationItem = memo(({ conv, formatTimestamp, onDelete, isDarkMode, navigate }: {
  conv: ConversationData;
  formatTimestamp: (timestamp: string) => string;
  onDelete: (conv: ConversationData, e: React.MouseEvent) => void;
  isDarkMode: boolean;
  navigate: (path: string, options?: any) => void;
}) => (
    <div
        className={`p-4 rounded-lg border mb-3 cursor-pointer transition-all group ${isDarkMode
                ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/70 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
        onClick={() => navigate(`/user/chat/${conv.gptId}?loadHistory=true&conversationId=${conv.id}`, {
            state: { fromHistory: true }
        })}
    >
        <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold truncate mr-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{conv.gptName}</h3>
            <span className={`text-xs flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatTimestamp(conv.timestamp)}
            </span>
        </div>
        <p className={`text-sm line-clamp-2 mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Last:</span> {conv.lastMessage}
        </p>
        <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <FiMessageSquare size={13} /> {conv.messageCount} msgs
                </span>
                <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                    {conv.model}
                </span>
            </div>
            <button
                onClick={(e) => onDelete(conv, e)}
                className={`p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${isDarkMode
                        ? 'text-red-400 hover:bg-red-900/30'
                        : 'text-red-500 hover:bg-red-100'
                    }`}
                title="Delete conversation"
            >
                <FiTrash2 size={16} />
            </button>
        </div>
        <FiExternalLink className={`absolute top-3 right-3 opacity-0 group-hover:opacity-50 transition-opacity ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={14} />
    </div>
));

// New component to display a single message
const MessageItem = memo(({ 
    message, 
    isDarkMode, 
    userProfilePic = '', 
    gptImageUrl = '' 
}: { 
    message: any; 
    isDarkMode: boolean; 
    userProfilePic?: string; 
    gptImageUrl?: string; 
}) => (
    <div className={`flex items-start mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        {message.role === 'assistant' && (
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                {gptImageUrl ? (
                    <img src={gptImageUrl} alt="GPT" className="w-full h-full rounded-full object-cover" />
                ) : (
                    <IoSparkles size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                )}
            </div>
        )}
        <div
            className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user'
                    ? (isDarkMode ? 'bg-blue-600 text-white ml-2' : 'bg-blue-500 text-white ml-2')
                    : (isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-800')
                }`}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    a: ({ ...props }) => <a className="text-blue-400 hover:underline" {...props} />,
                    code: ({ node, inline, className, children, ...props }: any) => {
                        return inline ? (
                            <code className={`px-1 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} ${className || ''}`} {...props}>
                                {children}
                            </code>
                        ) : (
                            <pre className={`p-2 rounded overflow-x-auto my-2 text-sm ${isDarkMode ? 'bg-black/30' : 'bg-gray-100'} ${className || ''}`} {...props}>
                                <code>{children}</code>
                            </pre>
                        );
                    }
                }}
            >
                {message.content || ''}
            </ReactMarkdown>
        </div>
        {message.role === 'user' && (
            <div className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border ml-2 ${isDarkMode ? 'border-white/20 bg-gray-700' : 'border-gray-300 bg-gray-300'}`}>
                {userProfilePic ? (
                    <img src={userProfilePic} alt="You" className="w-full h-full object-cover" />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center`}>
                        <IoPersonCircleOutline size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                    </div>
                )}
            </div>
        )}
    </div>
));

const UserHistoryPage: React.FC = () => {
    const loaderData = useLoaderData<LoaderData>();
    const actionData = useActionData<ActionData>();
    
    // Add safety checks for loaderData
    const { 
        user, 
        conversations: initialConversations = [], 
        theme: initialTheme = 'light', 
        error: initialError 
    } = loaderData || {};

    const [conversations, setConversations] = useState<ConversationData[]>(initialConversations);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError || null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPeriod, setFilterPeriod] = useState('all');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
    const [conversationMessages, setConversationMessages] = useState([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { theme = initialTheme, setTheme } = useTheme(); 
    const fetcher = useFetcher();

    // Scroll to bottom when viewing conversation
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [conversationMessages]);

    // Handle action response (delete conversation)
    useEffect(() => {
        if (actionData?.success && selectedConversation) {
            setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
            setShowDeleteConfirm(false);
            setSelectedConversation(null);
        }
    }, [actionData, selectedConversation]);

    // Handle theme toggle
    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'; 
        setTheme(newTheme);
        
        // Update theme via fetcher
        fetcher.submit(
            { theme: newTheme, intent: 'updateTheme' },
            { method: 'POST', action: '/api/theme' }
        );
    }, [theme, setTheme, fetcher]);

    const filteredConversations = useMemo(() => {
        let filtered = [...conversations];

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(conv =>
                conv.gptName.toLowerCase().includes(lowerSearchTerm) ||
                conv.lastMessage.toLowerCase().includes(lowerSearchTerm) ||
                (conv.summary && conv.summary.toLowerCase().includes(lowerSearchTerm))
            );
        }

        if (filterPeriod !== 'all') {
            const now = new Date();
            let cutoffDate;
            switch (filterPeriod) {
                case 'today': cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
                case 'week': {
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    cutoffDate = new Date(startOfToday.setDate(startOfToday.getDate() - 7));
                    break;
                }
                case 'month': {
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    cutoffDate = new Date(startOfToday.setMonth(startOfToday.getMonth() - 1));
                    break;
                }
                default: cutoffDate = null;
            }
            if (cutoffDate) {
                filtered = filtered.filter(conv => new Date(conv.timestamp) >= cutoffDate);
            }
        }

        return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [conversations, searchTerm, filterPeriod]);

    const formatTimestamp = useCallback((timestamp: string) => {
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Invalid Date';
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting timestamp:", timestamp, e);
            return 'Unknown Date';
        }
    }, []);

    const confirmDeleteConversation = useCallback((conv: ConversationData, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedConversation(conv);
        setShowDeleteConfirm(true);
    }, []);

    const handleDeleteConversation = useCallback(async () => {
        if (!selectedConversation || !user?._id) return;

        // Use fetcher to delete conversation
        fetcher.submit(
            { 
                intent: 'deleteConversation',
                conversationId: selectedConversation.id,
                userId: user._id
            },
            { method: 'POST' }
        );
    }, [selectedConversation, user, fetcher]);

    const cancelDelete = useCallback(() => {
        setShowDeleteConfirm(false);
        setSelectedConversation(null);
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value), []);
    const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setFilterPeriod(e.target.value), []);

    if (!user?._id) {
        return (
            <div className={`flex flex-col items-center justify-center h-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
                }`}>
                <p className="text-lg mb-4">Please log in to view your conversation history</p>
                <button
                    onClick={() => navigate('/login')}
                    className={`px-4 py-2 rounded-lg transition-colors text-white ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                >
                    Log In
                </button>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full p-4 sm:p-6 overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
            }`}>
            <div className="mb-5 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                    <h1 className="text-xl sm:text-2xl font-bold">Conversation History</h1>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        View and continue your previous conversations
                    </p>
                </div>
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-full transition-colors self-center sm:self-auto mt-3 sm:mt-0 ${
                        theme === 'dark' ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {theme === 'dark' ? (
                        <svg 
                            viewBox="0 0 24 24" 
                            fill="currentColor" 
                            className="w-5 h-5"
                        >
                            <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 21.75a.75.75 0 0 1-.75-.75v-2.25a.75.75 0 0 1 1.5 0V21a.75.75 0 0 1-.75.75ZM5.106 17.834a.75.75 0 0 0 1.06 1.06l1.591-1.59a.75.75 0 1 0-1.06-1.061l-1.591 1.59ZM2.25 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75ZM6.166 5.106a.75.75 0 0 0-1.06 1.06l1.59 1.591a.75.75 0 0 0 1.061-1.06l-1.59-1.591Z" />
                        </svg>
                    ) : (
                        <svg 
                            viewBox="0 0 24 24" 
                            fill="currentColor" 
                            className="w-5 h-5"
                        >
                            <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z" />
                        </svg>
                    )}
                </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 flex-shrink-0">
                <div className="relative w-full sm:w-auto sm:flex-1 max-w-lg">
                    <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
                    <input
                        type="text"
                        placeholder="Search conversations (name, message, summary)..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm sm:text-base ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                    />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    <FiCalendar className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} size={16} />
                    <select
                        value={filterPeriod}
                        onChange={handleFilterChange}
                        className={`border rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm appearance-none pr-8 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
                {loading ? (
                    <div className="space-y-3 animate-pulse">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`h-4 rounded w-1/3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                    <div className={`h-3 rounded w-1/4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                </div>
                                <div className={`h-3 rounded w-full mb-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-3 rounded w-16 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                        <div className={`h-4 px-4 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                                    </div>
                                    <div className={`h-6 w-6 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className={`flex flex-col items-center justify-center h-full text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                        <FiXCircle size={40} className="mb-4 opacity-70" />
                        <p className="text-lg mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className={`px-4 py-2 rounded-lg transition-colors text-white ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center h-full text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <FiClock size={40} className={`mb-4 opacity-50 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                        <p className="text-lg mb-2">
                            {searchTerm || filterPeriod !== 'all' ? `No conversations matching criteria` : "No conversation history yet"}
                        </p>
                        <p className="text-sm max-w-md">
                            {searchTerm || filterPeriod !== 'all'
                                ? "Try adjusting your search or time filter."
                                : "Start chatting with GPTs to build your history."}
                        </p>

                        {!searchTerm && filterPeriod === 'all' && (
                            <button
                                onClick={() => navigate('/user')}
                                className={`mt-6 px-4 py-2 rounded-lg transition-colors text-white ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                                    }`}
                            >
                                Browse Collections
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredConversations.map((conv) => (
                            <ConversationItem
                                key={conv.id}
                                conv={conv}
                                formatTimestamp={formatTimestamp}
                                onDelete={confirmDeleteConversation}
                                isDarkMode={theme === 'dark'}
                                navigate={navigate}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedConversation && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className={`p-6 rounded-lg shadow-xl w-full max-w-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Delete Conversation?</h3>
                        <p className={`text-sm mb-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            Are you sure you want to delete the conversation with "{selectedConversation.gptName}"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={cancelDelete}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark'
                                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConversation}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 hover:bg-red-700 text-white`}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserHistoryPage; 