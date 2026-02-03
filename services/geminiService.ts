
import { GoogleGenAI, Chat, Type } from "@google/genai";
import { ChallengeImage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STRICT_PRECISION_PROMPT = `
STRICT RULES FOR AI EXAMINER:
1. ACCURACY: You are a Senior Examiner. Hallucinations are a firing offense.
2. NO GUESSING: If a question is in the marking scheme but NOT in the student script, you MUST mark it "0 Marks" and state "Question not attempted".
3. MATH: The 'achievedMarks' total MUST be the exact mathematical sum of all individual 'marksAwarded'.
4. TERMINOLOGY: Use only official IGCSE/MYP Biology marking scheme vocabulary.
5. CONCISENESS: Be brisk and precise. No fluff.
`;

const cleanBase64 = (base64: string) => {
    if (base64.includes(',')) {
        return base64.split(',')[1];
    }
    return base64;
};

export const createChatSession = (curriculum: string, studentName: string): Chat => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are a helpful, encouraging, and knowledgeable tutor for ${studentName} (${curriculum}). 
      ${STRICT_PRECISION_PROMPT}
      Guide the student to the solution without giving the answer directly.`,
    },
  });
};

export const createTaskTutorSession = (studentName: string, taskTitle: string, taskDescription: string, contextPrompt: string): Chat => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are a specialized AI Tutor for the task: "${taskTitle}".
      Task: ${taskDescription}
      Context: ${contextPrompt}
      ${STRICT_PRECISION_PROMPT}
      Scaffold the learning. Check understanding.`,
    },
  });
};

export const sendMessageToGemini = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response = await chat.sendMessage({ message });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: System busy.";
  }
};

export const generateBioPuzzle = async (curriculum: string, topic?: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 1 biology puzzle for ${curriculum}${topic ? ` (${topic})` : ''}. 
            ${STRICT_PRECISION_PROMPT}
            Return JSON ONLY: { "question": "...", "answer": "...", "hint": "..." }.`,
            config: { responseMimeType: "application/json" }
        });
        return response.text || '';
    } catch (e) { return ''; }
};

export const generateTypingText = async (curriculum: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a factual biology paragraph (40 words) for ${curriculum}. NO HALLUCINATIONS. Plain text only.`
        });
        return response.text || 'Biology is the study of living organisms.';
    } catch (e) { return 'Error.'; }
};

export const getATLAdvice = async (skill: string, rating: number): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Student rated ${rating}/5 in ${skill}. Give 1 precise tip. ${STRICT_PRECISION_PROMPT}`
        });
        return response.text || 'Keep practicing.';
    } catch (e) { return ''; }
};

export const getWordOrigin = async (word: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Etymology of "${word}". Format: "Origin: Meaning". Max 10 words. ${STRICT_PRECISION_PROMPT}`
        });
        return response.text || 'Lookup failed.';
    } catch (e) { return ''; }
};

const formatHistoryPrompt = (history: string[] = []) => {
    if (history.length === 0) return "";
    const recent = history.slice(-20).map(q => `"${q}"`).join(', ');
    return `DO NOT repeat or approximate these previous questions: [${recent}].`;
};

export const generatePaper6Question = async (curriculum: string, history: string[] = []): Promise<{question: string, context?: string}> => {
    try {
        const historyPrompt = formatHistoryPrompt(history);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 1 IGCSE/MYP Practical Biology question. ${STRICT_PRECISION_PROMPT} ${historyPrompt}
            Return JSON ONLY: { "question": "...", "context": "exact correct answer" }`,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text || '';
        return JSON.parse(text);
    } catch (e) { 
        return { question: "State one safety precaution in a lab.", context: "Wear goggles" }; 
    }
};

export const generatePaper4TheoryQuestion = async (curriculum: string, history: string[] = []): Promise<{question: string, context?: string}> => {
    try {
        const historyPrompt = formatHistoryPrompt(history);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 1 Biology Theory question. ${STRICT_PRECISION_PROMPT} ${historyPrompt}
            Return JSON ONLY: { "question": "...", "context": "exact correct answer" }`,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text || '';
        return JSON.parse(text);
    } catch (e) {
        return { question: "Define Osmosis.", context: "Net movement of water from high to low potential through partially permeable membrane" };
    }
};

export const generatePaper4DiagramQuestion = async (image: ChallengeImage, history: string[] = []): Promise<{question: string, context?: string}> => {
    try {
        const historyPrompt = formatHistoryPrompt(history);
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { mimeType: 'image/png', data: cleanBase64(image.base64) } },
              {
                text: `Ask ONE technical question based ONLY on labels or organs visible in this image. ${STRICT_PRECISION_PROMPT} ${historyPrompt}
                Return JSON ONLY: { "question": "...", "context": "the expected answer" }`,
              },
            ],
          },
          config: { responseMimeType: "application/json" }
        });
        const text = response.text || '';
        return JSON.parse(text);
    } catch (e) {
        return { question: "Identify label A in the diagram.", context: "Refer to diagram labels" };
    }
};

