import React, { useState, useEffect, useRef } from 'react';
import {
  IoPersonOutline,
  IoPeopleOutline,
  IoTimeOutline,
  IoSearchOutline,
  IoFilterOutline,
  IoChevronDown,
  IoEllipse,
  IoArrowBack,
  IoChatbubblesOutline,
  IoSunnyOutline,
  IoMoonOutline
} from 'react-icons/io5';
import { useNavigate, useLocation, useLoaderData, useFetcher } from '@remix-run/react';
import { useTheme } from '~/context/themeContext';
import { getSupabaseClient } from '~/lib/supabase.client';
import type { Database } from '~/lib/database.types';

// Type definitions
type Profile = Database['public']['Tables']['profiles']['Row'];
type ChatSession = {
  id: string;
  user_id: string;
  gpt_id: string;
  model?: string;
  created_at: string;
  updated_at?: string;
};

type ChatMessage = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

type CustomGpt = Database['public']['Tables']['custom_gpts']['Row'];

interface ChatSessionWithDetails extends ChatSession {
  custom_gpts?: CustomGpt | null;
  chat_messages?: ChatMessage[];
  profiles?: Profile | null;
}

interface ActivityUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface ActivityItem {
  id: string;
  user: ActivityUser;
  action: string;
  details: string;
  timestamp: string;
  type: 'chat' | 'user_summary';
  conversation?: {
    _id: string;
    gptId: string;
    gptName?: string;
    messages?: ChatMessage[];
    lastMessage?: string;
    messageCount: number;
  };
  totalUserConversations?: number;
  isSecondaryUserConvo?: boolean;
}

interface FilterOptions {
  actionTypes: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    settings: boolean;
    chat: boolean;
  };
  dateRange: 'all' | 'today' | 'week' | 'month';
}

interface LoaderData {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      name?: string;
      full_name?: string;
    };
    role?: string;
  };
}

