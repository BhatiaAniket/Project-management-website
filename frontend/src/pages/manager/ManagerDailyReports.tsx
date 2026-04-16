import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { managerAPI } from '../../api/manager';
import { showToast } from '../../components/Toast';
import { useSocket } from '../../context/SocketContext';
import { 
  Search, Loader2, FileText, CheckCircle, XCircle, 
  Send, CheckCircle2, ChevronRight, Filter, 
  Clock, AlertCircle, Inbox, User, MessageSquare
} from 'lucide-react';

const ManagerDailyReports = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const { socket } = useSocket();

  const fetchReports = async () => {
    try {
      const res = await managerAPI.getReports();
      setReports(res.data.data || []);
    } catch (e) {
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('report:submitted', () => {
        showToast('New report received from team', 'info');
        fetchReports();
      });
      
      socket.on('report:updated', () => {
        fetchReports();
      });
    }
    return () => {
      if (socket) {
        socket.off('report:submitted');
        socket.off('report:updated');
      }
    };
  }, [socket]);

  const handleReview = async (status: string) => {
    if (!selectedReport) return;
    if (status === 'needs_revision' && !reviewComment.trim()) {
      return showToast('Please provide a comment for revisions', 'error');
    }
    setActionLoading(true);
    try {
      await managerAPI.updateReportStatus(selectedReport._id, {
        status,
        managerComment: reviewComment
      });
      showToast(status === 'approved' ? 'Report Approved' : 'Revision Requested', 'success');
      setSelectedReport(null);
      setReviewComment('');
      fetchReports();
    } catch (e) {
      showToast('Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending_review').length;
  
  const filtered = reports.filter(r => {
    const matchesSearch = r.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) || 
                         r.task?.title?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'pending' && r.status === 'pending_review') ||
                         (filter === 'reviewed' && r.status !== 'pending_review');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="flex items-center gap-2 mb-3">
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-[0.2em]">Operational</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Review Queue</span>
           </div>
           <h1 className="text-4xl font-bold font-heading -tracking-wider">Daily Reports</h1>
           <p className="text-muted-foreground text-sm mt-2">Quality assurance and progress verification for active tasks.</p>
        </div>

        <div className="flex items-center gap-4">
           {pendingCount > 0 && (
             <div className="px-5 py-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-600 rounded-2xl flex items-center gap-2 shadow-soft">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{pendingCount} Waiting for review</span>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Sidebar: Sidebar & Search */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-card border border-border rounded-[2rem] p-6 shadow-soft">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search by name or task..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:border-foreground transition-all focus:shadow-[0_0_0_1px_var(--foreground)]" 
                />
              </div>

              <div className="flex gap-2 p-1 bg-background border border-border rounded-xl mb-6">
                 {(['all', 'pending', 'reviewed'] as const).map(f => (
                   <button 
                     key={f}
                     onClick={() => setFilter(f)}
                     className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === f ? 'bg-foreground text-background shadow-soft' : 'opacity-40 hover:opacity-100'}`}
                   >
                     {f}
                   </button>
                 ))}
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-2xl" />)
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 opacity-30">
                    <Inbox className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Queue Clear</p>
                  </div>
                ) : (
                  filtered.map((r, i) => (
                    <motion.div 
                      key={r._id} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: i * 0.05 }}
                      onClick={() => { setSelectedReport(r); setReviewComment(r.managerComment || ''); }}
                      className={`cursor-pointer border-2 rounded-[1.5rem] p-5 transition-all relative overflow-hidden ${selectedReport?._id === r._id ? 'border-foreground bg-card' : 'border-transparent bg-background shadow-soft hover:border-border'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-2xl bg-muted/40 flex items-center justify-center text-xs font-black uppercase ring-1 ring-border group-hover:scale-110 transition-transform">
                              {r.employee?.fullName?.split(' ').map((n: string) => n[0]).join('')}
                           </div>
                           <div>
                              <h4 className="font-bold text-sm leading-none mb-1">{r.employee?.fullName}</h4>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                           </div>
                        </div>
                        {r.status === 'pending_review' && (
                           <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                        )}
                      </div>
                      <p className="text-xs font-bold truncate opacity-80 mb-2">{r.task?.title}</p>
                      <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest opacity-40">
                         <Clock className="w-3 h-3" />
                         <span>{r.hoursWorked}h Mapped</span>
                         <span className="ml-auto bg-muted px-2 py-0.5 rounded">{r.status.replace('_', ' ')}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
           </div>
        </div>

        {/* Right Panel: Review Interface */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedReport ? (
              <motion.div 
                key={selectedReport._id}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-border rounded-[2.5rem] p-10 lg:p-14 shadow-premium sticky top-10"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border pb-10 mb-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        selectedReport.status === 'approved' ? 'bg-green-500 text-white' :
                        selectedReport.status === 'needs_revision' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                       }`}>
                         {selectedReport.status?.replace('_', ' ')}
                       </span>
                       {(selectedReport.attachments?.length > 0 || selectedReport.attachmentUrl) && (
                          <div className="flex flex-wrap gap-2">
                             {selectedReport.attachments?.length > 0 ? (
                                selectedReport.attachments.map((file: any, i: number) => (
                                  <a 
                                    key={i}
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-4 py-1.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all text-center leading-none"
                                  >
                                    <FileText className="w-3 h-3" /> {file.originalName || 'View Attachment'}
                                  </a>
                                ))
                             ) : (
                                <a 
                                  href={selectedReport.attachmentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-4 py-1.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all text-center leading-none"
                                >
                                  <FileText className="w-3 h-3" /> View Attachment
                                </a>
                             )}
                          </div>
                       )}
                    </div>
                    <h2 className="text-3xl font-bold font-heading tracking-tight leading-tight">{selectedReport.task?.title}</h2>
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">
                          {selectedReport.employee?.fullName[0]}
                       </div>
                       <p className="text-sm font-medium">Submitted by <span className="font-bold">{selectedReport.employee?.fullName}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-5xl font-bold font-heading tracking-tighter">{selectedReport.hoursWorked}h</p>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-30 mt-2">Verified Duration</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <FileText className="w-3.5 h-3.5" /> Accomplishment Brief
                        </h4>
                        <div className="p-8 bg-background border border-border rounded-[2rem] shadow-soft text-sm leading-relaxed font-medium whitespace-pre-wrap">
                           {selectedReport.workSummary}
                        </div>
                      </div>

                      {selectedReport.blockers && (
                        <div>
                          <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <AlertCircle className="w-3.5 h-3.5" /> Impediments & Blockers
                          </h4>
                          <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[2rem] text-sm leading-relaxed font-medium text-red-600/90 whitespace-pre-wrap">
                             {selectedReport.blockers}
                          </div>
                        </div>
                      )}
                   </div>

                   <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <MessageSquare className="w-3.5 h-3.5" /> Strategic Feedback
                        </h4>
                        <textarea 
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Instructions for revision or approval context..."
                          className="w-full px-8 py-6 rounded-[2rem] border border-border bg-background text-sm font-medium focus:outline-none focus:border-foreground min-h-[200px] shadow-soft focus:shadow-premium transition-all resize-none"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleReview('needs_revision')}
                          disabled={actionLoading || selectedReport.status === 'needs_revision'}
                          className="flex-1 py-4 rounded-2xl border-2 border-red-500 text-red-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"
                        >
                          <XCircle className="w-4 h-4" /> Request Revision
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleReview('approved')}
                          disabled={actionLoading || selectedReport.status === 'approved'}
                          className="flex-1 py-4 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-premium transition-all disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Approve Content</>}
                        </motion.button>
                      </div>
                   </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[600px] flex flex-col items-center justify-center border-4 border-dashed border-border/50 bg-card/30 rounded-[3rem]">
                 <div className="w-24 h-24 rounded-[2.5rem] bg-muted/20 flex items-center justify-center mb-6">
                    <Inbox className="w-10 h-10 text-muted-foreground opacity-30" />
                 </div>
                 <h3 className="text-xl font-bold font-heading">Focused Review</h3>
                 <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30 mt-2">Select a report from the list to begin verification</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ManagerDailyReports;
