import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { employeeAPI } from '../../api/employee';
import { useSocket } from '../../context/SocketContext';
import { showToast } from '../../components/Toast';
import { Calendar, Video, Clock, Loader2, Send } from 'lucide-react';

const EmployeeMeetings = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'request'>('upcoming');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const { socket } = useSocket();

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    recipientId: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [meetingsRes, reqRes, colRes] = await Promise.all([
        employeeAPI.getMeetings(),
        employeeAPI.getMeetingRequests(),
        employeeAPI.getColleagues()
      ]);
      setMeetings(meetingsRes.data.data || []);
      // combine requests sent and responses
      const history = [...(reqRes.data.data?.requests || []), ...(reqRes.data.data?.responses || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(history);

      // Filter colleagues to just managers/admins for meeting requests (typically employees request meetings from managers)
      // Actually prompt says "Select Recipient (Manager or Company Admin - dropdown)"
      const managers = colRes.data.data?.filter((c: any) => c.role === 'manager' || c.role === 'company_admin') || [];
      setColleagues(managers);
    } catch (e) {
      console.error(e);
      showToast('Failed to load meeting data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    socket.on('meeting:scheduled', fetchData);
    socket.on('notification', fetchData); // to catch declines/accepts
    return () => {
      socket.off('meeting:scheduled', fetchData);
      socket.off('notification', fetchData);
    }
  }, [socket, fetchData]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.recipientId) return showToast('Please fill all required fields', 'error');
    setSubmitLoading(true);
    try {
      await employeeAPI.requestMeeting(form);
      showToast('Meeting request sent!', 'success');
      setForm({ title: '', description: '', date: '', recipientId: '' });
      fetchData();
    } catch (e) {
      showToast('Failed to send request', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading">Meetings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your schedule and send meeting requests.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['upcoming', 'request'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border capitalize ${activeTab === tab ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground'}`}
          >
            {tab === 'request' ? 'Request a Meeting' : 'Upcoming Meetings'}
          </button>
        ))}
      </div>

      {activeTab === 'upcoming' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.length > 0 ? meetings.map((m, i) => (
            <motion.div key={m._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-sm">{m.title}</h3>
                <span className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-full capitalize border border-border">{m.type}</span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(m.startTime).toLocaleDateString()}</p>
                <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({m.durationMinutes} min)</p>
                <p className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Organizer: {m.createdBy?.fullName || 'Unknown'}</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2"
              >
                Join Meeting
              </motion.button>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-12 border border-border bg-card rounded-2xl">
              <p className="text-muted-foreground text-sm">No upcoming meetings scheduled.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">New Request</h2>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" placeholder="e.g. 1:1 Performance Review" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Recipient (Manager/Admin) *</label>
                <select required value={form.recipientId} onChange={e => setForm({ ...form, recipientId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground">
                  <option value="">Select recipient...</option>
                  {colleagues.map(c => <option key={c._id} value={c._id}>{c.fullName} ({c.role.replace('_', ' ')})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Preferred Date & Time *</label>
                <input type="datetime-local" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Purpose / Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground min-h-[80px]" placeholder="Briefly describe the purpose of the meeting" />
              </div>
              <motion.button disabled={submitLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-2.5 mt-2 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2">
                {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Request</>}
              </motion.button>
            </form>
          </motion.div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Request History</h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
              {requests.length > 0 ? requests.map((req, i) => (
                <div key={req._id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-sm">{req.title.includes('Request') ? req.metadata?.originalRequest?.title || 'Meeting Request' : req.title}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize border ${req.title.includes('Accepted') ? 'bg-green-100 text-green-700 border-green-200' :
                        req.title.includes('Declined') ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                      {req.title.includes('Accepted') ? 'Accepted' : req.title.includes('Declined') ? 'Declined' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{req.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(req.createdAt).toLocaleString()}</p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground p-4 text-center border border-border bg-card rounded-xl">No request history found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeMeetings;
