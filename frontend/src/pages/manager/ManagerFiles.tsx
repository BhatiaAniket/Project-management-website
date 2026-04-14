import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, FileCode, CheckCheck, Upload, Users, Loader2, Search } from 'lucide-react';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';

const ManagerFiles = () => {
  const [activeTab, setActiveTab] = useState<'team' | 'sent' | 'received'>('team');
  const [teamFiles, setTeamFiles] = useState<any[]>([]);
  const [sentFiles, setSentFiles] = useState<any[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({
    recipients: [] as string[],
    message: '',
    file: null as File | null
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const peopleRes = await companyAPI.listPeople({ limit: 500 });
        setTeamMembers(peopleRes.data.data.people || []);
        
        // Mock data for demonstration - in real app would fetch from /api/files with manager scope
        setTeamFiles([
          { _id: 't1', fileName: 'Project_Alpha_Spec.pdf', type: 'pdf', size: '1.2 MB', uploadedBy: 'Abhay (IT)', project: 'Project Alpha', createdAt: new Date().toISOString() },
          { _id: 't2', fileName: 'UI_Mockups_v2.png', type: 'image', size: '4.5 MB', uploadedBy: 'Jane Doe', project: 'Project Beta', createdAt: new Date(Date.now() - 86400000).toISOString() }
        ]);
        
        setReceivedFiles([
          { _id: 'r1', fileName: 'Expense_Report.xlsx', type: 'spreadsheet', size: '450 KB', sentBy: { fullName: 'Employee John', avatar: '' }, createdAt: new Date().toISOString(), read: false }
        ]);

        setSentFiles([
          { _id: 's1', fileName: 'Company_Guidelines.pdf', type: 'pdf', sentTo: [{ _id: 'e1', fullName: 'All Employees' }], readBy: [], createdAt: new Date().toISOString() }
        ]);
      } catch(e) { 
        showToast('Error loading files', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSendFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || form.recipients.length === 0) return showToast('Please attach a file and select recipients', 'error');
    setUploading(true);
    
    // Simulate upload
    setTimeout(() => {
      const newSent = {
        _id: Math.random().toString(),
        fileName: form.file!.name,
        type: form.file!.type,
        sentTo: teamMembers.filter(m => form.recipients.includes(m._id)),
        readBy: [],
        createdAt: new Date().toISOString()
      };
      setSentFiles([newSent, ...sentFiles]);
      setForm({ recipients: [], message: '', file: null });
      setUploading(false);
      showToast('File shared with team', 'success');
    }, 1500);
  };

  const toggleRecipient = (id: string) => {
    setForm(prev => ({
      ...prev,
      recipients: prev.recipients.includes(id) ? prev.recipients.filter(x => x !== id) : [...prev.recipients, id]
    }));
  };

  if (loading) return <div className="flex justify-center items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading">Team Files</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and share project-related documents.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['team', 'received', 'sent'] as const).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border capitalize ${activeTab === tab ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground'}`}
          >
            {tab} Files
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Share Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 lg:col-span-1 sticky top-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-500" /> Share with Team</h2>
          <form onSubmit={handleSendFile} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Recipients (Multi-select) *</label>
              <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-xl p-2 custom-scrollbar bg-background text-xs">
                {teamMembers.map((m) => (
                  <label key={m._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer">
                    <input type="checkbox" checked={form.recipients.includes(m._id)} onChange={() => toggleRecipient(m._id)} className="rounded" />
                    <span className="truncate">{m.fullName}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto capitalize">{m.role.replace('_',' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">File *</label>
              <input 
                type="file" 
                onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 transition-colors"
                required
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              disabled={uploading}
              className="w-full py-3 mt-2 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70 shadow-md"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Share File</>}
            </motion.button>
          </form>
        </motion.div>

        {/* File Lists */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search files..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground"
            />
          </div>

          {(activeTab === 'team' ? teamFiles : activeTab === 'received' ? receivedFiles : sentFiles)
            .filter(f => f.fileName.toLowerCase().includes(search.toLowerCase()))
            .map((file, i) => (
              <motion.div key={file._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-foreground/20 transition-all shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{file.fileName}</h3>
                  <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                    <span>{file.size||''}</span>
                    {file.project && <span>• {file.project}</span>}
                    {file.uploadedBy && <span>• Uploaded by {file.uploadedBy}</span>}
                    {file.sentBy && <span>• From {file.sentBy.fullName}</span>}
                  </div>
                </div>
                <button className="text-xs font-bold px-3 py-1.5 rounded-full bg-muted hover:bg-muted-foreground/10 transition-colors">
                  Download
                </button>
              </motion.div>
          ))}
          
          {(activeTab === 'team' ? teamFiles : activeTab === 'received' ? receivedFiles : sentFiles).length === 0 && (
            <div className="text-center py-16 border border-border bg-card rounded-2xl">
              <p className="text-sm text-muted-foreground">No files found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerFiles;
