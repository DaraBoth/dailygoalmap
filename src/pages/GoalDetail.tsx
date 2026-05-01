import React, { useState, useEffect } from 'react';
import { useLoaderData, useSearch, useParams, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import GoalDetailHeader from '@/components/goal/GoalDetailHeader';
import Calendar from '@/components/Calendar';
import SmartAnalytics from '@/components/goal/SmartAnalytics';
import { GoalMember } from '@/types/goal';
import { enableRealtimeForTable } from '@/components/calendar/taskDatabase';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/components/calendar/types';
import { GoalTheme } from '@/types/theme';
import { useAuth } from '@/hooks/useAuth';
import { GoalChatWidget } from '@/components/goal/GoalChatWidget';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGoalSharing } from '@/hooks/useGoalSharing';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from '@/lib/utils';
import { Menu, LayoutDashboard, BarChart2, ArrowLeft, Users, Copy, RefreshCw, Check, ChevronRight, Crown, UserMinus, Share2, PanelLeftClose, PanelLeftOpen, Search, Trash2, UserPlus } from 'lucide-react';
import { searchUsers, sendInvitation, SearchUser } from '@/services/internalNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ThemeSelector } from '@/components/goal/ThemeSelector';
import { GoalSwitcher } from '@/components/goal/GoalSwitcher';
import { formatDistanceToNow } from 'date-fns';
import { normalizeTaskList, normalizeTaskRecord } from '@/components/calendar/taskNormalization';

const GoalDetail: React.FC = () => {
  const { id: goalId } = useParams({ from: '/goal/$id' });
  const loaderData = useLoaderData({ from: '/goal/$id' }) as any;
  const search = useSearch({ strict: false }) as any;
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const goalData = loaderData?.goal || null;
  const goalTheme = goalData?.goal_themes || null;

  const [currentGoalData, setCurrentGoalData] = useState(goalData);
  const [currentTheme, setCurrentTheme] = useState<GoalTheme | null>(goalTheme);
  const [members, setMembers] = useState<GoalMember[]>(loaderData?.members || []);
  const [tasks, setTasks] = useState<Task[]>(normalizeTaskList(loaderData?.tasks || []));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState("overview");
  const [autoOpenTaskId, setAutoOpenTaskId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteResults, setInviteResults] = useState<SearchUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());

  const {
    shareCode, isLoading: shareLoading, isRegenerating,
    fetchShareCode, regenerateShareCode,
    members: sharingMembers, isLoadingMembers,
    fetchMembers, removeMember,
  } = useGoalSharing(goalId);

  // Use sharing members (from RPC with display_name) when available, fall back to loader members
  const displayMembers = sharingMembers.length > 0 ? sharingMembers : members;

  const filteredMembers = displayMembers.filter(m =>
    (m.user_profiles?.display_name || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  const getLastSeenLabel = (lastSeen?: string | null) => {
    if (!lastSeen) return 'Last seen: not available';
    const parsed = new Date(lastSeen);
    if (isNaN(parsed.getTime())) return 'Last seen: not available';

    const minutesAgo = Math.floor((Date.now() - parsed.getTime()) / 60000);
    if (minutesAgo <= 2) return 'Active now';

    return `Last seen ${formatDistanceToNow(parsed, { addSuffix: true })}`;
  };

  const handleOpenMembersSheet = () => {
    setIsMembersSheetOpen(true);
    setInviteSearch('');
    setInviteResults([]);
    if (!shareCode) fetchShareCode();
    fetchMembers();
  };

  // Debounced search for users to invite (exclude existing members)
  useEffect(() => {
    if (!inviteSearch.trim()) {
      setInviteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const results = await searchUsers(inviteSearch, 8);
        const memberUserIds = new Set(displayMembers.map(m => m.user_id));
        setInviteResults(results.filter(u => !memberUserIds.has(u.id)));
      } finally {
        setIsSearchingUsers(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [inviteSearch, displayMembers]);

  const handleInvite = async (targetUser: SearchUser) => {
    if (!user?.id) return;
    setSentInvites(prev => new Set(prev).add(targetUser.id));
    const result = await sendInvitation(goalId, targetUser.id, {
      goal_title: goalTitle,
      url: `/goal/${goalId}`,
    });
    if (!result.ok) {
      toast({
        title: "Couldn't send invitation",
        description: result.error || 'Please try again.',
        variant: 'destructive',
      });
      setSentInvites(prev => { const s = new Set(prev); s.delete(targetUser.id); return s; });
    } else {
      toast({
        title: 'Invitation sent',
        description: `${targetUser.display_name || targetUser.email || 'User'} was invited to join.`,
      });
    }
  };

  const handleCopyShareCode = () => {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const goalTitle = currentGoalData?.title || '';
  const goalDescription = currentGoalData?.description || '';
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0;

  // Update last seen when user views this goal
  useEffect(() => {
    if (!goalId || !user?.id) return;

    const updateLastSeen = async () => {
      try {
        await supabase.rpc('update_member_last_seen', { p_goal_id: goalId });
      } catch (error) {
        console.error('Failed to update last seen:', error);
      }
    };

    updateLastSeen();
  }, [goalId, user?.id]);

  useEffect(() => {
    const taskParam = search?.task || search?.taskId;
    if (taskParam) {
      setAutoOpenTaskId(taskParam);
      setActiveTab("overview");
    }
  }, [search]);

  // Sync state with loaderData
  useEffect(() => {
    if (loaderData) {
      if (loaderData.goal) {
        setCurrentGoalData(loaderData.goal);
        if (loaderData.goal.goal_themes) {
          setCurrentTheme(loaderData.goal.goal_themes);
        } else {
          setCurrentTheme(null);
        }
      }
      if (loaderData.members) setMembers(loaderData.members);
      if (loaderData.tasks) setTasks(normalizeTaskList(loaderData.tasks));
    }
  }, [loaderData]);

  // Fetch theme when goal data changes
  useEffect(() => {
    const fetchTheme = async () => {
      if (!goalData?.theme_id) {
        setCurrentTheme(null);
        return;
      }

      const { data, error } = await supabase
        .from('goals')
        .select('*,goal_themes(*)')
        .eq('id', goalId)
        .single();

      if (!error) {
        setCurrentTheme(data.goal_themes as GoalTheme);
      }
    };

    fetchTheme();
  }, [goalId, goalData?.theme_id]);

  const handleThemeChange = async (themeId = "", isRemove = false) => {
    if (!goalId) return;

    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update({ theme_id: themeId })
      .eq('id', goalId)
      .select()
      .single();

    if (updatedGoal) {
      if (!isRemove) {
        const { data } = await supabase.from('goal_themes').select('*').eq('id', themeId).single();
        if (data) setCurrentTheme(data as GoalTheme);
      } else {
        setCurrentTheme(null);
      }
      toast({ title: 'Success', description: 'Theme updated successfully' });
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!goalId) return;
    enableRealtimeForTable('tasks').catch(() => { });

    const channel = supabase
      .channel(`task-changes-${goalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `goal_id=eq.${goalId}` }, async (payload) => {
        // Handle realtime updates more efficiently - update only the affected task
        if (payload.eventType === 'INSERT' && payload.new) {
          const normalizedNew = normalizeTaskRecord(payload.new as any);
          setTasks(prev => [...prev, normalizedNew]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Merge payload.new with the existing task to preserve any fields not included in the realtime payload
          setTasks(prev => prev.map(t => t.id === payload.new.id ? normalizeTaskRecord({ ...t, ...(payload.new as any) }) : t));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        } else {
          // Fallback: refetch all tasks only if we can't handle the specific change
          const { data, error } = await supabase.from('tasks').select('*').eq('goal_id', goalId);
          if (!error && data) setTasks(normalizeTaskList(data as any[]));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [goalId]);

  const backgroundStyle = currentTheme?.page_background_image
    ? {
      backgroundImage: `url(${currentTheme.page_background_image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
    : {};

  const navItems = [
    { id: 'overview', label: 'Tasks', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <>
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background" style={backgroundStyle}>

        {/* Sidebar - Desktop Only (Vercel-style) */}
        <aside className={cn(
          "hidden lg:flex flex-col border-r border-border/50 bg-background/80 backdrop-blur-xl shrink-0 transition-all duration-300",
          isSidebarCollapsed ? "w-14" : "w-56 xl:w-60"
        )}>
          {/* Back + Goal Switcher + Collapse */}
          <div className="flex items-center gap-1 p-2 border-b border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => navigate({ to: '/dashboard' })}
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <GoalSwitcher />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 ml-auto"
              onClick={() => setIsSidebarCollapsed(v => !v)}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed
                ? <PanelLeftOpen className="h-3.5 w-3.5" />
                : <PanelLeftClose className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Progress Section */}
          {!isSidebarCollapsed && (
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-semibold tabular-nums">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1 bg-border" />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {completedTasksCount} / {tasks.length} tasks done
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isSidebarCollapsed ? 'justify-center px-0' : '',
                  activeTab === item.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Members Button */}
          <div className="px-2 py-2 border-t border-border/50">
            <button
              onClick={handleOpenMembersSheet}
              title={isSidebarCollapsed ? 'Members' : undefined}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50",
                isSidebarCollapsed ? 'justify-center px-0' : ''
              )}
            >
              <Users className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">Members</span>
                  <span className="text-[11px] tabular-nums bg-accent px-1.5 py-0.5 rounded-sm">{displayMembers.length}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                </>
              )}
            </button>
          </div>

          {/* Theme Selector */}
          {user?.id && (
            <div className="px-2 py-2 border-t border-border/50">
              <ThemeSelector
                userId={user.id}
                currentThemeId={currentTheme?.id}
                onThemeSelect={handleThemeChange}
                collapsed={isSidebarCollapsed}
              />
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
              {/* Mobile: back + hamburger */}
              <div className="flex items-center gap-1 lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate({ to: '/dashboard' })}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-border/50">
                        <GoalSwitcher />
                      </div>
                      <div className="px-4 py-3 border-b border-border/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">Progress</span>
                          <span className="text-xs font-semibold">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                        <p className="text-[11px] text-muted-foreground mt-1">{completedTasksCount} / {tasks.length} tasks</p>
                      </div>
                      <nav className="flex-1 p-2 space-y-0.5">
                        {navItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                              activeTab === item.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </nav>
                      <div className="px-2 py-2 border-t border-border/50">
                        <button
                          onClick={() => { setIsSidebarOpen(false); handleOpenMembersSheet(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        >
                          <Users className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">Members</span>
                          <span className="text-[11px] tabular-nums bg-accent px-1.5 py-0.5 rounded-sm">{members.length}</span>
                          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                        </button>
                      </div>
                      {user?.id && (
                        <div className="px-2 py-2 border-t border-border/50">
                          <ThemeSelector userId={user.id} currentThemeId={currentTheme?.id} onThemeSelect={handleThemeChange} />
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Goal Title */}
              <h1 className="flex-1 text-sm font-semibold truncate text-foreground">{goalTitle}</h1>

              {/* Desktop tab pills */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      activeTab === item.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              {/* Mobile active tab pill */}
              <span className="lg:hidden text-xs font-medium text-muted-foreground px-2 py-1 bg-accent/50 rounded-md capitalize">
                {navItems.find(n => n.id === activeTab)?.label ?? activeTab}
              </span>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <Calendar
                    goalId={goalId}
                    goalTitle={goalTitle}
                    goalDescription={goalDescription}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    allTasks={tasks}
                    autoOpenTaskId={autoOpenTaskId}
                    onAutoOpenTaskHandled={() => setAutoOpenTaskId(null)}
                  />
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                  className="h-full overflow-y-auto px-4 sm:px-6 pt-0 pb-6"
                >
                  <div className="max-w-7xl mx-auto">
                    <SmartAnalytics
                      goalId={goalId}
                      tasks={tasks}
                      members={displayMembers}
                      goalTitle={goalTitle}
                      goalDescription={goalDescription}
                      targetDate={currentGoalData?.target_date}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Chat Widget */}
      <GoalChatWidget goalId={goalId} userInfo={user} tasks={tasks} goalTitle={goalTitle} />

      {/* Members Sheet */}
      <Sheet open={isMembersSheetOpen} onOpenChange={setIsMembersSheetOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn('p-0 flex flex-col', isMobile ? 'h-[88vh] rounded-t-2xl' : 'w-88 sm:w-96')}>
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4" />
              Members &amp; Sharing
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-0">
            {/* Share Code */}
            <div className="px-5 py-4 border-b border-border/50">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Invite Code</p>
              {shareLoading ? (
                <div className="h-9 bg-accent/50 rounded-md animate-pulse" />
              ) : shareCode ? (
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={shareCode}
                    className="h-9 font-mono text-xs bg-accent/30 border-border/50 flex-1"
                  />
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={handleCopyShareCode} title="Copy code">
                    {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={regenerateShareCode} disabled={isRegenerating} title="Regenerate code">
                    <RefreshCw className={cn('h-4 w-4', isRegenerating && 'animate-spin')} />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={fetchShareCode} className="w-full h-9 text-xs gap-2">
                  <Share2 className="h-3.5 w-3.5" /> Get Share Code
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">Share this code so others can join this goal.</p>
            </div>

            {/* Member List */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Members &middot; {displayMembers.length}
                </p>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-accent/30 border-border/50"
                />
              </div>

              {isLoadingMembers ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="h-8 w-8 rounded-full bg-accent animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 bg-accent rounded animate-pulse" />
                        <div className="h-2.5 w-16 bg-accent/60 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No members found</p>
              ) : (
                <div className="space-y-0.5">
                  {filteredMembers.map(m => (
                    <div key={m.user_id} className="flex items-center gap-3 py-2 px-2 rounded-md group hover:bg-accent/40 transition-colors">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={m.user_profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{(m.user_profiles?.display_name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.user_profiles?.display_name || 'Unknown'}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{m.role}</p>
                        <p className="text-[11px] text-muted-foreground/80">{getLastSeenLabel(m.last_seen)}</p>
                      </div>
                      {m.role === 'creator'
                        ? <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        : m.user_id !== user?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => removeMember(m.id)}
                            title="Remove member"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        )
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invite Section */}
            <div className="px-5 py-4 border-t border-border/50">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Invite Members</p>
              <div className="relative mb-3">
                <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name or email..."
                  value={inviteSearch}
                  onChange={e => setInviteSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-accent/30 border-border/50"
                />
              </div>

              {isSearchingUsers ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="h-8 w-8 rounded-full bg-accent animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 bg-accent rounded animate-pulse" />
                        <div className="h-2.5 w-16 bg-accent/60 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : inviteSearch.trim() && inviteResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
              ) : inviteResults.length > 0 ? (
                <div className="space-y-0.5">
                  {inviteResults.map(u => (
                    <div key={u.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-accent/40 transition-colors">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(u.display_name || u.email || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.display_name || 'User'}</p>
                        {u.email && <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={sentInvites.has(u.id) ? 'outline' : 'default'}
                        className="h-7 text-xs px-2.5 gap-1 shrink-0"
                        onClick={() => handleInvite(u)}
                        disabled={sentInvites.has(u.id)}
                      >
                        {sentInvites.has(u.id)
                          ? <><Check className="h-3.5 w-3.5" /> Invited</>
                          : <><UserPlus className="h-3.5 w-3.5" /> Invite</>
                        }
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Type a name or email to search
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default GoalDetail;
