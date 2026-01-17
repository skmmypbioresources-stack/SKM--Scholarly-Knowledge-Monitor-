
import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, Curriculum, TuitionTask, Resource, ChatMessage, TuitionReflection } from '../types';
import { updateStudent, checkAndIncrementAiUsage } from '../services/storageService';
import { createTaskTutorSession, sendMessageToGemini } from '../services/geminiService';
import { Chat } from '@google/genai';
import { 
  CalendarDays, BrainCircuit, FileText, Plus, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight,
  Loader2, Send, Bot, User, Lightbulb, BookOpenCheck, Zap, Trash2, Link as LinkIcon, ExternalLink
} from 'lucide-react';

const Tuition: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  const [activeTab, setActiveTab] = useState<'attendance' | 'resources' | 'ai_tasks' | 'reflections'>('attendance');
  const isIGCSE = student.curriculum === Curriculum.IGCSE;

  // --- THEME ---
  const themeColor = isIGCSE ? 'text-blue-600' : 'text-green-600';
  const themeBg = isIGCSE ? 'bg-blue-600' : 'bg-green-600';
  const themeBorder = isIGCSE ? 'border-blue-200' : 'border-green-200';
  const ringFocus = isIGCSE ? 'focus:ring-blue-500' : 'focus:ring-green-500';
  const activeTabClass = isIGCSE ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200';
  
  const [currentDate, setCurrentDate] = useState(new Date());

  const toggleAttendance = async (day: number) => {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let updatedAttendance = [...(student.attendance || [])];
      const existingIndex = updatedAttendance.findIndex(a => a.date === dateStr);
      if (existingIndex >= 0) {
          const status = updatedAttendance[existingIndex].status;
          if (status === 'present') updatedAttendance[existingIndex].status = 'absent';
          else if (status === 'absent') updatedAttendance[existingIndex].status = 'late';
          else updatedAttendance.splice(existingIndex, 1);
      } else {
          updatedAttendance.push({ date: dateStr, status: 'present' });
      }
      await updateStudent({ ...student, attendance: updatedAttendance });
      await refreshStudent();
  };

  const renderCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = student.attendance?.find(a => a.date === dateStr);
          let statusColor = 'bg-gray-50 text-gray-400 hover:bg-gray-100';
          let Icon = Plus;
          if (record?.status === 'present') { statusColor = 'bg-green-100 text-green-700 border border-green-200'; Icon = CheckCircle2; }
          else if (record?.status === 'absent') { statusColor = 'bg-red-100 text-red-700 border border-red-200'; Icon = XCircle; }
          else if (record?.status === 'late') { statusColor = 'bg-amber-100 text-amber-700 border border-amber-200'; Icon = Clock; }
          days.push(<button key={day} onClick={() => toggleAttendance(day)} className={`h-24 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${statusColor}`}><span className="font-bold text-lg">{day}</span>{record && <Icon size={20} />}{record && <span className="text-xs font-bold uppercase tracking-wider">{record.status}</span>}</button>);
      }
      return days;
  };

  // --- RESOURCE LOGIC (LINKS ONLY) ---
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [addingLinkCat, setAddingLinkCat] = useState<string | null>(null);

  const handleAddLink = async () => {
    if (!linkName || !linkUrl || !addingLinkCat) return;
    
    const newRes: Resource = {
        id: Date.now().toString(),
        name: linkName,
        type: 'link',
        url: linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`,
        category: addingLinkCat as any
    };
    
    const currentRes = student.differentiationResources || [];
    await updateStudent({ ...student, differentiationResources: [...currentRes, newRes] });
    await refreshStudent();
    
    setLinkName('');
    setLinkUrl('');
    setAddingLinkCat(null);
  };

  const handleDeleteResource = async (resourceId: string) => {
    if(!isReadOnly) return; 
    if (!confirm('Delete resource?')) return;
    try {
        const updatedRes = (student.differentiationResources || []).filter(r => r.id !== resourceId);
        await updateStudent({ ...student, differentiationResources: updatedRes });
        await refreshStudent();
    } catch (e) { alert("Failed to delete."); }
  };

  const renderResourceSection = (title: string, category: 'diff_support' | 'diff_core' | 'diff_extension', color: string) => {
      const resources = (student.differentiationResources || []).filter(r => r.category === category);
      
      return (
          <div className={`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm`}>
              <div className={`flex items-center justify-between mb-4 pb-4 border-b border-gray-100`}>
                  <h3 className={`font-bold text-lg ${color}`}>{title}</h3>
                  <button 
                      onClick={() => setAddingLinkCat(addingLinkCat === category ? null : category)}
                      className={`flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-medium text-indigo-600 cursor-pointer transition-colors`}
                   >
                      <LinkIcon size={16} /> Add Link
                   </button>
              </div>

              {/* Add Link Form */}
              {addingLinkCat === category && (
                  <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 animate-fade-in">
                        <input autoFocus className={`w-full text-sm p-2 mb-2 rounded border ${ringFocus} outline-none`} placeholder="Link Title" value={linkName} onChange={e => setLinkName(e.target.value)} />
                        <input className={`w-full text-sm p-2 mb-2 rounded border ${ringFocus} outline-none`} placeholder="Paste URL here..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-indigo-400 font-bold">No attachments.</span>
                            <div className="flex gap-2">
                                <button onClick={() => setAddingLinkCat(null)} className="text-xs text-gray-500 font-bold px-2 py-1">Cancel</button>
                                <button onClick={handleAddLink} className="text-xs bg-indigo-600 text-white font-bold px-3 py-1 rounded shadow-sm">Save Link</button>
                            </div>
                        </div>
                  </div>
              )}
              
              <div className="space-y-3">
                  {resources.length > 0 ? resources.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200">
                          <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`p-2 rounded-lg bg-indigo-100 text-indigo-600`}>
                                  <LinkIcon size={16} />
                              </div>
                              <div className="overflow-hidden">
                                <span className="text-sm font-medium text-gray-700 truncate block">{r.name}</span>
                                <span className="text-xs text-blue-500 truncate block hover:underline cursor-pointer" onClick={() => window.open(r.url, '_blank')}>{r.url}</span>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button 
                                onClick={() => window.open(r.url, '_blank')}
                                className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-full"
                                title="Open Link"
                            >
                                <ExternalLink size={18} />
                            </button>

                            {isReadOnly && (
                                <button 
                                    onClick={() => handleDeleteResource(r.id)}
                                    className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                          </div>
                      </div>
                  )) : <p className="text-sm text-gray-400 italic">No resources added.</p>}
              </div>
          </div>
      );
  };

  // ... AI Task Logic & Reflections logic (kept same) ...
  const [activeTask, setActiveTask] = useState<TuitionTask | null>(null);
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPrompt, setNewTaskPrompt] = useState('');
  const [newTaskDiff, setNewTaskDiff] = useState<'Easy'|'Medium'|'Hard'>('Medium');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [reflectionDate, setReflectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [refTopic, setRefTopic] = useState('');
  const [refUnderstood, setRefUnderstood] = useState('');
  const [refQuestions, setRefQuestions] = useState('');
  const [isAddingReflection, setIsAddingReflection] = useState(false);

  const handleCreateTask = async (e: React.FormEvent) => { e.preventDefault(); const task: TuitionTask = { id: Date.now().toString(), title: newTaskTitle, description: newTaskDesc, difficulty: newTaskDiff, completed: false, aiContextPrompt: newTaskPrompt, chatHistory: [] }; const currentTasks = student.tuitionTasks || []; await updateStudent({ ...student, tuitionTasks: [...currentTasks, task] }); await refreshStudent(); setIsTeacherMode(false); setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskPrompt(''); };
  useEffect(() => { if (activeTask) { chatSessionRef.current = createTaskTutorSession(student.name, activeTask.title, activeTask.description, activeTask.aiContextPrompt || ''); if (activeTask.chatHistory && activeTask.chatHistory.length > 0) { setMessages(activeTask.chatHistory); } else { setMessages([{ id: 'init', role: 'model', text: `Hi ${student.name}. I'm ready to help you with "${activeTask.title}".`, timestamp: Date.now() }]); } } }, [activeTask, student.name]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  const saveTaskChat = async (msgs: ChatMessage[]) => { if (!activeTask) return; const updatedTask = { ...activeTask, chatHistory: msgs }; setActiveTask(updatedTask); const updatedTasks = student.tuitionTasks.map(t => t.id === activeTask.id ? updatedTask : t); await updateStudent({ ...student, tuitionTasks: updatedTasks }); };
  const handleSendMessage = async () => { if (!chatInput.trim() || !chatSessionRef.current || isChatLoading) return; const { allowed } = await checkAndIncrementAiUsage(student); if (!allowed) { alert("Daily Limit."); return; } const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: Date.now() }; const newMessages = [...messages, userMsg]; setMessages(newMessages); setChatInput(''); setIsChatLoading(true); await saveTaskChat(newMessages); const response = await sendMessageToGemini(chatSessionRef.current, userMsg.text); const botMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: response, timestamp: Date.now() }; const finalMessages = [...newMessages, botMsg]; setMessages(finalMessages); setIsChatLoading(false); await saveTaskChat(finalMessages); await refreshStudent(); };
  const handleAddReflection = async (e: React.FormEvent) => { e.preventDefault(); if (!refTopic || !refUnderstood) return; const newRef: TuitionReflection = { id: Date.now().toString(), date: reflectionDate, topicDiscussed: refTopic, understood: refUnderstood, questions: refQuestions }; const currentRefs = student.tuitionReflections || []; await updateStudent({ ...student, tuitionReflections: [newRef, ...currentRefs] }); await refreshStudent(); setRefTopic(''); setRefUnderstood(''); setRefQuestions(''); setIsAddingReflection(false); };

  return (
    <div className="space-y-8">
      <div><h2 className="text-3xl font-bold text-gray-900 mb-2">Tuition & Differentiation</h2><p className="text-lg text-gray-500">Manage attendance, specialized worksheets, and AI-guided tasks.</p></div>
      <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
          <button onClick={() => setActiveTab('attendance')} className={`px-6 py-3 rounded-t-xl font-bold text-base transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'attendance' ? activeTabClass : 'text-gray-500 hover:bg-gray-50'}`}><CalendarDays size={20} /> Attendance Log</button>
          <button onClick={() => setActiveTab('resources')} className={`px-6 py-3 rounded-t-xl font-bold text-base transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'resources' ? activeTabClass : 'text-gray-500 hover:bg-gray-50'}`}><FileText size={20} /> Worksheets</button>
          <button onClick={() => setActiveTab('ai_tasks')} className={`px-6 py-3 rounded-t-xl font-bold text-base transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'ai_tasks' ? activeTabClass : 'text-gray-500 hover:bg-gray-50'}`}><BrainCircuit size={20} /> AI Guided Tasks</button>
          <button onClick={() => setActiveTab('reflections')} className={`px-6 py-3 rounded-t-xl font-bold text-base transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'reflections' ? activeTabClass : 'text-gray-500 hover:bg-gray-50'}`}><BookOpenCheck size={20} /> Reflections & Logs</button>
      </div>

      {activeTab === 'attendance' && (<div className="bg-white p-8 rounded-b-2xl rounded-r-2xl shadow-sm border border-gray-100 animate-fade-in">
          <div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-bold text-gray-800">Attendance Calendar</h3><div className="flex items-center gap-4"><button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={24} /></button><span className="text-xl font-medium min-w-[180px] text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span><button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={24} /></button></div></div>
          <div className="grid grid-cols-7 gap-4 mb-4 text-center">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="font-bold text-gray-400 uppercase text-sm tracking-wider">{d}</div>))}</div>
          <div className="grid grid-cols-7 gap-4">{renderCalendar()}</div>
      </div>)}

      {activeTab === 'resources' && (<div className="animate-fade-in"><div className="grid md:grid-cols-2 gap-6">{renderResourceSection('Support Material', 'diff_support', 'text-green-600')}{renderResourceSection('Worksheets', 'diff_core', 'text-blue-600')}</div></div>)}

      {activeTab === 'ai_tasks' && (<div className="animate-fade-in">{!activeTask ? (
          <>{/* List View */}<div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-800">Assigned Tasks</h3><button onClick={() => setIsTeacherMode(!isTeacherMode)} className="text-sm text-gray-500 hover:text-blue-600 font-medium">{isTeacherMode ? 'Cancel Adding Task' : '+ Teacher: Add Task'}</button></div>
            {isTeacherMode && (<form onSubmit={handleCreateTask} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8"><h4 className="font-bold text-lg mb-4 text-gray-800">Add New Guided Task</h4><div className="grid gap-4"><input required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Task Title" className={`p-3 rounded-xl border ${ringFocus} outline-none`} /><textarea required value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Question / Task Description" className={`p-3 rounded-xl border ${ringFocus} outline-none h-24`} /><textarea value={newTaskPrompt} onChange={e => setNewTaskPrompt(e.target.value)} placeholder="(Optional) Context for AI" className={`p-3 rounded-xl border ${ringFocus} outline-none h-20`} /><div className="flex justify-between"><select value={newTaskDiff} onChange={(e: any) => setNewTaskDiff(e.target.value)} className="p-3 rounded-xl border"><option>Easy</option><option>Medium</option><option>Hard</option></select><button type="submit" className={`${themeBg} text-white px-6 py-2 rounded-xl font-bold`}>Save Task</button></div></div></form>)}
            <div className="grid gap-4">{(student.tuitionTasks || []).map(task => (<div key={task.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex justify-between items-center"><div><div className="flex items-center gap-3 mb-1"><h4 className="font-bold text-lg text-gray-900">{task.title}</h4><span className={`text-xs font-bold px-2 py-1 rounded-full ${task.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : task.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{task.difficulty}</span></div><p className="text-gray-500 line-clamp-1">{task.description}</p></div><button onClick={() => setActiveTask(task)} className={`flex items-center gap-2 px-5 py-2.5 ${themeBg} text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-sm`}>Start Task <ChevronRight size={18} /></button></div>))}{(student.tuitionTasks || []).length === 0 && (<p className="text-center text-gray-400 py-10">No tasks assigned yet.</p>)}</div>
          </>) : (/* Active Task View */ <div className="flex flex-col h-[calc(100vh-220px)] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"><div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50"><div className="flex items-center gap-3"><button onClick={() => setActiveTask(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><ChevronLeft size={24} /></button><div><h3 className="font-bold text-lg text-gray-800">{activeTask.title}</h3><p className="text-xs text-gray-500">AI Interactive Mode</p></div></div><div className="flex gap-2 items-center"><div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-purple-100"><Zap size={14} /> AI Limited</div><button onClick={() => setActiveTask(null)} className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg">Exit</button></div></div><div className="flex-1 flex flex-col md:flex-row overflow-hidden"><div className="md:w-1/3 p-6 overflow-y-auto border-r border-gray-100 bg-slate-50/50"><h4 className="font-bold text-gray-500 uppercase tracking-wider text-sm mb-4 flex items-center gap-2"><FileText size={16} /> The Task</h4><p className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">{activeTask.description}</p><div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100"><div className="flex items-start gap-3"><Lightbulb className="text-blue-500 shrink-0 mt-1" size={20} /><div><p className="font-bold text-blue-800 text-sm mb-1">Instructions</p><p className="text-sm text-blue-700 leading-snug">Use the chat on the right to solve this. The AI will guide you but won't give the answer immediately.</p></div></div></div></div><div className="flex-1 flex flex-col bg-white"><div className="flex-1 overflow-y-auto p-6 space-y-6">{messages.map(msg => (<div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? `${themeBg} text-white` : 'bg-gray-100 text-purple-600'}`}>{msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}</div><div className={`p-4 rounded-2xl text-base leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? `${themeBg} text-white rounded-tr-none` : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-none'}`}>{msg.text}</div></div></div>))}{isChatLoading && (<div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Bot size={16} /></div><div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={16} /> ...</div></div>)}<div ref={chatEndRef} /></div><div className="p-4 border-t border-gray-100 bg-white"><div className="relative flex items-center"><input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Type your answer or ask for a hint..." className={`w-full bg-gray-100 rounded-full py-3 pl-5 pr-12 text-base focus:ring-2 ${ringFocus} outline-none transition-all`} /><button onClick={handleSendMessage} disabled={!chatInput.trim() || isChatLoading} className={`absolute right-2 p-2 ${themeBg} text-white rounded-full disabled:opacity-50`}><Send size={16} /></button></div></div></div></div></div>)}</div>)}

      {activeTab === 'reflections' && (<div className="animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold text-gray-800">Tuition Reflection Log</h3><button onClick={() => setIsAddingReflection(!isAddingReflection)} className={`flex items-center gap-2 px-5 py-2.5 ${themeBg} text-white rounded-xl font-bold shadow-md hover:opacity-90 transition-all`}>{isAddingReflection ? 'Cancel' : <><Plus size={20} /> Log New Reflection</>}</button></div>
          {isAddingReflection && (<div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm mb-8 animate-fade-in"><h4 className="font-bold text-xl mb-6 text-gray-900">New Tuition Log</h4><form onSubmit={handleAddReflection} className="space-y-6"><div><label className="block text-base font-semibold text-gray-700 mb-2">Date</label><input type="date" value={reflectionDate} onChange={e => setReflectionDate(e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-lg outline-none focus:ring-4 ${ringFocus} focus:ring-opacity-50 transition-shadow`} /></div><div><label className="block text-base font-semibold text-gray-700 mb-2">Topic Discussed</label><input required type="text" value={refTopic} onChange={e => setRefTopic(e.target.value)} placeholder="e.g. Algebra - Quadratics" className={`w-full border rounded-xl px-4 py-3 text-lg outline-none focus:ring-4 ${ringFocus} focus:ring-opacity-50 transition-shadow`} /></div><div><label className="block text-base font-semibold text-gray-700 mb-2">What I Understood</label><textarea required value={refUnderstood} onChange={e => setRefUnderstood(e.target.value)} placeholder="I learned..." className={`w-full border rounded-xl px-4 py-3 h-28 resize-none outline-none focus:ring-4 ${ringFocus} focus:ring-opacity-50 transition-shadow bg-gray-50`} /></div><div><label className="block text-base font-semibold text-gray-700 mb-2">Questions / What I Want to Know</label><textarea value={refQuestions} onChange={e => setRefQuestions(e.target.value)} placeholder="I am still confused..." className={`w-full border rounded-xl px-4 py-3 h-24 resize-none outline-none focus:ring-4 ${ringFocus} focus:ring-opacity-50 transition-shadow bg-gray-50`} /></div><div className="flex justify-end"><button type="submit" className={`px-8 py-3 ${themeBg} text-white rounded-xl font-bold text-lg shadow-md hover:opacity-90 transition-opacity`}>Save Log</button></div></form></div>)}
          <div className="grid gap-6">{(student.tuitionReflections || []).length > 0 ? ((student.tuitionReflections || []).map(ref => (<div key={ref.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all"><div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4"><div><h4 className="font-bold text-xl text-gray-900">{ref.topicDiscussed}</h4><span className="text-gray-500 text-sm font-medium">{ref.date}</span></div></div><div className="grid md:grid-cols-2 gap-8"><div><h5 className="font-bold text-green-600 text-sm uppercase tracking-wider mb-2 flex items-center gap-2"><CheckCircle2 size={16} /> What I Understood</h5><p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{ref.understood}</p></div><div><h5 className="font-bold text-amber-600 text-sm uppercase tracking-wider mb-2 flex items-center gap-2"><Lightbulb size={16} /> Questions / What to Know</h5><p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{ref.questions || <span className="text-gray-400 italic">No further questions logged.</span>}</p></div></div></div>))) : (<div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200"><p className="text-gray-400 text-lg">No tuition reflections recorded yet.</p></div>)}</div>
      </div>)}
    </div>
  );
};

export default Tuition;
