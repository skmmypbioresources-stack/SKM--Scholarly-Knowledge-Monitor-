
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Outlet, useParams, Navigate } from 'react-router-dom';
import Welcome from './pages/Welcome';
import BatchSelection from './pages/BatchSelection';
import StudentList from './pages/StudentList';
import BatchResources from './pages/BatchResources';
import AssessmentRecords from './pages/AssessmentRecords';
import SchoolAssessments from './pages/SchoolAssessments';
import SyllabusLibrary from './pages/SyllabusLibrary'; 
import AssessmentTasks from './pages/AssessmentTasks'; 
import BatchAssessmentTasks from './pages/BatchAssessmentTasks';
import Summative from './pages/Summative';
import Communication from './pages/Communication';
import Tuition from './pages/Tuition';
import Settings from './pages/Settings';
import AdminSettings from './pages/AdminSettings';
import Login from './pages/Login';
import Layout from './components/Layout';
import ChallengeLibrary from './pages/ChallengeLibrary';
import StudentEntryGate from './pages/StudentEntryGate';
import PeerMarking from './pages/PeerMarking';

// EMPOWERMENT
import BioPuzzle from './pages/BioPuzzle';
import ATLTracker from './pages/ATLTracker';
import TypingTutor from './pages/TypingTutor';
import VocabBuilder from './pages/VocabBuilder';
import GrowthScore from './pages/GrowthScore'; 

import { getStudentById, initDB, updateStudent } from './services/storageService';
import { getCurrentSession, isAuthorized } from './services/auth';
import { getStudentSyncData } from './services/cloudService';
import { Student } from './types';
import { Loader2, RefreshCw } from 'lucide-react';

const AdminRoute = () => {
    const session = getCurrentSession();
    if (!session) return <Navigate to="/login" replace />;
    if (session.type !== 'ADMIN') return <Navigate to="/login" replace />;
    return <Outlet />;
};

const StudentRouteWrapper: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  
  const session = getCurrentSession();
  const isAdmin = session?.type === 'ADMIN';
  const isReadOnly = isAdmin;

  // Gatekeeper State
  const [isLocked, setIsLocked] = useState(true); 

  const refreshStudent = async () => { 
     if (studentId) {
        const s = await getStudentById(studentId); 
        setStudent(s || null); 
        return s;
     }
     return null;
  };

  useEffect(() => {
      if (studentId && isAuthorized(studentId)) {
          setAuthorized(true);
          const loadData = async () => {
             try {
                const currentData = await refreshStudent();
                
                // --- SELF-HEALING / DATA RECOVERY LOGIC ---
                if (currentData && !isAdmin) {
                    const hasLocalData = currentData.assessments.length > 0 || currentData.termAssessments.length > 0;
                    if (!hasLocalData) {
                        setIsRecovering(true);
                        try {
                            const cloudRes = await getStudentSyncData(currentData.batch, currentData.id);
                            if (cloudRes.result === 'success' && cloudRes.data) {
                                await updateStudent(cloudRes.data);
                                await refreshStudent();
                            }
                        } catch (e) {
                            console.error("Auto-recovery failed", e);
                        } finally {
                            setIsRecovering(false);
                        }
                    }
                }
             } catch (e) { 
                 console.error(e); 
             } finally { 
                 setLoading(false); 
             }
          };
          loadData();
      } else { setAuthorized(false); setLoading(false); }
  }, [studentId]);

  if (loading) return <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40}/><p className="font-bold text-slate-400">Loading Student Portal...</p></div>;
  if (!authorized) return <Navigate to="/login" replace />;
  if (!student) return <div className="h-screen flex items-center justify-center">Student not found.</div>;

  if (isLocked && !isAdmin) {
      return (
        <StudentEntryGate 
            student={student} 
            onUnlock={async () => {
                await refreshStudent(); 
                setIsLocked(false);
            }} 
        />
      );
  }

  return (
    <div className="relative h-screen overflow-hidden">
        {isRecovering && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
                <RefreshCw size={18} className="animate-spin"/>
                <span className="font-bold text-sm">Recovering your data from Cloud...</span>
            </div>
        )}
        <Layout student={student} onRefresh={refreshStudent}>
          <Outlet context={{ student, isReadOnly, refreshStudent }} />
        </Layout>
    </div>
  );
};

const App: React.FC = () => {
  const [dbReady, setDbReady] = useState(false);
  useEffect(() => { const setup = async () => { await initDB(); setDbReady(true); }; setup(); }, []);

  if (!dbReady) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-blue-600"/></div>;

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AdminRoute />}>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/challenge-library" element={<ChallengeLibrary />} />
            <Route path="/curriculum/:curriculum" element={<BatchSelection />} />
            <Route path="/curriculum/:curriculum/batch/:batchId" element={<StudentList />} />
            <Route path="/curriculum/:curriculum/batch/:batchId/resources" element={<BatchResources />} />
            <Route path="/curriculum/:curriculum/batch/:batchId/assessments" element={<BatchAssessmentTasks />} />
        </Route>

        <Route path="/student/:studentId" element={<StudentRouteWrapper />}>
          <Route index element={<Navigate to="records" replace />} />
          <Route path="records" element={<AssessmentRecords />} />
          <Route path="school-exams" element={<SchoolAssessments />} />
          <Route path="assessment-tasks" element={<AssessmentTasks />} />
          <Route path="peer-marking" element={<PeerMarking />} />
          <Route path="syllabus-library" element={<SyllabusLibrary />} />
          <Route path="tuition" element={<Tuition />} />
          <Route path="summative" element={<Summative />} />
          <Route path="communication" element={<Communication />} />
          <Route path="settings" element={<Settings />} />
          
          <Route path="bio-puzzle" element={<BioPuzzle />} />
          <Route path="atl-tracker" element={<ATLTracker />} />
          <Route path="typing-tutor" element={<TypingTutor />} />
          <Route path="vocab" element={<VocabBuilder />} />
          <Route path="growth-score" element={<GrowthScore />} />
          
          <Route path="topics" element={<Navigate to="syllabus-library" replace />} />
          <Route path="tasks-ao" element={<Navigate to="assessment-tasks" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
};
export default App;
