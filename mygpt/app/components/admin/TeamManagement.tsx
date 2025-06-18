import React, { useState, useCallback, useMemo, useRef, useEffect, Suspense } from 'react';
import { 
  FiUser, 
  FiUserPlus, 
  FiMail, 
  FiEdit, 
  FiTrash2, 
  FiSearch, 
  FiMoreVertical,
  FiSun,
  FiMoon,
  FiShield,
  FiEye,
  FiEdit3,
  FiSend,
  FiUsers,
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa6';
import { useTheme } from '~/context/themeContext';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '~/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';
import { ClientOnly } from '~/components/ClientOnly';
import { useLoaderData, useFetcher } from '@remix-run/react';

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  lastActive: string;
  assignedGpts: string[];
  permissions: {
    canCreateGpt: boolean;
    canEditGpt: boolean;
    canDeleteGpt: boolean;
    canInviteUsers: boolean;
    canManageTeam: boolean;
  };
}

interface GPT {
  id: string;
  name: string;
  model: string;
  image_url?: string;
  description?: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin':
      return <FiShield className="text-red-500" size={16} />;
    case 'editor':
      return <FiEdit3 className="text-blue-500" size={16} />;
    case 'viewer':
      return <FiEye className="text-green-500" size={16} />;
    default:
      return <FiUser className="text-gray-500" size={16} />;
  }
};

const getStatusBadge = (status: string) => {
  const variants = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  };
  return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
};

// Loading skeleton
const LoadingSkeleton = React.memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </CardContent>
      </Card>
    ))}
  </div>
));

// Memoized header component
const TeamHeader = React.memo(({ 
  theme, 
  onToggleTheme, 
  onOpenInviteDialog 
}: {
  theme: string;
  onToggleTheme: () => void;
  onOpenInviteDialog: () => void;
}) => (
  <div className="mb-4 md:mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between">
    <div className="text-center sm:text-left">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Manage team members, roles, and permissions
      </p>
    </div>
    <div className="flex items-center gap-2 self-center sm:self-auto mt-3 sm:mt-0">
      <Button
        onClick={onToggleTheme}
        variant="outline"
        size="icon"
        className="rounded-full"
        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
      </Button>
      
      <Button 
        onClick={onOpenInviteDialog}
        className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
      >
        <FiUserPlus size={16} />
        Invite Member
      </Button>
    </div>
  </div>
));

// Memoized filters component
const TeamFilters = React.memo(({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}) => {
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  const handleRoleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onRoleFilterChange(e.target.value);
  }, [onRoleFilterChange]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusFilterChange(e.target.value);
  }, [onStatusFilterChange]);

  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4 flex-shrink-0">
      <div className="relative flex-1 max-w-md">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search team members..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      <select
        value={roleFilter}
        onChange={handleRoleChange}
        className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
      >
        <option value="all">All Roles</option>
        <option value="admin">Admin</option>
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>

      <select
        value={statusFilter}
        onChange={handleStatusChange}
        className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
});

