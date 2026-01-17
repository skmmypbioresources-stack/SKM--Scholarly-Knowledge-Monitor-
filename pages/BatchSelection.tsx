
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Curriculum } from '../types';
import { ChevronLeft, Users, GraduationCap, ArrowRight } from 'lucide-react';

const BatchSelection: React.FC = () => {
  const { curriculum } = useParams<{ curriculum: string }>();
  const navigate = useNavigate();

  const isIGCSE = curriculum === Curriculum.IGCSE;
  
  const themeColor = isIGCSE ? 'text-blue-600' : 'text-green-600';
  const themeBorder = isIGCSE ? 'border-blue-100 hover:border-blue-300' : 'border-green-100 hover:border-green-300';
  const themeBg = isIGCSE ? 'bg-blue-50' : 'bg-green-50';
  const hoverShadow = isIGCSE ? 'hover:shadow-blue-200' : 'hover:shadow-green-200';

  const batches = isIGCSE 
    ? [
        { id: 'fm5-25', title: 'FM 5 - Board Batch 25', description: 'Final Year Students (2025)' },
        { id: 'fm4-26', title: 'FM 4 - Board Batch 26', description: 'Pre-Final Year Students (2026)' }
      ]
    : [
        { id: 'myp-25', title: 'Board Batch 25', description: 'MYP Final Year Assessment' },
        { id: 'myp-26', title: 'Board Batch 26', description: 'MYP Year 4 Assessment' }
      ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center">
      <div className="max-w-5xl w-full">
        <button 
            onClick={() => navigate('/welcome')} 
            className="flex items-center text-gray-500 hover:text-blue-700 transition-colors mb-8 font-semibold text-lg"
        >
            <ChevronLeft size={24} className="mr-1" /> Back to Dashboard
        </button>

        <div className="mb-12 text-center md:text-left">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            <span className={themeColor}>{curriculum}</span> Batches
          </h1>
          <p className="text-gray-600 text-xl font-light">Select a batch to manage.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {batches.map(batch => (
            <Link 
              key={batch.id}
              to={`/curriculum/${curriculum}/batch/${batch.id}`}
              className={`group relative bg-white p-10 rounded-[2rem] shadow-lg ${hoverShadow} border-2 ${themeBorder} transition-all duration-300 flex flex-col transform hover:-translate-y-1 cursor-pointer`}
            >
              <div className={`absolute top-0 right-0 p-8 opacity-5`}>
                <GraduationCap size={140} className={themeColor} />
              </div>
              
              <div className={`w-16 h-16 rounded-2xl ${themeBg} flex items-center justify-center mb-8 shadow-inner`}>
                <Users className={themeColor} size={32} />
              </div>

              <h3 className="text-3xl font-bold text-gray-800 mb-3 tracking-tight group-hover:text-black">
                {batch.title}
              </h3>
              <p className="text-gray-500 text-xl font-medium leading-relaxed mb-8">{batch.description}</p>
              
              <div className={`mt-auto flex items-center gap-2 font-bold text-lg ${themeColor}`}>
                 Open Batch <ArrowRight size={20} className="transition-transform group-hover:translate-x-2"/>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BatchSelection;
