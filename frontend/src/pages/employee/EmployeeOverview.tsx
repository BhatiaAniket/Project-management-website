import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, RefreshCw, Calendar, ListTodo, Activity, Loader2 } from 'lucide-react';
import { employeeAPI } from '../../api/employee';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const EmployeeOverview = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    upcomingMeetings: 0
  });

  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchOverviewData = useCallback(async () => {
    try {
      const [statsRes, deadlinesRes, meetingsRes, notifsRes] = await Promise.all([
        employeeAPI.getOverviewStats(),
        employeeAPI.getUpcomingDeadlines(),
        employeeAPI.getUpcomingMeetings(),
        employeeAPI.getNotifications() // generic endpoint grabbing latest 3
      ]);
      setStats(statsRes.data.data);
      setUpcomingDeadlines(deadlinesRes.data.data);
      setUpcomingMeetings(meetingsRes.data.data);
      setNotifications(notifsRes.data.data?.slice(0, 3) || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchOverviewData();
    socket.on('task:updated', refresh);
    socket.on('report:reviewed', refresh);
    socket.on('meeting:scheduled', refresh);
    socket.on('notification', refresh);

    return () => {
      socket.off('task:updated', refresh);
      socket.off('report:reviewed', refresh);
      socket.off('meeting:scheduled', refresh);
      socket.off('notification', refresh);
    };
  }, [socket, fetchOverviewData]);

  if (loading) {
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
        className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-border/50 rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold font-heading mb-2">
              Welcome back, {user?.fullName?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              Here is your daily summary
            </p>
          </div>
          <span className="bg-foreground text-background text-xs font-semibold px-3 py-1 rounded-full capitalize">
            {user?.companyName || 'CognifyPM'}
          </span>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-5 hover:border-blue-500/50 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ListTodo className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-heading">{stats.totalTasks}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Tasks</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-5 hover:border-green-500/50 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-heading">{stats.completedTasks}</p>
          <p className="text-sm text-muted-foreground mt-1">Completed</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-2xl p-5 hover:border-orange-500/50 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-heading">{stats.pendingTasks}</p>
          <p className="text-sm text-muted-foreground mt-1">Pending/InProgress</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-2xl p-5 hover:border-red-500/50 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-heading">{stats.overdueTasks}</p>
          <p className="text-sm text-muted-foreground mt-1">Overdue</p>
        </motion.div>
      </div>

      {/* Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Deadlines Widget */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card border border-border rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" /> Upcoming Deadlines</h3>
          <div className="space-y-3">
            {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((t) => (
              <div key={t._id} className="flex justify-between items-center p-3 rounded-xl border border-border bg-background">
                <div>
                  <p className="font-semibold text-sm">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.project?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium px-2 py-1 bg-muted rounded truncate">
                    {new Date(t.dueDate).toLocaleDateString()}
                  </p>
                  <p className={`text-[10px] mt-1 capitalize ${t.priority === 'high' ? 'text-red-500' :
                      t.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`}>
                    {t.priority} Priority
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-muted-foreground"><p className="text-sm">No upcoming deadlines.</p></div>
            )}
          </div>
        </motion.div>

        {/* Meetings & Notifications Column */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-pink-500" /> Meetings</h3>
            <div className="space-y-3">
              {upcomingMeetings.length > 0 ? upcomingMeetings.map((m) => (
                <div key={m._id} className="p-3 rounded-xl border border-border bg-background">
                  <p className="font-semibold text-sm">{m.title}</p>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="capitalize">{m.type}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-muted-foreground"><p className="text-sm">No upcoming meetings.</p></div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-500" /> Recent Activity</h3>
            <div className="space-y-3">
              {notifications.length > 0 ? notifications.map((n) => (
                <div key={n._id} className="flex gap-3 text-sm border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-muted-foreground"><p className="text-sm">Catching up! You're all read.</p></div>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default EmployeeOverview;
