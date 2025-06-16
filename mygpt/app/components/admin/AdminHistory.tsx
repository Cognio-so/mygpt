import React, { useState, useCallback, useMemo } from 'react';
import { FiClock, FiUser, FiActivity, FiTrash2, FiDownload, FiFilter, FiSearch, FiMoon, FiSun, FiAlertCircle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useTheme } from '~/context/themeContext';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';

interface HistoryItem {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
  type: 'success' | 'warning' | 'error' | 'info';
  details?: string;
}

const AdminHistory: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'success' | 'warning' | 'error' | 'info'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  // Mock history data
  const [historyData] = useState<HistoryItem[]>([
    {
      id: '1',
      action: 'GPT Created',
      description: 'Created new GPT "Marketing Assistant"',
      user: 'Admin User',
      timestamp: '2024-01-15T10:30:00Z',
      type: 'success',
      details: 'GPT configured with marketing templates and web browsing capabilities'
    },
    {
      id: '2',
      action: 'Settings Updated',
      description: 'Modified API rate limits',
      user: 'Admin User',
      timestamp: '2024-01-15T09:15:00Z',
      type: 'info',
      details: 'Rate limit changed from 500 to 1000 requests/hour'
    },
    {
      id: '3',
      action: 'GPT Deleted',
      description: 'Deleted GPT "Old Assistant"',
      user: 'Admin User',
      timestamp: '2024-01-14T16:45:00Z',
      type: 'warning',
      details: 'GPT had 45 conversations and 12 knowledge base files'
    },
    {
      id: '4',
      action: 'Login Failed',
      description: 'Failed login attempt detected',
      user: 'Unknown',
      timestamp: '2024-01-14T14:20:00Z',
      type: 'error',
      details: 'Multiple failed attempts from IP: 192.168.1.100'
    },
    {
      id: '5',
      action: 'User Added',
      description: 'Added new team member "John Doe"',
      user: 'Admin User',
      timestamp: '2024-01-13T11:00:00Z',
      type: 'success',
      details: 'User granted editor permissions'
    },
    {
      id: '6',
      action: 'Backup Created',
      description: 'System backup completed successfully',
      user: 'System',
      timestamp: '2024-01-13T02:00:00Z',
      type: 'success',
      details: 'Backup size: 2.3GB, stored in cloud storage'
    },
    {
      id: '7',
      action: 'API Limit Exceeded',
      description: 'API rate limit exceeded',
      user: 'API Client',
      timestamp: '2024-01-12T15:30:00Z',
      type: 'warning',
      details: 'Client temporarily throttled for 15 minutes'
    },
  ]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="text-green-500" size={16} />;
      case 'warning':
        return <FiAlertCircle className="text-orange-500" size={16} />;
      case 'error':
        return <FiXCircle className="text-red-500" size={16} />;
      default:
        return <FiActivity className="text-blue-500" size={16} />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const formatDate = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  }, []);

  const filteredHistory = useMemo(() => {
    let filtered = historyData;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Filter by period
    const now = new Date();
    if (selectedPeriod !== 'all') {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp);
        const diffTime = now.getTime() - itemDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        switch (selectedPeriod) {
          case 'today':
            return diffDays < 1;
          case 'week':
            return diffDays < 7;
          case 'month':
            return diffDays < 30;
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [historyData, searchTerm, filterType, selectedPeriod]);

  const handleExport = useCallback(() => {
    const csvContent = [
      ['Action', 'Description', 'User', 'Timestamp', 'Type'],
      ...filteredHistory.map(item => [
        item.action,
        item.description,
        item.user,
        item.timestamp,
        item.type
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [filteredHistory]);

  const clearHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      // Here you would make the API call to clear history
      alert('History cleared successfully!');
    }
  }, []);

  return (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'dark' : ''} bg-gray-50 dark:bg-neutral-900 text-black dark:text-white p-4 sm:p-6 overflow-hidden rounded-lg`}>
      {/* Header */}
      <div className="mb-4 md:mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Activity History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track all system activities and user actions
          </p>
        </div>
        <div className="flex items-center gap-2 self-center sm:self-auto mt-3 sm:mt-0">
          <Button
            onClick={toggleTheme}
            variant="outline"
            size="icon"
            className="rounded-full"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FiDownload size={16} />
            Export
          </Button>
          <Button
            onClick={clearHistory}
            variant="outline"
            className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <FiTrash2 size={16} />
            Clear
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        >
          <option value="all">All Types</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="info">Info</option>
        </select>

        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <FiClock size={48} className="mb-4" />
            <h3 className="text-lg font-medium mb-2">No activity found</h3>
            <p className="text-sm text-center">
              {searchTerm ? 'Try adjusting your search terms or filters' : 'No activity recorded yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item) => {
              const dateTime = formatDate(item.timestamp);
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {item.action}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {item.description}
                            </p>
                          </div>
                          <Badge className={`${getTypeBadgeVariant(item.type)} px-2 py-1 text-xs font-medium rounded-full`}>
                            {item.type}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <FiUser size={12} />
                            <span>{item.user}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FiClock size={12} />
                            <span>{dateTime.date} at {dateTime.time}</span>
                          </div>
                        </div>
                        
                        {item.details && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                            {item.details}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHistory;
