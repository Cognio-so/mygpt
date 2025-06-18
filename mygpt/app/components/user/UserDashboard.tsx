import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { FiSearch, FiChevronDown, FiChevronUp, FiMenu, FiPlus, FiGlobe, FiUsers, FiMessageSquare, FiGrid, FiList, FiEdit, FiTrash2, FiFolderPlus } from 'react-icons/fi';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { FaRobot } from 'react-icons/fa6';
import { BiLogoMeta } from 'react-icons/bi';
import { RiOpenaiFill, RiMoonFill, RiSunFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import { Link, useLoaderData, useFetcher } from '@remix-run/react';
import { useTheme } from '~/context/themeContext';     

// Define interfaces
interface Agent {
  _id: string;
  name: string;
  imageUrl?: string;
  model: string;
  capabilities?: {
    webBrowsing: boolean;
  };
  createdAt: string;
  description?: string;
  folder?: string | null;
  createdBy?: string;
  assignedUsers?: string[];
}

// Model icons mapping
const modelIcons: { [key: string]: JSX.Element } = {
  'openrouter/auto': <TbRouter className="text-yellow-500" size={18} />,
  'GPT-4o': <RiOpenaiFill className="text-green-500" size={18} />,
  'GPT-4o-mini': <SiOpenai className="text-green-400" size={16} />,
  'Gemini-flash-2.5': <SiGooglegemini className="text-blue-400" size={16} />,
  'Gemini-pro-2.5': <SiGooglegemini className="text-blue-600" size={16} />,
  'Claude 3.5 Haiku': <FaRobot className="text-purple-400" size={16} />,
  'llama3-8b-8192': <BiLogoMeta className="text-blue-500" size={18} />,
  'Llama 4 Scout': <BiLogoMeta className="text-blue-700" size={18} />
};

// Agent Card component for user view (no edit/delete buttons)
interface UserAgentCardProps {
  agent: Agent;
  onClick: () => void;
}

const UserAgentCard: React.FC<UserAgentCardProps> = ({ agent, onClick }) => {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400/50 dark:hover:border-gray-600 transition-all shadow-md hover:shadow-lg flex flex-col cursor-pointer group"
      onClick={onClick}
    >
      <div className="h-32 sm:h-36 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-900 relative flex-shrink-0 overflow-hidden">
        {agent.imageUrl ? (
          <img
            src={agent.imageUrl}
            alt={agent.name}
            className="w-full h-full object-cover object-center opacity-90 dark:opacity-80 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50/50 to-purple-100/50 dark:from-blue-900/30 dark:to-purple-900/30">
            <span className="text-3xl sm:text-4xl text-gray-500/40 dark:text-white/30">{agent.name.charAt(0)}</span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <h3 className="font-semibold text-base sm:text-lg line-clamp-1 text-gray-900 dark:text-white">{agent.name}</h3>
          <div className="flex items-center flex-shrink-0 gap-1 bg-gray-100 dark:bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">
            {modelIcons[agent.model] 
              ? React.cloneElement(
                  modelIcons[agent.model] as React.ReactElement, 
                  { size: 12 }
                ) 
              : <FaRobot className="text-gray-500" size={12} />
            }   
            <span className="hidden sm:inline">{agent.model}</span>
          </div>
        </div>

        {agent.capabilities?.webBrowsing && (
          <div className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 mb-1">
            <FiGlobe size={12} />
            <span>Web search</span>
          </div>
        )}
        
        {agent.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{agent.description}</p>
        )}
      </div>
    </div>
  );
};

interface UserDashboardProps {
  userName?: string;
  onNavigate?: (page: string) => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ userName = "User", onNavigate }) => {
  const data = useLoaderData<{ agents: Agent[] }>();
  const { theme, setTheme } = useTheme();
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>('Default');
  const sortOptions: string[] = ['Default', 'Latest', 'Older'];
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [folders, setFolders] = useState<string[]>(['Uncategorized']);

  // Initialize folders when data loads
  useEffect(() => {
    if (data?.agents) {
      const uniqueFolders = Array.from(
        new Set(data.agents.map(agent => agent.folder || 'Uncategorized'))
      );
      setFolders(['All', ...uniqueFolders]);
    }
  }, [data]);

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    if (!data?.agents) return [];

    let filtered = data.agents.filter(agent =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply sorting
    if (sortOption === 'Latest') {
      filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOption === 'Older') {
      filtered = filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return filtered;
  }, [data?.agents, searchTerm, sortOption]);

  // Handle navigation to chat
  const handleNavigateToChat = useCallback((agentId: string) => {
    window.location.href = `/user/chat/${agentId}`;
  }, []);

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Handle outside click for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSortChange = (option: string): void => {
    setSortOption(option);
    setIsSortOpen(false);
  };

  // Handle resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowSidebar(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Error state
  if (error && !data?.agents) {
    return (
      <div className="flex h-screen bg-white dark:bg-black text-black dark:text-white items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen font-sans ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-black text-black dark:text-white">
        {/* Mobile Sidebar Overlay */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/80 z-40 sm:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Header Section */}
        <header className="bg-white dark:bg-black px-4 sm:px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 shadow-sm">
          {/* Desktop Header */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <div className="flex items-center ml-4 gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Grid View"
                >
                  <FiGrid className="text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="List View"
                >
                  <FiList className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search GPTs..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div className="relative flex items-center" ref={dropdownRef}>
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <span className="text-sm">{sortOption}</span>
                  {isSortOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </button>
                {isSortOpen && (
                  <div className="absolute top-full right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                    {sortOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleSortChange(option)}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {theme === 'dark' ? <RiSunFill size={20} className="text-yellow-400" /> : <RiMoonFill size={20} className="text-gray-700" />}
              </button>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="block sm:hidden">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiMenu size={24} className="text-gray-700 dark:text-gray-300" />
              </button>
              <h1 className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {theme === 'dark' ? <RiSunFill size={20} className="text-yellow-400" /> : <RiMoonFill size={20} className="text-gray-700" />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search GPTs..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex justify-center mt-3 gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <FiGrid className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <FiList className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredAndSortedAgents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <FaRobot size={32} className="text-gray-400 dark:text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No GPTs Available</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {searchTerm ? 'No GPTs match your search criteria.' : 'No GPTs have been assigned to you yet. Contact your administrator for access.'}
                </p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6" 
                : "space-y-4"
              }>
                {filteredAndSortedAgents.map((agent) => (
                  <UserAgentCard
                    key={agent._id}
                    agent={agent}
                    onClick={() => handleNavigateToChat(agent._id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;
