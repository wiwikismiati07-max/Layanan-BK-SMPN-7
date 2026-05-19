import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BarChart3, 
  Plus, 
  Download, 
  Upload, 
  Search, 
  Trash2, 
  ChevronRight,
  MoreVertical,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Database,
  Grid,
  Settings,
  LogOut,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { exportToExcel, parseExcel } from './lib/excelUtils';
import { getSupabase } from './lib/supabase';

// Types
interface Student {
  id: string;
  name: string;
  class: string;
  nisn?: string;
}

interface ClassRoom {
  id: string;
  name: string;
  teacher?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  target: string;
  photoUrl: string;
  note: string;
  createdAt: number;
}

type MenuTab = 'dashboard' | 'master' | 'transaksi' | 'laporan';

export default function App() {
  const [activeTab, setActiveTab] = useState<MenuTab>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form States
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    descriptions: Array(8).fill(''),
    target: '',
    photoUrl: '',
    note: ''
  });

  // Excel Input Refs
  const studentFileRef = useRef<HTMLInputElement>(null);
  const classFileRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);

  // Load Initial Data
  useEffect(() => {
    const savedStudents = localStorage.getItem('bk_students');
    const savedClasses = localStorage.getItem('bk_classes');
    const savedTransactions = localStorage.getItem('bk_transactions');

    if (savedStudents) setStudents(JSON.parse(savedStudents));
    if (savedClasses) setClasses(JSON.parse(savedClasses));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    
    setIsLoading(false);
  }, []);

  // Persistence
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('bk_students', JSON.stringify(students));
      localStorage.setItem('bk_classes', JSON.stringify(classes));
      localStorage.setItem('bk_transactions', JSON.stringify(transactions));
    }
  }, [students, classes, transactions, isLoading]);

  // Actions
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      setTransactions(transactions.map(t => t.id === editingId ? {
        ...t,
        date: newTransaction.date,
        target: newTransaction.target,
        photoUrl: newTransaction.photoUrl,
        note: newTransaction.note,
        description: newTransaction.descriptions.filter(d => d.trim() !== '').join(', '),
      } : t));
      setEditingId(null);
    } else {
      const item: Transaction = {
        date: newTransaction.date,
        target: newTransaction.target,
        photoUrl: newTransaction.photoUrl,
        note: newTransaction.note,
        description: newTransaction.descriptions.filter(d => d.trim() !== '').join(', '),
        id: Date.now().toString(),
        createdAt: Date.now()
      };
      setTransactions([item, ...transactions]);
    }

    setIsModalOpen(false);
    setNewTransaction({
      date: new Date().toISOString().split('T')[0],
      descriptions: Array(8).fill(''),
      target: '',
      photoUrl: '',
      note: ''
    });
  };

  const handleEditClick = (t: Transaction) => {
    const descs = t.description.split(', ');
    const filledDescs = [...descs];
    while (filledDescs.length < 8) filledDescs.push('');
    
    setNewTransaction({
      date: t.date,
      descriptions: filledDescs.slice(0, 8),
      target: t.target,
      photoUrl: t.photoUrl,
      note: t.note
    });
    setEditingId(t.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus agenda ini?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleExcelUpload = async (type: 'student' | 'class', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcel(file);
      if (type === 'student') {
        const newStudents = data.map((d: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: d.Nama || d.name || 'Unknown',
          class: d.Kelas || d.class || '-',
          nisn: d.NISN || d.nisn || ''
        }));
        setStudents([...students, ...newStudents]);
      } else {
        const newClasses = data.map((d: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: d.Nama || d.name || 'Unknown',
          teacher: d.Wali || d.teacher || ''
        }));
        setClasses([...classes, ...newClasses]);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memproses file Excel.');
    }
  };

  const handleBackup = () => {
    const data = { students, classes, transactions };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bk_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.students) setStudents(json.students);
        if (json.classes) setClasses(json.classes);
        if (json.transactions) setTransactions(json.transactions);
        alert('Data berhasil dipulihkan!');
      } catch (err) {
        alert('Format file cadangan tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.target.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 h-full bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <img 
                src="https://iili.io/KDFk4fI.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">AGENDA BK</h1>
              <p className="text-[10px] font-bold text-indigo-500 tracking-widest mt-1">SMP NEGERI 7</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'master', label: 'Master Data', icon: Users },
            { id: 'transaksi', label: 'Transaksi', icon: FileText },
            { id: 'laporan', label: 'Laporan', icon: BarChart3 }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as MenuTab)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 font-semibold text-sm group",
                activeTab === item.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-indigo-500")} />
              {item.label}
              {activeTab === item.id && (
                <motion.div layoutId="bubble" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="flex flex-col gap-2">
            <button 
              onClick={handleBackup}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" /> Cadangkan Data
            </button>
            <button 
              onClick={() => backupFileRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <Upload className="w-4 h-4" /> Unggah Database
            </button>
            <input type="file" ref={backupFileRef} onChange={handleRestore} className="hidden" accept=".json" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-[#f8fafc] flex flex-col">
        <header className="h-20 px-10 flex items-center justify-between sticky top-0 bg-[#f8fafc]/80 backdrop-blur-md z-10">
          <h2 className="text-2xl font-bold text-slate-900 capitalize tracking-tight">
            {activeTab}
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
              <input 
                type="text" 
                placeholder="Cari sesuatu..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border-transparent focus:border-indigo-500 border rounded-2xl pl-10 pr-4 py-2.5 text-sm w-64 shadow-sm transition-all outline-none"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </header>

        <div className="px-10 pb-10 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Siswa', value: students.length, icon: Users, color: 'indigo' },
                      { label: 'Total Kelas', value: classes.length, icon: Grid, color: 'sky' },
                      { label: 'Kegiatan Terlaksana', value: transactions.length, icon: CheckCircle2, color: 'emerald' },
                      { label: 'Bulan Ini', value: transactions.filter(t => t.date.startsWith(new Date().toISOString().slice(0, 7))).length, icon: Calendar, color: 'rose' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500`} />
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-1",
                          stat.color === 'indigo' ? "bg-indigo-100 text-indigo-600" : 
                          stat.color === 'sky' ? "bg-sky-100 text-sky-600" :
                          stat.color === 'emerald' ? "bg-emerald-100 text-emerald-600" :
                          "bg-rose-100 text-rose-600"
                        )}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                        <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold">Agenda Terkini</h3>
                      <button onClick={() => setActiveTab('transaksi')} className="text-indigo-600 text-xs font-bold hover:underline">Lihat Semua</button>
                    </div>
                    <div className="space-y-6">
                      {transactions.slice(0, 3).map((t) => (
                        <div key={t.id} className="flex gap-6 p-4 hover:bg-slate-50 rounded-[2rem] transition-all group border border-transparent hover:border-slate-100">
                          <div className="w-16 h-16 rounded-[1.25rem] bg-slate-100 flex-shrink-0 overflow-hidden shadow-inner font-bold text-slate-300 text-[10px] flex items-center justify-center">
                            {t.photoUrl ? (
                              <img src={t.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              'TANPA FOTO'
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-bold text-slate-900">{t.description}</h4>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                                {new Date(t.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{t.note}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Users className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="text-[10px] font-bold text-slate-600 uppercase">{t.target}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {transactions.length === 0 && (
                        <div className="text-center py-10">
                          <p className="text-slate-400 text-sm">Belum ada kegiatan yang tercatat.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'master' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Students */}
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 h-fit overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-bold">Data Siswa</h3>
                        <p className="text-xs text-slate-400 mt-1">{students.length} Siswa Terdaftar</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => studentFileRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-100 hover:scale-105 transition-all"
                        >
                          <Upload className="w-4 h-4" /> Import Excel
                        </button>
                        <input type="file" ref={studentFileRef} onChange={(e) => handleExcelUpload('student', e)} className="hidden" accept=".xlsx, .xls" />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <th className="pb-4 px-2">Nama</th>
                            <th className="pb-4 px-2">Kelas</th>
                            <th className="pb-4 px-2">NISN</th>
                            <th className="pb-4 px-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {students.slice(0, 50).map((s) => (
                            <tr key={s.id} className="group hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-2 text-sm font-semibold text-slate-700">{s.name}</td>
                              <td className="py-4 px-2 text-sm text-slate-500">{s.class}</td>
                              <td className="py-4 px-2 text-[11px] font-mono text-slate-400">{s.nisn}</td>
                              <td className="py-4 px-2 text-right">
                                <button 
                                  onClick={() => setStudents(students.filter(std => std.id !== s.id))}
                                  className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Classes */}
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 h-fit">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-bold">Data Kelas</h3>
                        <p className="text-xs text-slate-400 mt-1">{classes.length} Rombel</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => classFileRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-sky-100 hover:scale-105 transition-all"
                        >
                          <Upload className="w-4 h-4" /> Import Excel
                        </button>
                        <input type="file" ref={classFileRef} onChange={(e) => handleExcelUpload('class', e)} className="hidden" accept=".xlsx, .xls" />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <th className="pb-4 px-2">Nama Kelas</th>
                            <th className="pb-4 px-2">Wali Kelas</th>
                            <th className="pb-4 px-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {classes.map((c) => (
                            <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">{c.name.slice(0, 3)}</div>
                                  <span className="text-sm font-semibold text-slate-700">{c.name}</span>
                                </div>
                              </td>
                              <td className="py-4 px-2 text-sm text-slate-500">{c.teacher}</td>
                              <td className="py-4 px-2 text-right">
                                <button 
                                  onClick={() => setClasses(classes.filter(cls => cls.id !== c.id))}
                                  className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'transaksi' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold">Catatan Kegiatan BK</h3>
                      <p className="text-slate-400 text-sm">Rekam agenda bimbingan dan konseling harian.</p>
                    </div>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus className="w-5 h-5" /> Buat Kegiatan
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTransactions.map((t) => (
                      <div key={t.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm group hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 flex flex-col">
                        <div className="h-48 bg-slate-50 relative overflow-hidden flex items-center justify-center">
                          {t.photoUrl ? (
                            <img src={t.photoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                          ) : (
                            <ImageIcon className="w-12 h-12 text-slate-200" />
                          )}
                          <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-[10px] font-black text-slate-900 uppercase">
                            {t.date}
                          </div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col">
                          <h4 className="text-lg font-bold text-slate-900 mb-2">{t.description}</h4>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                              <Users className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">{t.target}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed italic mb-6 line-clamp-3">"{t.note}"</p>
                          <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                            <button 
                              onClick={() => setTransactions(transactions.filter(tr => tr.id !== t.id))}
                              className="text-rose-500 text-[10px] font-black uppercase hover:underline"
                            >
                              Hapus Agenda
                            </button>
                            <BarChart3 className="w-4 h-4 text-slate-200" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <h4 className="text-slate-400 font-bold">Belum ada transaksi</h4>
                        <p className="text-slate-400 text-xs mt-1">Gunakan tombol 'Buat Kegiatan' untuk menambah data.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'laporan' && (
                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-xl font-bold">Laporan Agenda Kerja</h3>
                      <p className="text-sm text-slate-400 mt-1">Ekspor data ke format Excel untuk dokumentasi resmi.</p>
                    </div>
                    <button 
                      onClick={() => exportToExcel(transactions, `Laporan_BK_${new Date().toISOString()}`)}
                      className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all"
                    >
                      <FileSpreadsheet className="w-5 h-5" /> Download Excel
                    </button>
                  </div>

                  <div className="overflow-x-auto -mx-10 px-10">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="py-6 px-4">Tanggal</th>
                          <th className="py-6 px-4">Uraian Kegiatan</th>
                          <th className="py-6 px-4">Sasaran</th>
                          <th className="py-6 px-4">Link Foto</th>
                          <th className="py-6 px-4">Keterangan</th>
                          <th className="py-6 px-4 w-24">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-6 px-4 text-sm font-semibold text-slate-900">{t.date}</td>
                            <td className="py-6 px-4 text-sm text-slate-700">{t.description}</td>
                            <td className="py-6 px-4 text-sm font-bold text-slate-500 uppercase">{t.target}</td>
                            <td className="py-6 px-4">
                              {t.photoUrl ? (
                                <a href={t.photoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline font-bold">
                                  Lihat <Upload className="w-3 h-3 hover:rotate-12 transition-transform" />
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-bold">TIDAK ADA</span>
                              )}
                            </td>
                            <td className="py-6 px-4 text-xs text-slate-500 italic max-w-xs truncate">{t.note}</td>
                            <td className="py-6 px-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleEditClick(t)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(t.id)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modal Transaction */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl p-10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">{editingId ? 'Edit Agenda' : 'Agenda Baru'}</h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }}
                  className="p-3 rounded-full hover:bg-slate-50 transition-all text-slate-400 hover:text-rose-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tanggal</label>
                    <input 
                      type="date" 
                      required
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sasaran (Siswa/Kelas)</label>
                    <input 
                      list="sasaran-list"
                      placeholder="Contoh: Kelas 7A"
                      required
                      value={newTransaction.target}
                      onChange={(e) => setNewTransaction({ ...newTransaction, target: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-semibold"
                    />
                    <datalist id="sasaran-list">
                      {classes.map(c => <option key={c.id} value={c.name} />)}
                      {students.slice(0, 10).map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Uraian Kegiatan (8 Kolom Manual)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {newTransaction.descriptions.map((desc, idx) => (
                      <input 
                        key={idx}
                        type="text" 
                        placeholder={`Kegiatan ${idx + 1}...`}
                        value={desc}
                        onChange={(e) => {
                          const updated = [...newTransaction.descriptions];
                          updated[idx] = e.target.value;
                          setNewTransaction({ ...newTransaction, descriptions: updated });
                        }}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-semibold"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Link Foto (URL)</label>
                  <input 
                    type="url" 
                    placeholder="https://example.com/image.png"
                    value={newTransaction.photoUrl}
                    onChange={(e) => setNewTransaction({ ...newTransaction, photoUrl: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Keterangan Tambahan</label>
                  <textarea 
                    rows={3}
                    placeholder="Tuliskan catatan singkat hasil kegiatan..."
                    value={newTransaction.note}
                    onChange={(e) => setNewTransaction({ ...newTransaction, note: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-semibold resize-none"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-4 rounded-[1.5rem] font-bold text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                  >
                    {editingId ? 'Simpan Perubahan' : 'Simpan Agenda'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}
