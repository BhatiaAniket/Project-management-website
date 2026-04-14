import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { employeeAPI } from '../../api/employee';
import { showToast } from '../../components/Toast';
import { Loader2, Download, TrendingUp, Sparkles, Award } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const EmployeePerformance = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await employeeAPI.getPerformance();
        setData(res.data.data);
      } catch (e) {
        showToast('Failed to load performance data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('performance_report.pdf');
      showToast('Report downloaded successfully', 'success');
    } catch (e) {
      showToast('Error generating PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  const maxTaskCount = data ? Math.max(...data.tasksPerWeek, 10) : 10; // min y-axis max is 10

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading">Performance Review</h1>
            <p className="text-muted-foreground text-sm">Automated metrics and AI-driven insights.</p>
          </div>
        </div>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-full hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-70"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export PDF
        </button>
      </div>

      {/* The Printable Report Container */}
      <div ref={reportRef} className="bg-card border border-border rounded-2xl p-8 shadow-sm">

        {/* Header */}
        <div className="flex justify-between items-end border-b border-border pb-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-1">CognifyPM Performance Report</h2>
            <p className="text-sm text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
          </div>
          <Award className="w-10 h-10 text-foreground opacity-20" />
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-background rounded-xl border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Completion Rate</p>
            <p className="text-2xl font-bold">{data?.completionRate || 0}%</p>
          </div>
          <div className="p-4 bg-background rounded-xl border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Tasks</p>
            <p className="text-2xl font-bold">{data?.totalTasks || 0}</p>
          </div>
          <div className="p-4 bg-background rounded-xl border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tasks Done</p>
            <p className="text-2xl font-bold">{data?.doneTasks || 0}</p>
          </div>
          <div className="p-4 bg-background rounded-xl border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Projects</p>
            <p className="text-2xl font-bold">Autopiloted</p>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 mb-8 relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 w-24 h-24 text-blue-500 opacity-5" />
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-500" /> AI Executive Summary</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {data?.completionRate > 80
              ? "Exceptional performance this period. You have consistently hit deadlines and maintained a high throughput of task resolution. Your proactive approach to daily reporting indicates strong alignment with project goals. Keep up the excellent work!"
              : data?.completionRate > 50
                ? "Solid progress over the recent weeks. Task completion is steady, though there is room for improvement in closing out pending items faster. Focusing on high-priority deadlines will boost overall efficiency."
                : "We've noticed a slowdown in task completions recently. Please review overdue tasks and communicate any blockers with your manager promptly to re-align on expectations."}
          </p>
        </div>

        {/* 8-Week Bar Chart (CSS Flex) */}
        <div>
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-foreground" /> 8-Week Velocity</h3>

          <div className="h-64 flex items-end justify-between gap-2 px-2 border-b border-l border-border pb-2">
            {data?.tasksPerWeek?.map((count: number, index: number) => {
              const heightPercent = Math.max((count / maxTaskCount) * 100, 2); // min 2% so empty weeks show slightly
              return (
                <div key={index} className="w-full flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-8 text-xs font-bold bg-foreground text-background px-2 py-1 rounded transition-opacity">
                    {count} tasks
                  </span>

                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className={`w-full max-w-[40px] rounded-t-md mx-auto transition-colors ${index === 7 ? 'bg-foreground' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                  />

                  <span className="absolute -bottom-6 text-[10px] text-muted-foreground font-medium">
                    {index === 7 ? 'This Wk' : `Wk -${7 - index}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmployeePerformance;
