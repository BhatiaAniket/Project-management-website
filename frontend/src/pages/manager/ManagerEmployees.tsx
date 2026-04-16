import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { managerAPI } from '../../api/manager';
import { showToast } from '../../components/Toast';
import { Search, Loader2, Users, TrendingUp } from 'lucide-react';

const ManagerEmployees = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await managerAPI.getEmployees();
        setEmployees(res.data.data || []);
      } catch (e) {
        showToast('Failed to load employees', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const filtered = employees.filter(e =>
    e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">My Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and view performance of your team members.</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No team members found</h3>
          <p className="text-sm text-muted-foreground">No employees have been added to this company yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((emp, i) => (
            <motion.div key={emp._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-foreground/20 transition-all">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-xl font-bold shrink-0">
                  {emp.fullName?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{emp.fullName}</h3>
                  <p className="text-xs text-muted-foreground">{emp.email}</p>
                  {emp.position && <p className="text-xs text-muted-foreground mt-0.5">{emp.position}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 text-center">
                  <p className="text-2xl font-bold">{emp.totalTasks ?? emp.tasksAssigned ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Total Tasks</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 text-center">
                  <p className={`text-2xl font-bold ${
                    (emp.score ?? 0) >= 800 ? 'text-green-500' :
                    (emp.score ?? 0) >= 600 ? 'text-blue-500' :
                    (emp.score ?? 0) >= 400 ? 'text-yellow-500' :
                    (emp.score ?? 0) >= 200 ? 'text-orange-500' : 'text-red-500'
                  }`}>
                    {emp.score ?? 0}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Score /1000</p>
                </div>
              </div>

              {/* Score label badge */}
              <div className={`mb-4 text-center text-xs font-semibold py-1 rounded-full ${
                (emp.score ?? 0) >= 800 ? 'bg-green-500/10 text-green-600' :
                (emp.score ?? 0) >= 600 ? 'bg-blue-500/10 text-blue-600' :
                (emp.score ?? 0) >= 400 ? 'bg-yellow-500/10 text-yellow-600' :
                (emp.score ?? 0) >= 200 ? 'bg-orange-500/10 text-orange-600' : 'bg-red-500/10 text-red-600'
              }`}>
                {emp.scoreLabel?.emoji ?? ''} {emp.scoreLabel?.label ?? (emp.score >= 800 ? 'Excellent' : emp.score >= 600 ? 'Good' : emp.score >= 400 ? 'Average' : emp.score >= 200 ? 'Needs Work' : 'Critical')}
              </div>

              <button className="w-full py-2.5 rounded-xl border border-border bg-background hover:bg-muted font-medium text-sm transition-colors flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" /> View Full Performance
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagerEmployees;
