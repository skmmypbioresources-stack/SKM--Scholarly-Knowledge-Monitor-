
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, ATLSkill, IBAttribute } from '../types';
import { updateStudent, checkEmpowermentQuota } from '../services/storageService';
import { getATLAdvice } from '../services/geminiService';
import { Star, Zap, Plus, Award, Target, PieChart as PieIcon, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- IB ATL FRAMEWORK DATA ---
const ATL_FRAMEWORK: Record<string, string[]> = {
    'Communication': [
        'Give and receive meaningful feedback',
        'Use intercultural understanding to interpret communication',
        'Use a variety of speaking techniques to communicate with a variety of audiences',
        'Use appropriate forms of writing for different purposes and audiences',
        'Read critically and for comprehension',
        'Make effective notes in class and for studying',
        'Negotiate ideas and knowledge with peers and teachers'
    ],
    'Social': [
        'Collaboration: Delegate and share responsibility for decision-making',
        'Collaboration: Help others to succeed',
        'Collaboration: Take responsibility for one’s own actions',
        'Collaboration: Manage and resolve conflict',
        'Collaboration: Build consensus',
        'Collaboration: Listen actively to other perspectives',
        'Collaboration: Exercise leadership and take on a variety of roles within groups'
    ],
    'Self-Management': [
        'Organization: Plan short- and long-term assignments; meet deadlines',
        'Organization: Create plans to prepare for summative assessments',
        'Organization: Select and use technology effectively and productively',
        'Affective: Mindfulness - Practice focus and concentration',
        'Affective: Resilience - Practice "bouncing back" after adversity',
        'Affective: Self-motivation - Practice analyzing and attributing causes for failure',
        'Reflection: Develop new skills, techniques and strategies for effective learning',
        'Reflection: Keep a journal to record reflections'
    ],
    'Research': [
        'Info Literacy: Collect, record and verify data',
        'Info Literacy: Access information to be informed and inform others',
        'Info Literacy: Make connections between various sources of information',
        'Info Literacy: Understand and use technology systems',
        'Info Literacy: Create references and citations, use footnotes/endnotes',
        'Media Literacy: Locate, organize, analyze, evaluate, synthesize and ethically use information',
        'Media Literacy: Seek a range of perspectives from multiple and varied sources'
    ],
    'Thinking': [
        'Critical: Practice observing carefully in order to recognize problems',
        'Critical: Gather and organize relevant information to formulate an argument',
        'Critical: Recognize unstated assumptions and bias',
        'Critical: Evaluate evidence and arguments',
        'Creative: Use brainstorming and visual diagrams to generate new ideas and inquiries',
        'Creative: Create original works and ideas; use existing works and ideas in new ways',
        'Transfer: Apply skills and knowledge in unfamiliar situations',
        'Transfer: Compare conceptual understanding across multiple subject groups'
    ]
};

const ATLTracker: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  const [tab, setTab] = useState<'ATL' | 'IB'>('ATL');
  
  // ATL State
  const [category, setCategory] = useState('Communication');
  const [skillName, setSkillName] = useState(ATL_FRAMEWORK['Communication'][0]);
  const [rating, setRating] = useState(3);
  const [taskContext, setTaskContext] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  // Update specific skill dropdown when category changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCat = e.target.value;
      setCategory(newCat);
      setSkillName(ATL_FRAMEWORK[newCat][0]);
  };

  // IB State
  const [ibAttribute, setIbAttribute] = useState('Inquirer');
  const [ibReflection, setIbReflection] = useState('');
  const [ibTask, setIbTask] = useState('');

  const skills = student.atlSkills || [];
  const attributes = student.ibAttributes || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  const handleAddSkill = async () => {
      if(!skillName || !taskContext) return;
      setLoadingAI(true);
      
      let advice = "Reflect on improvement.";
      const { allowed } = await checkEmpowermentQuota(student);
      if(allowed) advice = await getATLAdvice(skillName, rating);

      const newSkill: ATLSkill = {
          id: Date.now().toString(),
          category: category as any,
          skill: skillName,
          selfRating: rating,
          evidence: '',
          aiAdvice: advice,
          taskContext
      };
      await updateStudent({ ...student, atlSkills: [newSkill, ...skills] });
      await refreshStudent();
      setLoadingAI(false);
      setTaskContext('');
      // Keep category and skill selected for ease of use
  };

  const handleAddIB = async () => {
      if(!ibReflection || !ibTask) return;
      const newAttr: IBAttribute = {
          id: Date.now().toString(),
          attribute: ibAttribute,
          reflection: ibReflection,
          taskContext: ibTask
      };
      await updateStudent({ ...student, ibAttributes: [newAttr, ...attributes] });
      await refreshStudent();
      setIbReflection(''); setIbTask('');
  };

  const atlData = React.useMemo(() => {
      const counts: Record<string, number> = {};
      skills.forEach(s => counts[s.category] = (counts[s.category] || 0) + 1);
      return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [skills]);

  const ibData = React.useMemo(() => {
      const counts: Record<string, number> = {};
      attributes.forEach(a => counts[a.attribute] = (counts[a.attribute] || 0) + 1);
      return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [attributes]);

  return (
    <div className="space-y-8">
        <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-indigo-900 flex items-center justify-center gap-3">
                <Star className="text-yellow-500 fill-yellow-500" size={32}/> Growth Tracker
            </h2>
            <p className="text-indigo-600">Develop your Approaches to Learning & IB Attributes</p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
            <button onClick={()=>setTab('ATL')} className={`px-6 py-2 rounded-full font-bold transition-all ${tab==='ATL'?'bg-indigo-600 text-white shadow-lg':'bg-white text-gray-500 border'}`}>ATL Skills</button>
            <button onClick={()=>setTab('IB')} className={`px-6 py-2 rounded-full font-bold transition-all ${tab==='IB'?'bg-indigo-600 text-white shadow-lg':'bg-white text-gray-500 border'}`}>IB Learner Profile</button>
        </div>

        {tab === 'ATL' && (
            <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 md:col-span-1 h-fit">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={20} className="text-indigo-500"/> Log Skill Usage</h3>
                    {!isReadOnly ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">1. Select Skill Cluster</label>
                                <div className="relative">
                                    <select className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none" value={category} onChange={handleCategoryChange}>
                                        {Object.keys(ATL_FRAMEWORK).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">2. Select Specific Skill</label>
                                <div className="relative">
                                    <select className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm" value={skillName} onChange={e=>setSkillName(e.target.value)}>
                                        {ATL_FRAMEWORK[category].map((skill, idx) => (
                                            <option key={idx} value={skill}>{skill}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">3. Describe Task / Context</label>
                                <textarea 
                                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-24" 
                                    placeholder="In which activity did you apply this? (e.g. Science Lab Report)" 
                                    value={taskContext} 
                                    onChange={e=>setTaskContext(e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Self-Rating: {rating}/5</label>
                                <input type="range" min="1" max="5" value={rating} onChange={e=>setRating(Number(e.target.value))} className="w-full accent-indigo-600"/>
                                <div className="flex justify-between text-xs text-gray-400 px-1">
                                    <span>Novice</span>
                                    <span>Expert</span>
                                </div>
                            </div>

                            <button onClick={handleAddSkill} disabled={loadingAI || !taskContext} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-all">
                                {loadingAI ? 'Consulting AI...' : 'Add & Get Advice'}
                            </button>
                        </div>
                    ) : <p className="text-gray-400 italic text-sm">Only students can add self-reflections.</p>}
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><PieIcon size={18}/> Skill Distribution</h4>
                        <div className="h-64 w-full">
                            {atlData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={atlData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {atlData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <div className="h-full flex items-center justify-center text-gray-300">No data.</div>}
                        </div>
                    </div>
                    <div className="space-y-4">
                        {skills.map(s => (
                            <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="max-w-[80%]">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">{s.category}</span>
                                        <h4 className="text-lg font-bold text-gray-900 mt-2 leading-tight">{s.skill}</h4>
                                        <p className="text-sm text-gray-500 italic mt-1">Context: {s.taskContext || 'General'}</p>
                                    </div>
                                    <div className="flex gap-1">{[...Array(5)].map((_,i) => <Star key={i} size={16} className={i < s.selfRating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />)}</div>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start mt-3">
                                    <Zap size={18} className="text-blue-600 shrink-0 mt-1"/>
                                    <div>
                                        <p className="text-xs font-bold text-blue-800 uppercase mb-1">AI Coach Advice</p>
                                        <p className="text-sm text-blue-700 leading-relaxed">{s.aiAdvice}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {tab === 'IB' && (
            <div className="grid md:grid-cols-3 gap-8">
                 <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 md:col-span-1 h-fit">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Award size={20} className="text-indigo-500"/> Log Attribute</h3>
                    {!isReadOnly ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">IB Attribute</label>
                                <div className="relative">
                                    <select className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none" value={ibAttribute} onChange={e=>setIbAttribute(e.target.value)}>
                                        <option>Inquirer</option><option>Knowledgeable</option><option>Thinker</option><option>Communicator</option><option>Principled</option>
                                        <option>Open-minded</option><option>Caring</option><option>Risk-taker</option><option>Balanced</option><option>Reflective</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Task / Context</label>
                                <input className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Group Project" value={ibTask} onChange={e=>setIbTask(e.target.value)} />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Reflection</label>
                                <textarea className="w-full p-3 border rounded-xl h-24 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="How did you exhibit this?" value={ibReflection} onChange={e=>setIbReflection(e.target.value)} />
                            </div>

                            <button onClick={handleAddIB} disabled={!ibTask || !ibReflection} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md">Save Reflection</button>
                        </div>
                    ) : <p className="text-gray-400 italic text-sm">Only students can add reflections.</p>}
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><PieIcon size={18}/> Attribute Profile</h4>
                        <div className="h-64 w-full">
                            {ibData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={ibData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {ibData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <div className="h-full flex items-center justify-center text-gray-300">No data.</div>}
                        </div>
                    </div>
                    <div className="space-y-4">
                        {attributes.map(a => (
                            <div key={a.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{a.attribute}</span>
                                    <span className="text-xs text-gray-400 font-bold">{a.taskContext}</span>
                                </div>
                                <p className="text-gray-700 mt-2 italic">"{a.reflection}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ATLTracker;
