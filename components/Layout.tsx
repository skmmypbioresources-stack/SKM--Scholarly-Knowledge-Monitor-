
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
  Library, FileCheck2, Maximize, Minimize, DownloadCloud, UploadCloud, ExternalLink
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
      <linearGradient id="paint0_linear" x1="0" y1="0" x2={collapsed ? "48" : "130"} y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563EB" /> 
        <stop offset="1" stopColor="#4F46E5" /> 
      </linearGradient>
    </defs>
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ student, children, onRefresh }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
  // Sidebar & Fullscreen State
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncMsg, setSyncMsg] = useState('');
  const [hasCloudUrl, setHasCloudUrl] = useState(false);
  const [checkingUrl, setCheckingUrl] = useState(true);

  const basePath = `/student/${student.id}`;
  const session = getCurrentSession();
  const isStudentView = session?.type === 'STUDENT';
  const isIGCSE = student.curriculum === Curriculum.IGCSE;

  // Determine if student has actual data
  const hasLocalData = student.assessments.length > 0 || student.termAssessments.length > 0;

  const toggleFullscreen = () => {
    const docEl = document.documentElement as any;
    const doc = document as any;

    try {
        if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
          const promise = docEl.requestFullscreen ? docEl.requestFullscreen() : 
                         docEl.msRequestFullscreen ? docEl.msRequestFullscreen() : 
                         docEl.mozRequestFullScreen ? docEl.mozRequestFullScreen() : 
                         docEl.webkitRequestFullscreen ? docEl.webkitRequestFullscreen() : null;
          
          if (promise) {
              promise.catch((err: any) => {
                  console.warn("Fullscreen blocked by browser frame. Offering external window.");
                  if(confirm("Full Screen is blocked by your current browser window/frame. Would you like to open the app in a new tab for a better experience?")) {
                      window.open(window.location.href, '_blank');
                  }
              });
          }
          setIsFullscreen(true);
        } else {
          if (doc.exitFullscreen) doc.exitFullscreen();
          else if (doc.msExitFullscreen) doc.msExitFullscreen();
          else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
          else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
          setIsFullscreen(false);
        }
    } catch (e) {
        alert("Full Screen is not supported in this frame.");
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const academicItems = [
    { path: `${basePath}/records`, label: 'Assessment Records', icon: LayoutDashboard },
    { path: `${basePath}/school-exams`, label: 'Term Exams', icon: ClipboardList },
    { path: `${basePath}/assessment-tasks`, label: isIGCSE ? 'Assessment Tasks (AO)' : 'Assessment Tasks (Criteria)', icon: FileCheck2 },
    { path: `${basePath}/syllabus-library`, label: 'Syllabus Library', icon: Library },
  ];

  academicItems.push({ path: `${basePath}/summative`, label: 'Grade Predictor 🔮', icon: GraduationCap });

  const navItems = [
    { section: 'Academic', items: academicItems },
    { section: 'Learning', items: [
        { path: `${basePath}/tuition`, label: 'Tuition Tasks', icon: BrainCircuit },
        { path: `${basePath}/communication`, label: 'AI Tutor Chat', icon: MessageCircle },
    ]},
    { section: 'Empowerment', items: [
        { path: `${basePath}/bio-puzzle`, label: 'BioMind Puzzle', icon: Puzzle },
        { path: `${basePath}/atl-tracker`, label: 'ATL & IB Skills', icon: Star },
        { path: `${basePath}/typing-tutor`, label: 'BioType Tutor', icon: Keyboard },
        { path: `${basePath}/vocab`, label: 'Vocab Builder', icon: BookA },
        { path: `${basePath}/growth-score`, label: 'Growth Score', icon: Trophy },
    ]},
    { section: 'System', items: [
        { path: `${basePath}/settings`, label: 'Settings', icon: SettingsIcon },
    ]}
  ];

  const themeText = isIGCSE ? 'text-blue-700' : 'text-green-700';
  const themeBg = isIGCSE ? 'bg-blue-50' : 'bg-green-50';
  const activeItemClass = isIGCSE 
    ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' 
    : 'bg-green-50 text-green-700 border-r-4 border-green-600';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      const check = async () => {
          const url = await getSetting('cloud_script_url');
          setHasCloudUrl(!!url);
          setCheckingUrl(false);
      };
      check();
  }, [location.pathname]);

  const handleStudentAction = async () => {
      if (!hasCloudUrl) {
          alert("Please go to Settings and enter the Teacher's Link first.");
          navigate(`${basePath}/settings`);
          return;
      }
      
      setSyncStatus('loading');

      // If student has no assessments, try to PULL from cloud first (Restore)
      if (!hasLocalData) {
          setSyncMsg('Restoring...');
          try {
              const result = await getStudentSyncData(student.batch, student.id);
              if (result.result === 'success' && result.data) {
                  await updateStudent(result.data);
                  setSyncStatus('success');
                  setSyncMsg('Restored!');
                  if (onRefresh) await onRefresh();
              } else {
                  setSyncStatus('error');
                  setSyncMsg('No Cloud Data');
              }
          } catch (e) {
              setSyncStatus('error');
              setSyncMsg('Fetch Error');
          }
      } else {
          // Normal Save logic
          setSyncMsg('Saving...');
          try {
              const result = await syncStudentData(student);
              if (result.result === 'success') {
                  setSyncStatus('success');
                  setSyncMsg('Saved!');
              } else {
                  setSyncStatus('error');
                  setSyncMsg('Save Failed');
              }
          } catch (e) {
              setSyncStatus('error');
              setSyncMsg('Cloud Error');
          }
      }
      setTimeout(() => { setSyncStatus('idle'); setSyncMsg(''); }, 3000);
  };

  const handleAdminLoad = async () => {
      if (!hasCloudUrl) {
          alert("Admin: Configure Cloud Link in Settings.");
          return;
      }
      setSyncStatus('loading');
      setSyncMsg('Syncing...');
      try {
          const result = await getStudentSyncData(student.batch, student.id);
          if (result.result === 'success' && result.data) {
              await updateStudent(result.data);
              setSyncStatus('success');
              setSyncMsg('Updated!');
              if (onRefresh) await onRefresh();
          } else {
              setSyncStatus('error');
              setSyncMsg('Empty');
          }
      } catch (e) {
          setSyncStatus('error');
          setSyncMsg('Error');
      }
      setTimeout(() => { setSyncStatus('idle'); setSyncMsg(''); }, 3000);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
        {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        <aside className={`fixed md:relative z-50 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out shadow-xl md:shadow-none ${isCollapsed ? 'w-20' : 'w-72'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} border-b border-gray-100`}>
                <button onClick={() => !isStudentView ? navigate('/welcome') : null} className="transition-transform active:scale-95">
                    <SKMLogo collapsed={isCollapsed} />
                </button>
                {!isCollapsed && (
                     <button onClick={() => setIsCollapsed(true)} className="hidden md:block p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <PanelLeftClose size={20} />
                     </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-6 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
                {navItems.map((group, groupIdx) => (
                    <div key={groupIdx} className="mb-6">
                        {!isCollapsed && group.section !== 'Academic' && (
                            <h4 className="px-6 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider animate-fade-in">
                                {group.section}
                            </h4>
                        )}
                        {isCollapsed && groupIdx > 0 && <div className="mx-4 my-2 border-t border-gray-100"></div>}
                        
                        <nav className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = location.pathname.startsWith(item.path);
                                const Icon = item.icon;
                                return (
                                    <Link key={item.path} to={item.path} title={isCollapsed ? item.label : ''} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-6 py-3.5 transition-all duration-200 group relative ${isActive ? `${activeItemClass}` : 'text-gray-500 hover:bg-slate-50 hover:text-gray-900'}`}>
                                        <Icon size={22} className={`flex-shrink-0 transition-colors ${isActive ? (isIGCSE ? 'text-blue-600' : 'text-green-600') : 'text-gray-400 group-hover:text-gray-600'}`} />
                                        <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>{item.label}</span>
                                        {isCollapsed && isActive && <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-l-full ${isIGCSE ? 'bg-blue-600' : 'bg-green-600'}`}></div>}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-100">
                {isCollapsed ? (
                    <button onClick={() => setIsCollapsed(false)} className="w-full flex justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <PanelLeftOpen size={24} />
                    </button>
                ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${isIGCSE ? 'bg-blue-500' : 'bg-green-500'}`}>
                            {student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{student.name}</p>
                            <p className="text-xs text-gray-500 truncate">{student.curriculum} • {student.batch}</p>
                        </div>
                    </div>
                )}
            </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
             <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 z-20 shrink-0">
                 <div className="flex items-center gap-4">
                     <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Menu size={24} /></button>
                     <div className={`hidden sm:flex px-3 py-1.5 rounded-lg text-sm font-bold items-center gap-2 ${themeBg} ${themeText}`}><span className="w-2 h-2 rounded-full bg-current"></span>{student.curriculum} Portal</div>
                 </div>

                 <div className="flex items-center gap-4">
                     <button 
                         onClick={toggleFullscreen}
                         className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg transform active:scale-95 ${isFullscreen ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                     >
                         {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                         <span className="hidden sm:inline">{isFullscreen ? "EXIT FULLSCREEN" : "FULL SCREEN"}</span>
                     </button>

                     <button onClick={isStudentView ? handleStudentAction : handleAdminLoad} disabled={syncStatus === 'loading'} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${syncStatus === 'success' ? 'bg-green-100 text-green-700 border-green-200' : syncStatus === 'error' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                         {syncStatus === 'loading' ? <Loader2 className="animate-spin" size={16}/> : syncStatus === 'success' ? <CheckCircle2 size={16}/> : syncStatus === 'error' ? <AlertCircle size={16}/> : (isStudentView ? (!hasLocalData ? <DownloadCloud size={16}/> : <Cloud size={16}/>) : <RefreshCw size={16}/>)}
                         <span className="hidden sm:inline">{syncMsg || (isStudentView ? (!hasLocalData ? "Restore Cloud Data" : "Save to Cloud") : "Update Data")}</span>
                     </button>

                     <div className="h-8 w-px bg-gray-200"></div>

                     <div className="relative" ref={profileRef}>
                          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                              <div className="bg-slate-100 p-1.5 rounded-full"><UserCircle className="text-slate-600" size={24} /></div>
                              <ChevronDown size={16} className="text-gray-400" />
                          </button>
                          
                          {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                                <div className="p-4 border-b border-gray-50"><p className="text-sm font-bold text-gray-900">{student.name}</p><p className="text-xs text-gray-500">ID: {student.id}</p></div>
                                <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors"><LogOut size={16} /> Sign Out</button>
                            </div>
                          )}
                     </div>
                 </div>
             </header>

             {!checkingUrl && !hasCloudUrl && isStudentView && (
                 <div onClick={() => navigate(`${basePath}/settings`)} className="bg-red-600 text-white text-center py-2 px-4 flex items-center justify-center gap-3 text-sm font-bold cursor-pointer hover:bg-red-700 transition-colors shadow-inner"><WifiOff size={16} /> <span>NOT CONNECTED TO TEACHER - CLICK TO CONFIGURE</span></div>
             )}

             <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-8 scroll-smooth">
                 <div className="max-w-7xl mx-auto">{children}</div>
                 <div className="h-12"></div>
             </main>
        </div>
    </div>
  );
};

export default Layout;
