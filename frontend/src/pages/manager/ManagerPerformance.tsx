import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Star, AlertCircle, Clock, Target, Loader2, Sparkles, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../../context/AuthContext';
import { managerAPI } from '../../api/manager';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ManagerPerformance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'mine'>('employees');

  // Tab 1 state
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Tab 2 state
  const [myStats, setMyStats] = useState<any>(null);
  const [loadingMine, setLoadingMine] = useState(true);

  const [ratingLoading, setRatingLoading] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  // AI Report state
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(true);

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    } else {
      fetchMyPerformance();
    }
  }, [activeTab]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      // Use manager-specific performance endpoint (returns all company employees)
      const res = await managerAPI.getPerformanceTeam();
      const fetched = res.data.data?.performance || [];

      // Enrich with metadata (manager rating stored in User.metadata)
      try {
        const peopleRes = await companyAPI.listPeople({ role: 'employee' });
        const peopleMap = new Map(peopleRes.data.data.people.map((p: any) => [p._id, p]));
        const enriched = fetched.map((emp: any) => ({
          ...emp,
          metadata: peopleMap.get(emp._id)?.metadata || {}
        }));
        setEmployees(enriched);
      } catch {
        setEmployees(fetched);
      }
    } catch {
      setEmployees([]);
      showToast('Failed to load team performance', 'error');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchMyPerformance = async () => {
    if (!user?._id) return;
    setLoadingMine(true);
    setLoadingAi(true);
    try {
      const [res, aiRes] = await Promise.all([
        managerAPI.getPerformanceMe(),
        managerAPI.getManagerAIReport().catch(() => ({ data: { data: { report: 'AI summary currently unavailable.' } } }))
      ]);
      setMyStats(res.data.data);
      setAiReport(aiRes.data?.data?.report || 'AI summary currently unavailable.');
    } catch {
      setMyStats(null);
      showToast('Failed to load your performance data', 'error');
    } finally {
      setLoadingMine(false);
      setLoadingAi(false);
    }
  };

  const submitRating = async (empId: string, rating: number, currentMetadata: any) => {
    setRatingLoading(empId);
    try {
      await managerAPI.rateEmployee(empId, rating);
      showToast('Performance rating submitted', 'success');
      setEmployees(prev => prev.map(emp => {
        if (emp._id === empId) {
          return { ...emp, metadata: { ...emp.metadata, managerRating: rating } };
        }
        return emp;
      }));
    } catch (error) {
      showToast('Failed to submit rating', 'error');
    } finally {
      setRatingLoading(null);
    }
  };

  const exportTeamReport = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('team_performance_summary.pdf');
      showToast('Team report exported', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">Review team metrics and track your own goals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'employees' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Team Performance
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'mine' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          My Performance
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'employees' && (
          <motion.div key="employees" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground bg-muted p-4 rounded-xl border border-border inline-flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                Showing metrics for all employees in your company.
              </p>
              <button
                onClick={exportTeamReport}
                disabled={exporting || employees.length === 0}
                className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-full flex items-center gap-2 disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export Summary
              </button>
            </div>

            <div ref={reportRef} className="space-y-6">
              {loadingEmployees ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : employees.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-2xl">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No employees found</h3>
                  <p className="text-sm text-muted-foreground">There are no employees in your company yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {employees.map(emp => (
                    <div key={emp._id} className="bg-card border border-border rounded-2xl p-5 hover:border-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                              {emp.fullName?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{emp.fullName}</h3>
                            <p className="text-xs text-muted-foreground">{emp.role?.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                          (emp.score ?? emp.productivityScore ?? 0) >= 800 ? 'bg-green-500/10 text-green-600' :
                          (emp.score ?? emp.productivityScore ?? 0) >= 600 ? 'bg-blue-500/10 text-blue-600' :
                          (emp.score ?? emp.productivityScore ?? 0) >= 400 ? 'bg-yellow-500/10 text-yellow-600' :
                          (emp.score ?? emp.productivityScore ?? 0) >= 200 ? 'bg-orange-500/10 text-orange-600' :
                          'bg-red-500/10 text-red-600'
                        }`}>
                          <Sparkles className="w-4 h-4" />
                          <span>Score: {emp.score ?? emp.productivityScore ?? 0}{emp.score !== undefined ? '/1000' : ''}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="bg-muted p-3 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground">Tasks Done</p>
                          <p className="text-lg font-bold">{emp.tasksCompleted}</p>
                        </div>
                        <div className="bg-muted p-3 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground">Overdue</p>
                          <p className="text-lg font-bold text-red-500">{emp.tasksOverdue}</p>
                        </div>
                        <div className="bg-muted p-3 rounded-xl border border-border">
                          <p className="text-xs text-muted-foreground">On-Time %</p>
                          <p className="text-lg font-bold text-green-500">{emp.onTimeRate}%</p>
                        </div>
                      </div>

                      <div className="border-t border-border pt-4 flex items-center justify-between">
                        <p className="text-sm font-medium">Rate Performance:</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => {
                            const currentRating = emp.metadata?.managerRating || 0;
                            return (
                              <button
                                key={star}
                                disabled={ratingLoading === emp._id}
                                onClick={() => submitRating(emp._id, star, emp.metadata)}
                                className="focus:outline-none transition-transform hover:scale-110"
                              >
                                <Star className={`w-5 h-5 ${star <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'mine' && (
          <motion.div key="mine" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 text-blue-700 p-4 rounded-xl flex items-center gap-3">
              <Sparkles className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">Your performance is monitored by Company Admin in real-time. Keep up the good work!</p>
            </div>

            {loadingMine ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : myStats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-border p-5 rounded-2xl">
                    <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                    <p className={`text-3xl font-heading font-bold ${
                      (myStats.score ?? 0) >= 800 ? 'text-green-500' :
                      (myStats.score ?? 0) >= 600 ? 'text-blue-500' :
                      (myStats.score ?? 0) >= 400 ? 'text-yellow-500' : 'text-red-500'
                    }`}>{myStats.score ?? myStats.stats?.tasksAssigned ?? 0}<span className="text-lg text-muted-foreground">/1000</span></p>
                  </div>
                  <div className="bg-card border border-border p-5 rounded-2xl">
                    <p className="text-sm text-muted-foreground mb-1">Team Tasks Done</p>
                    <p className="text-3xl font-heading font-bold text-green-500">{myStats.breakdown?.teamDone ?? myStats.stats?.tasksCompleted ?? 0}</p>
                  </div>
                  <div className="bg-card border border-border p-5 rounded-2xl">
                    <p className="text-sm text-muted-foreground mb-1">Team Overdue</p>
                    <p className="text-3xl font-heading font-bold text-red-500">{myStats.breakdown?.teamOverdue ?? myStats.stats?.tasksOverdue ?? 0}</p>
                  </div>
                  <div className="bg-card border border-border p-5 rounded-2xl">
                    <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                    <p className="text-3xl font-heading font-bold text-blue-500">{myStats.breakdown?.teamCompletionRate ?? myStats.stats?.onTimeRate ?? 0}%</p>
                  </div>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 relative overflow-hidden">
                  <Sparkles className="absolute top-4 right-4 w-24 h-24 text-blue-500 opacity-5" />
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-500" /> AI Executive Summary</h3>
                  {loadingAi ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating personalized insight...
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {aiReport}
                    </p>
                  )}
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border">
                  <h3 className="text-lg font-semibold mb-4">Productivity Trend (8 Weeks)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={myStats.weeklyData || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="completed" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-card border border-border rounded-2xl">
                <p className="text-muted-foreground">Unable to fetch your statistical data.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
