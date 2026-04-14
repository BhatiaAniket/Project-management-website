import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, LayoutGrid, List, X, Loader2, Calendar, Flag, Users, BarChart3 } from 'lucide-react';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';
import { useLocation } from 'react-router-dom';

const priorityColors: Record<string, string> = {
  low: 'bg-blue-500/10 text-blue-500',
  medium: 'bg-amber-500/10 text-amber-500',
  high: 'bg-red-500/10 text-red-500',
};

const statusLabels: Record<string, string> = {
  not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', on_hold: 'On Hold', archived: 'Archived',
};

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', deadline: '', priority: 'medium', manager: '' });
  const [managers, setManagers] = useState<any[]>([]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.listProjects({ search });
      setProjects(res.data.data.projects || []);
    } catch { setProjects([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, [search]);
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await companyAPI.listPeople({ role: 'manager' });
        setManagers(res.data.data.people || []);
      } catch { /* ignore */ }
    };
    fetchManagers();
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
    try {
      await companyAPI.createProject(form);
      showToast('Project created!', 'success');
      setShowCreate(false);
      setForm({ name: '', description: '', deadline: '', priority: 'medium', manager: '' });
      fetchProjects();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed', 'error');
    } finally { setCreateLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} total projects</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-foreground text-background' : 'hover:bg-muted/60'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-foreground text-background' : 'hover:bg-muted/60'}`}><List className="w-4 h-4" /></button>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium">
            <Plus className="w-4 h-4" /> New Project
          </motion.button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground">Create your first project to get started</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <motion.div key={project._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-5 hover:border-accent/50 transition-all hover:translate-y-[-2px] cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold">{project.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[project.priority] || ''}`}>{project.priority}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description || 'No description'}</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Progress</span><span className="font-medium">{project.progress}%</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${project.progress}%` }} /></div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{project.manager?.fullName || 'Unassigned'}</div>
                  <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{project.deadline ? new Date(project.deadline).toLocaleDateString() : '—'}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs font-medium px-2 py-1 rounded-full border border-border">{statusLabels[project.status] || project.status}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Project</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden md:table-cell">Manager</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Progress</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden md:table-cell">Deadline</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3"><p className="text-sm font-medium">{p.name}</p></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{p.manager?.fullName || '—'}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${p.progress}%` }} /></div><span className="text-xs">{p.progress}%</span></div></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-1 rounded-full border border-border">{statusLabels[p.status] || p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-heading">Create Project</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <input placeholder="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" required />
                <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground resize-none h-20" />
                <select value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground">
                  <option value="">Assign Manager (optional)</option>
                  {managers.map((m: any) => <option key={m._id} value={m._id}>{m.fullName}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground mb-1 block">Deadline</label><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" required /></div>
                  <div><label className="text-xs text-muted-foreground mb-1 block">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select></div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={createLoading} type="submit" className="w-full py-3 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70">
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Projects;
