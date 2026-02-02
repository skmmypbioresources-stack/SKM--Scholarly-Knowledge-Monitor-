
import { GoogleGenAI, Chat, Type } from "@google/genai";
import { ChallengeImage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STRICT_PRECISION_PROMPT = `
STRICT RULES FOR AI:
1. NEVER hallucinate facts or invent biological terms.
2. If you are unsure or the data is missing, state "Insufficient information."
3. Stick strictly to IGCSE/MYP Biology marking standards.
4. Be extremely precise and concise. No conversational filler.
5. For grading, use ONLY the provided context/marking scheme.
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
      Scaffold the learning. Check understanding. Do not hallucinate improvements.`,
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

export interface AnalysisResult {
    feedback: string;
    markings: VisualMarking[];
    achievedMarks: number;
    totalMarks: number;
}

export const analyzeScriptWithVisualMarkers = async (
    files: { base64: string, mimeType: string }[],
    contextPrompt: string,
    markingSchemeBase64?: string,
    msMimeType: string = 'application/pdf'
): Promise<AnalysisResult> => {
    try {
        const parts: any[] = [];
        
        // Add all script pages
        files.forEach((file, index) => {
            parts.push({ 
                inlineData: { 
                    mimeType: file.mimeType, 
                    data: cleanBase64(file.base64) 
                } 
            });
            parts.push({ text: `Student Answer Script - Page ${index + 1}` });
        });

        // Add Marking Scheme
        if (markingSchemeBase64) {
             parts.push({ inlineData: { mimeType: msMimeType, data: cleanBase64(markingSchemeBase64) } });
             parts.push({ text: "Official Marking Scheme" });
        }
        
        parts.push({ text: `
            Act as a SENIOR IB MYP BIOLOGY EXAMINER. 
            
            STRICTNESS LEVEL: EXTREME.
            
            TASK:
            1. You are provided with a multi-page answer script (sequential images/PDF pages).
            2. Mark EVERY question across ALL pages against the marking scheme.
            3. Award marks ONLY for correct scientific keywords.
            4. SPATIAL ANNOTATION: For every mark (tick or cross), provide the EXACT (x, y) coordinates (0-1000) and the specific PAGE index (0 for first image, 1 for second, etc.) where that answer is written.
            
            Context: ${contextPrompt}
            
            Return JSON ONLY:
            {
              "feedback": "string (Formal report)",
              "totalMarks": number,
              "achievedMarks": number,
              "markings": [
                { 
                  "type": "tick" | "cross", 
                  "x": number, 
                  "y": number, 
                  "page": number (0-indexed index of the image provided),
                  "comment": "Specific reason" 
                }
              ]
            }
        ` });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts },
            config: {
                responseMimeType: "application/json"
            }
        });

        const data = JSON.parse(response.text || '{}');
        return {
            feedback: data.feedback || "No feedback generated.",
            markings: data.markings || [],
            totalMarks: typeof data.totalMarks === 'number' ? data.totalMarks : 0,
            achievedMarks: typeof data.achievedMarks === 'number' ? data.achievedMarks : 0
        };
    } catch (e) {
        console.error("Visual Analysis Error:", e);
        return { feedback: "Processing error. Ensure all pages are readable.", markings: [], totalMarks: 0, achievedMarks: 0 };
    }
};
