
import { Student, Curriculum, Topic, TermAssessment } from '../types';

export const INITIAL_TOPICS_IGCSE: Topic[] = [
  { id: 'ig1', title: '1. Characteristics and classification of living organisms', description: 'Concept of life, classification systems, and binomial nomenclature.', resources: [], completed: false },
  { id: 'ig2', title: '2. Organisation of the organism', description: 'Cell structure, magnification, and organization from cells to systems.', resources: [], completed: false },
  { id: 'ig3', title: '3. Movement into and out of cells', description: 'Diffusion, osmosis, and active transport mechanisms.', resources: [], completed: false },
  { id: 'ig4', title: '4. Biological molecules', description: 'Chemical elements, carbohydrates, fats, proteins, DNA, and water tests.', resources: [], completed: false },
  { id: 'ig5', title: '5. Enzymes', description: 'Enzyme action, active sites, specificity, and factors affecting enzyme activity.', resources: [], completed: false },
  { id: 'ig6', title: '6. Plant nutrition', description: 'Photosynthesis, chlorophyll, leaf structure, and mineral requirements.', resources: [], completed: false },
  { id: 'ig7', title: '7. Human nutrition', description: 'Diet, alimentary canal, mechanical and chemical digestion, and absorption.', resources: [], completed: false },
  { id: 'ig8', title: '8. Transport in plants', description: 'Xylem and phloem functions, water uptake, and transpiration.', resources: [], completed: false },
  { id: 'ig9', title: '9. Transport in animals', description: 'Circulatory system, heart structure, blood vessels, and blood composition.', resources: [], completed: false },
  { id: 'ig10', title: '10. Diseases and immunity', description: 'Pathogens, body defenses, immune response, antibodies, and vaccination.', resources: [], completed: false },
  { id: 'ig11', title: '11. Gas exchange in humans', description: 'Lungs structure, breathing mechanisms, and gas exchange surfaces.', resources: [], completed: false },
  { id: 'ig12', title: '12. Respiration', description: 'Aerobic and anaerobic respiration, energy release, and debt.', resources: [], completed: false },
  { id: 'ig13', title: '13. Excretion in humans', description: 'Kidney function, urea formation, and dialysis.', resources: [], completed: false },
  { id: 'ig14', title: '14. Coordination and response', description: 'Nervous system, synapses, sense organs, hormones, and homeostasis.', resources: [], completed: false },
  { id: 'ig15', title: '15. Drugs', description: 'Medicinal drugs, antibiotics, and effects of alcohol and heroin.', resources: [], completed: false },
  { id: 'ig16', title: '16. Reproduction', description: 'Asexual and sexual reproduction in plants and humans, and STIs.', resources: [], completed: false },
  { id: 'ig17', title: '17. Inheritance', description: 'Chromosomes, genes, DNA synthesis, mitosis, meiosis, and inheritance patterns.', resources: [], completed: false },
  { id: 'ig18', title: '18. Variation and selection', description: 'Continuous and discontinuous variation, mutation, and natural selection.', resources: [], completed: false },
  { id: 'ig19', title: '19. Organisms and their environment', description: 'Energy flow, food chains, webs, carbon and nitrogen cycles, and populations.', resources: [], completed: false },
  { id: 'ig20', title: '20. Human influences on ecosystems', description: 'Agriculture, pollution, habitat destruction, and conservation.', resources: [], completed: false },
  { id: 'ig21', title: '21. Biotechnology and genetic modification', description: 'Use of bacteria and yeast, fermenters, and genetic engineering examples.', resources: [], completed: false },
];

export const INITIAL_TOPICS_MYP: Topic[] = [
  { id: 'm1', title: 'Criterion A: Knowing and Understanding', description: 'Scientific knowledge application.', resources: [], completed: false },
  { id: 'm2', title: 'Criterion B: Inquiring and Designing', description: 'Designing scientific investigations.', resources: [], completed: false },
  { id: 'm3', title: 'Criterion C: Processing and Evaluating', description: 'Data analysis and evaluation.', resources: [], completed: false },
  { id: 'm4', title: 'Criterion D: Reflecting on Impacts', description: 'Science reflection in society.', resources: [], completed: false },
];

