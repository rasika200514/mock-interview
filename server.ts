import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { INTERVIEWERS, InterviewerPersona } from "./src/types";

dotenv.config();

const app = express();
app.use(express.json());

// In-memory active session store
const sessions = new Map<string, any>();

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please configure it in your Secrets / Environment panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API: Start an interview and pre-generate questions
app.post("/api/interview/start", async (req, res) => {
  try {
    const { role, experienceLevel, difficulty, type, persona, skills } = req.body;
    
    if (!role || !experienceLevel || !difficulty || !type || !persona) {
      return res.status(400).json({ error: "Missing required configuration fields to start." });
    }

    const interviewer = INTERVIEWERS[persona as InterviewerPersona] || INTERVIEWERS.sophia;
    const ai = getGeminiClient();

    const prompt = `You are playing the role of ${interviewer.name}, a ${interviewer.role}. Tone: ${interviewer.tone}.
Generate exactly 5 targeted, realistic, and highly engaging interview questions for a candidate interviewing for the position of "${role}" (${experienceLevel} level).

Interview Parameters:
- Interview Type: ${type === "technical" ? "Technical / Coding Concepts / System Design / Technology fundamentals" : "Behavioral / HR / Situational / Competency challenges"}
- Difficulty Level: ${difficulty}
- Primary skills to focus on: ${skills || "standard industry fundamentals"}

For each question, provide a subtle, helpful, constructive hint that guides the candidate's thinking without giving away the direct answer.
Ensure the questions represent what a top-tier tech or HR manager would ask to truly test capability.

Return your response strictly as a JSON array of 5 objects matching the specified schema. Do not include markdown formatting like \`\`\`json outside the JSON output.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: interviewer.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING, description: "The interview question" },
              hint: { type: Type.STRING, description: "A guiding hint" }
            },
            required: ["questionText", "hint"]
          }
        }
      }
    });

    const textOutput = response.text?.trim() || "[]";
    const questionsData = JSON.parse(textOutput);
    
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      throw new Error("Gemini API generated invalid question structure.");
    }

    const sessionId = Math.random().toString(36).substring(2, 11).toUpperCase();
    
    const session = {
      id: sessionId,
      role,
      experienceLevel,
      difficulty,
      type,
      persona,
      skills: skills || "",
      questions: questionsData.map((q, idx) => ({
        id: `q_${idx + 1}`,
        questionText: q.questionText,
        hint: q.hint
      })),
      currentQuestionIndex: 0,
      isCompleted: false,
      createdAt: Date.now()
    };

    sessions.set(sessionId, session);
    res.json(session);
  } catch (error: any) {
    console.error("Error starting mock interview session:", error);
    res.status(500).json({ error: error.message || "Failed to start interview session." });
  }
});

// API: Submit answer for current question
app.post("/api/interview/answer", (req, res) => {
  try {
    const { sessionId, answerText } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Interview session not found." });
    }

    const idx = session.currentQuestionIndex;
    if (idx < session.questions.length) {
      session.questions[idx].userAnswer = answerText || "";
    }

    session.currentQuestionIndex += 1;
    if (session.currentQuestionIndex >= session.questions.length) {
      session.isCompleted = true;
    }

    sessions.set(sessionId, session);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to register answer." });
  }
});

// API: Request conversational clarification on current question
app.post("/api/interview/clarify", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Interview session not found." });
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) {
      return res.status(400).json({ error: "No active question found to clarify." });
    }

    const interviewer = INTERVIEWERS[session.persona as InterviewerPersona] || INTERVIEWERS.sophia;
    const ai = getGeminiClient();

    const prompt = `You are playing the role of ${interviewer.name}, a ${interviewer.role}. Tone: ${interviewer.tone}.
The candidate has asked you for a direct clarification on this question you just asked them:
"${currentQuestion.questionText}"

Provide a brief, polite, in-character clarification in first-person, explaining exactly what dimension or aspects you want them to highlight (e.g., specific architectures, real-world examples, core values).
Keep it very conversational and concise (1-3 sentences). Do NOT give away the answer or any solution!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: interviewer.systemInstruction
      }
    });

    res.json({ clarification: response.text?.trim() || "Could you give me a specific real-world scenario where you applied this skill?" });
  } catch (error: any) {
    console.error("Error clarifying interview question:", error);
    res.status(500).json({ error: error.message || "Failed to clarify question." });
  }
});

