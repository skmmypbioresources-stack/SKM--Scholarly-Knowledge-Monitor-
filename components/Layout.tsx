
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Student, Curriculum } from '../types';
import { logout, getCurrentSession } from '../services/auth';
import { syncStudentData, getStudentSyncData } from '../services/cloudService';
import { updateStudent } from '../services/storageService';
import { getSetting } from '../services/db';
import { 
  LayoutDashboard, GraduationCap, MessageCircle, LogOut, UserCircle,
  ClipboardList, BrainCircuit, Settings as SettingsIcon, Loader2, ChevronDown,
  Cloud, RefreshCw, CheckCircle2, AlertCircle, Link as LinkIcon, WifiOff,
  Puzzle, Star, Keyboard, BookA, Trophy, Menu, PanelLeftClose, PanelLeftOpen,
  Library, FileCheck2, Maximize, Minimize, DownloadCloud, UploadCloud, ExternalLink,
  Users2
} from 'lucide-react';

interface LayoutProps {
  student: Student;
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}

const SKMLogo = ({ collapsed }: { collapsed: boolean }) => (
  <svg width={collapsed ? "48" : "120"} height="48" viewBox={collapsed ? "0 0 48 48" : "0 0 130 48"} fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-all duration-300">
    <rect width={collapsed ? "48" : "130"} height="48" rx="8" fill="url(#paint0_linear)" />
    {collapsed ? (
         <text x="24" y="32" textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize="20" fontWeight="900" fill="#FFFFFF">SKM</text>
    ) : (
        <>
            <text x="65" y="28" textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize="24" fontWeight="900" fill="#FFFFFF" letterSpacing="-0.5" style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.15))' }}>SKM</text>
            <text x="65" y="42" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="7.5" fontWeight="400" fill="#E0E7FF" opacity="0.95">Scholarly Knowledge Monitor</text>
        </>
    )}
    <defs>
      <linearGradient id="paint0_linear" x1="0" y1="0" x2="130" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4F46E5" />
        <stop offset="1" stopColor="#6366F1" />
      </linearGradient>
    </defs>
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ student, children, onRefresh }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const session = getCurrentSession();
  const isAdmin = session?.type === 'ADMIN';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
        await syncStudentData(student);
        await onRefresh();
    } catch (e) {
        console.error("Sync failed", e);
    } finally {
        setIsSyncing(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        setIsFullscreen(true);
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }
  };

  const navItems = [
    { label: 'Assessment Records', path: 'records', icon: LayoutDashboard, category: 'Academic' },
    { label: 'Grade Predictor', path: 'summative', icon: Trophy, category: 'Academic' },
    { label: 'Term Exams', path: 'school-exams', icon: ClipboardList, category: 'Academic' },
    { label: 'Assessment Tasks', path: 'assessment-tasks', icon: FileCheck2, category: 'Academic' },
    { label: 'Peer Marking', path: 'peer-marking', icon: Users2, category: 'Academic' },
    { label: 'Library', path: 'syllabus-library', icon: Library, category: 'Resources' },
    { label: 'Tuition Workflow', path: 'tuition', icon: BrainCircuit, category: 'Resources' },
    { label: 'AI Tutor', path: 'communication', icon: MessageCircle, category: 'Resources' },
  ];

  const empowermentItems = [
      { label: 'BioMind Puzzle', path: 'bio-puzzle', icon: Puzzle },
      { label: 'Growth Tracker', path: 'atl-tracker', icon: Star },
      { label: 'BioType Tutor', path: 'typing-tutor', icon: Keyboard },
      { label: 'Scientific Vocab', path: 'vocab', icon: BookA },
      { label: 'My Rank', path: 'growth-score', icon: Trophy },
  ];

  const currentPath = location.pathname.split('/').pop();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-gray-100 flex flex-col transition-all duration-300 shadow-xl z-30`}>
        <div className="p-4 mb-4 flex items-center justify-between">
          <SKMLogo collapsed={isCollapsed} />
          {!isCollapsed && (
              <button onClick={() => setIsCollapsed(true)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors">
                <PanelLeftClose size={20} />
              </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-8 scrollbar-hide pb-20">
          <div>
            {!isCollapsed && <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Academic Portal</p>}
            <nav className="space-y-1">
              {navItems.filter(i => i.category === 'Academic').map((item) => (
                <Link
                  key={item.path}
                  to={`/student/${student.id}/${item.path}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all group ${
                    currentPath === item.path
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <item.icon size={22} className={`${currentPath === item.path ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            {!isCollapsed && <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Support & Tools</p>}
            <nav className="space-y-1">
              {navItems.filter(i => i.category === 'Resources').map((item) => (
                <Link
                  key={item.path}
                  to={`/student/${student.id}/${item.path}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all group ${
                    currentPath === item.path
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <item.icon size={22} className="group-hover:rotate-12 transition-transform" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </nav>
          </div>

          <div>
             {!isCollapsed && <p className="px-4 text-[10px] font-black text-teal-500 uppercase tracking-[0.2em] mb-4">Empowerment</p>}
             <nav className="space-y-1">
                {empowermentItems.map((item) => (
                    <Link
                        key={item.path}
                        to={`/student/${student.id}/${item.path}`}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all group ${
                            currentPath === item.path
                            ? 'bg-teal-600 text-white shadow-lg'
                            : 'text-gray-500 hover:bg-teal-50 hover:text-teal-600'
                        }`}
                        title={isCollapsed ? item.label : ''}
                    >
                        <item.icon size={20} className="group-hover:scale-110 transition-transform" />
                        {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                ))}
             </nav>
          </div>
        </div>

        <div className="p-4 border-t border-gray-50 space-y-2">
            <button 
                onClick={toggleFullscreen}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition-all"
            >
                {isFullscreen ? <Minimize size={22}/> : <Maximize size={22}/>}
                {!isCollapsed && <span>{isFullscreen ? 'Exit Full' : 'Full Screen'}</span>}
            </button>
            <Link
                to={`/student/${student.id}/settings`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                currentPath === 'settings'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
            >
                <SettingsIcon size={22} />
                {!isCollapsed && <span>Settings</span>}
            </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
             {isCollapsed && (
                 <button onClick={() => setIsCollapsed(false)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400">
                    <PanelLeftOpen size={24} />
                 </button>
             )}
             <div className="hidden md:block">
                <h1 className="text-xl font-black text-gray-900">
                    {navItems.find(i => i.path === currentPath)?.label || empowermentItems.find(i => i.path === currentPath)?.label || 'Student Portal'}
                </h1>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{student.curriculum} • Batch {student.batch}</p>
             </div>
          </div>

          <div className="flex items-center gap-4">
            {isSyncing && <div className="flex items-center gap-2 text-indigo-600 text-xs font-black animate-pulse uppercase"><Loader2 className="animate-spin" size={14}/> Cloud Syncing...</div>}
            
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-indigo-600 font-bold text-sm transition-all rounded-xl hover:bg-white"
                    title="Manual Cloud Sync"
                >
                    <Cloud size={18} className={isSyncing ? 'animate-bounce' : ''}/>
                    <span className="hidden lg:inline">Save To Teacher</span>
                </button>
            </div>

            <div className="h-8 w-px bg-gray-100 mx-2"></div>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1 pr-4 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
              >
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black shadow-md ring-2 ring-indigo-50">
                  {student.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-black text-gray-900 leading-none">{student.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">ID: {student.id}</p>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 animate-fade-in z-50">
                  <div className="px-5 py-3 border-b border-gray-50 mb-2">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Type</p>
                     <p className="font-bold text-indigo-600">{isAdmin ? 'Teacher (Admin View)' : 'Student Dashboard'}</p>
                  </div>
                  
                  {isAdmin && (
                      <button 
                        onClick={() => navigate('/welcome')}
                        className="w-full flex items-center gap-3 px-5 py-3 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 font-bold transition-all"
                      >
                        <SettingsIcon size={18} /> Admin Dashboard
                      </button>
                  )}

                  <button 
                    onClick={() => { logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-red-500 hover:bg-red-50 font-bold transition-all"
                  >
                    <LogOut size={18} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
