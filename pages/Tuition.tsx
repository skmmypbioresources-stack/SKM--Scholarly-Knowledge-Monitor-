
import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, Curriculum, TuitionTask, Resource, ChatMessage, TuitionReflection, StudentWork } from '../types';
import { updateStudent, checkAndIncrementAiUsage } from '../services/storageService';
import { createTaskTutorSession, sendMessageToGemini } from '../services/geminiService';
import { Chat } from '@google/genai';
import { 
  CalendarDays, BrainCircuit, FileText, Plus, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight,
  Loader2, Send, Bot, User, Lightbulb, BookOpenCheck, Zap, Trash2, Link as LinkIcon, ExternalLink,
  Upload, ListChecks, MessageSquareText
} from 'lucide-react';

const Tuition: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  const [activeStep, setActiveStep] = useState<number>(1);
  const isIGCSE = student.curriculum === Curriculum.IGCSE;

  // --- THEME ---
  const themeColor = isIGCSE ? 'text-blue-600' : 'text-green-600';
  const themeBg = isIGCSE ? 'bg-blue-600' : 'bg-green-600';
  const activeStepClass = isIGCSE ? 'bg-blue-600 text-white shadow-lg' : 'bg-green-600 text-white shadow-lg';
  const ringFocus = isIGCSE ? 'focus:ring-blue-500' : 'focus:ring-green-500';

  // Step 1: Attendance Logic
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = student.attendance?.find(a => a.date === todayStr);

  const markAttendance = async (status: 'present' | 'absent' | 'late') => {
      if (isReadOnly) return;
      let updatedAttendance = [...(student.attendance || [])];
      const existingIndex = updatedAttendance.findIndex(a => a.date === todayStr);
      if (existingIndex >= 0) {
          updatedAttendance[existingIndex].status = status;
      } else {
          updatedAttendance.push({ date: todayStr, status });
      }
      await updateStudent({ ...student, attendance: updatedAttendance });
      await refreshStudent();
  };

  // Step 2: Work Submission Logic
  const [workTitle, setWorkTitle] = useState('');
  const [workUrl, setWorkUrl] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  const handleAddWork = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isReadOnly) return;
      if (!workTitle || !workUrl) return;
      setIsSubmittingWork(true);
      const newWork: StudentWork = {
          id: Date.now().toString(),
          name: workTitle,
          url: workUrl.startsWith('http') ? workUrl : `https://${workUrl}`,
          date: todayStr
      };
      const currentWork = student.tuitionWork || [];
      await updateStudent({ ...student, tuitionWork: [newWork, ...currentWork] });
      await refreshStudent();
      setWorkTitle('');
      setWorkUrl('');
      setIsSubmittingWork(false);
  };

  const handleDeleteWork = async (id: string) => {
      if (isReadOnly) return;
      if (!confirm("Remove this link?")) return;
      const updatedWork = (student.tuitionWork || []).filter(w => w.id !== id);
      await updateStudent({ ...student, tuitionWork: updatedWork });
      await refreshStudent();
  };

  // Step 3: AI Tasks Logic
  const [activeTask, setActiveTask] = useState<TuitionTask | null>(null);
  const [isTeacherAddingTask, setIsTeacherAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPrompt, setNewTaskPrompt] = useState('');
  const [newTaskDiff, setNewTaskDiff] = useState<'Easy'|'Medium'|'Hard'>('Medium');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleCreateTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isReadOnly) return; // Only Admin (ReadOnly mode in this context) can add tasks
      const task: TuitionTask = { 
          id: Date.now().toString(), 
          title: newTaskTitle, 
          description: newTaskDesc, 
          difficulty: newTaskDiff, 
          completed: false, 
          aiContextPrompt: newTaskPrompt, 
          chatHistory: [] 
      };
      const currentTasks = student.tuitionTasks || [];
      await updateStudent({ ...student, tuitionTasks: [...currentTasks, task] });
      await refreshStudent();
      setIsTeacherAddingTask(false);
      setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskPrompt('');
  };

  useEffect(() => {
    if (activeTask) {
        chatSessionRef.current = createTaskTutorSession(student.name, activeTask.title, activeTask.description, activeTask.aiContextPrompt || '');
        if (activeTask.chatHistory && activeTask.chatHistory.length > 0) {
            setMessages(activeTask.chatHistory);
        } else {
            setMessages([{ id: 'init', role: 'model', text: `Hi ${student.name}. I'm ready to help you with "${activeTask.title}".`, timestamp: Date.now() }]);
        }
    }
  }, [activeTask, student.name]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const saveTaskChat = async (msgs: ChatMessage[]) => {
      if (!activeTask || isReadOnly) return;
      const updatedTask = { ...activeTask, chatHistory: msgs };
      setActiveTask(updatedTask);
      const updatedTasks = student.tuitionTasks.map(t => t.id === activeTask.id ? updatedTask : t);
      await updateStudent({ ...student, tuitionTasks: updatedTasks });
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim() || !chatSessionRef.current || isChatLoading || isReadOnly) return;
      const { allowed } = await checkAndIncrementAiUsage(student);
      if (!allowed) { alert("Daily AI Limit Reached."); return; }
      
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: Date.now() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setChatInput('');
      setIsChatLoading(true);
      await saveTaskChat(newMessages);

      const response = await sendMessageToGemini(chatSessionRef.current, userMsg.text);
      const botMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: response, timestamp: Date.now() };
      const finalMessages = [...newMessages, botMsg];
      setMessages(finalMessages);
      setIsChatLoading(false);
      await saveTaskChat(finalMessages);
      await refreshStudent();
  };

  // Step 4: Reflections Logic
  const [reflectionDate, setReflectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [refTopic, setRefTopic] = useState('');
  const [refUnderstood, setRefUnderstood] = useState('');
  const [refQuestions, setRefQuestions] = useState('');
  const [isAddingReflection, setIsAddingReflection] = useState(false);

  const handleAddReflection = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isReadOnly) return;
      if (!refTopic || !refUnderstood) return;
      const newRef: TuitionReflection = { id: Date.now().toString(), date: reflectionDate, topicDiscussed: refTopic, understood: refUnderstood, questions: refQuestions };
      const currentRefs = student.tuitionReflections || [];
      await updateStudent({ ...student, tuitionReflections: [newRef, ...currentRefs] });
      await refreshStudent();
      setRefTopic(''); setRefUnderstood(''); setRefQuestions('');
      setIsAddingReflection(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">Tuition Lesson Workflow</h2>
              <p className="text-lg text-gray-500 font-medium">Complete your daily tuition journey in order.</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Batch:</span>
              <span className={`font-black text-sm ${themeColor}`}>{student.batch.toUpperCase()}</span>
          </div>
      </div>

      {/* Workflow Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
              { step: 1, label: 'Attendance', icon: CalendarDays },
              { step: 2, label: 'Work Upload', icon: Upload },
              { step: 3, label: 'AI Guided Tasks', icon: BrainCircuit },
              { step: 4, label: 'Reflection Log', icon: MessageSquareText },
          ].map((item) => (
              <button 
                  key={item.step}
                  onClick={() => setActiveStep(item.step)}
                  className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all group ${
                      activeStep === item.step 
                      ? activeStepClass + ' border-transparent' 
                      : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                  }`}
              >
                  <div className={`p-2 rounded-xl ${activeStep === item.step ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-gray-100'}`}>
                      <item.icon size={24} />
                  </div>
                  <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Step {item.step}</p>
                      <p className="font-bold text-sm whitespace-nowrap">{item.label}</p>
                  </div>
              </button>
          ))}
      </div>

      {/* Step 1: Attendance */}
      {activeStep === 1 && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 animate-fade-in text-center">
              <div className="max-w-md mx-auto">
                  <div className={`w-20 h-20 rounded-3xl ${isIGCSE ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'} flex items-center justify-center mx-auto mb-6 shadow-inner`}>
                      <CalendarDays size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Daily Attendance</h3>
                  <p className="text-gray-500 mb-8 font-medium">Mark your status for today's lesson ({new Date().toLocaleDateString()}).</p>
                  
                  {isReadOnly ? (
                      <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          <p className="font-bold text-gray-400">Viewing Student Attendance Record</p>
                          {todayAttendance ? (
                              <div className={`mt-4 py-3 rounded-xl font-black uppercase tracking-widest ${
                                  todayAttendance.status === 'present' ? 'bg-green-100 text-green-700' : 
                                  todayAttendance.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                  {todayAttendance.status}
                              </div>
                          ) : <p className="mt-2 text-sm text-gray-400">No record for today.</p>}
                      </div>
                  ) : (
                      <div className="flex gap-4">
                          <button 
                            onClick={() => markAttendance('present')}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${todayAttendance?.status === 'present' ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-green-100 text-green-600 hover:bg-green-50'}`}
                          >
                              PRESENT
                          </button>
                          <button 
                            onClick={() => markAttendance('late')}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${todayAttendance?.status === 'late' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white border-amber-100 text-amber-600 hover:bg-amber-50'}`}
                          >
                              LATE
                          </button>
                          <button 
                            onClick={() => markAttendance('absent')}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${todayAttendance?.status === 'absent' ? 'bg-red-500 border-red-500 text-white shadow-lg' : 'bg-white border-red-100 text-red-600 hover:bg-red-50'}`}
                          >
                              ABSENT
                          </button>
                      </div>
                  )}
                  {!isReadOnly && <p className="mt-6 text-xs text-gray-400 font-bold uppercase tracking-widest italic">Click to toggle your status</p>}
              </div>
          </div>
      )}

      {/* Step 2: Work Submission */}
      {activeStep === 2 && (
          <div className="grid md:grid-cols-3 gap-8 animate-fade-in">
              <div className="md:col-span-1">
                  <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 h-full">
                      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2"><Upload size={20} className={themeColor}/> Submit Work</h3>
                      {isReadOnly ? (
                          <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                              <p className="text-sm font-bold text-gray-400">Teacher View Only</p>
                          </div>
                      ) : (
                          <form onSubmit={handleAddWork} className="space-y-4">
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Assignment Name</label>
                                  <input required value={workTitle} onChange={e => setWorkTitle(e.target.value)} placeholder="e.g. Mitochondria Drawing" className={`w-full p-3 rounded-xl border-2 border-gray-100 outline-none ${ringFocus} focus:border-transparent transition-all`} />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Google Drive / Link URL</label>
                                  <input required value={workUrl} onChange={e => setWorkUrl(e.target.value)} placeholder="https://..." className={`w-full p-3 rounded-xl border-2 border-gray-100 outline-none ${ringFocus} focus:border-transparent transition-all`} />
                              </div>
                              <button type="submit" disabled={isSubmittingWork} className={`w-full py-4 rounded-xl font-black text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${themeBg}`}>
                                  {isSubmittingWork ? <Loader2 className="animate-spin" size={20}/> : <><LinkIcon size={20}/> Add Work Link</>}
                              </button>
                          </form>
                      )}
                  </div>
              </div>
              <div className="md:col-span-2">
                  <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 h-full">
                      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2"><ListChecks size={20} className="text-indigo-600"/> Submitted Assignments</h3>
                      <div className="space-y-4">
                          {(student.tuitionWork || []).length > 0 ? (student.tuitionWork || []).map(work => (
                              <div key={work.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all group">
                                  <div className="flex items-center gap-4 overflow-hidden">
                                      <div className={`p-3 rounded-xl ${isIGCSE ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                          <FileText size={20} />
                                      </div>
                                      <div className="overflow-hidden">
                                          <h4 className="font-bold text-gray-900 truncate">{work.name}</h4>
                                          <p className="text-xs text-gray-400 font-bold uppercase">{work.date}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <button onClick={() => window.open(work.url, '_blank')} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><ExternalLink size={20}/></button>
                                      {!isReadOnly && <button onClick={() => handleDeleteWork(work.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20}/></button>}
                                  </div>
                              </div>
                          )) : (
                              <div className="py-20 text-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-3xl">
                                  No work links submitted yet.
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Step 3: AI Guided Tasks */}
      {activeStep === 3 && (
          <div className="animate-fade-in">
              {!activeTask ? (
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                          <div>
                              <h3 className="text-2xl font-black text-gray-900">AI Guided Task Board</h3>
                              <p className="text-gray-500 font-medium text-sm">Solve biological problems with interactive AI scaffolding.</p>
                          </div>
                          {isReadOnly && (
                              <button 
                                onClick={() => setIsTeacherAddingTask(!isTeacherAddingTask)} 
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm text-white shadow-lg transition-transform active:scale-95 ${themeBg}`}
                              >
                                  {isTeacherAddingTask ? <XCircle size={18}/> : <Plus size={18}/>}
                                  {isTeacherAddingTask ? 'CANCEL' : 'ASSIGN NEW AI TASK'}
                              </button>
                          )}
                      </div>

                      {isTeacherAddingTask && isReadOnly && (
                          <form onSubmit={handleCreateTask} className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 mb-10 animate-fade-in">
                              <h4 className="font-black text-lg text-gray-800 mb-6 flex items-center gap-2"><Zap size={20} className="text-amber-500"/> Assign AI Scaffolding Task</h4>
                              <div className="grid gap-6">
                                  <div className="grid md:grid-cols-2 gap-6">
                                      <div>
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Task Header</label>
                                          <input required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="e.g. Osmosis Explanation" className="w-full p-4 rounded-2xl border-0 shadow-inner bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                      </div>
                                      <div>
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Target Difficulty</label>
                                          <select value={newTaskDiff} onChange={(e: any) => setNewTaskDiff(e.target.value)} className="w-full p-4 rounded-2xl border-0 shadow-inner bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                                              <option>Easy</option><option>Medium</option><option>Hard</option>
                                          </select>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Full Question / Prompt</label>
                                      <textarea required value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Describe the problem the student needs to solve..." className="w-full p-4 rounded-2xl border-0 shadow-inner bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium h-32 resize-none" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">AI Instruction Context (Hidden from student)</label>
                                      <textarea value={newTaskPrompt} onChange={e => setNewTaskPrompt(e.target.value)} placeholder="Tell the AI what correct answers look like or what steps to guide the student through..." className="w-full p-4 rounded-2xl border-0 shadow-inner bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium h-24 resize-none" />
                                  </div>
                                  <div className="flex justify-end pt-2">
                                      <button type="submit" className={`px-10 py-4 rounded-2xl font-black text-white shadow-xl transition-all hover:scale-105 ${themeBg}`}>PUBLISH TASK TO STUDENT</button>
                                  </div>
                              </div>
                          </form>
                      )}

                      <div className="grid gap-6">
                          {(student.tuitionTasks || []).length > 0 ? (student.tuitionTasks || []).map(task => (
                              <div key={task.id} className="bg-white p-6 rounded-3xl border-2 border-gray-50 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row justify-between items-center group">
                                  <div className="text-center md:text-left mb-4 md:mb-0">
                                      <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                                          <h4 className="font-black text-xl text-gray-900 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${task.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : task.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{task.difficulty}</span>
                                      </div>
                                      <p className="text-gray-500 font-medium line-clamp-1 max-w-xl">{task.description}</p>
                                  </div>
                                  <button onClick={() => setActiveTask(task)} className={`flex items-center gap-2 px-8 py-3.5 ${themeBg} text-white rounded-2xl font-black hover:opacity-90 transition-all shadow-lg transform group-hover:scale-105 active:scale-95`}>
                                      OPEN AI TUTOR <ChevronRight size={20} />
                                  </button>
                              </div>
                          )) : (
                              <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                                  <BrainCircuit size={48} className="mx-auto text-gray-200 mb-4"/>
                                  <p className="text-gray-400 font-black uppercase tracking-widest">No interactive tasks assigned yet.</p>
                                  <p className="text-gray-400 text-xs mt-1">Assignments will appear here once the teacher publishes them.</p>
                              </div>
                          )}
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col h-[calc(100vh-220px)] bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in">
                      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50/80 backdrop-blur-sm">
                          <div className="flex items-center gap-4">
                              <button onClick={() => setActiveTask(null)} className="p-3 hover:bg-gray-200 rounded-2xl text-gray-500 transition-colors"><ChevronLeft size={24} /></button>
                              <div>
                                  <h3 className="font-black text-xl text-gray-800 leading-tight">{activeTask.title}</h3>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                                      <Bot size={14} className="text-indigo-500"/> Scaffolding Mode Active
                                  </p>
                              </div>
                          </div>
                          <div className="flex gap-3 items-center">
                              <div className="hidden sm:flex px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 items-center gap-2">
                                  <Zap size={14} className="fill-indigo-700"/> AI Support Active
                              </div>
                              <button onClick={() => setActiveTask(null)} className="px-6 py-2 text-sm font-black text-red-500 hover:bg-red-50 rounded-xl transition-colors uppercase tracking-widest">Close</button>
                          </div>
                      </div>

                      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                          <div className="md:w-[30%] p-8 overflow-y-auto border-r border-gray-100 bg-slate-50/30">
                              <h4 className="font-black text-gray-400 uppercase tracking-tighter text-xs mb-6 flex items-center gap-2">
                                  <FileText size={16} /> Task Description
                              </h4>
                              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                  <p className="text-lg text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">{activeTask.description}</p>
                              </div>
                              <div className="mt-8 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                  <div className="flex items-start gap-4">
                                      <Lightbulb className="text-blue-500 shrink-0 mt-1" size={24} />
                                      <div>
                                          <p className="font-black text-blue-900 text-sm mb-1 uppercase tracking-widest">How to use</p>
                                          <p className="text-sm text-blue-700/80 leading-relaxed font-medium">Talk to the AI Tutor on the right. Ask for hints, explain your thinking, and let the AI guide you to the perfect answer.</p>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="flex-1 flex flex-col bg-white">
                              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20">
                                  {messages.map(msg => (
                                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? `${themeBg} text-white` : 'bg-white border border-gray-100 text-indigo-600'}`}>
                                                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                              </div>
                                              <div className={`p-6 rounded-3xl text-lg leading-relaxed shadow-sm whitespace-pre-wrap font-medium ${
                                                  msg.role === 'user' 
                                                  ? `${themeBg} text-white rounded-tr-none` 
                                                  : 'bg-white text-gray-800 border border-gray-50 rounded-tl-none'
                                              }`}>
                                                  {msg.text}
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                                  {isChatLoading && (
                                      <div className="flex gap-4">
                                          <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-indigo-400 shadow-sm">
                                              <Bot size={20} className="animate-pulse" />
                                          </div>
                                          <div className="bg-white border border-gray-50 p-6 rounded-3xl rounded-tl-none flex items-center gap-3 text-gray-400 font-bold shadow-sm">
                                              <Loader2 className="animate-spin" size={18} />
                                              Thinking...
                                          </div>
                                      </div>
                                  )}
                                  <div ref={chatEndRef} />
                              </div>

                              <div className="p-6 border-t border-gray-100 bg-white shadow-inner">
                                  {isReadOnly ? (
                                      <div className="p-4 bg-gray-50 rounded-2xl text-center text-gray-400 font-bold uppercase text-xs tracking-widest border border-dashed border-gray-200">
                                          Viewing Mode: Chat interactions are for students only
                                      </div>
                                  ) : (
                                      <div className="relative flex items-center max-w-4xl mx-auto">
                                          <input 
                                              value={chatInput} 
                                              onChange={e => setChatInput(e.target.value)} 
                                              onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                                              placeholder="Ask for a hint or type your solution..." 
                                              className={`w-full bg-slate-50 border-2 border-gray-50 rounded-2xl py-4 pl-6 pr-16 text-lg font-medium outline-none focus:ring-4 ${ringFocus} focus:bg-white focus:border-transparent transition-all`} 
                                          />
                                          <button 
                                              onClick={handleSendMessage} 
                                              disabled={!chatInput.trim() || isChatLoading} 
                                              className={`absolute right-2.5 p-3.5 ${themeBg} text-white rounded-xl disabled:opacity-50 shadow-lg transform active:scale-95 transition-all`}
                                          >
                                              <Send size={20} />
                                          </button>
                                      </div>
                                  )}
                                  <p className="text-[10px] text-gray-400 font-bold text-center mt-3 uppercase tracking-widest">Educational AI Support • Verify critical information</p>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Step 4: Reflections */}
      {activeStep === 4 && (
          <div className="animate-fade-in space-y-8">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                      <BookOpenCheck size={32} className={themeColor}/> Reflection Logbook
                  </h3>
                  {!isReadOnly && (
                      <button 
                          onClick={() => setIsAddingReflection(!isAddingReflection)} 
                          className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-white shadow-xl transition-all transform active:scale-95 ${themeBg}`}
                      >
                          {isAddingReflection ? 'CANCEL' : <><Plus size={20} /> ADD NEW LOG</>}
                      </button>
                  )}
              </div>

              {isAddingReflection && !isReadOnly && (
                  <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl animate-fade-in max-w-3xl mx-auto">
                      <h4 className="font-black text-2xl text-gray-900 mb-8">Post-Lesson Summary</h4>
                      <form onSubmit={handleAddReflection} className="space-y-8">
                          <div className="grid md:grid-cols-2 gap-8">
                              <div>
                                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Lesson Date</label>
                                  <input type="date" value={reflectionDate} onChange={e => setReflectionDate(e.target.value)} className={`w-full border-2 border-gray-50 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:ring-4 ${ringFocus} focus:ring-opacity-50 transition-all bg-slate-50`} />
                              </div>
                              <div>
                                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Today's Topic</label>
                                  <input required type="text" value={refTopic} onChange={e => setRefTopic(e.target.value)} placeholder="e.g. Aerobic Respiration" className={`w-full border-2 border-gray-50 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:ring-4 ${ringFocus} focus:ring-opacity-50 transition-all bg-slate-50`} />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">What did you master today?</label>
                              <textarea required value={refUnderstood} onChange={e => setRefUnderstood(e.target.value)} placeholder="Describe the concepts you understood clearly..." className={`w-full border-2 border-gray-50 rounded-2xl px-5 py-4 h-32 resize-none outline-none focus:ring-4 ${ringFocus} focus:ring-opacity-50 transition-all bg-slate-50 font-medium`} />
                          </div>
                          <div>
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Any remaining confusion?</label>
                              <textarea value={refQuestions} onChange={e => setRefQuestions(e.target.value)} placeholder="What questions would you like to ask in the next lesson?" className={`w-full border-2 border-gray-50 rounded-2xl px-5 py-4 h-28 resize-none outline-none focus:ring-4 ${ringFocus} focus:ring-opacity-50 transition-all bg-slate-50 font-medium`} />
                          </div>
                          <div className="flex justify-end pt-2">
                              <button type="submit" className={`px-12 py-4 rounded-2xl font-black text-xl text-white shadow-2xl hover:scale-105 transition-transform ${themeBg}`}>PERMANENTLY SAVE LOG</button>
                          </div>
                      </form>
                  </div>
              )}

              <div className="grid gap-8">
                  {(student.tuitionReflections || []).length > 0 ? (student.tuitionReflections || []).map(ref => (
                      <div key={ref.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-lg hover:shadow-xl transition-all group">
                          <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
                              <div>
                                  <div className="flex items-center gap-3 mb-1">
                                      <h4 className="font-black text-2xl text-gray-900 group-hover:text-indigo-600 transition-colors">{ref.topicDiscussed}</h4>
                                  </div>
                                  <span className="text-gray-400 text-xs font-black uppercase tracking-[0.2em]">{new Date(ref.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                              </div>
                              <div className={`p-4 rounded-2xl ${isIGCSE ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'} shadow-inner`}>
                                  <BookOpenCheck size={24} />
                              </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-10">
                              <div className="relative">
                                  <h5 className="font-black text-green-600 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                      <CheckCircle2 size={16} /> MASTERED CONCEPTS
                                  </h5>
                                  <div className="p-6 bg-green-50/50 rounded-2xl border border-green-100 min-h-[120px]">
                                      <p className="text-gray-700 leading-relaxed font-medium whitespace-pre-wrap italic">"{ref.understood}"</p>
                                  </div>
                              </div>
                              <div className="relative">
                                  <h5 className="font-black text-amber-600 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                      <Lightbulb size={16} /> FURTHER QUESTIONS
                                  </h5>
                                  <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-100 min-h-[120px]">
                                      <p className="text-gray-700 leading-relaxed font-medium whitespace-pre-wrap italic">
                                          {ref.questions ? `"${ref.questions}"` : <span className="text-gray-300 font-black tracking-widest text-[10px]">ALL CLEAR • NO QUESTIONS</span>}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                          <p className="text-gray-400 font-black uppercase tracking-widest text-lg">Your reflection history is empty</p>
                          <p className="text-gray-400 text-sm mt-1">Start by clicking 'Add New Log' after your next session.</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Tuition;