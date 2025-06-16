import React, { useState, useCallback } from 'react';
import { FiSave, FiUser, FiShield, FiDatabase, FiBell, FiGlobe, FiKey, FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '~/context/themeContext';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Separator } from '~/components/ui/separator';

interface SettingsFormData {
  // Profile Settings
  displayName: string;
  email: string;
  
  // Security Settings
  twoFactorEnabled: boolean;
  passwordChangeRequired: boolean;
  
  // API Settings
  apiKey: string;
  apiRateLimit: number;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  
  // System Settings
  autoSave: boolean;
  debugMode: boolean;
}

const AdminSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsFormData>({
    displayName: 'Admin User',
    email: 'admin@mygpt.com',
    twoFactorEnabled: false,
    passwordChangeRequired: true,
    apiKey: '••••••••••••••••••••••••••••••••',
    apiRateLimit: 1000,
    emailNotifications: true,
    pushNotifications: false,
    autoSave: true,
    debugMode: false,
  });

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
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Settings saved:', settings);
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const generateNewApiKey = useCallback(() => {
    const newKey = 'ak_' + Math.random().toString(36).substring(2, 40);
    handleInputChange('apiKey', newKey);
  }, [handleInputChange]);

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
            disabled={isSaving}
            className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            <FiSave size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
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
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiShield className="text-green-500" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch
                checked={settings.twoFactorEnabled}
                onCheckedChange={(checked) => handleInputChange('twoFactorEnabled', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Password Change</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Force password change on next login
                </p>
              </div>
              <Switch
                checked={settings.passwordChangeRequired}
                onCheckedChange={(checked) => handleInputChange('passwordChangeRequired', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiKey className="text-purple-500" />
              API Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  value={settings.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  placeholder="Your API key"
                  className="font-mono"
                />
                <Button
                  onClick={generateNewApiKey}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  Generate New
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiRateLimit">Rate Limit (requests/hour)</Label>
              <Input
                id="apiRateLimit"
                type="number"
                value={settings.apiRateLimit}
                onChange={(e) => handleInputChange('apiRateLimit', parseInt(e.target.value) || 0)}
                placeholder="1000"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiBell className="text-orange-500" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive updates and alerts via email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive real-time notifications in browser
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => handleInputChange('pushNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiDatabase className="text-red-500" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Save</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically save changes as you work
                </p>
              </div>
              <Switch
                checked={settings.autoSave}
                onCheckedChange={(checked) => handleInputChange('autoSave', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Debug Mode</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enable detailed logging for troubleshooting
                </p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => handleInputChange('debugMode', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
