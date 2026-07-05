import React, { useState, useEffect, useRef } from "react";
import { 
  Briefcase, 
  Layers, 
  HelpCircle, 
  Lightbulb, 
  Sparkles, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw, 
  FileText, 
  Award, 
  User, 
  Users, 
  ThumbsUp, 
  Check, 
  Loader2, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Clock, 
  ChevronRight, 
  BookOpen, 
  Printer 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  InterviewSession, 
  EvaluationReport, 
  Difficulty, 
  InterviewType, 
  InterviewerPersona, 
  INTERVIEWERS 
} from "./types";

const PRESETS = [
  {
    title: "Python Flask Backend Dev",
    role: "Backend Engineer (Python / Flask)",
    skills: "Python, Flask, REST APIs, SQL, PostgreSQL, PyTest, Docker, Celery",
    type: "technical" as const,
    difficulty: "medium" as const
  },
  {
    title: "Senior Frontend React Lead",
    role: "Senior Frontend Engineer",
    skills: "React 19, TypeScript, Vite, Tailwind CSS, Performance Optimization, State Management",
    type: "technical" as const,
    difficulty: "hard" as const
  },
  {
    title: "Technical Product Manager",
    role: "Technical Product Manager",
    skills: "Product Strategy, Roadmap Delivery, System Integrations, Stakeholder Management, Agile",
    type: "behavioral" as const,
    difficulty: "medium" as const
  },
  {
    title: "HR Talent Acquisition Lead",
    role: "Talent Acquisition Lead",
    skills: "Recruiting Strategy, Competency Interviews, Leadership Hiring, Conflict Resolution",
    type: "behavioral" as const,
    difficulty: "easy" as const
  }
];

const ROTATING_TIPS = [
  "Tip: Structure behavioral answers with the CAR method (Context, Action, Result).",
  "Tip: Take a moment to outline your thoughts. Clarify assumptions early.",
  "Tip: Speak at a steady, professional pace. Give concrete real-world examples.",
  "Tip: For technical questions, discuss trade-offs in architecture and performance.",
  "Tip: Be honest about areas you're still developing; focus on how you learn and adapt.",
  "Tip: The hints are here to guide you. Use them if you feel stuck or need direction."
];

