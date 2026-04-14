import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, FileCode, CheckCheck, Upload, Users, Loader2 } from 'lucide-react';
import { employeeAPI } from '../../api/employee';
import { showToast } from '../../components/Toast';

const EmployeeFiles = () => {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedFiles, setReceivedFiles] = useState<any[]>([]);
  const [sentFiles, setSentFiles] = useState<any[]>([]);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    recipients: [] as string[],
    message: '',
    file: null as File | null
  });

  useEffect(() => {
    // Mock fetching for now as full multipart API wasn't strictly built in Phase 1
    const fetchAll = async () => {
      try {
        const colRes = await employeeAPI.getColleagues();
        setColleagues(colRes.data.data || []);
        
        // Mock data
        setReceivedFiles([
          { _id: '1', fileName: 'Q3_Report.pdf', type: 'pdf', size: '2.4 MB', sentBy: { fullName: 'Manager Alice', avatar: '' }, createdAt: new Date().toISOString(), read: false },
          { _id: '2', fileName: 'design_assets.zip', type: 'zip', size: '15 MB', sentBy: { fullName: 'Bob Design', avatar: '' }, createdAt: new Date(Date.now() - 86400000).toISOString(), read: true }
        ]);
        
        setSentFiles([
          { _id: '3', fileName: 'daily_summary.docx', type: 'doc', sentTo: [{ _id: '101', fullName: 'Manager Alice' }], readBy: [], createdAt: new Date().toISOString() }
        ]);
      } catch(e) { }
      finally { setLoading(false); }
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
        sentTo: colleagues.filter(c => form.recipients.includes(c._id)),
        readBy: [],
        createdAt: new Date().toISOString()
      };
      setSentFiles([newSent, ...sentFiles]);
      setForm({ recipients: [], message: '', file: null });
      setUploading(false);
      showToast('File sent successfully', 'success');
    }, 1500);
  };

  const toggleRecipient = (id: string) => {
    setForm(prev => ({
      ...prev,
      recipients: prev.recipients.includes(id) ? prev.recipients.filter(x => x !== id) : [...prev.recipients, id]
    }));
  };

  const markAsRead = (id: string) => {
    setReceivedFiles(prev => prev.map(f => f._id === id ? { ...f, read: true } : f));
  };

  if (loading) return <div className="flex justify-center items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading">Files</h1>
          <p className="text-muted-foreground text-sm mt-1">Send and receive files securely.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['received', 'sent'] as const).map((tab) => (
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
        {/* Send File Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 lg:col-span-1 sticky top-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-500" /> Send File</h2>
          <form onSubmit={handleSendFile} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Recipients (Multi-select) *</label>
              <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded-xl p-2 custom-scrollbar bg-background">
                {colleagues.map((c) => (
                  <label key={c._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer text-sm">
                    <input type="checkbox" checked={form.recipients.includes(c._id)} onChange={() => toggleRecipient(c._id)} className="rounded" />
                    {c.fullName} <span className="text-[10px] text-muted-foreground capitalize">({c.role.replace('_',' ')})</span>
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

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Message / Note (Optional)</label>
              <textarea 
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground min-h-[60px] resize-none"
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              disabled={uploading}
              className="w-full py-3 mt-2 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70 shadow-md"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Send File</>}
            </motion.button>
          </form>
        </motion.div>

        {/* File Lists */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'received' ? (
            receivedFiles.length > 0 ? receivedFiles.map((file, i) => (
              <motion.div key={file._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-5 hover:border-foreground/20 transition-all flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  {file.type.includes('pdf') ? <FileText className="w-6 h-6" /> : file.type.includes('image') ? <ImageIcon className="w-6 h-6" /> : <FileCode className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{file.fileName}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <span>{file.size}</span>
                    <span>•</span>
                    <span>From: {file.sentBy.fullName}</span>
                    <span>•</span>
                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {file.read ? (
                    <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1 bg-blue-100 px-2 py-0.5 rounded-full"><CheckCheck className="w-3 h-3"/> Read</span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">Unread</span>
                  )}
                  <button onClick={() => markAsRead(file._id)} className="text-xs font-semibold hover:underline">Download</button>
                </div>
              </motion.div>
            )) : <div className="text-center py-16 border border-border bg-card rounded-2xl"><p className="text-sm text-muted-foreground">No received files.</p></div>
          ) : (
            sentFiles.length > 0 ? sentFiles.map((file, i) => (
              <motion.div key={file._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-5 hover:border-foreground/20 transition-all shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm truncate">{file.fileName}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(file.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Users className="w-3 h-3"/> Recipients & Status</p>
                  <div className="space-y-1">
                    {file.sentTo.map((rec: any) => {
                      const hasRead = file.readBy.some((r: any) => r.user === rec._id);
                      return (
                        <div key={rec._id} className="flex justify-between items-center text-xs">
                          <span>{rec.fullName}</span>
                          {hasRead ? <span className="text-blue-500 font-semibold flex items-center gap-1"><CheckCheck className="w-3 h-3"/> Read</span> : <span className="text-muted-foreground">Unread</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )) : <div className="text-center py-16 border border-border bg-card rounded-2xl"><p className="text-sm text-muted-foreground">No sent files.</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeFiles;
