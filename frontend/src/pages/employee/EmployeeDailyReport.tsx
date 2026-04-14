import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { employeeAPI } from '../../api/employee';
import { useSocket } from '../../context/SocketContext';
import { showToast } from '../../components/Toast';
import { CheckCircle, Clock, AlertCircle, Loader2, FileText, Send, Image as ImageIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const EmployeeDailyReport = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const { socket } = useSocket();
  const location = useLocation();

  // Form State
  const [formData, setFormData] = useState({
    taskId: '',
    workSummary: '',
    hoursWorked: '',
    blockers: '',
    file: null as File | null
  });

  const fetchData = useCallback(async () => {
    try {
      const [reportsRes, tasksRes] = await Promise.all([
        employeeAPI.getDailyReports(),
        employeeAPI.getTasks() // Need to select a task from assigned tasks
      ]);
      setReports(reportsRes.data.data || []);
      setTasks(tasksRes.data.data || []);

      // If redirected from Kanban "Done", prefill task
      if (location.state?.prefilledTask) {
        setFormData(prev => ({ ...prev, taskId: location.state.prefilledTask }));
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load reports data', 'error');
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    socket.on('report:reviewed', fetchData);
    return () => {
      socket.off('report:reviewed', fetchData);
    };
  }, [socket, fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.taskId || !formData.workSummary || !formData.hoursWorked) {
      return showToast('Please fill all required fields', 'error');
    }
    setSubmitLoading(true);

    try {
      // Typically you'd upload the file first then pass URL. Mocking url:
      const payload = {
        taskId: formData.taskId,
        workSummary: formData.workSummary,
        hoursWorked: Number(formData.hoursWorked),
        blockers: formData.blockers,
        attachmentUrl: formData.file ? URL.createObjectURL(formData.file) : '' // Mock URL
      };

      await employeeAPI.submitDailyReport(payload);
      showToast('Report submitted successfully!', 'success');
      setFormData({ taskId: '', workSummary: '', hoursWorked: '', blockers: '', file: null });
      fetchData(); // Refresh list
    } catch (error) {
      showToast('Failed to submit report', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'needs_revision':
        return <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold"><AlertCircle className="w-3.5 h-3.5" /> Needs Revision</span>;
      default:
        return <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-semibold"><Clock className="w-3.5 h-3.5" /> Pending Review</span>;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading">Daily Report</h1>
        <p className="text-muted-foreground text-sm mt-1">Submit your end-of-day summary for manager review.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Submit Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 lg:col-span-1 sticky top-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> New Report</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Linked Task *</label>
              <select
                value={formData.taskId}
                onChange={e => setFormData({ ...formData, taskId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground"
                required
              >
                <option value="">Select a task...</option>
                {tasks.map(t => (
                  <option key={t._id} value={t._id}>{t.title} ({t.status.replace('_', ' ')})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Work Done Today *</label>
              <textarea
                value={formData.workSummary}
                onChange={e => setFormData({ ...formData, workSummary: e.target.value })}
                placeholder="What did you accomplish?"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground min-h-[100px] resize-y custom-scrollbar"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Hours Worked *</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={formData.hoursWorked}
                onChange={e => setFormData({ ...formData, hoursWorked: e.target.value })}
                placeholder="e.g. 4.5"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Blockers / Issues (Optional)</label>
              <textarea
                value={formData.blockers}
                onChange={e => setFormData({ ...formData, blockers: e.target.value })}
                placeholder="Any issues blocking progress?"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground min-h-[60px] resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Additional Screenshot (Optional)</label>
              <input
                type="file"
                accept="image/png, image/jpeg, application/pdf"
                onChange={e => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 transition-colors"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={submitLoading}
              className="w-full py-3 mt-2 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
            >
              {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Report</>}
            </motion.button>
          </form>
        </motion.div>

        {/* Reports History List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold mb-2">Past Submissions</h2>
          {reports.length > 0 ? reports.map((report, i) => (
            <motion.div
              key={report._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-5 hover:border-foreground/20 transition-all shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">{report.task?.title || 'Unknown Task'}</h3>
                  <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                {getStatusBadge(report.status)}
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Summary</span>
                  <p className="text-sm bg-muted/40 p-3 rounded-xl border border-border/50">{report.workSummary}</p>
                </div>

                <div className="flex gap-6">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Hours</span>
                    <p className="text-sm font-semibold">{report.hoursWorked}h</p>
                  </div>
                  {report.blockers && (
                    <div className="flex-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Blockers</span>
                      <p className="text-sm text-red-500/80">{report.blockers}</p>
                    </div>
                  )}
                </div>

                {report.status !== 'pending_review' && report.managerComment && (
                  <div className={`mt-3 p-3 rounded-xl border ${report.status === 'approved' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <span className="text-xs font-bold uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      Manager Review Response
                    </span>
                    <p className="text-sm">{report.managerComment}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">You haven't submitted any reports yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDailyReport;
