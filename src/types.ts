export type InterviewType = "technical" | "behavioral";
export type Difficulty = "easy" | "medium" | "hard";
export type InterviewerPersona = "sophia" | "victor" | "eleanor";

export interface InterviewerConfig {
  id: InterviewerPersona;
  name: string;
  role: string;
  description: string;
  avatarUrl: string;
  tone: string;
  systemInstruction: string;
}

export interface QuestionItem {
  id: string;
  questionText: string;
  userAnswer?: string;
  hint?: string;
  clarification?: string;
}

export interface InterviewSession {
  id: string;
  role: string;
  experienceLevel: string;
  difficulty: Difficulty;
  type: InterviewType;
  persona: InterviewerPersona;
  skills: string;
  questions: QuestionItem[];
  currentQuestionIndex: number;
  isCompleted: boolean;
  createdAt: number;
}

export interface SkillRating {
  skill: string;
  score: number; // 0-100
  description: string;
}

export interface QuestionReview {
  question: string;
  answer: string;
  score: number; // 0-100
  feedback: string;
  modelAnswer: string;
}

export interface EvaluationReport {
  overallScore: number; // 0-100
  personaFeedback: string;
  skillsBreakdown: SkillRating[];
  strengths: string[];
  improvements: string[];
  questionsReview: QuestionReview[];
}

export const INTERVIEWERS: Record<InterviewerPersona, InterviewerConfig> = {
  sophia: {
    id: "sophia",
    name: "Sophia Martinez",
    role: "Senior HR Director",
    description: "Empathetic, values-driven, and focused on behavioral alignment, cultural fit, emotional intelligence, and leadership potential.",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    tone: "Warm, professional, observant, and encouraging.",
    systemInstruction: "You are Sophia Martinez, a seasoned HR Director who is warm, encouraging, but highly observant. You ask insightful behavioral questions that look for emotional intelligence, leadership potential, communication, and culture fit. Keep responses conversational and dynamic."
  },
  victor: {
    id: "victor",
    name: "Victor Chen",
    role: "Principal Tech Lead",
    description: "Pragmatic, logical, and highly technical. Focuses on system design, problem-solving, clean code principles, and deep tech fundamentals.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    tone: "Pragmatic, precise, analytical, and fair.",
    systemInstruction: "You are Victor Chen, a brilliant Principal Tech Lead. You care about system design, deep technical fundamentals, trade-offs, and logical clarity. You are precise, direct, and pragmatic. Your questions are technical and check if the candidate truly understands the engineering details, not just memorized concepts."
  },
  eleanor: {
    id: "eleanor",
    name: "Eleanor Vance",
    role: "VP of Engineering",
    description: "Highly demanding and strategic. Focuses on architectural decisions, business impact, scalability, and handling high-pressure challenges.",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    tone: "Challenging, authoritative, visionary, and direct.",
    systemInstruction: "You are Eleanor Vance, the VP of Engineering. You look at the big picture: business impact, engineering architecture, scalability, and how the candidate handles high-pressure constraints. You are direct, authoritative, tough but fair, and expect comprehensive, high-quality answers."
  }
};
