import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useFetcher, useLoaderData, useActionData } from '@remix-run/react';
import {
  FiUser, FiBell, FiMonitor, FiChevronRight,
  FiEdit2, FiCamera, FiCheck, FiInfo, FiXCircle, FiCheckCircle, FiLoader, FiSun, FiMoon
} from 'react-icons/fi';
import { useTheme } from '~/context/themeContext';

// Define interfaces
interface LoaderData {
  user: {
    id: string;
    name: string;
    email: string;
    profilePic?: string;
    role: string;
    isVerified: boolean;
  };
  theme: 'light' | 'dark';
}

interface ActionData {
  success: boolean;
  message?: string;
  error?: string;
  user?: any;
}

interface UserSettingPageProps {
  loaderData: LoaderData;
  actionData?: ActionData;
}

// Account settings section component
const AccountSettings = memo(({
  formData,
  handleInputChange,
  handleFormSubmit,
  handleImageUpload,
  isDarkMode,
  toggleTheme,
  message,
  setMessage,
  isSubmitting,
  fetcher
}: {
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFormSubmit: (intent: string) => (e: React.FormEvent) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  message: { text: string; type: string };
  setMessage: (msg: { text: string; type: string }) => void;
  isSubmitting: boolean;
  fetcher: any;
}) => {
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const triggerImageUpload = () => {
    profileImageInputRef.current?.click();
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h2 className={`text-xl font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Account Information</h2>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Manage your personal information and profile picture</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-center md:justify-start mb-6">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full overflow-hidden border-2 ${isDarkMode
                ? 'bg-gradient-to-br from-blue-800 to-purple-800 border-white/10'
                : 'bg-gradient-to-br from-blue-100 to-purple-100 border-gray-300'
              }`}>
              {formData.profileImage ? (
                <img
                  src={formData.profileImage instanceof File ? URL.createObjectURL(formData.profileImage) : formData.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className={`text-3xl font-semibold ${isDarkMode ? 'text-white/70' : 'text-gray-500'}`}>
                    {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={triggerImageUpload}
              className={`absolute bottom-0 right-0 p-1.5 rounded-full cursor-pointer border-2 hover:bg-blue-700 transition-colors ${isDarkMode
                  ? 'bg-blue-600 border-gray-800 text-white'
                  : 'bg-blue-500 border-white text-white'
                }`}
              title="Change profile picture"
            >
              <FiCamera size={16} />
            </button>
            <input
              ref={profileImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              name="profileImageInput"
            />
          </div>
        </div>

        <fetcher.Form onSubmit={handleFormSubmit('updateProfile')} className="space-y-5">
          <input type="hidden" name="intent" value="updateProfile" />
          
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              placeholder="Your full name"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              placeholder="your.email@example.com"
              disabled={isSubmitting}
            />
            <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Your email address is used for notifications and account recovery</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`text-white py-2.5 px-5 rounded-lg transition duration-200 font-medium flex items-center justify-center min-w-[130px] ${isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
                } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="animate-spin mr-2" size={18} /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </fetcher.Form>
      </div>

      <div className={`border-t pt-8 mb-8 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-xl font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Appearance</h2>
        <p className={`text-sm mb-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Customize how the application looks</p>
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className={`text-base font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Dark Mode</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Use dark theme throughout the application</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="darkMode"
                checked={isDarkMode}
                onChange={toggleTheme}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isDarkMode
                  ? 'bg-blue-600 after:translate-x-full after:border-white after:bg-white'
                  : 'bg-gray-300 after:border-gray-400 after:bg-white'
                }`}></div>
            </label>
          </div>
        </div>
      </div>

      <div className={`border-t pt-8 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-xl font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Change Password</h2>
        <p className={`text-sm mb-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Update your password to maintain account security</p>

        <fetcher.Form onSubmit={handleFormSubmit('updatePassword')} className="space-y-5">
          <input type="hidden" name="intent" value="updatePassword" />
          
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              className={`w-full border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              placeholder="••••••••••••"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className={`w-full border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              placeholder="Minimum 6 characters"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              placeholder="••••••••••••"
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`text-white py-2.5 px-5 rounded-lg transition duration-200 font-medium flex items-center justify-center min-w-[170px] ${isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
                } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="animate-spin mr-2" size={18} /> Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </fetcher.Form>
      </div>

      {message.text && (
        <div className={`mt-6 p-3 rounded-lg flex items-center gap-3 text-sm ${message.type === 'success'
            ? (isDarkMode ? 'bg-green-900/40 text-green-200 border border-green-700/50' : 'bg-green-100 text-green-700 border border-green-200')
            : (isDarkMode ? 'bg-red-900/40 text-red-200 border border-red-700/50' : 'bg-red-100 text-red-700 border border-red-200')
          }`}>
          {message.type === 'success' ? <FiCheckCircle size={18} /> : <FiXCircle size={18} />}
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })} className="ml-auto p-1 rounded-full hover:bg-white/10">
            <FiXCircle size={16} />
          </button>
        </div>
      )}
    </div>
  );
});

const UserSettingPage: React.FC = () => {
  const loaderData = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  
  const { user, theme } = loaderData;
  const { theme: currentTheme, setTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(currentTheme === 'dark');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    profileImage: user.profilePic || null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetcher = useFetcher();

  // Handle action data (success/error messages)
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        setMessage({ text: actionData.message || 'Operation completed successfully', type: 'success' });
        
        // Update user data if returned
        if (actionData.user) {
          setFormData(prev => ({
            ...prev,
            name: actionData.user.name || prev.name,
            email: actionData.user.email || prev.email,
            profileImage: actionData.user.profilePic || prev.profileImage,
          }));
        }

        // Clear password fields on successful password update
        if (actionData.message?.includes('Password')) {
          setFormData(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          }));
        }
      } else {
        setMessage({ text: actionData.error || 'An error occurred', type: 'error' });
      }
    }
  }, [actionData]);

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Handle fetcher state
  useEffect(() => {
    setIsSubmitting(fetcher.state === 'submitting');
  }, [fetcher.state]);

  // Update useEffect to sync with theme changes
  useEffect(() => {
    setIsDarkMode(currentTheme === 'dark');
  }, [currentTheme]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setMessage({ text: 'Please select a valid image file.', type: 'error' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ text: 'Image file size should not exceed 5MB.', type: 'error' });
        return;
      }
      setFormData(prev => ({
        ...prev,
        profileImage: file.name // Store filename instead of File object
      }));
      setMessage({ text: '', type: '' });

      // Automatically upload the image
      const formData = new FormData();
      formData.append('intent', 'uploadProfilePicture');
      formData.append('profileImage', file);
      fetcher.submit(formData, { method: 'POST', encType: 'multipart/form-data' });
    }
  }, [fetcher]);

  const toggleTheme = useCallback(() => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setTheme(newTheme); // This will update the ThemeContext and trigger the context's fetcher
  }, [isDarkMode, setTheme]);

  const handleFormSubmit = useCallback((intent: string) => (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (intent === 'updatePassword') {
      if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
        setMessage({ text: 'All password fields are required.', type: 'error' });
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ text: 'New passwords do not match.', type: 'error' });
        return;
      }
      if (formData.newPassword.length < 6) {
        setMessage({ text: 'New password must be at least 6 characters.', type: 'error' });
        return;
      }
    }

    // Submit form data
    const submitData = new FormData();
    submitData.append('intent', intent);
    
    if (intent === 'updateProfile') {
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
    } else if (intent === 'updatePassword') {
      submitData.append('currentPassword', formData.currentPassword);
      submitData.append('newPassword', formData.newPassword);
      submitData.append('confirmPassword', formData.confirmPassword);
    }

    fetcher.submit(submitData, { method: 'POST' });
  }, [formData, fetcher]);

  return (
    <div className={`flex flex-col h-full min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
      }`}>
      <div className="p-4 sm:p-6 md:p-8 lg:p-10 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">Settings</h1>
      </div>

      <div className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto scrollbar-hide">
        <AccountSettings
          formData={formData}
          handleInputChange={handleInputChange}
          handleFormSubmit={handleFormSubmit}
          handleImageUpload={handleImageUpload}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          message={message}
          setMessage={setMessage}
          isSubmitting={isSubmitting}
          fetcher={fetcher}
        />
      </div>
    </div>
  );
};

export default UserSettingPage; 