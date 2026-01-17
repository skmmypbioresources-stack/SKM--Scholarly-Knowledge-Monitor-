
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student } from '../types';
import { Trophy, Star, Target, Zap, Award, BarChart2, BookA, BookOpenCheck, MousePointer2 } from 'lucide-react';

const GrowthScore: React.FC = () => {
  const { student } = useOutletContext<{ student: Student }>();

  const assessmentsCount = student.assessments?.length || 0;
  const reflectionsCount = (student.assessments?.filter(a => a.whatWentWell && a.whatToImprove).length || 0) + (student.termAssessments?.length || 0);
  const vocabCount = student.vocabList?.length || 0;
  const skillCount = student.atlSkills?.length || 0;
  const tuitionLogCount = student.tuitionReflections?.length || 0;
  
  const challengePoints = student.challengePoints || 0;

  // Final calculation
  const score = (assessmentsCount * 5) + (reflectionsCount * 10) + (vocabCount * 2) + (skillCount * 5) + (tuitionLogCount * 5) + challengePoints;
  
  let rank = 'Novice';
  let color = 'bg-gray-100 text-gray-600 border-gray-200';
  let icon = <Star className="text-gray-400" size={32}/>;

  if (score >= 50) { rank = 'Scholar'; color = 'bg-blue-50 text-blue-600 border-blue-200'; icon = <Zap className="text-blue-500" size={32}/>; }
  if (score >= 100) { rank = 'Elite'; color = 'bg-purple-50 text-purple-600 border-purple-200'; icon = <Target className="text-purple-500" size={32}/>; }
  if (score >= 200) { rank = 'Legend'; color = 'bg-yellow-50 text-yellow-600 border-yellow-200'; icon = <Trophy className="text-yellow-500" size={32}/>; }

  const progressToNext = score >= 200 ? 100 : (score % 100); 

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center">
            <h2 className="text-4xl font-black text-gray-900 mb-2 flex items-center justify-center gap-3">
                <Award className="text-indigo-600" size={40}/> My Growth Rank
            </h2>
            <p className="text-gray-500 text-lg">Earn points through academic consistency and daily challenges.</p>
        </div>

        <div className={`p-8 rounded-[2.5rem] border-2 shadow-xl text-center relative overflow-hidden transition-all duration-500 ${color}`}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gray-200/50">
                <div className="h-full bg-current transition-all duration-1000 ease-out" style={{ width: `${progressToNext}%` }}></div>
            </div>
            <div className="mb-4 flex justify-center transform hover:scale-110 transition-transform">{icon}</div>
            <h3 className="text-6xl font-black mb-2 tracking-tight">{rank}</h3>
            <p className="text-2xl font-bold opacity-80">{score} Total Points</p>
            {score < 200 && (
                <div className="mt-6 inline-block bg-white/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-current/10">
                    <p className="text-xs font-black uppercase tracking-widest">Next Level in {score < 50 ? (50 - score) : score < 100 ? (100 - score) : (200 - score)} pts</p>
                </div>
            )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center group hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600 group-hover:scale-110 transition-transform">
                    <BarChart2 size={24} />
                </div>
                <p className="text-4xl font-black text-blue-600 mb-1">{assessmentsCount}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assessments</p>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center group hover:border-green-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-green-600 group-hover:scale-110 transition-transform">
                    <Award size={24} />
                </div>
                <p className="text-4xl font-black text-green-600 mb-1">{reflectionsCount}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reflections</p>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center group hover:border-purple-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-purple-600 group-hover:scale-110 transition-transform">
                    <MousePointer2 size={24} />
                </div>
                <p className="text-4xl font-black text-purple-600 mb-1">{challengePoints}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gatekeeper Pts</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center group hover:border-amber-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-600 group-hover:scale-110 transition-transform">
                    <BookA size={24} />
                </div>
                <p className="text-4xl font-black text-amber-600 mb-1">{vocabCount}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vocab Words</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center group hover:border-indigo-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Star size={24} />
                </div>
                <p className="text-4xl font-black text-indigo-600 mb-1">{skillCount}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ATL Skills</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center group hover:border-teal-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-teal-600 group-hover:scale-110 transition-transform">
                    <BookOpenCheck size={24} />
                </div>
                <p className="text-4xl font-black text-teal-600 mb-1">{tuitionLogCount}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tuition Logs</p>
            </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <BarChart2 size={120} />
            </div>
            <h4 className="font-black text-xl mb-6 flex items-center gap-3"><Zap size={24} className="text-yellow-400 fill-yellow-400"/> Points Earning Guide</h4>
            <ul className="grid md:grid-cols-2 gap-x-12 gap-y-4 text-sm text-slate-300">
                <li className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-medium">Correct Gatekeeper (Paper 4/6/Diagram)</span> 
                    <span className="font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded">+Score (0-10)</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-medium">Write a Quality Reflection</span> 
                    <span className="font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">+10 pts</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-medium">Log a Test Result</span> 
                    <span className="font-black text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">+5 pts</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-medium">Track an ATL / IB Skill</span> 
                    <span className="font-black text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">+5 pts</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-medium">Log a Tuition Session</span> 
                    <span className="font-black text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded">+5 pts</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-medium">Add a Scientific Vocab Word</span> 
                    <span className="font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">+2 pts</span>
                </li>
            </ul>
        </div>
    </div>
  );
};

export default GrowthScore;