const createMypStudent = (id: string, name: string, batch: string = 'myp-25') => ({
  id,
  username: id, 
  password: '1234',
  name,
  curriculum: Curriculum.MYP,
  batch,
  assessments: [],
  termAssessments: [],
  topics: JSON.parse(JSON.stringify(INITIAL_TOPICS_MYP)),
  attendance: [],
  tuitionTasks: [],
  tuitionReflections: [],
  differentiationResources: [],
  targetGrade: '7',
  chatHistory: [],
  aiUsage: { date: new Date().toISOString().split('T')[0], count: 0 },
  atlSkills: [],
  ibAttributes: [],
  typingStats: { wpm: 0, accuracy: 0, lessonsCompleted: 0 },
  vocabList: [],
  empowermentUsage: { date: new Date().toISOString().split('T')[0], count: 0 }
});

const createIgcseStudent = (id: string, name: string, batch: string = 'fm5-25') => ({
  id,
  username: id,
  password: '1234',
  name,
  curriculum: Curriculum.IGCSE,
  batch,
  assessments: [],
  termAssessments: [],
  topics: JSON.parse(JSON.stringify(INITIAL_TOPICS_IGCSE)),
  attendance: [],
  tuitionTasks: [],
  tuitionReflections: [],
  differentiationResources: [],
  targetGrade: 'A*',
  chatHistory: [],
  aiUsage: { date: new Date().toISOString().split('T')[0], count: 0 },
  atlSkills: [],
  ibAttributes: [],
  typingStats: { wpm: 0, accuracy: 0, lessonsCompleted: 0 },
  vocabList: [],
  empowermentUsage: { date: new Date().toISOString().split('T')[0], count: 0 }
});

const createIgcseStudentWithMarks = (id: string, name: string, fmScore: number) => {
  const s = createIgcseStudent(id, name, 'fm5-25');
  s.termAssessments.push({
      id: `term-${id}-1`,
      examType: 'First Midterm Examination',
      date: '2024-09-20', 
      score: fmScore,
      maxScore: 100,
      percentage: fmScore,
      whatWentWell: 'Data imported from records.',
      actionPlan: 'Please review to plan next steps.'
  });
  return s;
};

