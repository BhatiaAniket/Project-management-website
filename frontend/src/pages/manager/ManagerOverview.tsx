import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
   Users, FolderOpen, CheckCircle, Clock, Calendar, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { useCallback } from 'react';

const ManagerOverview = () => {
   const { user } = useAuth();
   const { socket } = useSocket();
   const [stats, setStats] = useState({
      totalEmployees: 0,
      activeProjects: 0,
      completedProjects: 0,
      pendingTasks: 0,
      upcomingMeetings: 0
   });
   const [projectProgress, setProjectProgress] = useState([]);
   const [taskStatus, setTaskStatus] = useState({ todo: 0, inProgress: 0, done: 0, overdue: 0 });
   const [recentActivity, setRecentActivity] = useState([]);
   const [loading, setLoading] = useState(true);

   const fetchAllData = useCallback(async () => {
      try {
         const [
            statsRes,
            progressRes,
            taskStatusRes,
            activityRes
         ] = await Promise.all([
            companyAPI.getOverviewStats(),
            companyAPI.getProjectsProgress(),
            companyAPI.getTasksStatusSummary(),
            companyAPI.getRecentActivity()
         ]);

         setStats(statsRes.data.data);
         setProjectProgress(progressRes.data.data);
         setTaskStatus(taskStatusRes.data.data);
         setRecentActivity(activityRes.data.data);
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
      const refresh = () => fetchAllData();
      socket.on('task:updated', refresh);
      socket.on('report:submitted', refresh);
      socket.on('report:reviewed', refresh);
      socket.on('meeting:scheduled', refresh);

      return () => {
         socket.off('task:updated', refresh);
         socket.off('report:submitted', refresh);
         socket.off('report:reviewed', refresh);
         socket.off('meeting:scheduled', refresh);
      };
   }, [socket, fetchAllData]);

   const COLORS = {
      todo: '#94a3b8',
      inProgress: '#3b82f6',
      done: '#22c55e',
      overdue: '#ef4444'
   };

   if (loading) {
      return (
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
               {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-5">
                     <div className="animate-pulse">
                        <div className="h-10 w-10 bg-muted rounded-lg mb-3"></div>
                        <div className="h-8 w-20 bg-muted rounded mb-2"></div>
                        <div className="h-4 w-16 bg-muted rounded"></div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         {/* Welcome Banner */}
         <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-500/10 to-teal-500/10 border border-border/50 rounded-2xl p-6"
         >
            <h1 className="text-3xl font-bold font-heading mb-2">
               Welcome back, {user?.fullName}!
            </h1>
            <p className="text-muted-foreground">Here is the overview for your assigned projects.</p>
         </motion.div>

         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-card border border-border rounded-2xl p-5 hover:border-blue-500/50 transition-all duration-300 hover:translate-y-[-2px]"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                     <FolderOpen className="w-5 h-5" />
                  </div>
               </div>
               <p className="text-3xl font-bold font-heading">
                  <CountUp end={stats.activeProjects} duration={2} />
               </p>
               <p className="text-sm text-muted-foreground mt-1">Assigned Projects</p>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="bg-card border border-border rounded-2xl p-5 hover:border-purple-500/50 transition-all duration-300 hover:translate-y-[-2px]"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                     <CheckCircle className="w-5 h-5" />
                  </div>
               </div>
               <p className="text-3xl font-bold font-heading">
                  <CountUp end={taskStatus.todo + taskStatus.inProgress + taskStatus.done + taskStatus.overdue} duration={2} />
               </p>
               <p className="text-sm text-muted-foreground mt-1">Total Tasks</p>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="bg-card border border-border rounded-2xl p-5 hover:border-green-500/50 transition-all duration-300 hover:translate-y-[-2px]"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                     <CheckCircle className="w-5 h-5" />
                  </div>
               </div>
               <p className="text-3xl font-bold font-heading">
                  <CountUp end={taskStatus.done} duration={2} />
               </p>
               <p className="text-sm text-muted-foreground mt-1">Completed Tasks</p>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="bg-card border border-border rounded-2xl p-5 hover:border-red-500/50 transition-all duration-300 hover:translate-y-[-2px]"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                     <Clock className="w-5 h-5" />
                  </div>
               </div>
               <p className="text-3xl font-bold font-heading">
                  <CountUp end={taskStatus.overdue} duration={2} />
               </p>
               <p className="text-sm text-muted-foreground mt-1">Overdue Tasks</p>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5 }}
               className="bg-card border border-border rounded-2xl p-5 hover:border-pink-500/50 transition-all duration-300 hover:translate-y-[-2px]"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                     <Calendar className="w-5 h-5" />
                  </div>
               </div>
               <p className="text-3xl font-bold font-heading">
                  <CountUp end={stats.upcomingMeetings} duration={2} />
               </p>
               <p className="text-sm text-muted-foreground mt-1">Upcoming Meetings</p>
            </motion.div>
         </div>

         {/* Charts Row */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Progress */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.6 }}
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
                     <p>No projects assigned yet.</p>
                  </div>
               )}
            </motion.div>

            {/* Task Status */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.7 }}
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
                     <div className="w-3 h-3 rounded-full bg-gray-400"></div>
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

         {/* Recent Activity */}
         <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-card border border-border rounded-2xl p-6"
         >
            <h3 className="text-lg font-semibold mb-4">RECENT ACTIVITY FROM YOUR TEAM</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
               {recentActivity.length > 0 ? (
                  recentActivity.map((activity: any, index: number) => (
                     <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full mt-2 ${activity.color === 'green' ? 'bg-green-500' :
                              activity.color === 'blue' ? 'bg-blue-500' :
                                 activity.color === 'yellow' ? 'bg-yellow-500' :
                                    'bg-red-500'
                           }`}></div>
                        <div className="flex-1">
                           <p className="text-sm">{activity.message}</p>
                           <p className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleTimeString()}
                           </p>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="text-center text-muted-foreground py-8">
                     <Activity className="w-12 h-12 mx-auto mb-2" />
                     <p>No activity yet in your projects</p>
                  </div>
               )}
            </div>
         </motion.div>
      </div>
   );
};

export default ManagerOverview;