// API: Perform detailed performance evaluation once the interview completes
app.post("/api/interview/evaluate", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Interview session not found." });
    }

    const interviewer = INTERVIEWERS[session.persona as InterviewerPersona] || INTERVIEWERS.sophia;
    const ai = getGeminiClient();

    // Map out questions and user answers
    const dialogue = session.questions.map((q: any, i: number) => {
      return `[QUESTION ${i + 1}]
Question Asked: "${q.questionText}"
Candidate's Answer: "${q.userAnswer || "No answer provided."}"`;
    }).join("\n\n");

    const prompt = `You are an elite talent assessor analyzing a completed mock interview conducted by ${interviewer.name} (${interviewer.role}) for a candidate applying for the "${session.experienceLevel}" role of "${session.role}".
Interview Type: ${session.type === "technical" ? "Technical (depth, coding concepts, systems)" : "HR / Behavioral (culture, EQ, communication)"}
Difficulty: ${session.difficulty}
Core Key Skills Target: ${session.skills || "industry-relevant principles"}

Below is the interview dialogue detailing each question and the candidate's exact response:

${dialogue}

Grade and evaluate the candidate strictly but constructively.
1. Determine an overallScore (0-100) reflecting their readiness.
2. Formulate personaFeedback written in first-person as ${interviewer.name} in their specific tone (${interviewer.tone}), summing up their impressions of the candidate.
3. Compute a skillsBreakdown evaluating 3 core skills (e.g., 'Technical Depth', 'Behavioral Delivery', 'Problem Solving', 'System Design' or 'Communication') that are most applicable here.
4. Extract exactly 3 concrete strengths with specific mentions to what they said.
5. Detail exactly 3 specific, actionable advice points for improvements.
6. Provide a questionsReview where you analyze each of the 5 answers, grade it out of 100, give constructive feedback, and provide a perfect exemplar modelAnswer.

Return your response strictly as a JSON object matching the provided schema. Do not wrap it in markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert talent analyst and executive coach. Return a meticulous, detailed, highly professional feedback JSON report.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER, description: "Overall rating from 0 to 100" },
            personaFeedback: { type: Type.STRING, description: "Personalized summary written in first person as the interviewer" },
            skillsBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  skill: { type: Type.STRING, description: "Skill name" },
                  score: { type: Type.INTEGER, description: "Skill score out of 100" },
                  description: { type: Type.STRING, description: "Explanation of why they got this score" }
                },
                required: ["skill", "score", "description"]
              }
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            questionsReview: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                  score: { type: Type.INTEGER, description: "Score for this question out of 100" },
                  feedback: { type: Type.STRING, description: "Feedback on this answer" },
                  modelAnswer: { type: Type.STRING, description: "An exemplar model answer showing how to ace this question" }
                },
                required: ["question", "answer", "score", "feedback", "modelAnswer"]
              }
            }
          },
          required: ["overallScore", "personaFeedback", "skillsBreakdown", "strengths", "improvements", "questionsReview"]
        }
      }
    });

    const reportOutput = response.text?.trim() || "{}";
    const reportData = JSON.parse(reportOutput);
    res.json(reportData);
  } catch (error: any) {
    console.error("Error conducting evaluation:", error);
    res.status(500).json({ error: error.message || "Failed to evaluate interview performance." });
  }
});

// Full-Stack Server bootstrapper with Vite / Static middleware
async function startServer() {
  // Vite dev or production setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