export const MOCK_STUDENTS: Student[] = [
  // Demo Student
  createIgcseStudent('4321', 'Demo Student', 'fm5-25'),

  // IGCSE FM5-25 (Batch 2025)
  createIgcseStudentWithMarks('7137', 'Devayani', 70),
  createIgcseStudentWithMarks('8013', 'Suhas Krishna', 70),
  createIgcseStudentWithMarks('7167', 'Dhiren', 66),
  createIgcseStudentWithMarks('8233', 'Bharani', 83),
  createIgcseStudentWithMarks('7883', 'Revanthkumar', 50),
  createIgcseStudentWithMarks('8128', 'Siya', 60),
  createIgcseStudentWithMarks('7758', 'Aahan', 66),
  createIgcseStudentWithMarks('7881', 'Ved', 93),
  createIgcseStudentWithMarks('7549', 'Shravya', 60),
  createIgcseStudentWithMarks('7735', 'Sathvik Sai', 47),
  createIgcseStudentWithMarks('6854', 'Hruthikesh', 77),

  // IGCSE FM4-26 (Batch 2026)
  createIgcseStudent('7725', 'Adithya Krishna', 'fm4-26'),
  createIgcseStudent('8170', 'Robin Peter', 'fm4-26'),
  createIgcseStudent('7989', 'Hetansh', 'fm4-26'),
  createIgcseStudent('8490', 'Surya', 'fm4-26'),
  createIgcseStudent('8439', 'Harsh Rohida', 'fm4-26'),
  createIgcseStudent('8163', 'Avir Arora', 'fm4-26'),
  createIgcseStudent('8430', 'Nithya', 'fm4-26'),
  createIgcseStudent('8028', 'Johnathan', 'fm4-26'),
  createIgcseStudent('7993', 'Anjana Pratika', 'fm4-26'),
  createIgcseStudent('7603', 'Samyukthaa', 'fm4-26'),
  createIgcseStudent('8068', 'Devin', 'fm4-26'),
  createIgcseStudent('8248', 'Aashi', 'fm4-26'),
  createIgcseStudent('8083', 'Abhirup Paul', 'fm4-26'),
  createIgcseStudent('7639', 'Maanvick', 'fm4-26'),
  createIgcseStudent('8235', 'Devendar', 'fm4-26'), // Fixed duplicate 8233 -> 8235
  createIgcseStudent('7704', 'Ishaan', 'fm4-26'),
  createIgcseStudent('6968', 'Vihaan', 'fm4-26'),
  createIgcseStudent('8104', 'Keyvahn Chotani', 'fm4-26'),
  createIgcseStudent('8288', 'Leysha Gupta', 'fm4-26'),
  createIgcseStudent('7985', 'Ramavtar', 'fm4-26'),
  createIgcseStudent('7433', 'Bhavik Reddy', 'fm4-26'),
  createIgcseStudent('8109', 'SHANAYA', 'fm4-26'),
  
  // MYP Students - Batch 25
  createMypStudent('8102', 'AE DHANYA ELANGOVAN'),
  createMypStudent('8098', 'ARADHANA MURALIKRISHNAN'),
  createMypStudent('8018', 'NIKITHA REDDY'),
  createMypStudent('8091', 'ANANYA SUHANE'),
  createMypStudent('8338', 'TEJASWINI RAMALINGAM'),
  createMypStudent('8303', 'MOKSHA NALEEN PATEL'),
  createMypStudent('7891', 'DHARMI SARDHARA'),
  createMypStudent('7840', 'FIONA HARDIK PATEL'),
  createMypStudent('7868', 'AAGAM LUNAWAT'),
  createMypStudent('7892', 'JENIL SARDHARA'),
  createMypStudent('7995', 'DHRUV PATEL'),
  createMypStudent('8151', 'AKARSH GOYAL'),
  createMypStudent('8187', 'DIVYE MITTAL'),
  createMypStudent('7774', 'RUMAISHA ALAM KHAN'),
  createMypStudent('8328', 'DHRUVI AGARWAL'),
  createMypStudent('7730', 'ADITYA JAIN'),
  createMypStudent('7764', 'SAYAAN PATEL'),
  createMypStudent('7768', 'PRAJWAL SAHOO'),
  createMypStudent('7978', 'PARTHIV SORATHIYA'),
  createMypStudent('8141', 'JAIVIN THUMMAR'),
  createMypStudent('7822', 'PRANSHU DOSHI'),

  // MYP Students - Batch 26
  createMypStudent('8185', 'AARNAVI REKHA APPASANI', 'myp-26'),
  createMypStudent('7632', 'SAACHI AGARWAL', 'myp-26'),
  createMypStudent('7987', 'SANVI SAJAY', 'myp-26'),
  createMypStudent('8108', 'DIVA ADESHRA', 'myp-26'),
  createMypStudent('8217', 'AASMAA MITESH GAJERA', 'myp-26'),
  createMypStudent('8038', 'LAKSHMI KEERTHANA', 'myp-26'),
  createMypStudent('7737', 'TIARA AGARWAL', 'myp-26'),
  createMypStudent('7825', 'SHOURYA RAHUL MANE', 'myp-26'),
  createMypStudent('7973', 'PRANAV GOBINATH', 'myp-26'),
  createMypStudent('7490', 'KULDIP DUBISHETTY', 'myp-26'),
  createMypStudent('8283', 'RUDRASAKHIYA', 'myp-26'),
  createMypStudent('8164', 'AKSHAJ VELLORE', 'myp-26'),
  createMypStudent('8389', 'RUDRANSH VIVEK GANDHI', 'myp-26'),
  createMypStudent('8499', 'NAINESHA REDDY GUNREDDY', 'myp-26'),
  createMypStudent('7336', 'SAANVI SUNIT PATEL', 'myp-26'),
  createMypStudent('7839', 'SAI SIDDHIKSHA SAKHAMURI', 'myp-26'),
  createMypStudent('8024', 'ANAYA CHOKSI', 'myp-26'),
  createMypStudent('8132', 'ANAV SINGH BHATIA', 'myp-26'),
  createMypStudent('7645', 'YADHAVAR BABU', 'myp-26'),
  createMypStudent('7588', 'ARNAV SAMRA', 'myp-26'),
  createMypStudent('8223', 'DEV DARSHAN KARIA', 'myp-26'),
  createMypStudent('7789', 'VIDUSSHI JAIN', 'myp-26'),
];
