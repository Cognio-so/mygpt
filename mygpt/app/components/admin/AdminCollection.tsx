import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { FiEdit, FiTrash2, FiSearch, FiChevronDown, FiChevronUp, FiPlus, FiInfo, FiFolder, FiFolderPlus, FiGlobe, FiSun, FiMoon } from 'react-icons/fi';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { FaRobot } from 'react-icons/fa6';
import { BiLogoMeta } from 'react-icons/bi';
import { RiOpenaiFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import { useNavigate, useLoaderData, useFetcher, Link } from '@remix-run/react';
import { useTheme } from '~/context/themeContext';
import { Button } from '~/components/ui/button';
import { ClientOnly } from '~/components/ClientOnly';

// Define interfaces
interface Gpt {
  _id: string;
  name: string;
  description?: string;
  model?: string;
  imageUrl?: string;
  createdAt?: string;
  capabilities?: { webBrowsing?: boolean };
  knowledgeBase?: { fileName: string; fileUrl: string }[];
  folder?: string | null;
}

// Model icons mapping - moved outside component to prevent recreation
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

const sortOptions = ['newest', 'oldest', 'alphabetical'];

// Loading skeleton component
const LoadingSkeleton = React.memo(() => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 animate-pulse">
        <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
));

// Memoized header component
const CollectionHeader = React.memo(({ 
  gptCount, 
  theme, 
  onToggleTheme 
}: {
  gptCount: number;
  theme: string;
  onToggleTheme: () => void;
}) => (
  <div className="mb-4 md:mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between">
    <div className="text-center sm:text-left">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Collections</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Manage your custom GPTs ({gptCount} total)
      </p>
    </div>
    <Button
      onClick={onToggleTheme}
      variant="ghost"
      size="icon"
      className="rounded-full self-center sm:self-auto mt-3 sm:mt-0"
      aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
    </Button>
  </div>
));

