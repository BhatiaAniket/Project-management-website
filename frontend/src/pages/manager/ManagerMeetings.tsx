import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Video, Calendar as CalendarIcon, Clock, Users, X, Loader2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';

export default function ManagerMeetings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'requests' | 'employee_requests'>('upcoming');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [employeeRequests, setEmployeeRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Users for participants dropdown
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Create Meeting state
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    startDate: '',
    startTime: '',
    duration: '30',
    type: 'team',
    agenda: '',
    participants: [] as string[]
  });

  // Admin Request state
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestForm, setRequestForm] = useState({
    subject: '',
    date: '',
    reason: ''
  });

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.listMeetings();
      setMeetings(res.data.data.meetings || []);
    } catch { setMeetings([]); }
    finally { setLoading(false); }
  };

  const fetchEmployeeRequests = async () => {
    try {
      const axios = require('axios').default;
      const api = axios.create({
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const res = await api.get('/manager/meetings/requests');
      setEmployeeRequests(res.data.data || []);
    } catch { /* ignore */ }
  };

  const fetchTeam = async () => {
    try {
      const res = await companyAPI.listPeople({ role: 'employee' });
      setTeamMembers(res.data.data.people || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchMeetings();
    fetchTeam();
    fetchEmployeeRequests();
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.startDate || !meetingForm.startTime) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (meetingForm.participants.length === 0) {
      showToast('Please select at least one participant from the list (Hold Ctrl/Cmd to select)', 'error');
      return;
    }

    setCreateLoading(true);
    try {
      const datetime = new Date(`${meetingForm.startDate}T${meetingForm.startTime}`);

      const payload = {
        title: meetingForm.title,
        startTime: datetime.toISOString(),
        durationMinutes: parseInt(meetingForm.duration),
        type: meetingForm.type,
        agenda: meetingForm.agenda,
        participants: meetingForm.participants
      };

      await companyAPI.createMeeting(payload);
      showToast('Meeting scheduled successfully', 'success');
      setShowCreate(false);
      setMeetingForm({ title: '', startDate: '', startTime: '', duration: '30', type: 'team', agenda: '', participants: [] });
      fetchMeetings();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to schedule meeting', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAdminRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);
    try {
      await companyAPI.requestAdminMeeting(requestForm);
      showToast('Request sent to Admin!', 'success');
      setRequestForm({ subject: '', date: '', reason: '' });
      setActiveTab('upcoming');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send request', 'error');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleEmployeeRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const axios = require('axios').default;
      const api = axios.create({
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      await api.post('/manager/meetings/handle-request', {
        notificationId: requestId,
        action
      });
      showToast(`Meeting ${action === 'accept' ? 'accepted' : 'declined'}`, 'success');
      fetchEmployeeRequests();
      fetchMeetings();
    } catch (err) {
      showToast('Failed to process request', 'error');
    }
  };

  const isMeetingActive = (startTime: string, durationMin: number) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMin * 60000);
    // Allow joining 10 mins early, until meeting ends
    const joinWindow = new Date(start.getTime() - 10 * 60000);
    return now >= joinWindow && now <= end;
  };

  const upcomingMeetings = meetings.filter(m => new Date(m.startTime) >= new Date() || m.status === 'active');
  const pastMeetings = meetings.filter(m => new Date(m.startTime) < new Date() && m.status !== 'active');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule and manage team syncs</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Schedule Meeting
        </button>
      </div>

      <div className="flex border-b border-border gap-6">
        <button onClick={() => setActiveTab('upcoming')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'upcoming' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Upcoming ({upcomingMeetings.length})
        </button>
        <button onClick={() => setActiveTab('past')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'past' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Past ({pastMeetings.length})
        </button>
        <button onClick={() => setActiveTab('requests')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'requests' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Requests to Admin
        </button>
        <button onClick={() => setActiveTab('employee_requests')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'employee_requests' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Employee Requests ({employeeRequests.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : activeTab === 'upcoming' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingMeetings.length === 0 ? (
            <p className="col-span-full py-8 text-center text-muted-foreground">No upcoming meetings scheduled.</p>
          ) : upcomingMeetings.map(m => {
            const active = isMeetingActive(m.startTime, m.durationMinutes);
            return (
              <div key={m._id} className="bg-card border border-border rounded-2xl p-5 hover:border-accent/50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg">{m.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${m.type === 'team' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {m.type}
                  </span>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="w-4 h-4" /> {new Date(m.startTime).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" /> {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({m.durationMinutes} min)
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" /> {m.participants.length} participants
                  </div>
                </div>
                {active ? (
                  <button
                    onClick={() => navigate(`/manager/meetings/${m.roomId || m._id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                  >
                    <Video className="w-4 h-4" /> Join Now
                  </button>
                ) : (
                  <button disabled className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground font-medium cursor-not-allowed">
                    Not Started
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : activeTab === 'past' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastMeetings.length === 0 ? (
            <p className="col-span-full py-8 text-center text-muted-foreground">No past meetings.</p>
          ) : pastMeetings.map(m => (
            <div key={m._id} className="bg-muted border border-border rounded-2xl p-5 opacity-70">
              <h3 className="font-semibold text-lg mb-2">{m.title}</h3>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <CalendarIcon className="w-4 h-4" /> {new Date(m.startTime).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">Status: {m.status}</p>
            </div>
          ))}
        </div>
      ) : activeTab === 'employee_requests' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employeeRequests.length === 0 ? (
            <p className="col-span-full py-8 text-center text-muted-foreground">No pending meeting requests from employees.</p>
          ) : employeeRequests.map(req => (
            <div key={req._id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{req.metadata?.originalRequest?.title || 'Meeting Request'}</h3>
                <span className="px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-orange-100 text-orange-700">
                  Request
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{req.message}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEmployeeRequest(req._id, 'decline')}
                  className="flex-1 py-2 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleEmployeeRequest(req._id, 'accept')}
                  className="flex-1 py-2 px-4 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition"
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold font-heading">Request Meeting with Admin</h2>
            <p className="text-sm text-muted-foreground mt-1">Submit a direct request for a 1-on-1 with the company admin.</p>
          </div>
          <form onSubmit={handleAdminRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input type="text" required value={requestForm.subject} onChange={e => setRequestForm({ ...requestForm, subject: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-border bg-background outline-none focus:border-foreground" placeholder="Brief subject" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Date</label>
              <input type="date" required value={requestForm.date} onChange={e => setRequestForm({ ...requestForm, date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-border bg-background outline-none focus:border-foreground" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason / Agenda</label>
              <textarea required value={requestForm.reason} onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-border bg-background outline-none focus:border-foreground h-24 resize-none" placeholder="Provide context for this request..."></textarea>
            </div>
            <button disabled={requestLoading} type="submit" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-foreground text-background font-medium hover:scale-[1.02] transition-transform">
              {requestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Send Request</>}
            </button>
          </form>
        </div>
      )}

      {/* Create Meeting Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-heading">Schedule Meeting</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <input placeholder="Meeting Title" required value={meetingForm.title} onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" required value={meetingForm.startDate} onChange={e => setMeetingForm({ ...meetingForm, startDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
                  <input type="time" required value={meetingForm.startTime} onChange={e => setMeetingForm({ ...meetingForm, startTime: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={meetingForm.duration} onChange={e => setMeetingForm({ ...meetingForm, duration: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground">
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">1 Hour</option>
                  </select>
                  <select value={meetingForm.type} onChange={e => setMeetingForm({ ...meetingForm, type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground">
                    <option value="one-on-one">1-on-1</option>
                    <option value="team">Team Sync</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground ml-1">Participants</label>
                  <select
                    multiple
                    value={meetingForm.participants}
                    onChange={e => {
                      const options = Array.from(e.target.selectedOptions);
                      setMeetingForm({ ...meetingForm, participants: options.map(o => o.value) });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground h-32"
                  >
                    {teamMembers.map(m => (
                      <option key={m._id} value={m._id}>{m.fullName}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">Hold Ctrl/Cmd to select multiple</p>
                </div>
                <button type="submit" disabled={createLoading} className="w-full py-3 rounded-xl bg-foreground text-background font-medium hover:scale-[1.02] transition-transform">
                  {createLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Schedule'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
