import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Plus, Search, Filter, UserPlus, MoreHorizontal, Mail, Eye, Edit2, UserX, Loader2, X, FileSpreadsheet, Check } from 'lucide-react';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';
import { useLocation } from 'react-router-dom';

const tabs = [
  { label: 'Managers', value: 'manager' },
  { label: 'Employees', value: 'employee' },
  { label: 'Clients', value: 'client' },
];

const PeopleManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('manager');
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', role: 'employee', department: '', position: '', contactNumber: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.listPeople({ role: activeTab, search });
      setPeople(res.data.data.people || []);
    } catch {
      setPeople([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPeople(); }, [activeTab, search]);

  const location = useLocation();
  useEffect(() => {
    if (location.state?.openModal) {
      setShowAddModal(true);
      if (location.state?.role) setActiveTab(location.state.role);
    }
  }, [location.state]);

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await companyAPI.addPerson({ ...addForm, role: activeTab });
      showToast('Person added successfully!', 'success');
      setShowAddModal(false);
      setAddForm({ fullName: '', email: '', role: 'employee', department: '', position: '', contactNumber: '' });
      fetchPeople();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add person', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      if (importPreview.length === 0) {
        const res = await companyAPI.importPeople(formData, true);
        setImportPreview(res.data.data.records || []);
      } else {
        const formData2 = new FormData();
        formData2.append('file', importFile);
        const res = await companyAPI.importPeople(formData2, false);
        showToast(`Imported ${res.data.data.success?.length || 0} records`, 'success');
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        fetchPeople();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Import failed', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await companyAPI.deactivatePerson(id);
      showToast('Person deactivated', 'success');
      fetchPeople();
    } catch { showToast('Failed to deactivate', 'error'); }
    setActionMenuId(null);
  };

  const handleResendEmail = async (id: string) => {
    try {
      await companyAPI.resendEmail(id);
      showToast('Welcome email resent', 'success');
    } catch { showToast('Failed to resend', 'error'); }
    setActionMenuId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">People Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team members and clients</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-muted/60 transition-colors">
            <Upload className="w-4 h-4" /> Import via File
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Person
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button key={tab.value} onClick={() => setActiveTab(tab.value)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${activeTab === tab.value ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Department</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Position</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : people.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">No {activeTab}s found. Add your first one!</td></tr>
              ) : (
                people.map((person) => (
                  <tr key={person._id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold">{person.fullName?.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-medium">{person.fullName}</p>
                          <p className="text-xs text-muted-foreground">{person.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{person.department || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{person.position || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${person.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${person.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        {person.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <button onClick={() => setActionMenuId(actionMenuId === person._id ? null : person._id)} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {actionMenuId === person._id && (
                        <div className="absolute right-4 top-full mt-1 w-40 rounded-xl border border-border bg-card shadow-lg z-10 overflow-hidden">
                          <button onClick={() => handleResendEmail(person._id)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Resend Email</button>
                          <button onClick={() => handleDeactivate(person._id)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 flex items-center gap-2 text-red-500"><UserX className="w-3.5 h-3.5" /> Deactivate</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Person Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-heading">Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddPerson} className="space-y-4">
                <input placeholder="Full Name" value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" required />
                <input placeholder="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" required />
                <input placeholder="Department" value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
                <input placeholder="Position" value={addForm.position} onChange={(e) => setAddForm({ ...addForm, position: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
                <input placeholder="Contact Number" value={addForm.contactNumber} onChange={(e) => setAddForm({ ...addForm, contactNumber: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={addLoading} type="submit" className="w-full py-3 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70">
                  {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Add & Send Invite</>}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowImportModal(false); setImportPreview([]); setImportFile(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-heading">Import People</h2>
                <button onClick={() => { setShowImportModal(false); setImportPreview([]); setImportFile(null); }}><X className="w-5 h-5" /></button>
              </div>

              {importPreview.length === 0 ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium mb-1">Upload file to import</p>
                    <p className="text-xs text-muted-foreground mb-4">Supports Excel (.xlsx), CSV, Word (.docx), PDF</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium cursor-pointer">
                      <Upload className="w-4 h-4" /> Choose File
                      <input type="file" accept=".xlsx,.xls,.csv,.docx,.pdf" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                    {importFile && <p className="text-sm mt-3 text-green-500">{importFile.name}</p>}
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={!importFile || importLoading} onClick={handleFileUpload} className="w-full py-3 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Preview Import'}
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{importPreview.length} records found. Review then confirm:</p>
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-3 py-2 text-xs font-semibold">Name</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold">Email</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold">Role</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold">Dept</th>
                      </tr></thead>
                      <tbody>
                        {importPreview.map((r: any, i: number) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="px-3 py-2">{r.fullName || '—'}</td>
                            <td className="px-3 py-2">{r.email || '—'}</td>
                            <td className="px-3 py-2 capitalize">{r.role || '—'}</td>
                            <td className="px-3 py-2">{r.department || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setImportPreview([]); setImportFile(null); }} className="flex-1 py-3 rounded-full border border-border text-sm font-medium hover:bg-muted/40">Cancel</button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={importLoading} onClick={handleFileUpload} className="flex-1 py-3 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70">
                      {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Confirm Import</>}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PeopleManagement;
