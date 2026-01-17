import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, Curriculum } from '../types';
import { updateStudent } from '../services/storageService';
import { Trophy, AlertCircle, Target, TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Summative: React.FC = () => {
  const { student, refreshStudent } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void> }>();
  
  const summativeAssessments = student.assessments.filter(a => a.type === 'Summative');
  
  // Calculate Average
  const averageScore = summativeAssessments.length > 0 
    ? Math.round(summativeAssessments.reduce((acc, curr) => acc + curr.percentage, 0) / summativeAssessments.length) 
    : 0;

  const isIGCSE = student.curriculum === Curriculum.IGCSE;

  // Grading Scales
  const GRADES_IGCSE = ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const GRADES_MYP = ['7', '6', '5', '4', '3', '2', '1'];

  const currentGrades = isIGCSE ? GRADES_IGCSE : GRADES_MYP;

  // Helper to calculate grade from percentage
  const calculateGrade = (percentage: number): string => {
      if (isIGCSE) {
          if (percentage >= 90) return 'A*';
          if (percentage >= 80) return 'A';
          if (percentage >= 70) return 'B';
          if (percentage >= 60) return 'C';
          if (percentage >= 50) return 'D';
          if (percentage >= 40) return 'E';
          return 'U';
      } else {
          if (percentage >= 85) return '7';
          if (percentage >= 70) return '6';
          if (percentage >= 55) return '5';
          if (percentage >= 40) return '4';
          if (percentage >= 25) return '3';
          return '1';
      }
  };

  const currentPredictedGrade = calculateGrade(averageScore);
  
  // Target Grade Logic
  const handleTargetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTarget = e.target.value;
      await updateStudent({ ...student, targetGrade: newTarget });
      await refreshStudent();
  };

  // Compare Grade Logic (Simple index comparison)
  const compareGrades = (current: string, target: string) => {
      const cIndex = currentGrades.indexOf(current);
      const tIndex = currentGrades.indexOf(target);
      if (cIndex === -1 || tIndex === -1) return 'unknown';
      if (cIndex < tIndex) return 'above'; // Lower index is better (A* < A)
      if (cIndex > tIndex) return 'below';
      return 'ontrack';
  };

  const status = compareGrades(currentPredictedGrade, student.targetGrade || (isIGCSE ? 'A' : '6'));

  // Chart Data
  const gradeDistribution = [
    { name: 'Distinction/High', value: summativeAssessments.filter(a => calculateGrade(a.percentage) === (isIGCSE ? 'A*' : '7') || calculateGrade(a.percentage) === (isIGCSE ? 'A' : '6')).length, color: '#22c55e' },
    { name: 'Merit/Pass', value: summativeAssessments.filter(a => ['B','C','5','4'].includes(calculateGrade(a.percentage))).length, color: '#3b82f6' },
    { name: 'Needs Imp.', value: summativeAssessments.filter(a => ['D','E','F','3','2','1'].includes(calculateGrade(a.percentage))).length, color: '#ef4444' },
  ].filter(d => d.value > 0);


  // Theme
  const gradientBg = isIGCSE ? 'from-blue-600 to-indigo-700 shadow-blue-200' : 'from-green-600 to-emerald-700 shadow-green-200';
  const ringFocus = isIGCSE ? 'focus:ring-blue-500' : 'focus:ring-green-500';
  const scoreCircle = isIGCSE ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700';
  const buttonHover = isIGCSE ? 'hover:border-blue-300 hover:text-blue-700' : 'hover:border-green-300 hover:text-green-700';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🔮 Future Grade Forecast</h2>
            <p className="text-lg text-gray-500">Your academic crystal ball. See where you are heading and smash those targets!</p>
        </div>
        
        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 px-4">
            <Target size={20} className="text-gray-400" />
            <span className="font-bold text-gray-600">My Target Grade:</span>
            <select 
                value={student.targetGrade || (isIGCSE ? 'A' : '6')}
                onChange={handleTargetChange}
                className={`font-bold text-xl bg-transparent outline-none ${isIGCSE ? 'text-blue-600' : 'text-green-600'} cursor-pointer`}
            >
                {currentGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Grade Card */}
        <div className={`col-span-2 bg-gradient-to-br ${gradientBg} rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden`}>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-2 opacity-90">
                        <Trophy size={28} />
                        <span className="font-bold text-lg uppercase tracking-wider">Current Predicted Grade</span>
                    </div>
                    <div className="text-8xl font-extrabold tracking-tighter drop-shadow-md">
                        {summativeAssessments.length > 0 ? currentPredictedGrade : '-'}
                    </div>
                    <p className="mt-2 font-medium opacity-80">Based on average score of {averageScore}%</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 min-w-[200px] border border-white/20">
                    <p className="text-sm font-bold uppercase tracking-wider mb-2 opacity-80">Status vs Target</p>
                    
                    {summativeAssessments.length === 0 ? (
                        <span className="text-white/50">No data yet</span>
                    ) : status === 'above' ? (
                        <div className="flex items-center gap-2 text-green-300 font-bold text-xl">
                            <ArrowUp size={24} /> Exceeding Target
                        </div>
                    ) : status === 'below' ? (
                        <div className="flex items-center gap-2 text-red-300 font-bold text-xl">
                            <ArrowDown size={24} /> Below Target
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-blue-300 font-bold text-xl">
                            <Minus size={24} /> On Track
                        </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-white/20">
                        <p className="text-xs opacity-70">To improve, review your "Action Plans" in Assessment Records.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center relative">
            <h3 className="absolute top-6 left-6 font-bold text-gray-700 flex items-center gap-2">
                <TrendingUp size={20} className="text-gray-400" />
                Grade Distribution
            </h3>
            {summativeAssessments.length > 0 ? (
                <div className="w-full h-64 mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={gradeDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {gradeDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="text-gray-400 text-center mt-8">No data to visualize.</div>
            )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-xl text-gray-800">The Evidence (Your Scores)</h3>
          </div>
          <div className="grid gap-5 p-8">
            {summativeAssessments.length > 0 ? (
                summativeAssessments.map((assessment) => (
                    <div key={assessment.id} className={`flex flex-col md:flex-row md:items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 shadow-sm ${buttonHover} transition-all group`}>
                        <div>
                            <h4 className="font-bold text-xl text-gray-900 mb-1">{assessment.title}</h4>
                            <p className="text-base text-gray-500 font-medium">{assessment.date}</p>
                        </div>
                        
                        <div className="flex items-center gap-8 mt-4 md:mt-0">
                             <div className="text-right">
                                <span className="block text-xs text-gray-400 uppercase font-bold tracking-wider">Achieved</span>
                                <span className="font-mono font-bold text-xl text-gray-700">{calculateGrade(assessment.percentage)}</span>
                             </div>
                             <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-extrabold text-lg shadow-sm ${scoreCircle}`}>
                                {assessment.percentage}%
                             </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 text-gray-400 text-lg">
                    No data for the crystal ball yet. 
                    <br/>Go to "Assessment Records" and add a "Summative" exam to see the magic!
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default Summative;