const AdminHistory: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const fetcher = useFetcher();
  const loaderData = useLoaderData<LoaderData>();
  
  // Initialize view type from URL parameter or default to 'personal'
  const queryParams = new URLSearchParams(location.search);
  const initialView = queryParams.get('view') || 'personal';

  const [viewType, setViewType] = useState<'personal' | 'team'>(initialView as 'personal' | 'team');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    actionTypes: {
      create: true,
      edit: true,
      delete: true,
      settings: true,
      chat: true,
    },
    dateRange: 'all',
  });

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Get current user from loader data
  const user = loaderData?.user;

  // Fetch real chat history data
  useEffect(() => {
    const fetchActivityData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          console.error('Supabase client not available');
          setIsLoading(false);
          return;
        }

        // For personal view - fetch user's own chat history
        if (viewType === 'personal') {
          try {
            // First, fetch chat sessions
            const { data: chatSessions, error: chatSessionsError } = await supabase
              .from('chat_sessions')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (chatSessionsError) {
              console.error('Error fetching personal sessions:', chatSessionsError);
              setActivities([]);
              setFilteredActivities([]);
              setIsLoading(false);
              return;
            }

            if (!chatSessions || chatSessions.length === 0) {
              setActivities([]);
              setFilteredActivities([]);
              setIsLoading(false);
              return;
            }

            // Fetch related data for each chat session
            const formattedHistory: ActivityItem[] = [];

            for (const session of chatSessions) {
              // Fetch custom GPT details
              const { data: customGpt } = await supabase
                .from('custom_gpts')
                .select('id, name')
                .eq('id', session.gpt_id)
                .single();

              // Fetch messages for this session
              const { data: messages } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', session.id)
                .order('created_at', { ascending: true });

              const messageCount = messages?.length || 0;
              const userMessage = messages?.find(m => m.role === 'user');
              const lastMessage = messages?.[messages.length - 1];

              formattedHistory.push({
                id: session.id,
                user: { 
                  id: user.id, 
                  name: user.user_metadata?.name || user.user_metadata?.full_name || 'You', 
                  email: user.email || '' 
                },
                action: 'Chat conversation',
                details: `with ${customGpt?.name || 'AI Assistant'} (${messageCount} messages)`,
                timestamp: session.created_at,
                conversation: {
                  _id: session.id,
                  gptId: session.gpt_id,
                  gptName: customGpt?.name,
                  messages: messages || [],
                  lastMessage: lastMessage?.content?.substring(0, 100) || userMessage?.content?.substring(0, 100),
                  messageCount: messageCount
                },
                type: 'chat'
              });
            }

            setActivities(formattedHistory);
            setFilteredActivities(formattedHistory);
          } catch (error) {
            console.error('Error in personal view fetch:', error);
            setActivities([]);
            setFilteredActivities([]);
          }
        }
        // For team view - fetch all team chat history and show individual conversations
        else if (viewType === 'team') {
          try {
            // Check if user is an admin
            if (user.role !== 'admin') {
              setViewType('personal');
              return;
            }

            // Fetch all sessions except current user's
            const { data: chatSessions, error: chatSessionsError } = await supabase
              .from('chat_sessions')
              .select('*')
              .neq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (chatSessionsError) {
              console.error('Error fetching team sessions:', chatSessionsError);
              setActivities([]);
              setFilteredActivities([]);
              setIsLoading(false);
              return;
            }

            if (!chatSessions || chatSessions.length === 0) {
              setActivities([]);
              setFilteredActivities([]);
              setIsLoading(false);
              return;
            }

            // Fetch related data for each session
            const formattedHistory: ActivityItem[] = [];

            for (const session of chatSessions) {
              // Fetch user profile
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', session.user_id)
                .single();

              // Fetch custom GPT details
              const { data: customGpt } = await supabase
                .from('custom_gpts')
                .select('id, name')
                .eq('id', session.gpt_id)
                .single();

              // Fetch messages for this session
              const { data: messages } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', session.id)
                .order('created_at', { ascending: true });

              const messageCount = messages?.length || 0;
              const userMessage = messages?.find(m => m.role === 'user');
              const lastMessage = messages?.[messages.length - 1];

              // Get user name from profile or use fallback
              const userName = profile?.full_name || `User ${session.user_id.substring(0, 8)}`;
              const userEmail = profile?.email || '';
              
              formattedHistory.push({
                id: session.id,
                user: {
                  id: session.user_id,
                  name: userName,
                  email: userEmail
                },
                action: 'Chat conversation',
                details: `with ${customGpt?.name || 'AI Assistant'} (${messageCount} messages)`,
                timestamp: session.created_at,
                conversation: {
                  _id: session.id,
                  gptId: session.gpt_id,
                  gptName: customGpt?.name,
                  messages: messages || [],
                  lastMessage: lastMessage?.content?.substring(0, 100) || userMessage?.content?.substring(0, 100),
                  messageCount: messageCount
                },
                type: 'chat'
              });
            }

            setActivities(formattedHistory);
            setFilteredActivities(formattedHistory);
          } catch (error) {
            console.error("Team history view error:", error);
            setViewType('personal');
          }
        }
      } catch (error) {
        console.error("Error fetching activity data:", error);
        setActivities([]);
        setFilteredActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityData();
  }, [user, viewType]);

  // Filter activities based on search query and filter options
  useEffect(() => {
    let filtered = [...activities];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (activity.user && activity.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (activity.conversation?.lastMessage && activity.conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (activity.conversation?.gptName && activity.conversation.gptName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply action type filters
    filtered = filtered.filter(activity => {
      const actionType = getActionType(activity.action);
      return filterOptions.actionTypes[actionType as keyof typeof filterOptions.actionTypes];
    });

    // Apply date range filter
    if (filterOptions.dateRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      if (filterOptions.dateRange === 'today') {
        cutoffDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (filterOptions.dateRange === 'week') {
        cutoffDate = new Date(now.setDate(now.getDate() - 7));
      } else if (filterOptions.dateRange === 'month') {
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
      } else {
        cutoffDate = new Date();
      }

      filtered = filtered.filter(activity => new Date(activity.timestamp) >= cutoffDate);
    }

    setFilteredActivities(filtered);
  }, [searchQuery, filterOptions, activities]);

  // Helper function to determine action type
  const getActionType = (action: string): string => {
    if (action.includes('Chat conversation')) return 'chat';
    if (action.includes('Created') || action.includes('Added')) return 'create';
    if (action.includes('Edited') || action.includes('Updated') || action.includes('Modified')) return 'edit';
    if (action.includes('Deleted') || action.includes('Removed')) return 'delete';
    if (action.includes('Changed settings') || action.includes('Updated settings')) return 'settings';
    return 'chat';
  };

  // Handle chat history item click
  const handleChatHistoryClick = (conversation: ActivityItem['conversation']) => {
    if (conversation && conversation.gptId) {
      navigate(`/admin/chat/${conversation.gptId}?loadHistory=true&conversationId=${conversation._id}`);
    }
  };

  // Format the timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours < 1) {
        return 'Just now';
      } else if (diffHours < 2) {
        return '1 hour ago';
      } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
      }
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  // Toggle filter options
  const toggleFilterOption = (type: keyof FilterOptions['actionTypes'], value: boolean) => {
    setFilterOptions(prev => ({
      ...prev,
      actionTypes: {
        ...prev.actionTypes,
        [type]: value
      }
    }));
  };

  // Set date range filter
  const setDateRangeFilter = (range: FilterOptions['dateRange']) => {
    setFilterOptions(prev => ({
      ...prev,
      dateRange: range
    }));
    setFilterOpen(false);
  };

  // Click outside hook for filter dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterDropdownRef]);

  // When view type changes, update URL
  useEffect(() => {
    const newUrl = `/admin/history?view=${viewType}`;
    navigate(newUrl, { replace: true });
  }, [viewType, navigate]);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Update theme in server via form submission
    const formData = new FormData();
    formData.append('intent', 'updateTheme');
    formData.append('theme', newTheme);
    
    fetcher.submit(formData, { method: 'POST', action: '/admin/setting' });
  };

  // Determine if team view is available
  const isTeamViewAvailable = user?.role === 'admin';
  const isDarkMode = theme === 'dark';

  // CSS for hiding scrollbars
  const scrollbarHideStyles = `
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'dark' : ''} bg-white dark:bg-black text-gray-900 dark:text-gray-100 overflow-hidden`}>
      {/* Add hidden scrollbar styles */}
      <style>{scrollbarHideStyles}</style>

      {/* Header section */}
      <div className="px-6 pt-6 pb-5 flex-shrink-0 border-b border-gray-300 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Activity History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {viewType === 'personal' 
              ? "Your chat conversations and activity" 
              : "Team conversations and activity"}
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-colors self-center sm:self-auto mt-3 sm:mt-0 ${
            isDarkMode 
              ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <IoSunnyOutline size={20} /> : <IoMoonOutline size={20} />}
        </button>
      </div>

      {/* Controls section */}
      <div className="px-6 py-4 flex-shrink-0 border-b border-gray-300 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* View switcher */}
          <div className="inline-flex items-center p-1 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 self-center sm:self-start">
            <button
              onClick={() => setViewType('personal')}
              className={`flex items-center px-3 py-1.5 rounded text-sm transition-all ${viewType === 'personal'
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
            >
              <IoPersonOutline size={16} className="mr-1.5" />
              <span>Personal</span>
            </button>
            <button
              onClick={() => isTeamViewAvailable ? setViewType('team') : undefined}
              className={`flex items-center px-3 py-1.5 rounded text-sm transition-all ${viewType === 'team'
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                  : isTeamViewAvailable
                    ? 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800'
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              title={isTeamViewAvailable ? 'View team history' : 'Requires admin privileges'}
            >
              <IoPeopleOutline size={16} className="mr-1.5" />
              <span>Team</span>
            </button>
          </div>

          {/* Search and filter */}
          <div className="flex flex-1 sm:justify-end max-w-lg gap-2 self-center w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IoSearchOutline className="text-gray-400 dark:text-gray-500" size={18} />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 text-sm placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="relative" ref={filterDropdownRef}>
              <button
                ref={filterButtonRef}
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              >
                <IoFilterOutline size={16} className="mr-1.5" />
                <span>Filter</span>
                <IoChevronDown size={14} className={`ml-1 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Filter Dropdown */}
              {filterOpen && (
                <div
                  className="absolute w-60 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-2xl z-20 p-4"
                  style={{
                    right: 0,
                    top: filterButtonRef.current &&
                      window.innerHeight - filterButtonRef.current.getBoundingClientRect().bottom < 300 &&
                      filterButtonRef.current.getBoundingClientRect().top > 300
                      ? `-${300 + 8}px`
                      : 'calc(100% + 8px)',
                  }}
                >
                  <div className="mb-4">
                    <h3 className="text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Action Types</h3>
                    <div className="space-y-1.5">
                      {Object.keys(filterOptions.actionTypes).map((type) => (
                        <label key={type} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 rounded bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900"
                            checked={filterOptions.actionTypes[type as keyof typeof filterOptions.actionTypes]}
                            onChange={(e) => toggleFilterOption(type as keyof typeof filterOptions.actionTypes, e.target.checked)}
                          />
                          <span className="ml-2 text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Time Period</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(['today', 'week', 'month', 'all'] as const).map((range) => (
                        <button
                          key={range}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filterOptions.dateRange === range
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                          onClick={() => setDateRangeFilter(range)}
                        >
                          {range === 'all' ? 'All Time' : `Last ${range}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto py-6 px-4 flex justify-center hide-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 animate-spin"></div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-500 px-4">
            <div className="border-2 border-gray-300 dark:border-gray-800 rounded-full p-4 mb-4">
              <IoChatbubblesOutline size={32} className="text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">No Conversations Found</h3>
            <p className="text-sm max-w-sm">
              {searchQuery || filterOptions.dateRange !== 'all' || !Object.values(filterOptions.actionTypes).every(v => v)
                ? "No conversations match your current filters. Try adjusting your search or filter criteria."
                : viewType === 'team'
                  ? "No team conversations found. Team member conversations will appear here."
                  : "No conversations recorded yet. Your chat history will appear here once you start chatting."
              }
            </p>
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            <div className="space-y-3 relative border-l border-gray-300 dark:border-gray-800 ml-4">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="relative bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 border border-gray-300 dark:border-gray-700 rounded-lg p-4 ml-4 transition-colors cursor-pointer group"
                  onClick={() => {
                    if (activity.conversation) {
                      handleChatHistoryClick(activity.conversation);
                    }
                  }}
                >
                  <div className="absolute -left-[10px] top-[50%] transform -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600">
                    <IoChatbubblesOutline size={10} className="text-blue-500" />
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* User info */}
                      <div className="mb-1.5 flex items-center">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {viewType === 'personal' ? 'You' : activity.user?.name || 'Team Member'}
                        </span>
                        {viewType === 'team' && activity.user?.email && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            {activity.user.email}
                          </span>
                        )}
                      </div>

                      {/* Conversation details */}
                      <p className="text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{activity.action}</span>
                        <span className="font-medium text-gray-900 dark:text-white ml-1">
                          {activity.details}
                        </span>
                      </p>

                      {/* Last message preview */}
                      {activity.conversation?.lastMessage && (
                        <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded p-2 text-xs text-gray-600 dark:text-gray-300">
                          <div className="line-clamp-2">
                            <span className="font-semibold">Preview: </span>
                            {activity.conversation.lastMessage}
                            {activity.conversation.lastMessage.length >= 100 && '...'}
                          </div>
                          <div className="mt-1 text-gray-500 dark:text-gray-400 text-[10px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            Click to view full conversation
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHistory;