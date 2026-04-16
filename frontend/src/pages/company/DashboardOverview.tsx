import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { 
  Users, UserCheck, FolderOpen, CheckCircle, Clock, Calendar,
  TrendingUp, BarChart3, PieChart, Activity, AlertCircle,
  Plus, ArrowUp, ArrowDown, Loader2, Star
} from 'lucide-react';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart, Line, Area } from 'recharts';
import { useSocket } from '../../context/SocketContext';
import HoverCard from '../../components/HoverCard';

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [companyName, setCompanyName] = useState('');
  const [stats, setStats] = useState({
    totalManagers: 0,
    totalEmployees: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingTasks: 0,
    upcomingMeetings: 0
  });
  const [projectProgress, setProjectProgress] = useState([]);
  const [taskStatus, setTaskStatus] = useState({ todo: 0, inProgress: 0, done: 0, overdue: 0 });
  const [weeklyProductivity, setWeeklyProductivity] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [performanceSummary, setPerformanceSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Hover States
  const [hoverData, setHoverData] = useState<Record<string, any>>({});
  const [hoverLoading, setHoverLoading] = useState<Record<string, boolean>>({});

  const fetchHover = async (type: string) => {
    // Can optionally decide to not re-fetch if we have it, but realtime we might want fresh. For now cache is fine for a session:
    if (hoverData[type]) return; 
    setHoverLoading(prev => ({ ...prev, [type]: true }));
    try {
      const res = await companyAPI.getHoverDetails(type);
      setHoverData(prev => ({ ...prev, [type]: res.data.data }));
    } catch (e) {
      console.error(e);
    } finally {
      setHoverLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [
        statsRes,
        progressRes,
        taskStatusRes,
        productivityRes,
        deadlinesRes,
        activityRes,
        perfRes
      ] = await Promise.all([
        companyAPI.getOverviewStats(),
        companyAPI.getProjectsProgress(),
        companyAPI.getTasksStatusSummary(),
        companyAPI.getWeeklyProductivity(),
        companyAPI.getUpcomingDeadlines(),
        companyAPI.getRecentActivity(),
        companyAPI.getPerformanceSummary()
      ]);

      setCompanyName(statsRes.data.data?.companyName || statsRes.data.companyName || '');
      setStats(statsRes.data.data || statsRes.data);
      setProjectProgress(progressRes.data.data || []);
      setTaskStatus(taskStatusRes.data.data || { todo: 0, inProgress: 0, done: 0, overdue: 0 });
      setWeeklyProductivity(productivityRes.data.data || []);
      setUpcomingDeadlines(deadlinesRes.data.data || []);
      setRecentActivity(activityRes.data.data || []);
      setPerformanceSummary(perfRes.data.data || []);

      // Invalidate hover cache if data refreshed from socket
      setHoverData({});
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!socket) return;
    const updateListener = () => {
      fetchAllData();
    };
    socket.on('project:updated', updateListener);
    socket.on('task:updated', updateListener);
    socket.on('people:updated', updateListener);
    return () => {
      socket.off('project:updated', updateListener);
      socket.off('task:updated', updateListener);
      socket.off('people:updated', updateListener);
    };
  }, [socket, fetchAllData]);

  const COLORS = {
    todo: '#94a3b8',
    inProgress: '#3b82f6',
    done: '#22c55e',
    overdue: '#ef4444'
  };

  if (loading) {
    // Truncated skeleton for brevity, matches original
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-border/50 rounded-2xl p-6"
      >
        <h1 className="text-3xl font-bold font-heading mb-2">
          Welcome to CognifyPM{companyName ? `, ${companyName}` : ''}! 
        </h1>
        <p className="text-muted-foreground">Here's what's happening today</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Managers */}
        <HoverCard 
          width="w-64"
          onEnter={() => fetchHover('managers')}
          content={
            hoverLoading['managers'] ? <div className="p-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            : hoverData['managers']?.length ? hoverData['managers'].map((m: any, i: number) => (
              <div key={i} className="py-2 border-b border-border last:border-0">
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.department || 'No dept'} • {m.position || 'No pos'}</p>
              </div>
            )) : <p className="text-xs text-center p-2">No managers</p>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-full bg-card border border-border rounded-2xl p-5 hover:border-blue-500/50 transition-all duration-300 hover:translate-y-[-2px] cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold font-heading">
              <CountUp end={stats.totalManagers} duration={2} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">Managers</p>
          </motion.div>
        </HoverCard>

        {/* Employees */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-5 hover:border-purple-500/50 transition-all duration-300 hover:translate-y-[-2px]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-heading">
            <CountUp end={stats.totalEmployees} duration={2} />
          </p>
          <p className="text-sm text-muted-foreground mt-1">Employees</p>
        </motion.div>

        {/* Active Projects */}
        <HoverCard 
          width="w-64"
          onEnter={() => fetchHover('active-projects')}
          content={
            hoverLoading['active-projects'] ? <div className="p-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            : hoverData['active-projects']?.length ? hoverData['active-projects'].map((p: any, i: number) => (
              <div key={i} className="py-2 border-b border-border last:border-0">
                <p className="text-sm font-semibold">{p.name}</p>
                <div className="flex justify-between items-center text-xs mt-1 text-muted-foreground">
                  <span>Manager: {p.assignedManagerName}</span>
                  <span className="font-medium text-foreground">{p.progress}%</span>
                </div>
              </div>
            )) : <p className="text-xs text-center p-2">No active projects</p>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="h-full bg-card border border-border rounded-2xl p-5 hover:border-green-500/50 transition-all duration-300 hover:translate-y-[-2px] cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                <FolderOpen className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold font-heading">
              <CountUp end={stats.activeProjects} duration={2} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">Active Projects</p>
          </motion.div>
        </HoverCard>

        {/* Completed Projects */}
        <HoverCard 
          width="w-64"
          onEnter={() => fetchHover('completed-projects')}
          content={
            hoverLoading['completed-projects'] ? <div className="p-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            : hoverData['completed-projects']?.length ? hoverData['completed-projects'].map((p: any, i: number) => (
              <div key={i} className="py-2 border-b border-border last:border-0">
                <p className="text-sm font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500"/> {p.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Manager: {p.assignedManagerName}</p>
              </div>
            )) : <p className="text-xs text-center p-2">No completed projects</p>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="h-full bg-card border border-border rounded-2xl p-5 hover:border-teal-500/50 transition-all duration-300 hover:translate-y-[-2px] cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold font-heading">
              <CountUp end={stats.completedProjects} duration={2} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">Completed</p>
          </motion.div>
        </HoverCard>

        {/* Pending Tasks */}
        <HoverCard 
          width="w-64"
          onEnter={() => fetchHover('pending-tasks')}
          content={
            hoverLoading['pending-tasks'] ? <div className="p-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            : hoverData['pending-tasks']?.length ? hoverData['pending-tasks'].map((t: any, i: number) => (
              <div key={i} className="py-2 border-b border-border last:border-0">
                <p className="text-sm font-semibold truncate" title={t.title}>{t.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Priority: <span className="capitalize">{t.priority}</span>
                  {t.dueDate && ` • Due: ${new Date(t.dueDate).toLocaleDateString()}`}
                </p>
              </div>
            )) : <p className="text-xs text-center p-2">No pending tasks</p>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="h-full bg-card border border-border rounded-2xl p-5 hover:border-orange-500/50 transition-all duration-300 hover:translate-y-[-2px] cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold font-heading">
              <CountUp end={stats.pendingTasks} duration={2} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">Pending Tasks</p>
          </motion.div>
        </HoverCard>

        {/* Meetings */}
        <HoverCard 
          width="w-64"
          onEnter={() => fetchHover('meetings')}
          content={
            hoverLoading['meetings'] ? <div className="p-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            : hoverData['meetings']?.length ? hoverData['meetings'].map((m: any, i: number) => (
              <div key={i} className="py-2 border-b border-border last:border-0">
                <p className="text-sm font-semibold">{m.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  At: {new Date(m.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                <p className="text-[10px] bg-muted inline-block px-1.5 py-0.5 rounded mt-1">{m.participantCount} pcts</p>
              </div>
            )) : <p className="text-xs text-center p-2">No upcoming meetings</p>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="h-full bg-card border border-border rounded-2xl p-5 hover:border-pink-500/50 transition-all duration-300 hover:translate-y-[-2px] cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold font-heading">
              <CountUp end={stats.upcomingMeetings} duration={2} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">Meetings</p>
          </motion.div>
        </HoverCard>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">PROJECT PROGRESS</h3>
          {projectProgress.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="progress" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <FolderOpen className="w-12 h-12 mb-2" />
              <p>No projects yet. Create your first project.</p>
            </div>
          )}
        </motion.div>

        {/* Task Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">TASK STATUS</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={[
                  { name: 'To Do', value: taskStatus.todo },
                  { name: 'In Progress', value: taskStatus.inProgress },
                  { name: 'Done', value: taskStatus.done },
                  { name: 'Overdue', value: taskStatus.overdue }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                <Cell fill={COLORS.todo} />
                <Cell fill={COLORS.inProgress} />
                <Cell fill={COLORS.done} />
                <Cell fill={COLORS.overdue} />
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <span className="text-sm">To Do ({taskStatus.todo})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">In Progress ({taskStatus.inProgress})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm">Done ({taskStatus.done})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm">Overdue ({taskStatus.overdue})</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Productivity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">TEAM PRODUCTIVITY - THIS WEEK</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyProductivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">RECENT ACTIVITY</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    activity.color === 'green' ? 'bg-green-500' :
                    activity.color === 'blue' ? 'bg-blue-500' :
                    activity.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Activity className="w-12 h-12 mx-auto mb-2" />
                <p>No activity yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">UPCOMING DEADLINES</h3>
          <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((deadline: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div>
                    <p className="font-medium text-sm">{deadline.title}</p>
                    <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(deadline.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    deadline.colorClass === 'red' ? 'bg-red-100 text-red-700' :
                    deadline.colorClass === 'orange' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {deadline.daysRemaining < 0 ? 'Overdue' : deadline.daysRemaining === 0 ? 'Today' : `${deadline.daysRemaining} days`}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="w-12 h-12 mx-auto mb-2" />
                <p>No upcoming deadlines</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-card border border-border rounded-2xl p-6 flex flex-col"
        >
          <h3 className="text-lg font-semibold mb-4">QUICK ACTIONS</h3>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <button 
              onClick={() => navigate('/company/people', { state: { openModal: true, role: 'manager' } })}
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-border hover:bg-muted transition-colors bg-background"
            >
              <Plus className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">Add Manager</span>
            </button>
            <button 
              onClick={() => navigate('/company/people', { state: { openModal: true, role: 'employee' } })}
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-border hover:bg-muted transition-colors bg-background"
            >
              <Plus className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium">Add Employee</span>
            </button>
            <button 
              onClick={() => navigate('/company/projects', { state: { openModal: true } })}
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-border hover:bg-muted transition-colors bg-background"
            >
              <FolderOpen className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">New Project</span>
            </button>
            <button 
              onClick={() => navigate('/company/meetings', { state: { openModal: true } })}
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-border hover:bg-muted transition-colors bg-background"
            >
              <Calendar className="w-5 h-5 text-pink-500" />
              <span className="text-sm font-medium">Schedule Meeting</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Row 4: Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold">EMPLOYEE PERFORMANCE</h3>
        </div>

        {performanceSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground tracking-wider">
                  <th className="pb-3 pr-4 font-semibold">Employee</th>
                  <th className="pb-3 pr-4 font-semibold">Score</th>
                  <th className="pb-3 pr-4 font-semibold">Completed</th>
                  <th className="pb-3 font-semibold text-right">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {performanceSummary.map((emp: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-3 pr-4 text-sm font-medium">{emp.name}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${emp.score >= 80 ? 'bg-green-500' : emp.score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} 
                            style={{ width: `${emp.score}%` }} 
                          />
                        </div>
                        <span className="text-xs font-medium">{emp.score}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{emp.done} / {emp.total}</td>
                    <td className="py-3 text-sm font-medium text-right text-red-500">{emp.overdue > 0 ? emp.overdue : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No performance data available</p>
          </div>
        )}
      </motion.div>

    </div>
  );
};

export default DashboardOverview;
