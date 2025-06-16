import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useLoaderData, useFetcher } from '@remix-run/react';
import { FiSearch, FiChevronDown, FiChevronUp, FiMenu, FiPlus, FiGlobe, FiEdit, FiTrash2, FiFolderPlus, FiFolder } from 'react-icons/fi';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { FaRobot } from 'react-icons/fa6';
import { BiLogoMeta } from 'react-icons/bi';
import { RiOpenaiFill, RiMoonFill, RiSunFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { ScrollArea } from '~/components/ui/scroll-area';
import { useTheme } from '~/context/themeContext';

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
  knowledgeBase?: Array<{
    fileName: string;
    fileUrl: string;
  }>;
}

const modelIcons: Record<string, JSX.Element> = {
  'openrouter/auto': <TbRouter className="text-yellow-500" size={18} />,
  'GPT-4o': <RiOpenaiFill className="text-green-500" size={18} />,
  'GPT-4o-mini': <SiOpenai className="text-green-400" size={16} />,
  'Gemini-flash-2.5': <SiGooglegemini className="text-blue-400" size={16} />,
  'Gemini-pro-2.5': <SiGooglegemini className="text-blue-600" size={16} />,
  'Claude 3.5 Haiku': <FaRobot className="text-purple-400" size={16} />,
  'llama3-8b-8192': <BiLogoMeta className="text-blue-500" size={18} />,
  'Llama 4 Scout': <BiLogoMeta className="text-blue-700" size={18} />
};

interface EnhancedAgentCardProps {
  agent: Agent;
  onClick: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToFolder: (agent: Agent) => void;
}

const EnhancedAgentCard = React.memo(({ agent, onClick, onEdit, onDelete, onMoveToFolder }: EnhancedAgentCardProps) => {
  const { theme } = useTheme();
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:border-blue-400/50 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-36 flex-shrink-0 overflow-hidden">
        {agent.imageUrl ? (
          <img
            src={agent.imageUrl}
            alt={`${agent.name} agent`}
            className="h-full w-full object-cover object-center opacity-90 transition-transform duration-300 group-hover:scale-105 dark:opacity-80"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50/50 to-purple-100/50 dark:from-blue-900/30 dark:to-purple-900/30">
            <span className="text-4xl text-gray-500/40 dark:text-white/30">{agent.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            className="bg-white/80 text-gray-700 hover:bg-green-200 hover:text-white dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-green-700/80 rounded-full p-2"
            title="Move to Folder"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onMoveToFolder(agent);
            }}
          >
            <FiFolderPlus size={14} />
          </button>
          <button
            className="bg-white/80 text-gray-700 hover:bg-blue-300 hover:text-white dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-blue-700/80 rounded-full p-2"
            title="Edit Agent"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit(agent._id);
            }}
          >
            <FiEdit size={14} />
          </button>
          <button
            type="button"
            className="bg-white/80 text-gray-700 hover:bg-red-300 hover:text-white dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-red-700/80 rounded-full p-2"
            title="Delete Agent"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete(agent._id);
            }}
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>
      <div className="flex flex-grow flex-col p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="line-clamp-1 text-lg font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
          <div className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {modelIcons[agent.model] ? React.cloneElement(modelIcons[agent.model], { size: 12 }) : <FaRobot className="text-gray-500" size={12} />}
            <span className="hidden sm:inline">{agent.model}</span>
          </div>
        </div>
        {agent.capabilities?.webBrowsing && (
          <div className="mb-1 flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
            <FiGlobe size={12} />
            <span>Web search</span>
          </div>
        )}
        {agent.folder && (
          <div className="mb-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <FiFolder size={12} />
            <span>{agent.folder}</span>
          </div>
        )}
        {agent.description && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{agent.description}</p>
        )}
        {agent.knowledgeBase && agent.knowledgeBase.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{agent.knowledgeBase.length} knowledge files</span>
          </div>
        )}
      </div>
    </article>
  );
});

interface AdminDashboardProps {
  userName?: string;
}

interface FolderSection {
  key: string;
  title: string;
  agents: Agent[];
}

