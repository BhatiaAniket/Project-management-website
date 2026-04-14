import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Star, AlertCircle, Clock, Target, Loader2, Sparkles, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../../context/AuthContext';
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

  // Rating states
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

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
      const res = await companyAPI.listPerformance({ role: 'employee' });
      // Enhance with metadata parsing if necessary
      const fetched = res.data.data.performance || [];
      // To get actual metadata like managerRating, we might need listPeople
      const peopleRes = await companyAPI.listPeople({ role: 'employee' });
      const peopleMap = new Map(peopleRes.data.data.people.map((p: any) => [p._id, p]));

      const enriched = fetched.map((emp: any) => ({
        ...emp,
        metadata: peopleMap.get(emp._id)?.metadata || {}
      }));
      setEmployees(enriched);
    } catch { setEmployees([]); }
    finally { setLoadingEmployees(false); }
  };

  const fetchMyPerformance = async () => {
    if (!user?._id) return;
    setLoadingMine(true);
    try {
      const res = await companyAPI.getIndividualPerformance(user._id);
      setMyStats(res.data.data);
    } catch { setMyStats(null); }
    finally { setLoadingMine(false); }
  };

  const submitRating = async (empId: string, rating: number, currentMetadata: any) => {
    setRatingLoading(empId);
    try {
      await companyAPI.updatePerson(empId, {
        metadata: { ...currentMetadata, managerRating: rating }
      });
      // Optionally notify admin here via socket broadcast mechanism if needed
      showToast('Performance rating submitted to Company Admin', 'success');
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
                Showing metrics for employees assigned to your active projects.
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
                  <p className="text-sm text-muted-foreground">You do not have any employees assigned to your projects right now.</p>
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
                              {emp.fullName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{emp.fullName}</h3>
                            <p className="text-xs text-muted-foreground">{emp.role.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full">
                          <Sparkles className="w-4 h-4" />
                          <span className="font-bold text-sm">Score: {emp.productivityScore}</span>
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
                    <p className="text-sm text-muted-foreground mb-1">Tasks Assigned</p>
                    <p className="text-3xl font-heading font-bold">{myStats.stats.tasksAssigned}</p>
                  </div>
                  <div className="bg-card border border-border p-5 rounded-2xl">
                    <p className="text-sm text-muted-foreground mb-1">Tasks Completed</p>
                    <p className="text-3xl font-heading font-bold text-green-500">{myStats.stats.tasksCompleted}</p>
                  </div>
                  <div className="bg-card border border-border p-5 rounded-2xl">
                    <p className="text-sm text-muted-foreground mb-1">Overdue Tasks</p>
                    <p className="text-3xl font-heading font-bold text-red-500">{myStats.stats.tasksOverdue}</p>
                  </div>
                  <div className="bg-card border border-border p-5 rounded-2xl">
                    <p className="text-sm text-muted-foreground mb-1">On-Time Rate</p>
                    <p className="text-3xl font-heading font-bold text-blue-500">{myStats.stats.onTimeRate}%</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border">
                  <h3 className="text-lg font-semibold mb-4">Productivity Trend (8 Weeks)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={myStats.weeklyData}>
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