export default function App() {
  // Config states
  const [role, setRole] = useState("Backend Engineer (Python / Flask)");
  const [experienceLevel, setExperienceLevel] = useState("Mid");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [interviewType, setInterviewType] = useState<InterviewType>("technical");
  const [selectedPersona, setSelectedPersona] = useState<InterviewerPersona>("victor");
  const [skills, setSkills] = useState("Python, Flask, SQL, REST APIs, Docker");

  // Session & UI States
  const [step, setStep] = useState<"setup" | "loading" | "interview" | "grading" | "results">("setup");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Interaction States
  const [showHint, setShowHint] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);
  const [clarification, setClarification] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [resultsTab, setResultsTab] = useState<"summary" | "skills" | "questions" | "badge">("summary");
  const [elapsedTime, setElapsedTime] = useState(0);

  // Speech objects
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Rotate tips during loading screens
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "loading" || step === "grading") {
      interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % ROTATING_TIPS.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Interview timer
  useEffect(() => {
    if (step === "interview") {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  // Read question aloud when current question changes
  useEffect(() => {
    if (step === "interview" && session) {
      const q = session.questions[session.currentQuestionIndex];
      if (q) {
        // Delay speech slightly to let view render
        const t = setTimeout(() => {
          speakText(q.questionText);
        }, 800);
        return () => clearTimeout(t);
      }
    }
  }, [step, session?.currentQuestionIndex]);

  // Helper to format time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  // Text-To-Speech function
  const speakText = (text: string) => {
    if (isMuted) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      // Select appropriate-sounding voice
      let voiceName = "";
      if (selectedPersona === "sophia") {
        voiceName = "female";
      } else if (selectedPersona === "victor") {
        voiceName = "male";
      } else {
        voiceName = "samantha";
      }

      const match = voices.find(v => 
        v.name.toLowerCase().includes(voiceName) || 
        v.lang.includes("en-US") || 
        v.lang.includes("en-GB")
      );
      if (match) utterance.voice = match;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech Synthesis Error:", e);
    }
  };

  // Speech-To-Text Dictation Toggle
  const toggleSpeechToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not fully supported in this browser. Try Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          let chunk = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              chunk += event.results[i][0].transcript;
            }
          }
          if (chunk) {
            setCurrentAnswer((prev) => prev + (prev ? " " : "") + chunk);
          }
        };

        rec.onerror = (err: any) => {
          console.error("STT Error:", err);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err: any) {
        console.error("Could not start speech recognition:", err);
      }
    }
  };

  // Preset Selection Click
  const selectPreset = (p: typeof PRESETS[0]) => {
    setRole(p.role);
    setSkills(p.skills);
    setInterviewType(p.type);
    setDifficulty(p.difficulty);
    // Auto align persona to flavor
    if (p.type === "technical") {
      setSelectedPersona("victor");
    } else {
      setSelectedPersona("sophia");
    }
  };

  // Start Interview call
  const handleStartInterview = async () => {
    setError(null);
    setStep("loading");
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          experienceLevel,
          difficulty,
          type: interviewType,
          persona: selectedPersona,
          skills
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start interview.");
      }

      setSession(data);
      setCurrentAnswer("");
      setShowHint(false);
      setClarification(null);
      setStep("interview");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setStep("setup");
    }
  };

  // Submit current answer call
  const handleSubmitAnswer = async () => {
    if (!session) return;
    setError(null);
    setShowHint(false);
    setClarification(null);

    // Stop listening if recording
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    try {
      const res = await fetch("/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          answerText: currentAnswer.trim() || "No answer provided."
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit answer.");
      }

      setSession(data);
      setCurrentAnswer("");

      // If finished, proceed to grading
      if (data.isCompleted) {
        handleGenerateEvaluation(data.id);
      }
    } catch (err: any) {
      setError(err.message || "Could not log answer.");
    }
  };

  // Clarify current question call
  const handleGetClarification = async () => {
    if (!session) return;
    setIsClarifying(true);
    setClarification(null);
    try {
      const res = await fetch("/api/interview/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not fetch clarification.");
      }
      setClarification(data.clarification);
      speakText("Clarification: " + data.clarification);
    } catch (err: any) {
      console.error(err);
      setClarification("I am looking for your personal approach to handling this constraint, specifying tools or trade-offs.");
    } finally {
      setIsClarifying(false);
    }
  };

  // Generate performance evaluation
  const handleGenerateEvaluation = async (sessId: string) => {
    setStep("grading");
    try {
      const res = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to evaluate performance.");
      }

      setEvaluation(data);
      setResultsTab("summary");
      setStep("results");
    } catch (err: any) {
      setError(err.message || "Failed to finalize evaluation grading.");
      setStep("results"); // still show result screen but will handle fallback/error
    }
  };

  const handleRestart = () => {
    setSession(null);
    setEvaluation(null);
    setCurrentAnswer("");
    setElapsedTime(0);
    setError(null);
    setStep("setup");
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-700 border-emerald-200 bg-emerald-50";
    if (score >= 70) return "text-amber-700 border-amber-200 bg-amber-50";
    return "text-rose-700 border-rose-200 bg-rose-50";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getInterviewerHeaderColor = (p: InterviewerPersona) => {
    if (p === "sophia") return "from-purple-50 to-pink-50 border-purple-100 text-purple-950";
    if (p === "victor") return "from-blue-50 to-cyan-50 border-blue-100 text-indigo-950";
    return "from-amber-50 to-rose-50 border-amber-100 text-amber-950";
  };

  return (
    <div id="app-root" className="bg-slate-50 text-slate-800 min-h-screen font-sans antialiased overflow-x-hidden selection:bg-indigo-500 selection:text-white pb-12">
      {/* Subtle Sleek Ambient Background Blobs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="fixed top-1/2 -right-40 w-[450px] h-[450px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Global Toast Error */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-rose-50 border border-rose-200 backdrop-blur-md text-rose-900 px-4 py-3 rounded-2xl shadow-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-sm text-rose-950">System Notification</h4>
                <p className="text-xs text-rose-800 mt-1">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10 flex flex-col min-h-screen">
        {/* Header Branding */}
        <header className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-8 border border-slate-200 bg-white p-5 rounded-2xl shadow-sm gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                MockAgent
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 font-bold">
                  v1.5
                </span>
              </h1>
              <p className="text-xs text-slate-500">Robust technical and HR evaluation system powered by Gemini 3.5 AI Core</p>
            </div>
          </div>

          {step === "interview" && session && (
            <div className="flex items-center justify-between sm:justify-end gap-4 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="font-mono text-slate-800 font-bold text-sm">{formatTime(elapsedTime)}</span>
              </div>
              <div className="h-4 w-[1px] bg-slate-300" />
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-1 rounded-lg hover:bg-slate-200 transition-colors ${isMuted ? 'text-slate-400' : 'text-emerald-600'}`}
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          )}
        </header>

        {/* Content Body based on step */}
        <div className="flex-1 flex flex-col justify-center">
          {/* STEP 1: CONFIGURATION / SETUP */}
          {step === "setup" && (
            <motion.div 
              id="setup-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
            >
              {/* Left Column - Intro Hero */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold mb-6">
                    <Award className="w-3.5 h-3.5" /> Career Prep Simulator
                  </div>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
                    Refine your skills with expert AI interviewers.
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Configure your targeted position, skills, and choose an interview style. Our specialized AI personas will evaluate your responses, giving actionable scores, strengths, and perfect model answers.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg mt-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Dynamic AI Persona Adaptation</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Choose from compassionate HR coaches to strict engineering directors.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg mt-0.5">
                        <Check className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Integrated Speech Utilities</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Type or dictate answers naturally using Web Speech synthesis and recognition.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preset Roles Picker */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h4 className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold mb-3">
                    Fast Configuration Presets
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectPreset(p)}
                        className="text-left p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-xs"
                      >
                        <div className="font-bold text-slate-800 truncate">{p.title}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.role}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Setup Fields Form */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                <div className="space-y-6">
                  <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                    <Layers className="w-5 h-5 text-indigo-600" /> Interview Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Role Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Target Job Title</label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                          placeholder="e.g. Python Developer"
                        />
                      </div>
                    </div>

                    {/* Experience Level */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Experience Level</label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="Junior">Junior (0-2 years)</option>
                        <option value="Mid">Mid Level (2-5 years)</option>
                        <option value="Senior">Senior (5-8 years)</option>
                        <option value="Lead / Architect">Lead & Director (8+ years)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Interview Category */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Interview Type</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setInterviewType("technical")}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${interviewType === "technical" ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Technical Test
                        </button>
                        <button
                          type="button"
                          onClick={() => setInterviewType("behavioral")}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${interviewType === "behavioral" ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          HR / Behavioral
                        </button>
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Difficulty</label>
                      <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setDifficulty(diff)}
                            className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${difficulty === diff ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Skills Tag input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Focus Skills / Technologies</label>
                    <input
                      type="text"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="e.g. Python, Flask, SQL, REST APIs (comma separated)"
                    />
                    <p className="text-[10px] text-slate-400 mt-1.5">Provide key tech stacks or core competencies to direct the AI's questioning profile.</p>
                  </div>

                  {/* Interviewer Persona Picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-3">Choose Your AI Interviewer</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(Object.keys(INTERVIEWERS) as InterviewerPersona[]).map((key) => {
                        const inter = INTERVIEWERS[key];
                        const isSelected = selectedPersona === key;
                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedPersona(key)}
                            className={`cursor-pointer rounded-2xl p-4 border transition-all text-left flex flex-col justify-between ${isSelected ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={inter.avatarUrl}
                                alt={inter.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 leading-none">{inter.name}</h4>
                                <span className="text-[10px] text-indigo-600 font-semibold mt-1 block">{inter.role}</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-3 line-clamp-3 leading-relaxed">
                              {inter.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={handleStartInterview}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-100 active:scale-98 transition-all"
                  >
                    Initiate Interview Session
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: LOADING - QUESTION GENERATION */}
          {step === "loading" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md mx-auto text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm"
            >
              <div className="relative inline-flex items-center justify-center mb-8">
                <div className="absolute w-24 h-24 rounded-full bg-indigo-500/10 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shadow-md">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              </div>
              
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">Assembling Questions...</h3>
              <p className="text-slate-500 text-xs mb-8">
                Our Gemini AI recruiter is formulating structured questions tailor-made for {role}.
              </p>

              {/* Tip Carousel Banner */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 min-h-[70px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={tipIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs text-indigo-800 font-semibold italic leading-relaxed"
                  >
                    {ROTATING_TIPS[tipIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STEP 3: THE ACTIVE INTERVIEW STUDIO */}
          {step === "interview" && session && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
            >
              {/* Left Column: Interviewer Panel */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                <div>
                  {/* Interviewer header card */}
                  <div className={`p-4 rounded-2xl bg-gradient-to-r ${getInterviewerHeaderColor(session.persona)} border mb-6 flex items-center gap-4 shadow-sm`}>
                    <img
                      src={INTERVIEWERS[session.persona].avatarUrl}
                      alt={INTERVIEWERS[session.persona].name}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-[9px] uppercase font-mono tracking-widest text-slate-500 font-bold">Interviewer Agent</div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{INTERVIEWERS[session.persona].name}</h3>
                      <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{INTERVIEWERS[session.persona].role}</p>
                    </div>
                  </div>

                  {/* Interview Metadata stats */}
                  <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center text-[11px] border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-semibold">Target Role</span>
                      <span className="text-slate-800 font-bold text-right truncate max-w-[150px]">{session.role}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-semibold">Level & Type</span>
                      <span className="text-slate-800 font-bold capitalize">{session.experienceLevel} • {session.type}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-semibold">Difficulty</span>
                      <span className="text-indigo-600 font-extrabold uppercase tracking-wider">{session.difficulty}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 font-medium leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                    "{INTERVIEWERS[session.persona].tone}"
                  </div>
                </div>

                {/* Micro-interaction Helpers */}
                <div className="space-y-3 mt-6 pt-6 border-t border-slate-200">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs transition-all text-slate-700 hover:text-slate-900"
                  >
                    <span className="flex items-center gap-2 font-bold">
                      <Lightbulb className={`w-4 h-4 ${showHint ? 'text-amber-500' : 'text-slate-400'}`} />
                      {showHint ? "Conceal Suggestive Hint" : "Reveal Suggestive Hint"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={handleGetClarification}
                    disabled={isClarifying}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs transition-all text-slate-700 hover:text-slate-900 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2 font-bold">
                      {isClarifying ? (
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-slate-400" />
                      )}
                      Ask for Clarification
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Right Column: Active Terminal & Dialogue Workspace */}
              <div className="lg:col-span-8 flex flex-col justify-between">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm flex-1 flex flex-col justify-between">
                  {/* Current Progress Gauge */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-4">
                      <span className="font-mono uppercase tracking-widest text-[9px] font-bold">Active Interview Progress</span>
                      <span className="font-semibold">Question <strong className="text-slate-900 font-extrabold">{session.currentQuestionIndex + 1}</strong> of {session.questions.length}</span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden border border-slate-200">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${((session.currentQuestionIndex) / session.questions.length) * 100}%` }}
                      />
                    </div>

                    {/* Active Interviewer Simulated Screen Layout */}
                    <div className="bg-slate-900 rounded-3xl overflow-hidden relative border-4 border-white shadow-xl h-80 mb-6 flex flex-col justify-between">
                      {/* AI Avatar animated circle inside */}
                      <div className="absolute inset-0 flex items-center justify-center flex-col text-white z-10">
                        <div className="w-32 h-32 bg-indigo-500/10 rounded-full flex items-center justify-center pulse-listening border border-indigo-400/30 mb-4">
                          <div className="w-24 h-24 bg-indigo-500/30 rounded-full flex items-center justify-center border border-indigo-400/50">
                            <img
                              src={INTERVIEWERS[session.persona].avatarUrl}
                              alt={INTERVIEWERS[session.persona].name}
                              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-400 shadow-lg"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                        <h2 className="text-base font-bold text-white leading-none">{INTERVIEWERS[session.persona].name}</h2>
                        <p className="text-indigo-300 text-[11px] font-semibold opacity-90 mt-1">{INTERVIEWERS[session.persona].role}</p>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 z-20">
                        <div className="bg-slate-950/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
                          <p className="text-slate-100 text-sm font-medium leading-relaxed">
                            "{session.questions[session.currentQuestionIndex]?.questionText}"
                          </p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              onClick={() => speakText(session.questions[session.currentQuestionIndex]?.questionText)}
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 px-2 py-1 rounded border border-indigo-500/20"
                            >
                              <Play className="w-3 h-3" /> Replay Question Aloud
                            </button>
                            {!isMuted && (
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1 font-semibold animate-pulse">
                                ● Audio Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Camera Placeholder and Advice blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                      {/* Simulated webcam placeholder */}
                      <div className="md:col-span-4 bg-slate-200 rounded-2xl overflow-hidden relative border border-slate-200 shadow-sm h-32 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <div className="absolute top-2 right-2 bg-slate-900/60 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider">
                          {isListening ? "🟢 Voice: Dictating" : "🔴 Voice: Muted"}
                        </div>
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-300/50 mb-1 ${isListening ? 'pulse-listening text-indigo-600 bg-indigo-50' : ''}`}>
                            <User className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">User Camera</span>
                        </div>
                      </div>

                      {/* Answer guidelines or state prompt */}
                      <div className="md:col-span-8 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 flex flex-col justify-between">
                        <div className="flex items-start gap-2.5 text-xs text-indigo-900">
                          <Lightbulb className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-bold">Answering Strategy:</span> Respond clearly and frame your answers using structured methodology. Click the mic icon below to speak or dictate.
                          </div>
                        </div>
                        {showHint && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2 flex gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Guiding Hint:</strong> {session.questions[session.currentQuestionIndex]?.hint}</span>
                          </div>
                        )}
                        {clarification && (
                          <div className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 mt-2 flex gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Clarification:</strong> "{clarification}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Input workspace with Sleek Interface dark code block terminal */}
                  <div className="bg-[#1E293B] rounded-3xl border border-slate-800 p-6 flex flex-col shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-sm shadow-rose-500/30"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-sm shadow-amber-500/30"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-sm shadow-emerald-500/30"></div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Candidate Response Workspace</span>
                    </div>

                    <div className="relative">
                      <textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        className="w-full bg-[#0F172A] border border-slate-800 rounded-xl p-4 pr-14 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/80 min-h-[140px] leading-relaxed resize-none font-mono"
                        placeholder="Type or dictate your structured response here..."
                      />

                      {/* Floating Mic Button */}
                      <button
                        onClick={toggleSpeechToText}
                        className={`absolute right-4 bottom-4 p-2.5 rounded-xl shadow-lg transition-all ${isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-700'}`}
                        title={isListening ? "Stop Recording Voice" : "Start Voice Dictation"}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-4">
                      <div className="text-[10px] text-slate-400 font-mono">
                        Word Count: <span className="text-white font-bold">{currentAnswer.trim().split(/\s+/).filter(Boolean).length} words</span>
                      </div>

                      <button
                        onClick={handleSubmitAnswer}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg active:scale-98 transition-all"
                      >
                        {session.currentQuestionIndex === session.questions.length - 1 ? "Complete & Submit Interview" : "Submit Answer & Continue"}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: GRADING EVALUATION SCREEN */}
          {step === "grading" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md mx-auto text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm"
            >
              <div className="relative inline-flex items-center justify-center mb-8">
                <div className="absolute w-24 h-24 rounded-full bg-indigo-500/10 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shadow-md">
                  <Award className="w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
              </div>
              
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">Analyzing Dialogue Dynamics...</h3>
              <p className="text-slate-500 text-xs mb-8">
                Your AI interviewer is evaluating correctness, technical depth, communication, and framing of each response.
              </p>

              {/* Tip Carousel Banner */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 min-h-[70px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={tipIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs text-indigo-800 font-semibold italic leading-relaxed"
                  >
                    {ROTATING_TIPS[tipIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STEP 5: ASSESSMENTS / RESULTS */}
          {step === "results" && evaluation && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header Overview card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  
                  {/* Gauge */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
                    <div className="relative w-36 h-36 rounded-full flex items-center justify-center border-4 border-slate-100 shadow-md bg-slate-50">
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 border-r-indigo-600 animate-pulse" />
                      <div className="text-center">
                        <span className="text-4xl font-extrabold font-display text-slate-900">{evaluation.overallScore}</span>
                        <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider mt-1">Percent Score</span>
                      </div>
                    </div>
                    <div className={`mt-4 px-3 py-1 border rounded-lg text-xs font-bold capitalize ${getScoreColor(evaluation.overallScore)}`}>
                      {evaluation.overallScore >= 85 ? "Distinguished Candidate" : evaluation.overallScore >= 70 ? "Proficient Candidate" : "Needs Practice"}
                    </div>
                  </div>

                  {/* Persona Feedback Speech */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="flex items-center gap-3">
                      {session && (
                        <img
                          src={INTERVIEWERS[session.persona as InterviewerPersona].avatarUrl}
                          alt={INTERVIEWERS[session.persona as InterviewerPersona].name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div>
                        {session && (
                          <h4 className="text-sm font-bold text-slate-900">
                            Assessment by {INTERVIEWERS[session.persona as InterviewerPersona].name}
                          </h4>
                        )}
                        <span className="text-[10px] text-indigo-600 font-bold mt-0.5 block font-mono uppercase tracking-wider">Interviewer Summary</span>
                      </div>
                    </div>

                    <p className="text-slate-700 text-sm italic leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      "{evaluation.personaFeedback}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-0.5">
                {[
                  { id: "summary", label: "Executive Summary", icon: FileText },
                  { id: "skills", label: "Skills Scorecard", icon: TrendingUp },
                  { id: "questions", label: "Deep Question Review", icon: BookOpen },
                  { id: "badge", label: "Assessment Badge", icon: Award }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = resultsTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setResultsTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 -mb-0.5 ${isSelected ? 'border-indigo-600 text-indigo-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Panels */}
              <div className="min-h-[300px]">
                {/* TAB 1: EXECUTIVE SUMMARY */}
                {resultsTab === "summary" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    {/* Strengths */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                        <ThumbsUp className="w-4 h-4 text-emerald-600" /> Key Strengths Demonstrated
                      </h4>
                      <ul className="space-y-3">
                        {evaluation.strengths.map((str, idx) => (
                          <li key={idx} className="flex gap-3 text-xs text-slate-700 leading-relaxed bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="flex-1 font-medium">{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                        <TrendingUp className="w-4 h-4 text-indigo-600" /> Actionable Suggestions for Growth
                      </h4>
                      <ul className="space-y-3">
                        {evaluation.improvements.map((imp, idx) => (
                          <li key={idx} className="flex gap-3 text-xs text-slate-700 leading-relaxed bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="flex-1 font-medium">{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: SKILLS SCORECARD */}
                {resultsTab === "skills" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
                  >
                    <h3 className="font-display text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
                      Target Skill Dimensions Analysis
                    </h3>

                    <div className="space-y-6">
                      {evaluation.skillsBreakdown.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                          <div className="flex justify-between items-center text-xs mb-2.5">
                            <span className="font-bold text-slate-900 text-sm">{item.skill}</span>
                            <span className={`font-mono font-bold px-2.5 py-0.5 rounded border ${getScoreColor(item.score)}`}>
                              {item.score}/100
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3 border border-slate-300">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${getScoreBarColor(item.score)}`}
                              style={{ width: `${item.score}%` }}
                            />
                          </div>

                          <p className="text-slate-600 text-xs leading-relaxed font-medium">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: DEEP QUESTION REVIEW */}
                {resultsTab === "questions" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {evaluation.questionsReview.map((rev, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-200 pb-3 gap-4">
                          <h4 className="text-slate-900 text-sm font-bold flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-200 font-mono text-[10px] text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                              0{idx + 1}
                            </span>
                            <span>{rev.question}</span>
                          </h4>
                          <span className={`font-mono text-xs font-bold px-2.5 py-0.5 border rounded flex-shrink-0 ${getScoreColor(rev.score)}`}>
                            {rev.score} Pts
                          </span>
                        </div>

                        {/* Answers breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* User answer */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                            <div>
                              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2 font-bold">Your Submitted Answer</div>
                              <p className="text-xs text-slate-700 leading-relaxed italic font-medium">
                                "{rev.answer}"
                              </p>
                            </div>
                            <div className="text-[10px] uppercase font-mono text-indigo-700 border-t border-slate-200 pt-3 mt-3 font-bold">
                              Feedback: <span className="text-slate-600 capitalize font-sans font-medium">{rev.feedback}</span>
                            </div>
                          </div>

                          {/* Model answer */}
                          <div className="bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl flex flex-col justify-between">
                            <div>
                              <div className="text-[10px] uppercase font-mono tracking-wider text-indigo-700 mb-2 font-bold">Exemplar Perfect Answer</div>
                              <p className="text-xs text-slate-800 leading-relaxed font-sans font-medium">
                                {rev.modelAnswer}
                              </p>
                            </div>
                            <div className="text-[10px] uppercase font-mono text-slate-500 border-t border-indigo-100/30 pt-3 mt-3 font-bold">
                              Recommended response strategy
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* TAB 4: PERFORMANCE BADGE CERTIFICATE */}
                {resultsTab === "badge" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-xl mx-auto bg-white border-2 border-indigo-100 rounded-3xl p-8 text-center relative overflow-hidden shadow-xl"
                  >
                    {/* Badge aesthetic patterns */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-[50px] pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-purple-500/5 blur-[50px] pointer-events-none" />

                    <div className="inline-flex items-center justify-center mb-6">
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-200 animate-spin" style={{ animationDuration: "12s" }} />
                        <div className="absolute inset-2 rounded-full border border-dashed border-indigo-300" />
                        <div className="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shadow-inner">
                          <Award className="w-10 h-10 text-indigo-600" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 uppercase">
                        Certificate of Mock Assessment
                      </h3>
                      <p className="text-slate-500 text-xs tracking-wider uppercase font-mono font-bold">
                        This document verifies completion of the career simulator
                      </p>

                      <div className="h-[1px] w-1/3 bg-slate-200 mx-auto my-4" />

                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-400 uppercase block font-mono font-bold">Candidate Goal Profile</span>
                        <h4 className="text-lg font-bold text-slate-800">{role}</h4>
                        <span className="text-xs text-indigo-600 font-bold capitalize">{experienceLevel} Professional Assessment</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-6 text-left">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="text-[9px] text-slate-500 block uppercase font-mono font-bold">Overall Score</span>
                          <span className="text-sm font-extrabold text-slate-900 font-mono">{evaluation.overallScore} / 100</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="text-[9px] text-slate-500 block uppercase font-mono font-bold">Interviewer Persona</span>
                          <span className="text-xs font-bold text-slate-800 block truncate">{session ? INTERVIEWERS[session.persona as InterviewerPersona].name : "Recruiter Agent"}</span>
                        </div>
                      </div>

                      <div className="pt-8">
                        <p className="text-[11px] text-slate-500 italic font-medium">
                          "Success is the sum of small efforts, repeated day in and day out."
                        </p>
                      </div>

                      <div className="pt-6 flex justify-center gap-3">
                        <button
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                        >
                          <Printer className="w-4 h-4" /> Print Certificate
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Action Button Footer */}
              <div className="pt-6 flex justify-center border-t border-slate-200 mt-8">
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 active:scale-98 transition-all uppercase tracking-wider"
                >
                  <RotateCcw className="w-4 h-4" /> Start New Interview Session
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Global Footer */}
        <footer className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-8 pb-4 mt-12">
          <p>© 2026 Mock Interview Agent • Deep Assessment Simulator powered by Gemini 3.5 AI Core.</p>
          <p className="mt-1">Designed for robust interactive technical & behavioral career preparation.</p>
        </footer>
      </main>
    </div>
  );
}