export default function AdminDashboard({ userName = "Admin User" }: AdminDashboardProps) {
  const { agents } = useLoaderData<{ agents: Agent[] }>();
  const fetcher = useFetcher();
  const { theme, setTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('Default');
  const [showSidebar, setShowSidebar] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sortOptions = ['Default', 'Latest', 'Older'];

  const applySorting = useCallback((agents: Agent[], sortOpt: string): Agent[] => {
    if (sortOpt === 'Default') return agents;
    const sortedAgents = [...agents];
    if (sortOpt === 'Latest') {
      sortedAgents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOpt === 'Older') {
      sortedAgents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return sortedAgents;
  }, []);

  const organizedAgents = useMemo(() => {
    if (!agents || agents.length === 0) {
      return [];
    }
    
    // Get all unique folders
    const uniqueFolders = Array.from(new Set(agents.map(a => a.folder).filter(Boolean)));
    const sections: FolderSection[] = [];

    // Featured agents (first 4 agents)
    if (agents.length > 0) {
      sections.push({
        key: 'featured',
        title: 'Featured Agents',
        agents: agents.slice(0, 4)
      });
    }

    // Folder-based sections
    uniqueFolders.forEach(folder => {
      const folderAgents = agents.filter(a => a.folder === folder);
      if (folderAgents.length > 0) {
        sections.push({
          key: folder!.toLowerCase().replace(/\s+/g, '-'),
          title: folder!,
          agents: folderAgents
        });
      }
    });

   

    return sections;
  }, [agents]);

  const filteredAgentsData = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase().trim();
    
    return organizedAgents.map(section => {
      let filtered = section.agents;
      
      if (searchTermLower) {
        filtered = section.agents.filter(
          agent =>
            agent.name.toLowerCase().includes(searchTermLower) ||
            (agent.description && agent.description.toLowerCase().includes(searchTermLower)) ||
            (agent.folder && agent.folder.toLowerCase().includes(searchTermLower))
        );
      }
      
      return {
        ...section,
        agents: applySorting(filtered, sortOption)
      };
    }).filter(section => section.agents.length > 0);
  }, [searchTerm, organizedAgents, sortOption, applySorting]);

  const handleDeleteGpt = useCallback(
    async (id: string) => {
      if (window.confirm('Are you sure you want to delete this agent?')) {
        fetcher.submit({ id, intent: 'delete' }, { method: 'post', action: '/admin/delete-gpt' });
      }
    },
    [fetcher]
  );

  const handleEditGpt = useCallback((id: string) => {
    window.location.href = `/admin/edit-gpt/${id}`;
  }, []);

  const handleMoveToFolder = useCallback(
    (agent: Agent) => {
      const folderName = prompt('Enter folder name:', agent.folder || '');
      if (folderName !== null) {
        fetcher.submit({ id: agent._id, folder: folderName, intent: 'updateFolder' }, { method: 'post', action: '/admin/update-folder' });
      }
    },
    [fetcher]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSortOption('Default');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigateToChat = useCallback((agentId: string) => {
    window.location.href = `/admin/chat/${agentId}`;
  }, []);

  const hasSearchResults = filteredAgentsData.some(section => section.agents.length > 0);

  return (
    <div className={`min-h-screen font-sans ${theme === 'dark' ? 'dark' : ''} bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white rounded-lg`}>
      <header className="sticky top-0 z-10 flex items-center justify-between  bg-white px-4 py-4 shadow-sm dark:bg-neutral-900 sm:px-6 rounded-t-lg">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setShowSidebar(!showSidebar)}>
            <FiMenu size={24} />
          </Button>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-64 pl-10"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
            {theme === 'dark' ? <RiSunFill size={20} className="text-yellow-400" /> : <RiMoonFill size={20} className="text-gray-700" />}
          </Button>
          <Button asChild>
            <Link to="/admin/create-gpt" className="flex items-center gap-2">
              <FiPlus size={18} />
              Create Agent
            </Link>
          </Button>
        </div>
      </header>

      {showSidebar && (
        <div className="fixed inset-0 z-40 bg-black/80 sm:hidden" onClick={() => setShowSidebar(false)} />
      )}

      <ScrollArea className="flex-1 p-4 sm:p-6">
        {searchTerm && !hasSearchResults ? (
          <p className="py-12 text-center text-gray-500 dark:text-gray-400">No agents found for &quot;{searchTerm}&quot;</p>
        ) : !agents || agents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center py-8">
            <p className="mb-4 text-lg text-gray-600 dark:text-gray-400">No custom agents found</p>
            <Button asChild>
              <Link to="/admin/create-gpt">Create Your First Agent</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredAgentsData.map((section, index) => (
              <section key={section.key} className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {section.key === 'featured' && '⭐'}
                    {section.title}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({section.agents.length})
                    </span>
                  </h2>
                  {index === 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          Sort: {sortOption}
                          {sortOption === 'Default' ? <FiChevronDown /> : <FiChevronUp />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" ref={dropdownRef}>
                        {sortOptions.map(option => (
                          <DropdownMenuItem key={option} onSelect={() => setSortOption(option)}>
                            {option}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.agents.map(agent => (
                    <EnhancedAgentCard
                      key={agent._id}
                      agent={agent}
                      onClick={() => handleNavigateToChat(agent._id)}
                      onEdit={handleEditGpt}
                      onDelete={handleDeleteGpt}
                      onMoveToFolder={handleMoveToFolder}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}