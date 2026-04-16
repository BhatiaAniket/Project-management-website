import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2, CalendarClock, Video, Users, Clock, Sparkles } from 'lucide-react';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';

const Meetings: React.FC = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', date: '', duration: '30', participants: [] as string[], agenda: '', type: 'one-on-one' });

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      // Fetch all to do robust local filtering based on time instead of just string tags
      const res = await companyAPI.listMeetings();
      setMeetings(res.data.data.meetings || []);
    } catch { setMeetings([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMeetings(); }, [activeTab]);
  useEffect(() => {
    const fetchPeople = async () => {
      try {
        const res = await companyAPI.listPeople({ limit: 100 });
        setPeople(res.data.data.people || []);
      } catch { /* ignore */ }
    };
    fetchPeople();
  }, []);

  const location = useLocation();
  useEffect(() => {
    if (location.state?.openModal) {
      setShowCreate(true);
    }
  }, [location.state]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    
    const startTimeDate = new Date(form.date);
    if (isNaN(startTimeDate.getTime())) {
      showToast('Please select a valid date and time', 'error');
      setCreateLoading(false);
      return;
    }

    if (!form.title.trim() || !form.date || !form.duration) {
      showToast('Please fill all required fields', 'error');
      setCreateLoading(false);
      return;
    }

    if (form.participants.length === 0) {
      showToast('Please select at least one participant from the list', 'error');
      setCreateLoading(false);
      return;
    }

    const payload = {
      title: form.title,
      startTime: startTimeDate.toISOString(),
      durationMinutes: parseInt(form.duration, 10),
      type: form.type,
      agenda: form.agenda || "",
      participants: form.participants
    };

    try {
      await companyAPI.createMeeting(payload);
      showToast('Meeting scheduled!', 'success');
      setShowCreate(false);
      setForm({ title: '', date: '', duration: '30', participants: [], agenda: '', type: 'one-on-one' });
      fetchMeetings();
    } catch (err: any) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setCreateLoading(false); }
  };

  const isMeetingActive = (startTime: string, durationMin: number) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMin * 60000);
    const joinWindow = new Date(start.getTime() - 10 * 60000);
    return now >= joinWindow && now <= end;
  };

  const isMeetingPast = (startTime: string, durationMin: number) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMin * 60000);
    return now > end;
  };

  const filteredMeetings = meetings.filter(m => 
    activeTab === 'past' ? isMeetingPast(m.startTime, m.durationMinutes) : !isMeetingPast(m.startTime, m.durationMinutes)
  );

  const toggleParticipant = (id: string) => {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.includes(id) ? prev.participants.filter((p) => p !== id) : [...prev.participants, id],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Meetings & Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule and manage your meetings</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium">
          <Plus className="w-4 h-4" /> Schedule Meeting
        </motion.button>
      </div>

      <div className="flex gap-2">
        {(['upcoming', 'past'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all border capitalize ${activeTab === tab ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground'}`}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filteredMeetings.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <CalendarClock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No {activeTab} meetings</h3>
          <p className="text-sm text-muted-foreground">Schedule your first meeting to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((meeting, i) => {
            const active = isMeetingActive(meeting.startTime, meeting.durationMinutes);
            const isPast = isMeetingPast(meeting.startTime, meeting.durationMinutes);
            
            return (
              <motion.div key={meeting._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`bg-card border border-border rounded-2xl p-5 hover:border-accent/50 transition-all ${isPast ? 'opacity-80' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold">{meeting.title}</h3>
                    <span className="text-xs text-muted-foreground capitalize">{meeting.type?.replace(/_/g, ' ')}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${isPast ? 'bg-background border border-border' : active ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                    {isPast ? 'Completed' : active ? 'Ongoing' : 'Upcoming'}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4" />{new Date(meeting.startTime).toLocaleString()}</div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{meeting.durationMinutes} min</div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4" />{meeting.participants?.length || 0} participants</div>
                </div>
                
                {active ? (
                  <motion.button 
                    onClick={() => navigate(`/company/meetings/${meeting.roomId || meeting._id}`)}
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }} 
                    className="w-full mt-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" /> Join Meeting
                  </motion.button>
                ) : !isPast ? (
                  <button disabled className="w-full mt-4 py-2.5 rounded-full bg-muted text-muted-foreground text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed">
                    Not Started
                  </button>
                ) : null}

                {meeting.summary?.rawSummary && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5 mb-2"><Sparkles className="w-3.5 h-3.5 text-accent" /><span className="text-xs font-semibold uppercase tracking-wider text-accent/80">AI Summary</span></div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{meeting.summary.rawSummary}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Meeting Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-heading">Schedule Meeting</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <input placeholder="Meeting Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" required />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground block mb-1">Date & Time</label><input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" required /></div>
                  <div><label className="text-xs text-muted-foreground block mb-1">Duration (min)</label><input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" min="15" max="480" /></div>
                </div>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground">
                  <option value="one-on-one">1:1 Meeting</option>
                  <option value="team">Team Meeting</option>
                  <option value="standup">Standup</option>
                  <option value="review">Review</option>
                </select>
                <textarea placeholder="Agenda / Description" value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground resize-none h-16" />
                <div>
                  <label className="text-xs text-muted-foreground block mb-2">Participants</label>
                  <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
                    {people.map((p) => (
                      <label key={p._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer text-sm">
                        <input type="checkbox" checked={form.participants.includes(p._id)} onChange={() => toggleParticipant(p._id)} className="rounded" />
                        {p.fullName} <span className="text-xs text-muted-foreground capitalize">({p.role})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={createLoading} type="submit" className="w-full py-3 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70">
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule Meeting'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Meetings;