// Memoized team member card
const TeamMemberCard = React.memo(({ 
  member, 
  availableGpts, 
  formatDate, 
  onEditPermissions, 
  onSendEmail, 
  onAssignGpt, 
  onRemoveMember 
}: {
  member: TeamMember;
  availableGpts: GPT[];
  formatDate: (date: string) => string;
  onEditPermissions: (member: TeamMember) => void;
  onSendEmail: (member: TeamMember) => void;
  onAssignGpt: (member: TeamMember) => void;
  onRemoveMember: (member: TeamMember) => void;
}) => {
  const handleEditPermissions = useCallback(() => onEditPermissions(member), [member, onEditPermissions]);
  const handleSendEmail = useCallback(() => onSendEmail(member), [member, onSendEmail]);
  const handleAssignGpt = useCallback(() => onAssignGpt(member), [member, onAssignGpt]);
  const handleRemoveMember = useCallback(() => onRemoveMember(member), [member, onRemoveMember]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base font-semibold">{member.name}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <FiMoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAssignGpt}>
                <FaRobot className="mr-2 h-4 w-4" />
                Assign GPT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEditPermissions}>
                <FiEdit className="mr-2 h-4 w-4" />
                Edit Permissions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendEmail}>
                <FiMail className="mr-2 h-4 w-4" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleRemoveMember}
                className="text-red-600 dark:text-red-400"
              >
                <FiTrash2 className="mr-2 h-4 w-4" />
                Remove Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getRoleIcon(member.role)}
            <span className="text-sm font-medium capitalize">{member.role}</span>
          </div>
          {getStatusBadge(member.status)}
        </div>

        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Joined: {formatDate(member.joinedAt)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Last active: {formatDate(member.lastActive)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Assigned GPTs ({member.assignedGpts.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {member.assignedGpts.slice(0, 3).map((gptId) => {
              const gpt = availableGpts.find(g => g.id === gptId);
              return (
                <Badge key={gptId} variant="secondary" className="text-xs">
                  {gpt?.name || gptId}
                </Badge>
              );
            })}
            {member.assignedGpts.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{member.assignedGpts.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Permissions
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(member.permissions).filter(([_, value]) => value).map(([key]) => (
              <Badge key={key} variant="outline" className="text-xs">
                {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const TeamManagement: React.FC = () => {
  const loaderData = useLoaderData<{
    teamMembers: TeamMember[];
    availableGpts: GPT[];
    currentUser: { id: string; email: string; name: string; avatar?: string; role?: string };
    team: { name: string; description: string };
    error?: string;
  }>();
  
  // Destructure with fallbacks
  const {
    teamMembers = [],
    availableGpts = [],
    currentUser,
    team,
    error
  } = loaderData || {};
  
  const fetcher = useFetcher();
  const { theme, setTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  
  // Dialog states
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditPermissionsOpen, setIsEditPermissionsOpen] = useState(false);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  const [isAssignGptOpen, setIsAssignGptOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'user' as 'admin' | 'user',
    message: ''
  });
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: ''
  });
  const [permissionsForm, setPermissionsForm] = useState<{
    role: TeamMember['role'];
    permissions: TeamMember['permissions'];
  } | null>(null);

  // Add new state for GPT assignment
  const [selectedGptIds, setSelectedGptIds] = useState<string[]>([]);

  // Enhanced debugging
  useEffect(() => {
    console.log('🔍 TeamManagement mounted with data:', {
      hasLoaderData: !!loaderData,
      teamMembersArray: teamMembers,
      teamMembersCount: teamMembers?.length || 0,
      teamMembersType: typeof teamMembers,
      isArray: Array.isArray(teamMembers),
      availableGptsCount: availableGpts?.length || 0,
      currentUser: currentUser,
      team: team,
      error: error
    });

    // Log each team member
    if (teamMembers && teamMembers.length > 0) {
      console.log('👥 Team members details:');
      teamMembers.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.name} (${member.email}) - ${member.role}`);
      });
    } else {
      console.log('❌ No team members found or teamMembers is not an array');
    }
  }, [loaderData, teamMembers, availableGpts, currentUser, team, error]);

  // Show error if exists
  useEffect(() => {
    if (error) {
      console.error('❌ Loader error:', error);
    }
  }, [error]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const filteredMembers = useMemo(() => {
    console.log('🔍 Filtering members. Input:', {
      teamMembersLength: teamMembers?.length || 0,
      searchTerm,
      roleFilter,
      statusFilter
    });

    if (!teamMembers || !Array.isArray(teamMembers) || teamMembers.length === 0) {
      console.log('❌ No team members to filter');
      return [];
    }

    let filtered = teamMembers;

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    console.log('✅ Filtered members result:', {
      originalCount: teamMembers.length,
      filteredCount: filtered.length,
      filtered: filtered.map(m => ({ name: m.name, email: m.email, role: m.role }))
    });

    return filtered;
  }, [teamMembers, searchTerm, roleFilter, statusFilter]);

  const handleInviteMember = useCallback(async () => {
    if (!inviteForm.email || !inviteForm.name) {
      alert('Please fill in all required fields');
      return;
    }

    console.log('🚀 Submitting invitation:', inviteForm);

    fetcher.submit(
      {
        intent: 'invite',
        email: inviteForm.email,
        name: inviteForm.name,
        role: inviteForm.role
      },
      { method: 'post' }
    );
  }, [inviteForm, fetcher]);

  const handleUpdateRole = useCallback((member: TeamMember, newRole: 'admin' | 'user') => {
    if (member.user_id === currentUser.id) {
      alert("You cannot change your own role");
      return;
    }

    if (window.confirm(`Change ${member.name}'s role to ${newRole}?`)) {
      console.log('🔄 Updating role:', member.user_id, 'to:', newRole);
      fetcher.submit(
        { 
          intent: 'updateRole',
          userId: member.user_id,
          role: newRole
        },
        { method: 'post' }
      );
    }
  }, [currentUser.id, fetcher]);

  const handleRemoveMember = useCallback((member: TeamMember) => {
    if (member.user_id === currentUser.id) {
      alert("You cannot remove yourself");
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${member.name}? This action cannot be undone.`)) {
      console.log('🗑️ Removing member:', member.user_id);
      fetcher.submit(
        { 
          intent: 'removeUser',
          userId: member.user_id
        },
        { method: 'post' }
      );
    }
  }, [currentUser.id, fetcher]);

  const handleSendEmail = useCallback(async () => {
    if (!selectedMember || !emailForm.subject || !emailForm.message) {
      alert('Please fill in all fields');
      return;
    }

    // In a real implementation, you'd send this to an email service
    console.log('📧 Sending email to:', selectedMember.email, emailForm);
    alert(`Email would be sent to ${selectedMember.name}!`);
    
    setIsSendEmailOpen(false);
    setEmailForm({ subject: '', message: '' });
  }, [selectedMember, emailForm]);

  const handleEditPermissions = useCallback((member: TeamMember) => {
    setSelectedMember(member);
    setPermissionsForm({
      role: member.role,
      permissions: { ...member.permissions }
    });
    setIsEditPermissionsOpen(true);
  }, []);

  const handleSavePermissions = useCallback(() => {
    if (!selectedMember || !permissionsForm) return;

    console.log('💾 Saving permissions for:', selectedMember.user_id);
    fetcher.submit(
      {
        intent: 'updatePermissions',
        userId: selectedMember.user_id,
        role: permissionsForm.role,
        permissions: JSON.stringify(permissionsForm.permissions)
      },
      { method: 'post' }
    );

    setIsEditPermissionsOpen(false);
    setPermissionsForm(null);
  }, [selectedMember, permissionsForm, fetcher]);

  const handleAssignGpt = useCallback((member: TeamMember) => {
    setSelectedMember(member);
    setSelectedGptIds(member.assignedGpts || []);
    setIsAssignGptOpen(true);
  }, []);

  const handleSaveGptAssignments = useCallback(() => {
    if (!selectedMember) return;

    console.log('💾 Saving GPT assignments for:', selectedMember.user_id);
    fetcher.submit(
      {
        intent: 'assignGpts',
        userId: selectedMember.user_id,
        gptIds: JSON.stringify(selectedGptIds)
      },
      { method: 'post' }
    );

    setIsAssignGptOpen(false);
    setSelectedGptIds([]);
  }, [selectedMember, selectedGptIds, fetcher]);

  const handleGptToggle = useCallback((gptId: string) => {
    setSelectedGptIds(prev => 
      prev.includes(gptId) 
        ? prev.filter(id => id !== gptId)
        : [...prev, gptId]
    );
  }, []);

  const handleSendEmailDialog = useCallback((member: TeamMember) => {
    setSelectedMember(member);
    setEmailForm({
      subject: `Important update from MyGPT Team`,
      message: `Hi ${member.name},\n\nWe wanted to reach out regarding your account...\n\nBest regards,\nMyGPT Team`
    });
    setIsSendEmailOpen(true);
  }, []);

  return (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'dark' : ''} bg-gray-50 dark:bg-neutral-900 text-black dark:text-white overflow-hidden rounded-lg`}>
      <div className="p-4 sm:p-6 flex-shrink-0">
        <div className="mb-4 md:mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{team?.name || 'Team Management'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {team?.description || 'Manage team members, roles, and permissions'}
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
              onClick={() => setIsInviteDialogOpen(true)}
              className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              <FiUserPlus size={16} />
              Invite Member
            </Button>
          </div>
        </div>

        <TeamFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          roleFilter={roleFilter}
          onRoleFilterChange={(value) => setRoleFilter(value as 'admin' | 'user' | 'all')}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => setStatusFilter(value as 'active' | 'pending' | 'inactive' | 'all')}
        />
      </div>

      {/* Team Members Grid */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <ClientOnly fallback={<LoadingSkeleton />}>
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500 dark:text-red-400">
              <h3 className="text-lg font-medium mb-2">Error Loading Team Data</h3>
              <p className="text-sm text-center">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="mt-4"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <FiUsers size={48} className="mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {teamMembers && teamMembers.length === 0 
                  ? 'No team members yet' 
                  : 'No team members found'
                }
              </h3>
              <p className="text-sm text-center">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search terms or filters' 
                  : 'Invite your first team member to get started'
                }
              </p>
              {teamMembers && teamMembers.length === 0 && (
                <Button 
                  onClick={() => setIsInviteDialogOpen(true)}
                  className="mt-4 bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                >
                  <FiUserPlus size={16} className="mr-2" />
                  Invite First Member
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredMembers.length} of {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {filteredMembers.map((member) => (
                  <TeamMemberCard
                    key={member.user_id}
                    member={member}
                    availableGpts={availableGpts}
                    formatDate={formatDate}
                    onEditPermissions={handleEditPermissions}
                    onSendEmail={handleSendEmailDialog}
                    onAssignGpt={handleAssignGpt}
                    onRemoveMember={handleRemoveMember}
                  />
                ))}
              </div>
            </>
          )}
        </ClientOnly>
      </div>

      {/* Dialogs */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your MyGPT team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Name *</Label>
                <Input
                  id="invite-name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="user">User - Can use GPTs</option>
                <option value="admin">Admin - Full access including user management</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-message">Custom Message (Optional)</Label>
              <Textarea
                id="invite-message"
                value={inviteForm.message}
                onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Add a personal message to the invitation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteMember}
              disabled={fetcher.state === 'submitting' || !inviteForm.email || !inviteForm.name}
            >
              {fetcher.state === 'submitting' ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Updated Edit Permissions Dialog */}
      <Dialog open={isEditPermissionsOpen} onOpenChange={setIsEditPermissionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permissions for {selectedMember?.name}</DialogTitle>
            <DialogDescription>
              Manage what this team member can do in your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                value={permissionsForm?.role || 'user'}
                onChange={(e) => setPermissionsForm(prev => prev ? {
                  ...prev,
                  role: e.target.value as TeamMember['role']
                } : null)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPermissionsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePermissions} 
              disabled={fetcher.state === 'submitting'}
            >
              {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSendEmailOpen} onOpenChange={setIsSendEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to {selectedMember?.name}</DialogTitle>
            <DialogDescription>
              Send a direct email to this team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={emailForm.message}
                onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Type your message here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={fetcher.state === 'submitting'}>
              <FiSend className="mr-2 h-4 w-4" />
              {fetcher.state === 'submitting' ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Updated Assign GPT Dialog */}
      <Dialog open={isAssignGptOpen} onOpenChange={setIsAssignGptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign GPTs to {selectedMember?.name}</DialogTitle>
            <DialogDescription>
              Select which GPTs this team member can access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {availableGpts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FaRobot className="mx-auto mb-2" size={32} />
                <p>No GPTs available</p>
                <p className="text-sm">Create some GPTs first to assign them to team members.</p>
              </div>
            ) : (
              availableGpts.map((gpt) => (
                <div key={gpt.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {gpt.image_url && (
                      <img 
                        src={gpt.image_url} 
                        alt={gpt.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium">{gpt.name}</div>
                      <div className="text-sm text-gray-500">{gpt.model}</div>
                      {gpt.description && (
                        <div className="text-xs text-gray-400 line-clamp-1">{gpt.description}</div>
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedGptIds.includes(gpt.id)}
                    onChange={() => handleGptToggle(gpt.id)}
                    className="rounded border-gray-300"
                  />
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignGptOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveGptAssignments}
              disabled={fetcher.state === 'submitting'}
            >
              {fetcher.state === 'submitting' ? 'Updating...' : 'Update Assignments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;
