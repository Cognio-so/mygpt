import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  FiUser, 
  FiUserPlus, 
  FiMail, 
  FiEdit, 
  FiTrash2, 
  FiSearch, 
  FiFilter, 
  FiMoreVertical,
  FiSun,
  FiMoon,
  FiShield,
  FiEye,
  FiEdit3,
  FiSettings,
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
  DialogTrigger,
} from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
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
}

const TeamManagement: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'editor' | 'viewer'>('all');
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
    role: 'viewer' as TeamMember['role'],
    message: ''
  });
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: ''
  });

  // Mock data
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@mygpt.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      role: 'admin',
      status: 'active',
      joinedAt: '2024-01-01T00:00:00Z',
      lastActive: '2024-01-15T10:30:00Z',
      assignedGpts: ['gpt1', 'gpt2', 'gpt3'],
      permissions: {
        canCreateGpt: true,
        canEditGpt: true,
        canDeleteGpt: true,
        canInviteUsers: true,
        canManageTeam: true
      }
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@mygpt.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
      role: 'editor',
      status: 'active',
      joinedAt: '2024-01-05T00:00:00Z',
      lastActive: '2024-01-14T16:45:00Z',
      assignedGpts: ['gpt1', 'gpt4'],
      permissions: {
        canCreateGpt: true,
        canEditGpt: true,
        canDeleteGpt: false,
        canInviteUsers: false,
        canManageTeam: false
      }
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@mygpt.com',
      role: 'viewer',
      status: 'pending',
      joinedAt: '2024-01-10T00:00:00Z',
      lastActive: '2024-01-12T14:20:00Z',
      assignedGpts: ['gpt1'],
      permissions: {
        canCreateGpt: false,
        canEditGpt: false,
        canDeleteGpt: false,
        canInviteUsers: false,
        canManageTeam: false
      }
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah@mygpt.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      role: 'editor',
      status: 'inactive',
      joinedAt: '2023-12-15T00:00:00Z',
      lastActive: '2024-01-08T11:00:00Z',
      assignedGpts: ['gpt2', 'gpt5'],
      permissions: {
        canCreateGpt: true,
        canEditGpt: true,
        canDeleteGpt: false,
        canInviteUsers: false,
        canManageTeam: false
      }
    }
  ]);

  const [availableGpts] = useState<GPT[]>([
    { id: 'gpt1', name: 'Marketing Assistant', model: 'GPT-4o' },
    { id: 'gpt2', name: 'Code Helper', model: 'GPT-4o-mini' },
    { id: 'gpt3', name: 'Writing Coach', model: 'Claude 3.5' },
    { id: 'gpt4', name: 'Data Analyst', model: 'Gemini Pro' },
    { id: 'gpt5', name: 'Customer Support', model: 'GPT-4o' }
  ]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

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

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const filteredMembers = useMemo(() => {
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

    return filtered;
  }, [teamMembers, searchTerm, roleFilter, statusFilter]);

  const handleInviteMember = useCallback(async () => {
    // Simulate API call
    console.log('Inviting member:', inviteForm);
    alert(`Invitation sent to ${inviteForm.email}!`);
    setIsInviteDialogOpen(false);
    setInviteForm({ email: '', name: '', role: 'viewer', message: '' });
  }, [inviteForm]);

  const handleSendEmail = useCallback(async () => {
    if (!selectedMember) return;
    console.log('Sending email to:', selectedMember.email, emailForm);
    alert(`Email sent to ${selectedMember.name}!`);
    setIsSendEmailOpen(false);
    setEmailForm({ subject: '', message: '' });
  }, [selectedMember, emailForm]);

  const handleRemoveMember = useCallback((member: TeamMember) => {
    if (window.confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
      console.log('Removing member:', member.id);
      alert(`${member.name} has been removed from the team.`);
    }
  }, []);

  const handleEditPermissions = useCallback((member: TeamMember) => {
    setSelectedMember(member);
    setIsEditPermissionsOpen(true);
  }, []);

  const handleAssignGpt = useCallback((member: TeamMember) => {
    setSelectedMember(member);
    setIsAssignGptOpen(true);
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
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'dark' : ''} bg-gray-50 dark:bg-neutral-900 text-black dark:text-white p-4 sm:p-6 overflow-hidden rounded-lg`}>
      {/* Header */}
      <div className="mb-4 md:mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage team members, roles, and permissions
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
          
          {/* Invite Member Dialog */}
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
                <FiUserPlus size={16} />
                Invite Member
              </Button>
            </DialogTrigger>
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
                    <Label htmlFor="invite-name">Name</Label>
                    <Input
                      id="invite-name"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as TeamMember['role'] }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
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
                <Button onClick={handleInviteMember}>
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Team Members Grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <FiUsers size={48} className="mb-4" />
            <h3 className="text-lg font-medium mb-2">No team members found</h3>
            <p className="text-sm text-center">
              {searchTerm ? 'Try adjusting your search terms or filters' : 'Invite your first team member to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
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
                        <DropdownMenuItem onClick={() => handleAssignGpt(member)}>
                          <FaRobot  className="mr-2 h-4 w-4" />
                          Assign GPT
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditPermissions(member)}>
                          <FiEdit className="mr-2 h-4 w-4" />
                          Edit Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendEmailDialog(member)}>
                          <FiMail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleRemoveMember(member)}
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
            ))}
          </div>
        )}
      </div>

      {/* Send Email Dialog */}
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
            <Button onClick={handleSendEmail}>
              <FiSend className="mr-2 h-4 w-4" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
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
                value={selectedMember?.role}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              {selectedMember && Object.entries(selectedMember.permissions).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-sm">
                    {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <input
                    type="checkbox"
                    checked={value}
                    className="rounded border-gray-300"
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPermissionsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsEditPermissionsOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign GPT Dialog */}
      <Dialog open={isAssignGptOpen} onOpenChange={setIsAssignGptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign GPTs to {selectedMember?.name}</DialogTitle>
            <DialogDescription>
              Select which GPTs this team member can access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {availableGpts.map((gpt) => (
              <div key={gpt.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{gpt.name}</div>
                  <div className="text-sm text-gray-500">{gpt.model}</div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedMember?.assignedGpts.includes(gpt.id)}
                  className="rounded border-gray-300"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignGptOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsAssignGptOpen(false)}>
              Update Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;