export const verifyChallengeAnswer = async (userAnswer: string, context: string, question: string): Promise<{score: number, explanation: string}> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Evaluate student answer. ${STRICT_PRECISION_PROMPT}
            Question: "${question}"
            Correct Answer: "${context}"
            Student Answer: "${userAnswer}"
            Grade 0-10. 10 = Perfect, 4-6 = Partial.
            Return JSON ONLY: { "score": number, "explanation": "factual feedback" }`,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text || '';
        const parsed = JSON.parse(text);
        return {
            score: typeof parsed.score === 'number' ? parsed.score : 0,
            explanation: parsed.explanation || "No explanation."
        };
    } catch (e) {
        return { score: 0, explanation: "Verification error." };
    }
};

export const analyzeAnswerScript = async (
    fileBase64: string,
    mimeType: string,
    contextPrompt: string,
    markingSchemeBase64?: string,
    msMimeType: string = 'application/pdf'
): Promise<string> => {
    try {
        const parts: any[] = [{ inlineData: { mimeType: mimeType, data: cleanBase64(fileBase64) } }];
        if (markingSchemeBase64) {
             parts.push({ inlineData: { mimeType: msMimeType, data: cleanBase64(markingSchemeBase64) } });
        }
        parts.push({ text: `Mark student script against provided scheme. ${STRICT_PRECISION_PROMPT} Context: "${contextPrompt}"` });
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: parts } });
        return response.text || "No analysis.";
    } catch (e) { return "Processing error."; }
};

export interface VisualMarking {
    type: 'tick' | 'cross';
    x: number; // 0-1000
    y: number; // 0-1000
    page: number; // 0-indexed page number
    comment: string;
}

export interface QuestionBreakdown {
    questionRef: string;
    marksAwarded: number;
    maxMarks: number;
    remark: string; 
    improvementTip: string;
}

export interface AnalysisResult {
    isValidScript: boolean;
    validationMessage?: string;
    feedbackSummary: string;
    questionAnalysis: QuestionBreakdown[];
    markings: VisualMarking[];
    achievedMarks: number;
    totalMarks: number;
    strengths: string[];
    weaknesses: string[];
}

export const analyzeScriptWithVisualMarkers = async (
    files: { base64: string, mimeType: string }[],
    contextPrompt: string,
    markingSchemeBase64?: string,
    msMimeType: string = 'application/pdf'
): Promise<AnalysisResult> => {
    try {
        const parts: any[] = [];
        
        files.forEach((file, index) => {
            parts.push({ inlineData: { mimeType: file.mimeType, data: cleanBase64(file.base64) } });
            parts.push({ text: `Student Answer Script - Page ${index + 1}` });
        });

        if (markingSchemeBase64) {
             parts.push({ inlineData: { mimeType: msMimeType, data: cleanBase64(markingSchemeBase64) } });
             parts.push({ text: "Official Marking Scheme" });
        }
        
        parts.push({ text: `
            Act as an ELITE SENIOR BIOLOGY EXAMINER. 
            
            DIAGNOSTIC PROTOCOL (ZERO HALLUCINATION):
            1. INTEGRITY CHECK: Compare Student Script vs Marking Scheme for: ${contextPrompt}. 
               If mismatch, set "isValidScript": false and describe the error in "validationMessage".
            
            2. FULL ENUMERATION: Identify EVERY question number (e.g., Q1 to Q43) present in the Marking Scheme.
            
            3. STRICT GRADING:
               - If a question is found in the script: Mark it exactly against the scheme.
               - If a question is NOT found (e.g. script stops at Q20): You MUST award 0 Marks for all remaining questions (Q21-Q43).
               - DO NOT assume answers for missing pages or questions.
            
            4. PEDAGOGY:
               - "remark": Technical explanation of the score.
               - "improvementTip": A specific "Teacher's Pro Tip" on phrasing or scientific concepts. MANDATORY for all questions.
            
            5. FINAL MATH: Total "achievedMarks" MUST equal the sum of "marksAwarded" in the list.
            
            Return JSON ONLY:
            {
              "isValidScript": boolean,
              "validationMessage": "string",
              "feedbackSummary": "string",
              "totalMarks": number,
              "achievedMarks": number,
              "questionAnalysis": [
                {
                   "questionRef": "string (e.g. Q1)",
                   "marksAwarded": number,
                   "maxMarks": number,
                   "remark": "string",
                   "improvementTip": "string"
                }
              ],
              "markings": [
                { "type": "tick" | "cross", "x": number, "y": number, "page": number, "comment": "string" }
              ],
              "strengths": ["string"],
              "weaknesses": ["string"]
            }
        ` });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(response.text || '{}');
        
        // Final sanity check on sum to prevent hallucinated totals
        let calculatedSum = 0;
        if (Array.isArray(data.questionAnalysis)) {
            data.questionAnalysis.forEach((q: any) => calculatedSum += (q.marksAwarded || 0));
        }

        return {
            isValidScript: data.isValidScript !== false,
            validationMessage: data.validationMessage || "Script/Assessment mismatch.",
            feedbackSummary: data.feedbackSummary || "Diagnostic complete.",
            questionAnalysis: data.questionAnalysis || [],
            markings: data.markings || [],
            totalMarks: typeof data.totalMarks === 'number' ? data.totalMarks : 0,
            achievedMarks: calculatedSum, // Trust the sum over a hallucinated total
            strengths: Array.isArray(data.strengths) ? data.strengths : [],
            weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : []
        };
    } catch (e) {
        console.error("High-Speed Precise Analysis Error:", e);
        return { isValidScript: true, feedbackSummary: "Error.", questionAnalysis: [], markings: [], totalMarks: 0, achievedMarks: 0, strengths: [], weaknesses: [] };
    }
};