// Memoized controls component
const CollectionControls = React.memo(({
  folders,
  selectedFolder,
  onFolderChange,
  searchTerm,
  onSearchChange,
  sortOption,
  onSortChange,
  showSortOptions,
  onToggleSortOptions,
  sortDropdownRef
}: {
  folders: string[];
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortOption: string;
  onSortChange: (option: string) => void;
  showSortOptions: boolean;
  onToggleSortOptions: () => void;
  sortDropdownRef: React.RefObject<HTMLDivElement>;
}) => {
  const navigate = useNavigate();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  const handleFolderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFolderChange(e.target.value);
  }, [onFolderChange]);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-4 flex-shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
        <div className="relative">
          <select
            value={selectedFolder}
            onChange={handleFolderChange}
            className="w-full sm:w-36 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 appearance-none cursor-pointer"
            aria-label="Select Folder"
          >
            {folders.map(folder => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
          <FiFolder className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        </div>

        <div className="relative flex-grow sm:flex-grow-0">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search GPTs..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full sm:w-52 md:w-64 pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            aria-label="Search GPTs"
          />
        </div>

        <div className="relative" ref={sortDropdownRef}>
          <Button
            onClick={onToggleSortOptions}
            variant="outline"
            className="flex items-center justify-between w-full sm:w-36 px-3 py-2 text-sm"
            aria-haspopup="true"
            aria-expanded={showSortOptions}
          >
            <span className="truncate">Sort: {sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}</span>
            {showSortOptions ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </Button>
          {showSortOptions && (
            <div className="absolute left-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-10 overflow-hidden">
              {sortOptions.map((option) => (
                <Button
                  key={option}
                  onClick={() => onSortChange(option)}
                  variant="ghost"
                  className={`w-full text-left px-4 py-2 text-sm ${sortOption === option ? 'font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={() => navigate('/admin/create-gpt')}
        className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg font-medium text-sm transition-colors flex-shrink-0 whitespace-nowrap"
      >
        <FiPlus size={18} /> Create New GPT
      </Button>
    </div>
  );
});

// Optimized GptCard component
const GptCard = React.memo(({ 
  gpt, 
  onDelete, 
  onEdit, 
  formatDate, 
  onNavigate, 
  onMoveToFolder 
}: {
  gpt: Gpt;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  formatDate: (dateString: string) => string;
  onNavigate: (path: string) => void;
  onMoveToFolder: (gpt: Gpt) => void;
}) => {
  const handleNavigate = useCallback(() => {
    onNavigate(`/admin/chat/${gpt._id}`);
  }, [gpt._id, onNavigate]);

  const handleMoveToFolder = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveToFolder(gpt);
  }, [gpt, onMoveToFolder]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(gpt._id);
  }, [gpt._id, onEdit]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(gpt._id);
  }, [gpt._id, onDelete]);

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:border-blue-400/50 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 cursor-pointer"
      onClick={handleNavigate}
    >
      <div className="relative h-32 sm:h-36 flex-shrink-0 overflow-hidden">
        {gpt.imageUrl ? (
          <img
            src={gpt.imageUrl}
            alt={`${gpt.name} agent`}
            className="h-full w-full object-cover object-center opacity-90 transition-transform duration-300 group-hover:scale-105 dark:opacity-80"
            loading="lazy"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50/50 to-purple-100/50 dark:from-blue-900/30 dark:to-purple-900/30">
            <span className="text-4xl text-gray-500/40 dark:text-white/30">{gpt.name.charAt(0)}</span>
          </div>
        )}
        
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="bg-white/80 text-gray-700 hover:bg-green-200 hover:text-white dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-green-700/80 rounded-full p-2"
            title="Move to Folder"
            onClick={handleMoveToFolder}
          >
            <FiFolderPlus size={14} />
          </button>
          <button
            className="bg-white/80 text-gray-700 hover:bg-blue-300 hover:text-white dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-blue-700/80 rounded-full p-2"
            title="Edit GPT"
            onClick={handleEdit}
          >
            <FiEdit size={14} />
          </button>
          <button
            type="button"
            className="bg-white/80 text-gray-700 hover:bg-red-300 hover:text-white dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-red-700/80 rounded-full p-2"
            title="Delete GPT"
            onClick={handleDelete}
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col justify-between p-3">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="line-clamp-1 text-lg font-semibold text-gray-900 dark:text-white">{gpt.name}</h3>
          {gpt.model && (
          <div className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {modelIcons[gpt.model] ? React.cloneElement(modelIcons[gpt.model], { size: 12 }) : <FaRobot className="text-gray-500" size={12} />}
            <span className="hidden sm:inline">{gpt.model}</span>
          </div>
          )}
        </div>
        {gpt.capabilities?.webBrowsing && (
          <div className="mb-1 flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
            <FiGlobe size={12} />
            <span>Web search</span>
          </div>
        )}
        {gpt.folder && (
          <div className="mb-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <FiFolder size={12} />
            <span>{gpt.folder}</span>
          </div>
        )}
        {gpt.description && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{gpt.description}</p>
        )}
        {gpt.knowledgeBase && gpt.knowledgeBase.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{gpt.knowledgeBase.length} knowledge files</span>
          </div>
        )}
      </div>
    </article>
  );
});

const AdminCollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const data = useLoaderData<{ customGpts: Gpt[] }>();
  const fetcher = useFetcher();
  const { theme, setTheme } = useTheme();
  const [folders, setFolders] = useState<string[]>(['All']); 
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [showSortOptions, setShowSortOptions] = useState<boolean>(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Optimize theme toggle
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Initialize folders when data loads
  useEffect(() => {
    if (data?.customGpts?.length) {
      const uniqueFolders = Array.from(
        new Set(data.customGpts.map(gpt => gpt.folder).filter((folder): folder is string => folder != null))
      );
      setFolders(['All', ...uniqueFolders]);
    }
  }, [data]);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleSortChange = useCallback((option: string) => {
    setSortOption(option);
    setShowSortOptions(false);
  }, []);

  const toggleSortOptions = useCallback(() => {
    setShowSortOptions(prev => !prev);
  }, []);

  const handleMoveToFolder = useCallback((gpt: Gpt) => {
    const folderName = prompt("Enter folder name:", gpt.folder || "");
    if (folderName !== null) {
      fetcher.submit(
        { id: gpt._id, folder: folderName.trim(), intent: 'updateFolder' },
        { method: 'post', action: '/admin/update-folder' }
      );
    }
  }, [fetcher]);

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this GPT? This action cannot be undone.')) {
      fetcher.submit(
        { id, intent: 'delete' },
        { method: 'post', action: '/admin/delete-gpt' }
      );
    }
  }, [fetcher]);

  const handleEdit = useCallback((id: string) => {
    navigate(`/admin/edit-gpt/${id}`);
  }, [navigate]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const filteredAndSortedGpts = useMemo(() => {
    let filtered = data?.customGpts || [];
    
    // Apply folder filter
    if (selectedFolder !== 'All') {
      filtered = filtered.filter(gpt => gpt.folder === selectedFolder);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(gpt => 
        gpt.name.toLowerCase().includes(searchLower) ||
        (gpt.description && gpt.description.toLowerCase().includes(searchLower)) ||
        (gpt.folder && gpt.folder.toLowerCase().includes(searchLower)) ||
        (gpt.model && gpt.model.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        case 'oldest':
          return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [data?.customGpts, selectedFolder, searchTerm, sortOption]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.data) {
      if ((fetcher.data as any).success) {
        // Refresh data instead of full page reload
        window.location.reload();
      } else if ((fetcher.data as any).error) {
        alert(`Error: ${(fetcher.data as any).error}`);
      }
    }
  }, [fetcher.data]);

  return (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'dark' : ''} bg-gray-50 dark:bg-neutral-900 text-black dark:text-white p-4 sm:p-6 overflow-hidden rounded-lg`}>
      <CollectionHeader 
        gptCount={data?.customGpts?.length || 0}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <CollectionControls
        folders={folders}
        selectedFolder={selectedFolder}
        onFolderChange={setSelectedFolder}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        sortOption={sortOption}
        onSortChange={handleSortChange}
        showSortOptions={showSortOptions}
        onToggleSortOptions={toggleSortOptions}
        sortDropdownRef={sortDropdownRef}
      />

      <div className="flex-1 overflow-y-auto">
        <ClientOnly fallback={<LoadingSkeleton />}>
        {filteredAndSortedGpts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <FiInfo size={48} className="mb-4" />
            <h3 className="text-lg font-medium mb-2">No GPTs found</h3>
            <p className="text-sm text-center">
                {searchTerm ? `No results for "${searchTerm}"${selectedFolder !== 'All' ? ` in ${selectedFolder} folder` : ''}` : 
               selectedFolder === 'All' ? 'Create your first custom GPT to get started' : 
               `No GPTs in ${selectedFolder} folder`}
            </p>
            {!searchTerm && selectedFolder === 'All' && (
              <Link to="/admin/create-gpt" className="mt-4">
                <Button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                  Create Your First GPT
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAndSortedGpts.map((gpt) => (
              <GptCard
                key={gpt._id}
                gpt={gpt}
                onDelete={handleDelete}
                onEdit={handleEdit}
                formatDate={formatDate}
                onNavigate={handleNavigate}
                onMoveToFolder={handleMoveToFolder}
              />
            ))}
          </div>
        )}
        </ClientOnly>
      </div>
    </div>
  );
};

export default AdminCollectionPage;