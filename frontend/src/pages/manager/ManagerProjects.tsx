import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutGrid, List, Loader2, Calendar, Users, BarChart3, ChevronLeft, Plus, Check, Clock, AlertCircle } from 'lucide-react';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';

const priorityColors: Record<string, string> = {
  low: 'bg-blue-500/10 text-blue-500',
  medium: 'bg-amber-500/10 text-amber-500',
  high: 'bg-red-500/10 text-red-500',
};

const statusLabels: Record<string, string> = {
  not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', on_hold: 'On Hold', archived: 'Archived',
};

export default function ManagerProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  // Detail View State
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Create Task Form
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
  const [taskAdding, setTaskAdding] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.listProjects({ search });
      setProjects(res.data.data.projects || []);
    } catch { setProjects([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, [search]);

  const loadProjectDetails = async (projectId: string) => {
    setTasksLoading(true);
    try {
      const res = await companyAPI.getProject(projectId);
      setSelectedProject(res.data.data.project);
      setProjectTasks(res.data.data.tasks || []);
    } catch (err: any) {
      showToast('Failed to load project details', 'error');
    } finally {
      setTasksLoading(false);
    }
  };

  const handleTaskCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setTaskAdding(true);
    try {
      await companyAPI.addTask(selectedProject._id, taskForm);
      showToast('Task added successfully', 'success');
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
      loadProjectDetails(selectedProject._id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add task', 'error');
    } finally {
      setTaskAdding(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    if (!selectedProject) return;
    try {
      await companyAPI.updateTask(selectedProject._id, taskId, { status: newStatus });
      loadProjectDetails(selectedProject._id);
    } catch (err: any) {
      showToast('Failed to update task', 'error');
    }
  };

  if (selectedProject) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to Projects
        </button>

        {tasksLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold font-heading">{selectedProject.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{selectedProject.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border border-border`}>{statusLabels[selectedProject.status] || selectedProject.status}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColors[selectedProject.priority] || ''}`}>{selectedProject.priority} priority</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div><span className="text-muted-foreground">Deadline:</span> <span className="font-medium">{new Date(selectedProject.deadline).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground">Progress:</span> <span className="font-medium text-green-500">{selectedProject.progress}%</span></div>
                <div><span className="text-muted-foreground">Team Size:</span> <span className="font-medium">{selectedProject.team?.length || 0}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-heading">Tasks</h2>
              <button onClick={() => setShowTaskModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>

            {/* Kanban-lite view */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['todo', 'in_progress', 'done', 'overdue'].map(col => {
                const colTasks = projectTasks.filter(t => t.status === col);
                const colTitles: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done', overdue: 'Overdue' };
                return (
                  <div key={col} className="bg-muted/30 rounded-2xl p-4 border border-border flex flex-col h-full">
                    <h3 className="font-semibold text-sm mb-3 flex items-center justify-between">
                      {colTitles[col]} <span className="text-xs bg-background px-2 py-0.5 rounded-full">{colTasks.length}</span>
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {colTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
                      ) : (
                        colTasks.map(task => (
                          <div key={task._id} className="bg-card border border-border rounded-xl p-3 shadow-sm hover:border-accent/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium leading-tight">{task.title}</span>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority]?.split(' ')[0] || 'bg-gray-200'}`} />
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              {task.assignedTo ? (
                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold" title={task.assignedTo.fullName}>
                                  {task.assignedTo.fullName.charAt(0)}
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-bold" title="Unassigned">?</div>
                              )}
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                              </span>
                            </div>
                            <select
                              value={task.status}
                              onChange={(e) => handleTaskStatusChange(task._id, e.target.value)}
                              className="w-full text-xs p-1 rounded border border-border bg-background outline-none"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="done">Done</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Create Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-4">New Task</h2>
              <form onSubmit={handleTaskCreate} className="space-y-4">
                <input placeholder="Task Title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" required />
                <textarea placeholder="Description" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none h-20" />
                <select value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm">
                  <option value="">Assignee (Optional)</option>
                  {selectedProject.team?.map((member: any) => (
                    <option key={member._id} value={member._id}>{member.fullName}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                  <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 py-2 text-sm text-muted-foreground hover:bg-muted rounded-xl">Cancel</button>
                  <button type="submit" disabled={taskAdding} className="flex-1 py-2 text-sm bg-foreground text-background rounded-xl font-medium">{taskAdding ? 'Adding...' : 'Add'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">My Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Select a project to manage tasks</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-foreground text-background' : 'hover:bg-muted/60'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-foreground text-background' : 'hover:bg-muted/60'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Search my projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No assigned projects</h3>
          <p className="text-sm text-muted-foreground">You currently have no projects assigned to you.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <motion.div key={project._id} onClick={() => loadProjectDetails(project._id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-5 hover:border-accent/50 transition-all hover:translate-y-[-2px] cursor-pointer">
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
                  <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Team: {project.team?.length || 0}</div>
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
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Progress</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden md:table-cell">Deadline</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id} onClick={() => loadProjectDetails(p._id)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3"><p className="text-sm font-medium">{p.name}</p></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${p.progress}%` }} /></div><span className="text-xs">{p.progress}%</span></div></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-1 rounded-full border border-border">{statusLabels[p.status] || p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
