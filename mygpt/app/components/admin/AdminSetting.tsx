import React, { useState, useCallback, useEffect } from 'react';
import { FiSave, FiUser, FiShield, FiDatabase, FiBell, FiGlobe, FiKey, FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '~/context/themeContext';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Separator } from '~/components/ui/separator';
import { useFetcher, useLoaderData } from '@remix-run/react';

interface SettingsFormData {
  // Profile Settings
  displayName: string;
  email: string;
  
  // Security Settings
  twoFactorEnabled: boolean;
  passwordChangeRequired: boolean;
  
  // API Keys
  openaiKey: string;
  llamaKey: string;
  geminiKey: string;
  claudeKey: string;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  
  // System Settings
  autoSave: boolean;
  debugMode: boolean;
}

const AdminSettings: React.FC = () => {
  const loaderData = useLoaderData<{
    user: any;
    profile?: {
      full_name: string | null;
      email: string;
      api_keys: {
        openai?: string;
        llama?: string;
        gemini?: string;
        claude?: string;
      } | null;
    };
  }>();
  
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const fetcher = useFetcher();
  
  // Initialize settings with data from loader
  const [settings, setSettings] = useState<SettingsFormData>({
    displayName: loaderData?.profile?.full_name || 'Admin User',
    email: loaderData?.profile?.email || loaderData?.user?.email || 'admin@mygpt.com',
    twoFactorEnabled: false,
    passwordChangeRequired: true,
    openaiKey: loaderData?.profile?.api_keys?.openai || '',
    llamaKey: loaderData?.profile?.api_keys?.llama || '',
    geminiKey: loaderData?.profile?.api_keys?.gemini || '',
    claudeKey: loaderData?.profile?.api_keys?.claude || '',
    emailNotifications: true,
    pushNotifications: false,
    autoSave: true,
    debugMode: false,
  });

  // Update settings when loader data changes
  useEffect(() => {
    if (loaderData?.profile) {
      setSettings(prev => ({
        ...prev,
        displayName: loaderData.profile?.full_name || prev.displayName,
        email: loaderData.profile?.email || prev.email,
        openaiKey: loaderData.profile?.api_keys?.openai || prev.openaiKey,
        llamaKey: loaderData.profile?.api_keys?.llama || prev.llamaKey,
        geminiKey: loaderData.profile?.api_keys?.gemini || prev.geminiKey,
        claudeKey: loaderData.profile?.api_keys?.claude || prev.claudeKey,
      }));
    }
  }, [loaderData]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const handleInputChange = useCallback((field: keyof SettingsFormData, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    // Save API keys to database
    fetcher.submit(
      {
        intent: 'updateApiKeys',
        openaiKey: settings.openaiKey,
        llamaKey: settings.llamaKey,
        geminiKey: settings.geminiKey,
        claudeKey: settings.claudeKey,
        displayName: settings.displayName
      },
      { method: 'post' }
    );
    
    setIsSaving(false);
  }, [settings, fetcher]);

  // Check for submission results
  useEffect(() => {
    if (fetcher.data && typeof fetcher.data === 'object' && 'success' in fetcher.data && fetcher.data.success) {  
      alert('Settings saved successfully!');
    } else if (fetcher.data && typeof fetcher.data === 'object' && 'error' in fetcher.data && fetcher.data.error) {
      alert(`Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data]);

  // Helper function to mask API key for display
  const maskApiKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  return (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'dark' : ''} bg-gray-50 dark:bg-neutral-900 text-black dark:text-white p-4 sm:p-6 overflow-hidden rounded-lg`}>
      {/* Header */}
      <div className="mb-4 md:mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account and system preferences</p>
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
            onClick={handleSave}
            disabled={isSaving || fetcher.state === 'submitting'}
            className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            <FiSave size={16} />
            {isSaving || fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiUser className="text-blue-500" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={settings.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  disabled // Email is managed by auth system
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiKey className="text-purple-500" />
              API Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openaiKey">OpenAI API Key</Label>
              <Input
                id="openaiKey"
                value={settings.openaiKey}
                onChange={(e) => handleInputChange('openaiKey', e.target.value)}
                placeholder="sk-..."
                className="font-mono"
                type="password"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Used for GPT-4o and other OpenAI models
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="claudeKey">Anthropic Claude API Key</Label>
              <Input
                id="claudeKey"
                value={settings.claudeKey}
                onChange={(e) => handleInputChange('claudeKey', e.target.value)}
                placeholder="sk_ant-..."
                className="font-mono"
                type="password"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Used for Claude 3 Opus, Sonnet and Haiku models
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="geminiKey">Google Gemini API Key</Label>
              <Input
                id="geminiKey"
                value={settings.geminiKey}
                onChange={(e) => handleInputChange('geminiKey', e.target.value)}
                placeholder="AIza..."
                className="font-mono"
                type="password"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Used for Gemini Pro and Flash models
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="llamaKey">Meta Llama API Key</Label>
              <Input
                id="llamaKey"
                value={settings.llamaKey}
                onChange={(e) => handleInputChange('llamaKey', e.target.value)}
                placeholder="Enter Llama API key"
                className="font-mono"
                type="password"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Used for Llama 3 and Llama 4 models
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
