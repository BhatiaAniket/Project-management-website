import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';

const Performance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manager' | 'employee'>('manager');
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [personDetail, setPersonDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.listPerformance({ role: activeTab });
      setPeople(res.data.data.performance || []);
    } catch { setPeople([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPerformance(); }, [activeTab]);

  const openDetail = async (person: any) => {
    setSelectedPerson(person);
    setDetailLoading(true);
    setAiSummary('');
    try {
      const res = await companyAPI.getIndividualPerformance(person._id);
      setPersonDetail(res.data.data);
    } catch { setPersonDetail(null); }
    finally { setDetailLoading(false); }
  };

  const generateSummary = async () => {
    if (!selectedPerson) return;
    setAiLoading(true);
    try {
      const res = await companyAPI.generateAISummary(selectedPerson._id);
      setAiSummary(res.data.data.summary);
    } catch { showToast('Failed to generate AI summary', 'error'); }
    finally { setAiLoading(false); }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered performance insights for your team</p>
      </div>

      <div className="flex gap-2">
        {(['manager', 'employee'] as const).map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedPerson(null); }} className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${activeTab === tab ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Performance
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* People List */}
        <div className={`space-y-3 ${selectedPerson ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : people.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-2xl">
              <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No {activeTab}s found</p>
            </div>
          ) : (
            <div className={`grid gap-3 ${selectedPerson ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {people.map((p, i) => (
                <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => openDetail(p)} className={`bg-card border rounded-2xl p-4 cursor-pointer transition-all hover:translate-y-[-2px] ${selectedPerson?._id === p._id ? 'border-accent' : 'border-border hover:border-accent/50'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold">{p.fullName?.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.fullName}</p>
                      <p className="text-xs text-muted-foreground">{p.department || p.role}</p>
                    </div>
                    <span className={`text-lg font-bold ${getScoreColor(p.productivityScore)}`}>{p.productivityScore}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-lg font-bold">{p.tasksCompleted}</p><p className="text-[10px] text-muted-foreground uppercase">Done</p></div>
                    <div><p className="text-lg font-bold">{p.tasksOverdue}</p><p className="text-[10px] text-muted-foreground uppercase">Overdue</p></div>
                    <div><p className="text-lg font-bold">{p.onTimeRate}%</p><p className="text-[10px] text-muted-foreground uppercase">On-time</p></div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedPerson && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-4">
            {detailLoading ? (
              <div className="flex justify-center py-12 bg-card border border-border rounded-2xl"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : personDetail ? (
              <>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center text-lg font-bold">{personDetail.person?.fullName?.charAt(0)}</div>
                      <div>
                        <h2 className="text-lg font-bold">{personDetail.person?.fullName}</h2>
                        <p className="text-sm text-muted-foreground">{personDetail.person?.role} • {personDetail.person?.department || 'No dept'}</p>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={generateSummary} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-70">
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> AI Insights</>}
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Assigned', value: personDetail.stats?.tasksAssigned },
                      { label: 'Completed', value: personDetail.stats?.tasksCompleted },
                      { label: 'Overdue', value: personDetail.stats?.tasksOverdue },
                      { label: 'On-time', value: `${personDetail.stats?.onTimeRate}%` },
                    ].map((s, i) => (
                      <div key={i} className="text-center p-3 rounded-xl bg-muted/30">
                        <p className="text-xl font-bold">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {aiSummary && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-accent/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <h3 className="text-sm font-semibold">AI Performance Insight</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary}</p>
                  </motion.div>
                )}

                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground mb-4">Weekly Productivity</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={personDetail.weeklyData || []}>
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '13px' }} />
                      <Bar dataKey="completed" fill="hsl(155, 50%, 45%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : null}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Performance;
