import React, { useState, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import subjectsData from './data/offline_questions.json';
import { 
  Home, Target, PlayCircle, FileText, Calendar, 
  Settings, Bell, ArrowRight, ArrowLeft,
  CheckCircle2, XCircle, Calculator as CalcIcon, RefreshCw, X, Lightbulb, BellRing, ChevronRight, Moon, BookOpen, Clock, LogOut, Bookmark, Check, Eye
} from 'lucide-react';
import Calculator from './Calculator';
import './Calculator.css';

function App() {
  const [user, setUser] = useState(null);
  const [loginName, setLoginName] = useState('');
  
  const [currentTab, setCurrentTab] = useState('home'); // home, practice, mock, subjects, settings, plan
  const [gameState, setGameState] = useState('dashboard'); // dashboard, testing, feedback, results, review
  
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { index: selectedOptionIndex }
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // Active Session Persistence & Modals
  const [activeSession, setActiveSession] = useState(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  
  // Settings & Custom Question Count
  const [examMode, setExamMode] = useState('practice'); 
  const [questionsPerSubject, setQuestionsPerSubject] = useState(20);
  const [customInputVal, setCustomInputVal] = useState('20');
  const [showCalculator, setShowCalculator] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({});
  const [flagged, setFlagged] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('all'); // all, wrong, correct

  // Keep a ref to latest state for background/leave event listeners
  const sessionRef = useRef({
    gameState,
    examMode,
    selectedSubjects,
    currentQuestions,
    currentQuestionIndex,
    answers,
    timeLeft,
    totalTime
  });

  useEffect(() => {
    sessionRef.current = {
      gameState,
      examMode,
      selectedSubjects,
      currentQuestions,
      currentQuestionIndex,
      answers,
      timeLeft,
      totalTime
    };
  }, [gameState, examMode, selectedSubjects, currentQuestions, currentQuestionIndex, answers, timeLeft, totalTime]);

  // Initialize Data & Check for Active Session
  useEffect(() => {
    const savedUser = localStorage.getItem('jamb_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const savedStats = localStorage.getItem('jamb_stats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    } else {
      const initStats = {};
      Object.keys(subjectsData).forEach(sub => {
        initStats[sub] = { answered: 0, correct: 0, total: subjectsData[sub].questions.length };
      });
      setStats(initStats);
      localStorage.setItem('jamb_stats', JSON.stringify(initStats));
    }

    const savedFlagged = localStorage.getItem('jamb_flagged');
    if (savedFlagged) setFlagged(JSON.parse(savedFlagged));

    const savedCount = localStorage.getItem('jamb_q_count');
    if (savedCount) {
      const parsed = parseInt(savedCount, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setQuestionsPerSubject(parsed);
        setCustomInputVal(String(parsed));
      }
    }

    // Check for ongoing active session
    const savedActiveSession = localStorage.getItem('jamb_active_session');
    if (savedActiveSession) {
      try {
        const session = JSON.parse(savedActiveSession);
        if (session && session.currentQuestions && session.currentQuestions.length > 0) {
          setActiveSession(session);
          setShowResumePrompt(true);
        }
      } catch (e) {
        console.error("Failed to parse saved active session", e);
      }
    }
  }, []);

  // Save active session to localStorage helper
  const saveSessionNow = (overrides = {}) => {
    const snap = { ...sessionRef.current, ...overrides };
    if ((snap.gameState === 'testing' || snap.gameState === 'feedback') && snap.currentQuestions?.length > 0) {
      const sessionData = {
        examMode: snap.examMode,
        selectedSubjects: snap.selectedSubjects,
        currentQuestions: snap.currentQuestions,
        currentQuestionIndex: snap.currentQuestionIndex,
        answers: snap.answers,
        timeLeft: snap.timeLeft,
        totalTime: snap.totalTime,
        gameState: snap.gameState,
        savedAt: Date.now()
      };
      localStorage.setItem('jamb_active_session', JSON.stringify(sessionData));
      setActiveSession(sessionData);
    }
  };

  // Handle App Minimizing / Backgrounding / Leaving app
  useEffect(() => {
    const handleSaveOnLeave = () => {
      const snap = sessionRef.current;
      if (snap && (snap.gameState === 'testing' || snap.gameState === 'feedback') && snap.currentQuestions?.length > 0) {
        const sessionData = {
          examMode: snap.examMode,
          selectedSubjects: snap.selectedSubjects,
          currentQuestions: snap.currentQuestions,
          currentQuestionIndex: snap.currentQuestionIndex,
          answers: snap.answers,
          timeLeft: snap.timeLeft,
          totalTime: snap.totalTime,
          gameState: snap.gameState,
          savedAt: Date.now()
        };
        localStorage.setItem('jamb_active_session', JSON.stringify(sessionData));
        setActiveSession(sessionData);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSaveOnLeave();
      }
    };

    let appStateListener = null;
    try {
      appStateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          handleSaveOnLeave();
        }
      });
    } catch (e) {}

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleSaveOnLeave);
    window.addEventListener('beforeunload', handleSaveOnLeave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleSaveOnLeave);
      window.removeEventListener('beforeunload', handleSaveOnLeave);
      if (appStateListener && typeof appStateListener.then === 'function') {
        appStateListener.then(l => l && l.remove && l.remove()).catch(() => {});
      }
    };
  }, []);

  // Handle Android Hardware Back Button via @capacitor/app
  useEffect(() => {
    let listenerPromise = null;
    try {
      listenerPromise = CapApp.addListener('backButton', () => {
        if (showPauseModal) {
          setShowPauseModal(false);
        } else if (showResumePrompt) {
          setShowResumePrompt(false);
        } else if (showCalculator) {
          setShowCalculator(false);
        } else if (showNotifications) {
          setShowNotifications(false);
        } else if (gameState === 'feedback') {
          setGameState('testing');
        } else if (gameState === 'testing') {
          setShowPauseModal(true);
        } else if (gameState === 'review') {
          setGameState('results');
        } else if (gameState === 'results') {
          setGameState('dashboard');
          setCurrentTab('home');
        } else if (currentTab !== 'home') {
          setCurrentTab('home');
        } else {
          try {
            CapApp.exitApp();
          } catch (e) {}
        }
      });
    } catch (e) {
      console.warn("Capacitor App plugin listener failed:", e);
    }

    return () => {
      if (listenerPromise && typeof listenerPromise.then === 'function') {
        listenerPromise.then(l => l && l.remove && l.remove()).catch(() => {});
      }
    };
  }, [showPauseModal, showResumePrompt, showCalculator, showNotifications, gameState, currentTab]);

  // Timer with periodic progress save
  useEffect(() => {
    let timer;
    if (gameState === 'testing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishExam();
            return 0;
          }
          const nextTime = prev - 1;
          if (nextTime % 5 === 0) {
            try {
              const currentRaw = localStorage.getItem('jamb_active_session');
              if (currentRaw) {
                const parsed = JSON.parse(currentRaw);
                parsed.timeLeft = nextTime;
                localStorage.setItem('jamb_active_session', JSON.stringify(parsed));
              }
            } catch (e) {}
          }
          return nextTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleLogin = () => {
    if (loginName.trim().length < 2) return;
    const newUser = {
      name: loginName.trim(),
      avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(loginName)}&backgroundColor=10B981,8B5CF6,3B82F6`
    };
    setUser(newUser);
    localStorage.setItem('jamb_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    if(window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem('jamb_user');
      setUser(null);
      setLoginName('');
    }
  };

  const setQuestionCount = (count) => {
    const valid = Math.max(1, Math.min(100, count));
    setQuestionsPerSubject(valid);
    setCustomInputVal(String(valid));
    localStorage.setItem('jamb_q_count', String(valid));
  };

  const toggleSubject = (subjectKey) => {
    if (selectedSubjects.includes(subjectKey)) {
      setSelectedSubjects(prev => prev.filter(s => s !== subjectKey));
    } else {
      if (selectedSubjects.length < 4) {
        setSelectedSubjects(prev => [...prev, subjectKey]);
      }
    }
  };

  const toggleFlag = (q) => {
    let newFlagged;
    if (flagged.find(f => f.text === q.text)) {
      newFlagged = flagged.filter(f => f.text !== q.text);
    } else {
      newFlagged = [...flagged, q];
    }
    setFlagged(newFlagged);
    localStorage.setItem('jamb_flagged', JSON.stringify(newFlagged));
  };

  const playSound = (isCorrect) => {
    if(!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (isCorrect) {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      }
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
  };

  const handleResumeSession = (sessionToResume) => {
    const session = sessionToResume || activeSession;
    if (!session || !session.currentQuestions || session.currentQuestions.length === 0) return;
    
    setSelectedSubjects(session.selectedSubjects || []);
    setCurrentQuestions(session.currentQuestions);
    setCurrentQuestionIndex(session.currentQuestionIndex || 0);
    setAnswers(session.answers || {});
    setTimeLeft(session.timeLeft !== undefined ? session.timeLeft : session.currentQuestions.length * 45);
    setTotalTime(session.totalTime || session.currentQuestions.length * 45);
    setExamMode(session.examMode || 'practice');
    setGameState('testing');
    setShowPauseModal(false);
    setShowResumePrompt(false);
  };

  const handleDiscardSession = () => {
    if (window.confirm("Discard this in-progress practice session? All unsaved progress will be cleared.")) {
      localStorage.removeItem('jamb_active_session');
      setActiveSession(null);
      setShowPauseModal(false);
      setShowResumePrompt(false);
      setGameState('dashboard');
      setCurrentQuestions([]);
      setAnswers({});
    }
  };

  const startExam = (modeOverride) => {
    if (selectedSubjects.length === 0) return;
    const modeToUse = modeOverride || examMode;
    setExamMode(modeToUse);
    
    let combined = [];
    selectedSubjects.forEach(sub => {
      let qs = subjectsData[sub].questions.filter(q => q.options && q.options.length >= 2);
      qs = [...qs].sort(() => 0.5 - Math.random());
      
      let limit = questionsPerSubject;
      if (modeToUse === 'exam' && questionsPerSubject === 40 && sub.toLowerCase() === 'english') {
        limit = 60;
      }
      
      qs = qs.slice(0, limit).map(q => ({
        ...q,
        subjectKey: sub,
        subject: subjectsData[sub].name
      }));
      combined = [...combined, ...qs];
    });
    
    const duration = combined.length * 45; // 45 secs per question
    const sessionData = {
      examMode: modeToUse,
      selectedSubjects,
      currentQuestions: combined,
      currentQuestionIndex: 0,
      answers: {},
      timeLeft: duration,
      totalTime: duration,
      gameState: 'testing',
      savedAt: Date.now()
    };
    
    setCurrentQuestions(combined);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTimeLeft(duration); 
    setTotalTime(duration);
    setGameState('testing');
    setShowCalculator(false);
    setShowPauseModal(false);
    setShowResumePrompt(false);
    setActiveSession(sessionData);
    localStorage.setItem('jamb_active_session', JSON.stringify(sessionData));
  };

  const startBookmarksPractice = () => {
    if (flagged.length === 0) return;
    setExamMode('practice');
    const combined = [...flagged].sort(() => 0.5 - Math.random());
    const duration = combined.length * 60;
    const sessionData = {
      examMode: 'practice',
      selectedSubjects: ['Bookmarks'],
      currentQuestions: combined,
      currentQuestionIndex: 0,
      answers: {},
      timeLeft: duration,
      totalTime: duration,
      gameState: 'testing',
      savedAt: Date.now()
    };

    setCurrentQuestions(combined);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTimeLeft(duration); 
    setTotalTime(duration);
    setGameState('testing');
    setShowCalculator(false);
    setShowPauseModal(false);
    setShowResumePrompt(false);
    setActiveSession(sessionData);
    localStorage.setItem('jamb_active_session', JSON.stringify(sessionData));
  };

  const finishExam = () => {
    localStorage.removeItem('jamb_active_session');
    setActiveSession(null);
    setShowPauseModal(false);
    setShowResumePrompt(false);

    const newStats = { ...stats };
    currentQuestions.forEach((q, idx) => {
      if (answers[idx] !== undefined && q.subjectKey && newStats[q.subjectKey]) {
        newStats[q.subjectKey].answered = Math.min(newStats[q.subjectKey].answered + 1, newStats[q.subjectKey].total);
        if (answers[idx] === q.answer) {
          newStats[q.subjectKey].correct += 1;
        }
      }
    });
    setStats(newStats);
    localStorage.setItem('jamb_stats', JSON.stringify(newStats));
    setGameState('results');
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIndex) => {
    if (examMode === 'practice' && answers[currentQuestionIndex] !== undefined) return;

    const newAnswers = {
      ...answers,
      [currentQuestionIndex]: optionIndex
    };
    setAnswers(newAnswers);
    saveSessionNow({ answers: newAnswers });

    if (examMode === 'practice') {
      const q = currentQuestions[currentQuestionIndex];
      playSound(optionIndex === q.answer);
      setTimeout(() => {
        setGameState('feedback');
        saveSessionNow({ answers: newAnswers, gameState: 'feedback' });
      }, 300);
    }
  };

  const calculateScore = () => {
    let score = 0;
    currentQuestions.forEach((q, idx) => {
      if (answers[idx] === q.answer) score++;
    });
    return score;
  };

  // VIEWS
  const renderLogin = () => (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', padding:'2rem', textAlign:'center'}}>
       <div style={{background:'var(--bg-card)', padding:'2.5rem 2rem', borderRadius:'24px', width:'100%', maxWidth:'400px', border:'1px solid var(--border)', boxShadow:'0 10px 40px rgba(0,0,0,0.5)'}}>
         <div style={{width:'80px', height:'80px', background:'var(--primary)', borderRadius:'20px', margin:'0 auto 1.5rem', display:'flex', alignItems:'center', justifyContent:'center'}}>
           <BookOpen size={40} color="var(--bg-main)" />
         </div>
         <h1 style={{color:'var(--text-main)', marginBottom:'0.5rem', fontSize:'1.5rem'}}>TAIRED JAMB CBT <br/><span style={{fontSize:'1.1rem', color:'var(--primary)'}}>2026/2027</span></h1>
         <p style={{color:'var(--text-muted)', marginBottom:'2rem', fontSize:'0.9rem'}}>Enter your name to start practicing offline.</p>
         <input 
           type="text" 
           placeholder="Your Name (e.g. Joshua)" 
           value={loginName}
           onChange={e => setLoginName(e.target.value)}
           style={{width:'100%', padding:'1.1rem', borderRadius:'12px', border:'1px solid var(--border)', background:'var(--bg-main)', color:'var(--text-main)', marginBottom:'1.5rem', fontSize:'1rem', outline:'none'}}
         />
         <button 
            className="btn-full btn-primary-full" 
            onClick={handleLogin}
            style={{opacity: loginName.length > 1 ? 1 : 0.5, transition: 'all 0.3s'}}
            disabled={loginName.length < 2}
         >
            Start Learning <ArrowRight size={18} style={{display:'inline', verticalAlign:'middle', marginLeft:'0.5rem'}}/>
         </button>
       </div>
    </div>
  );

  const renderDashboard = () => (
    <>
      <div className="dashboard-header">
        <div className="user-info">
          <div className="avatar" style={{border:'2px solid var(--primary)', padding:'2px', background:'var(--bg-main)'}}>
            <img src={user.avatar} alt="avatar" style={{width:'100%', height:'100%', borderRadius:'50%'}} />
          </div>
          <div className="welcome-text">
            <p>Welcome back,</p>
            <h1>{user.name} <span style={{fontSize:'1.2rem'}}>🎓</span></h1>
          </div>
        </div>
        <div className="header-actions">
          <div className="icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} />
            <div className="notification-dot"></div>
          </div>
        </div>
      </div>

      {showNotifications && (
        <div style={{position:'absolute', top:'70px', right:'1.5rem', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1rem', zIndex:100, width:'260px', boxShadow:'0 10px 30px rgba(0,0,0,0.5)', animation:'fadeIn 0.2s ease-out'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
             <h4 style={{fontWeight:700}}>Notifications</h4>
             <X size={16} color="var(--text-muted)" onClick={()=>setShowNotifications(false)} style={{cursor:'pointer'}}/>
          </div>
          <div style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'0.75rem', borderBottom:'1px solid var(--border)', paddingBottom:'0.75rem'}}>
             <strong style={{color:'var(--primary)', display:'block'}}>Welcome {user.name}!</strong>
             Choose your custom question count and start practicing.
          </div>
          <div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>
             <strong style={{color:'var(--color-purple)', display:'block'}}>Detailed Explanations</strong>
             You can now review step-by-step calculations after every exam!
          </div>
        </div>
      )}

      {/* Resume In-Progress Practice Card */}
      {activeSession && activeSession.currentQuestions && activeSession.currentQuestions.length > 0 && (
        <div className="resume-card">
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <span className="pulse-indicator"></span>
              <span style={{fontSize:'0.75rem', fontWeight:700, color:'var(--primary)', letterSpacing:'0.5px', textTransform:'uppercase'}}>
                Active Session In Progress
              </span>
            </div>
            <span style={{fontSize:'0.75rem', color:'var(--text-muted)', background:'rgba(255,255,255,0.06)', padding:'0.2rem 0.5rem', borderRadius:'6px'}}>
              {activeSession.examMode === 'practice' ? 'Practice' : 'Mock Exam'}
            </span>
          </div>

          <h3 style={{fontSize:'1.15rem', fontWeight:700, marginBottom:'0.35rem', color:'var(--text-main)'}}>
            {activeSession.selectedSubjects && activeSession.selectedSubjects.length > 0 
              ? activeSession.selectedSubjects.map(s => subjectsData[s]?.name || s).join(', ')
              : 'JAMB Practice Session'}
          </h3>

          <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'0.5rem'}}>
            <span>Question {(activeSession.currentQuestionIndex || 0) + 1} of {activeSession.currentQuestions.length}</span>
            <span style={{color:'var(--primary)', fontWeight:600}}>{Object.keys(activeSession.answers || {}).length} answered</span>
          </div>

          <div className="progress-bar-container" style={{marginBottom:'1rem', height:'6px'}}>
            <div 
              className="progress-bar-fill" 
              style={{width: `${Math.round(((Object.keys(activeSession.answers || {}).length) / Math.max(1, activeSession.currentQuestions.length)) * 100)}%`}}
            ></div>
          </div>

          <div style={{display:'flex', gap:'0.75rem'}}>
            <button 
              className="btn-full btn-primary-full" 
              style={{padding:'0.85rem 1rem', fontSize:'0.92rem', flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem'}}
              onClick={() => handleResumeSession()}
            >
              <PlayCircle size={18} /> Resume Practice
            </button>
            <button 
              style={{padding:'0.85rem 1rem', fontSize:'0.85rem', background:'rgba(239, 68, 68, 0.12)', color:'var(--color-red)', border:'1px solid rgba(239, 68, 68, 0.3)', borderRadius:'12px', cursor:'pointer', fontWeight:600}}
              onClick={handleDiscardSession}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="goal-card">
        <div className="goal-header">
          <div className="goal-icon">
            <Target size={24} />
          </div>
          <div className="goal-text">
            <h3>Your Goal</h3>
            <h2>Score 250+ in JAMB</h2>
          </div>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill"></div>
        </div>
        <div className="progress-labels">
          <span className="active">Target: 250+ / 400</span>
          <span>Offline Database Ready</span>
        </div>
      </div>

      {/* Quick Question Count Selector on Dashboard */}
      <div style={{padding:'0 1.5rem', marginBottom:'1.5rem'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.25rem'}}>
          <span style={{fontSize:'0.85rem', fontWeight:600, color:'var(--text-main)'}}>Questions Per Subject</span>
          <span style={{fontSize:'0.85rem', color:'var(--primary)', fontWeight:700}}>{questionsPerSubject} Qs</span>
        </div>
        <div className="count-pills">
          {[5, 10, 15, 20, 40].map(cnt => (
            <button 
              key={cnt}
              className={`count-pill ${questionsPerSubject === cnt ? 'active' : ''}`}
              onClick={() => setQuestionCount(cnt)}
            >
              {cnt} Qs
            </button>
          ))}
          <button 
            className={`count-pill ${![5, 10, 15, 20, 40].includes(questionsPerSubject) ? 'active' : ''}`}
            onClick={() => {
              const val = prompt("Enter custom number of questions (1 - 100):", questionsPerSubject);
              if (val) {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed) && parsed > 0) setQuestionCount(parsed);
              }
            }}
          >
            Custom ✍️
          </button>
        </div>
      </div>

      <div className="actions-grid">
        <div className="action-card" onClick={() => { setExamMode('practice'); setCurrentTab('subjects'); }} style={{
          backgroundImage: `linear-gradient(to bottom, rgba(11,17,26,0.8), rgba(11,17,26,0.95)), url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80')`,
          backgroundSize: 'cover', backgroundPosition: 'center'
        }}>
          <div className="action-icon" style={{background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)'}}>
            <PlayCircle size={24} />
          </div>
          <div>
            <h3 style={{color:'var(--text-main)'}}>Start Practice</h3>
            <p>Instant answers and step-by-step calculations.</p>
          </div>
          <div className="action-arrow">
            <ArrowRight size={16} color="var(--primary)" />
          </div>
        </div>

        <div className="action-card" onClick={() => { setExamMode('exam'); setCurrentTab('subjects'); }} style={{
          backgroundImage: `linear-gradient(to bottom, rgba(11,17,26,0.8), rgba(11,17,26,0.95)), url('https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&q=80')`,
          backgroundSize: 'cover', backgroundPosition: 'center'
        }}>
          <div className="action-icon" style={{background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-purple)'}}>
            <FileText size={24} />
          </div>
          <div>
            <h3 style={{color:'var(--text-main)'}}>Take Mock Exam</h3>
            <p>Timed real exam simulator with post-exam review.</p>
          </div>
          <div className="action-arrow">
            <ArrowRight size={16} color="var(--color-purple)" />
          </div>
        </div>

        {flagged.length > 0 && (
          <div className="action-card" onClick={() => startBookmarksPractice()} style={{
            gridColumn: '1 / -1',
            backgroundImage: `linear-gradient(to right, rgba(11,17,26,0.9), rgba(11,17,26,0.98)), url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80')`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
              <div className="action-icon" style={{background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-orange)'}}>
                <Bookmark size={24} />
              </div>
              <div>
                <h3 style={{color:'var(--text-main)'}}>Review Bookmarks</h3>
                <p>You have {flagged.length} flagged questions to revise.</p>
              </div>
            </div>
            <div className="action-arrow">
              <ArrowRight size={16} color="var(--color-orange)" />
            </div>
          </div>
        )}
      </div>

      <div className="subjects-section">
        <div className="section-title">
          <span>Subject Progress</span>
          <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, cursor:'pointer'}} onClick={()=>setCurrentTab('plan')}>View Plan <ArrowRight size={14} style={{display:'inline', verticalAlign:'middle'}}/></span>
        </div>
        
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
           {Object.keys(stats).slice(0, 4).map((subKey, i) => {
              const stat = stats[subKey];
              const pct = stat.total > 0 ? Math.round((stat.answered / stat.total) * 100) : 0;
              const colors = ['var(--primary)', 'var(--color-blue)', 'var(--color-purple)', 'var(--color-orange)'];
              const icons = [<FileText size={18}/>, <CalcIcon size={18}/>, <Target size={18}/>, <Lightbulb size={18}/>];
              const color = colors[i % colors.length];
              
              return (
                <div key={subKey} style={{background:'var(--bg-card)', padding:'1rem', borderRadius:'16px', border:'1px solid var(--border)', transition:'transform 0.2s', cursor:'pointer'}} onClick={()=>{ setSelectedSubjects([subKey]); setCurrentTab('subjects'); }}>
                  <div style={{display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'1rem'}}>
                    <div style={{background:`rgba(255,255,255,0.05)`, padding:'0.5rem', borderRadius:'8px', color: color}}>
                      {icons[i % icons.length]}
                    </div>
                    <span style={{fontSize:'0.85rem', fontWeight:600}}>{subjectsData[subKey]?.name || subKey}</span>
                  </div>
                  <div style={{textAlign:'center', fontWeight:700, fontSize:'1.5rem', color: color}}>{pct}%</div>
                  <div style={{textAlign:'center', fontSize:'0.75rem', color:'var(--text-muted)'}}>{stat.answered} / {stat.total} Done</div>
                </div>
              );
           })}
        </div>
      </div>
    </>
  );

  const renderPlan = () => {
    const weakSubjects = Object.keys(stats).filter(s => stats[s].answered > 0 && (stats[s].correct / stats[s].answered) < 0.6);
    
    return (
      <div style={{padding:'1.5rem'}}>
         <h2 style={{fontSize:'1.5rem', fontWeight:700, marginBottom:'1.5rem'}}>Your Study Plan</h2>
         
         <div style={{background:'var(--bg-card)', padding:'1.5rem', borderRadius:'20px', border:'1px solid var(--border)', marginBottom:'2rem', position:'relative', overflow:'hidden'}}>
           <div style={{position:'absolute', right:'-20px', top:'-20px', opacity:0.1}}><Target size={120} color="var(--primary)"/></div>
           <h3 style={{color:'var(--primary)', marginBottom:'0.5rem'}}>Today's Objective</h3>
           <p style={{color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'1rem'}}>Complete {questionsPerSubject * 2} questions to maintain your study streak.</p>
           <div style={{background:'var(--bg-main)', height:'8px', borderRadius:'4px', overflow:'hidden'}}>
             <div style={{width:'40%', background:'var(--primary)', height:'100%', borderRadius:'4px'}}></div>
           </div>
           <p style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.5rem', fontWeight:600}}>In Progress</p>
         </div>
         
         <h3 style={{fontSize:'1.2rem', fontWeight:700, margin:'1.5rem 0 1rem'}}>Focus Areas (Needs Improvement)</h3>
         <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            {weakSubjects.length === 0 ? (
              <div style={{background:'var(--bg-card)', padding:'1.5rem', borderRadius:'16px', border:'1px solid var(--border)', textAlign:'center'}}>
                 <CheckCircle2 size={32} color="var(--primary)" style={{margin:'0 auto 0.5rem'}}/>
                 <p style={{color:'var(--text-main)', fontWeight:600, fontSize:'0.95rem'}}>All subjects look strong!</p>
                 <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginTop:'0.25rem'}}>Keep practicing to maintain consistency.</p>
              </div>
            ) : (
              weakSubjects.map((subKey) => (
                <div key={subKey} style={{background:'var(--bg-card)', padding:'1rem', borderRadius:'16px', border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                   <div>
                     <h4 style={{color:'var(--color-orange)', marginBottom:'0.2rem'}}>{subjectsData[subKey]?.name}</h4>
                     <p style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Accuracy below 60%. Review recommended.</p>
                   </div>
                   <button onClick={()=>{ setSelectedSubjects([subKey]); setExamMode('practice'); setCurrentTab('subjects'); }} style={{background:'rgba(245, 158, 11, 0.1)', color:'var(--color-orange)', border:'none', padding:'0.5rem 1rem', borderRadius:'8px', fontWeight:600, cursor:'pointer'}}>
                     Revise
                   </button>
                </div>
              ))
            )}
         </div>
         
         <button className="btn-full btn-outline-full" style={{marginTop:'2rem'}} onClick={() => setCurrentTab('home')}>
            Back to Dashboard
         </button>
      </div>
    );
  };

  const renderSubjects = () => (
    <div style={{padding: '1.5rem', paddingBottom: '6rem'}}>
      <div className="test-header" style={{padding:'0 0 1.5rem', background:'transparent'}}>
        <button className="test-back-btn" onClick={() => setCurrentTab('home')}>
          <ArrowLeft size={20} /> Subjects
        </button>
      </div>
      
      <p style={{color:'var(--text-muted)', marginBottom:'1.25rem', fontSize:'0.9rem'}}>Select up to 4 subjects for your {examMode === 'practice' ? 'practice session' : 'mock exam'}.</p>

      {/* In-view Custom Questions Configuration */}
      <div style={{background:'var(--bg-card)', padding:'1rem 1.25rem', borderRadius:'16px', border:'1px solid var(--border)', marginBottom:'1.5rem'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
          <span style={{fontSize:'0.9rem', fontWeight:600, color:'var(--text-main)'}}>Number of Questions</span>
          <span style={{fontSize:'0.9rem', color:'var(--primary)', fontWeight:700}}>{questionsPerSubject} per subject</span>
        </div>
        <div className="count-pills">
          {[5, 10, 15, 20, 30, 40].map(cnt => (
            <button 
              key={cnt}
              className={`count-pill ${questionsPerSubject === cnt ? 'active' : ''}`}
              onClick={() => setQuestionCount(cnt)}
            >
              {cnt}
            </button>
          ))}
        </div>
        <div className="custom-count-input-wrapper">
          <input 
            type="number"
            className="custom-count-input"
            placeholder="Or type custom amount (e.g. 25)"
            value={customInputVal}
            onChange={(e) => {
              setCustomInputVal(e.target.value);
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val > 0 && val <= 100) {
                setQuestionsPerSubject(val);
                localStorage.setItem('jamb_q_count', String(val));
              }
            }}
            min="1"
            max="100"
          />
          <span style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>questions</span>
        </div>
      </div>

      {Object.keys(subjectsData).map(key => {
        const isSelected = selectedSubjects.includes(key);
        return (
          <div 
            key={key} 
            className={`subject-list-item ${isSelected ? 'selected' : ''}`}
            onClick={() => toggleSubject(key)}
            style={{transition: 'all 0.3s ease'}}
          >
            <div className="subject-list-item-left">
              <div className="subject-list-icon" style={{background: isSelected ? 'var(--primary)' : 'var(--bg-card-hover)', transition: 'background 0.3s'}}>
                <BookOpen size={20} color={isSelected ? 'var(--bg-main)' : 'var(--text-main)'}/>
              </div>
              <div>
                <h4>{subjectsData[key].name}</h4>
                <p>{subjectsData[key].questions.length} Questions Available</p>
              </div>
            </div>
            {isSelected && <CheckCircle2 size={20} color="var(--primary)" />}
          </div>
        )
      })}

      <button 
        className="btn-full btn-primary-full" 
        onClick={() => startExam()}
        disabled={selectedSubjects.length === 0}
        style={{marginTop: '2rem', opacity: selectedSubjects.length === 0 ? 0.5 : 1, transition: 'all 0.3s'}}
      >
        Start {examMode === 'practice' ? 'Practice' : 'Mock Exam'} {selectedSubjects.length > 0 ? `(${selectedSubjects.length * questionsPerSubject} Total Qs)` : ''}
      </button>
    </div>
  );

  const renderSettings = () => (
    <div className="settings-container">
      <h2 className="settings-header">Settings</h2>
      
      <div className="settings-group">
        <div className="setting-item">
          <div className="setting-left">
            <Moon size={20} color="var(--text-muted)"/>
            Dark Mode (Emerald Study)
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={true} readOnly />
            <span className="slider"></span>
          </label>
        </div>
        
        <div className="setting-item">
          <div className="setting-left">
            <BellRing size={20} color="var(--text-muted)"/>
            Sound Effects & Chimes
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={soundEnabled} onChange={(e)=>setSoundEnabled(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="setting-item" style={{display:'block'}}>
          <div style={{marginBottom:'1rem', fontWeight:600}}>Test Configuration</div>
          
          <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem', color:'var(--text-muted)'}}>Mode</label>
          <select 
            value={examMode} 
            onChange={(e) => setExamMode(e.target.value)}
            style={{width:'100%', padding:'1rem', borderRadius:'12px', background:'var(--bg-card-hover)', color:'var(--text-main)', border:'1px solid var(--border)', marginBottom:'1rem'}}
          >
            <option value="practice">Practice Mode (Instant Feedback & Explanations)</option>
            <option value="exam">Mock Exam Mode (Timed Simulation)</option>
          </select>

          <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem', color:'var(--text-muted)'}}>Custom Questions per Subject</label>
          <div className="count-pills">
            {[5, 10, 15, 20, 30, 40].map(cnt => (
              <button 
                key={cnt}
                className={`count-pill ${questionsPerSubject === cnt ? 'active' : ''}`}
                onClick={() => setQuestionCount(cnt)}
              >
                {cnt} Qs
              </button>
            ))}
          </div>
          <div className="custom-count-input-wrapper">
            <input 
              type="number"
              className="custom-count-input"
              value={customInputVal}
              onChange={(e) => {
                setCustomInputVal(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0 && val <= 100) {
                  setQuestionsPerSubject(val);
                  localStorage.setItem('jamb_q_count', String(val));
                }
              }}
              min="1"
              max="100"
            />
            <span style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>questions</span>
          </div>
        </div>
      </div>
      
      <button className="btn-full btn-outline-full" onClick={handleLogout} style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', color:'var(--color-red)', borderColor:'var(--color-red)'}}>
        <LogOut size={20}/> Log Out
      </button>
    </div>
  );

  const renderTesting = () => {
    if (!currentQuestions || currentQuestions.length === 0) return null;
    
    const q = currentQuestions[currentQuestionIndex];
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const hasAnswered = answers[currentQuestionIndex] !== undefined;
    const isFlagged = flagged.find(f => f.text === q.text) !== undefined;
    
    return (
      <div style={{display:'flex', flexDirection:'column', flex:1, animation:'fadeIn 0.3s ease-out'}}>
        {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}

        <div className="test-header">
          <button className="test-back-btn" onClick={() => setShowPauseModal(true)}>
            <ArrowLeft size={20} /> {examMode === 'practice' ? 'Practice' : 'Mock'}
          </button>
          
          <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
            <div className="test-timer">
              <Clock size={18} />
              {formatTime(timeLeft)}
            </div>
            <button onClick={() => setShowCalculator(!showCalculator)} style={{background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'10px', padding:'0.4rem', color:'var(--text-main)', cursor:'pointer', display:'flex', alignItems:'center'}}>
              <CalcIcon size={18} />
            </button>
          </div>
        </div>

        <div className="test-progress-container">
          <div className="test-progress-text">
            Question {currentQuestionIndex + 1} of {currentQuestions.length}
          </div>
          <div className="test-progress-bar">
            <div className="test-progress-fill" style={{width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%`, transition:'width 0.3s ease-out'}}></div>
          </div>
        </div>

        <div className="test-content">
          <div className="subject-pill">
            <BookOpen size={14} />
            {q.subject || 'JAMB Question'}
          </div>

          {q.section && q.section.trim().length > 0 && (
            <div className={`question-instruction ${
              q.section.toLowerCase().includes('opposite') || q.section.toLowerCase().includes('antonym') 
                ? 'antonym' 
                : (q.section.toLowerCase().includes('nearest') || q.section.toLowerCase().includes('synonym') ? 'synonym' : '')
            }`}>
              <Lightbulb size={16} style={{flexShrink:0, marginTop:'2px'}} />
              <div dangerouslySetInnerHTML={{ __html: q.section }} />
            </div>
          )}

          <div className="question-text" dangerouslySetInnerHTML={{ __html: q.text }} />
          {q.image && (
            <div className="diagram-container">
              <img src={q.image} alt="Question Diagram" className="diagram-img" />
            </div>
          )}

          <div className="options-container">
            {q.options && q.options.map((opt, idx) => {
              let rowCls = '';
              if (hasAnswered && examMode === 'practice') {
                if (idx === q.answer) rowCls = 'correct';
                else if (idx === answers[currentQuestionIndex]) rowCls = 'wrong';
              } else if (hasAnswered && idx === answers[currentQuestionIndex]) {
                rowCls = 'selected';
              }

              return (
                <div 
                  key={idx}
                  className={`option-row ${rowCls}`}
                  onClick={() => handleSelectOption(idx)}
                >
                  <div className="option-letter-circle">{letters[idx] || idx + 1}</div>
                  <div className="option-text" dangerouslySetInnerHTML={{ __html: opt }} />
                  {rowCls === 'correct' && <CheckCircle2 size={24} color="var(--primary)" className="option-icon" />}
                  {rowCls === 'selected' && examMode === 'exam' && <CheckCircle2 size={24} color="var(--primary)" className="option-icon" />}
                  {rowCls === 'wrong' && <XCircle size={24} color="var(--color-red)" className="option-icon" />}
                </div>
              );
            })}
          </div>

          <div className="test-controls">
            <button 
              className="btn-test-nav btn-prev"
              onClick={() => {
                const prevIdx = Math.max(0, currentQuestionIndex - 1);
                setCurrentQuestionIndex(prevIdx);
                saveSessionNow({ currentQuestionIndex: prevIdx });
              }}
              disabled={currentQuestionIndex === 0}
              style={{opacity: currentQuestionIndex === 0 ? 0.5 : 1}}
            >
              Previous
            </button>
            
            <button 
              className="btn-test-nav btn-next"
              onClick={() => {
                if (currentQuestionIndex === currentQuestions.length - 1) {
                  finishExam();
                } else {
                  const nextIdx = Math.min(currentQuestions.length - 1, currentQuestionIndex + 1);
                  setCurrentQuestionIndex(nextIdx);
                  saveSessionNow({ currentQuestionIndex: nextIdx });
                }
              }}
            >
              {currentQuestionIndex === currentQuestions.length - 1 ? 'Finish Exam' : 'Next'} <ArrowRight size={20} />
            </button>
          </div>
        </div>

        <div className="test-footer">
          <button className="footer-tool-btn" onClick={() => setShowCalculator(!showCalculator)}>
            <CalcIcon size={20} /> Calculator
          </button>
          <button className="footer-tool-btn" onClick={() => toggleFlag(q)} style={{color: isFlagged ? 'var(--color-orange)' : 'var(--text-muted)'}}>
            <Bookmark size={20} fill={isFlagged ? 'var(--color-orange)' : 'none'}/> {isFlagged ? 'Bookmarked' : 'Bookmark'}
          </button>
        </div>
      </div>
    );
  };

  const renderFeedbackModal = () => {
    const q = currentQuestions[currentQuestionIndex];
    const isCorrect = answers[currentQuestionIndex] === q.answer;

    return (
      <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, overflow:'hidden', zIndex:99}}>
        <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', animation:'fadeIn 0.2s ease'}} onClick={()=>setGameState('testing')}></div>
        <div className="feedback-modal">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
             <div className="feedback-header">
               <div className={`feedback-icon ${isCorrect ? 'correct' : 'wrong'}`}>
                 {isCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
               </div>
               <div>
                 <h3 style={{color: isCorrect ? 'var(--primary)' : 'var(--color-red)'}}>{isCorrect ? 'Correct!' : 'Incorrect'}</h3>
                 <p>{isCorrect ? "Spot on! Great work." : "Check the solution calculation below."}</p>
               </div>
             </div>
             <button onClick={()=>setGameState('testing')} style={{background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer'}}><X size={24}/></button>
          </div>

          <div className="feedback-explanation">
            <strong style={{color:'var(--primary)', display:'block', marginBottom:'0.5rem'}}>Solution / Calculation:</strong>
            <div style={{marginTop:'0.25rem', whiteSpace:'pre-line', lineHeight:1.6}} dangerouslySetInnerHTML={{ __html: q.explanation || "No step-by-step calculation provided for this question." }} />
          </div>

          <button 
            className="btn-full btn-primary-full"
            onClick={() => {
              setGameState('testing');
              if (currentQuestionIndex < currentQuestions.length - 1) {
                const nextIdx = currentQuestionIndex + 1;
                setCurrentQuestionIndex(nextIdx);
                saveSessionNow({ gameState: 'testing', currentQuestionIndex: nextIdx });
              } else {
                finishExam();
              }
            }}
          >
            {currentQuestionIndex === currentQuestions.length - 1 ? 'View Final Results' : 'Next Question'} <ArrowRight size={20} style={{display:'inline', verticalAlign:'middle'}}/>
          </button>
        </div>
      </div>
    );
  };

  const renderReviewScreen = () => {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const filteredQuestions = currentQuestions.filter((q, idx) => {
      if (reviewFilter === 'correct') return answers[idx] === q.answer;
      if (reviewFilter === 'wrong') return answers[idx] !== q.answer;
      return true;
    });

    return (
      <div className="review-screen">
        <button className="test-back-btn" onClick={() => setGameState('results')} style={{marginBottom:'1.5rem'}}>
          <ArrowLeft size={20} /> Back to Result Summary
        </button>

        <h2 style={{fontSize:'1.5rem', fontWeight:700, marginBottom:'0.5rem'}}>Review & Calculations</h2>
        <p style={{color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'1.5rem'}}>Review all answers and step-by-step working.</p>

        {/* Filter Pills */}
        <div style={{display:'flex', gap:'0.5rem', marginBottom:'1.5rem'}}>
          <button 
            className={`count-pill ${reviewFilter === 'all' ? 'active' : ''}`}
            onClick={() => setReviewFilter('all')}
          >
            All ({currentQuestions.length})
          </button>
          <button 
            className={`count-pill ${reviewFilter === 'wrong' ? 'active' : ''}`}
            onClick={() => setReviewFilter('wrong')}
            style={{borderColor: reviewFilter === 'wrong' ? 'var(--color-red)' : undefined}}
          >
            Wrong / Missed
          </button>
          <button 
            className={`count-pill ${reviewFilter === 'correct' ? 'active' : ''}`}
            onClick={() => setReviewFilter('correct')}
          >
            Correct
          </button>
        </div>

        {filteredQuestions.map((q, filteredIdx) => {
          const originalIdx = currentQuestions.findIndex(orig => orig === q);
          const userAnswerIdx = answers[originalIdx];
          const isCorrect = userAnswerIdx === q.answer;
          const isAnswered = userAnswerIdx !== undefined;

          let cardClass = isCorrect ? 'correct-card' : (isAnswered ? 'wrong-card' : 'unanswered-card');

          return (
            <div key={originalIdx} className={`review-item-card ${cardClass}`}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem'}}>
                <span style={{fontSize:'0.85rem', fontWeight:700, color:'var(--text-muted)'}}>Question #{originalIdx + 1} • {q.subject || ''}</span>
                <span style={{
                  fontSize:'0.8rem', 
                  fontWeight:700, 
                  padding:'0.25rem 0.6rem', 
                  borderRadius:'8px',
                  background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isCorrect ? 'var(--primary)' : 'var(--color-red)'
                }}>
                  {isCorrect ? 'Correct' : (isAnswered ? 'Wrong' : 'Unanswered')}
                </span>
              </div>

              {q.section && q.section.trim().length > 0 && (
                <div className={`question-instruction ${
                  q.section.toLowerCase().includes('opposite') || q.section.toLowerCase().includes('antonym') 
                    ? 'antonym' 
                    : (q.section.toLowerCase().includes('nearest') || q.section.toLowerCase().includes('synonym') ? 'synonym' : '')
                }`} style={{marginBottom:'0.75rem', fontSize:'0.82rem', padding:'0.5rem 0.75rem'}}>
                  <Lightbulb size={14} style={{flexShrink:0, marginTop:'2px'}} />
                  <div dangerouslySetInnerHTML={{ __html: q.section }} />
                </div>
              )}

              <div style={{fontSize:'1rem', fontWeight:600, marginBottom:'1rem', lineHeight:1.5}} dangerouslySetInnerHTML={{ __html: q.text }} />

              {q.image && (
                <div className="diagram-container" style={{marginBottom:'1rem', padding:'0.75rem'}}>
                  <img src={q.image} alt="Question Diagram" className="diagram-img" style={{maxHeight:'220px'}} />
                </div>
              )}

              {/* Options Breakdown */}
              <div style={{display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1rem'}}>
                {q.options && q.options.map((opt, optIdx) => {
                  const isCorrectOpt = optIdx === q.answer;
                  const isUserPicked = optIdx === userAnswerIdx;

                  let optBorder = 'var(--border)';
                  let optBg = 'transparent';
                  let optColor = 'var(--text-main)';

                  if (isCorrectOpt) {
                    optBorder = 'var(--primary)';
                    optBg = 'rgba(16, 185, 129, 0.08)';
                    optColor = 'var(--primary)';
                  } else if (isUserPicked && !isCorrect) {
                    optBorder = 'var(--color-red)';
                    optBg = 'rgba(239, 68, 68, 0.08)';
                    optColor = 'var(--color-red)';
                  }

                  return (
                    <div 
                      key={optIdx}
                      style={{
                        padding:'0.75rem 1rem', 
                        borderRadius:'10px', 
                        border:`1px solid ${optBorder}`, 
                        background: optBg, 
                        display:'flex', 
                        alignItems:'center', 
                        gap:'0.75rem',
                        fontSize:'0.9rem'
                      }}
                    >
                      <span style={{fontWeight:700, color: optColor}}>{letters[optIdx] || optIdx + 1}.</span>
                      <div style={{flex:1}} dangerouslySetInnerHTML={{ __html: opt }} />
                      {isCorrectOpt && <CheckCircle2 size={18} color="var(--primary)" />}
                      {isUserPicked && !isCorrect && <XCircle size={18} color="var(--color-red)" />}
                    </div>
                  );
                })}
              </div>

              {/* Step-by-Step Calculation / Explanation */}
              <div className="review-explanation-box">
                <strong>Calculation & Solution:</strong>
                <div style={{whiteSpace:'pre-line'}} dangerouslySetInnerHTML={{ __html: q.explanation || "No specific calculation provided for this item." }} />
              </div>
            </div>
          );
        })}

        <button className="btn-full btn-primary-full" style={{marginTop:'1.5rem'}} onClick={() => { setGameState('dashboard'); setCurrentTab('home'); }}>
          Done Reviewing
        </button>
      </div>
    );
  };

  const renderResults = () => {
    const score = calculateScore();
    const total = currentQuestions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const timeSpent = totalTime - timeLeft;
    
    return (
      <div className="result-screen" style={{animation:'fadeIn 0.5s ease-out'}}>
        <button className="result-header" onClick={() => { setGameState('dashboard'); setCurrentTab('home'); }}>
          <ArrowLeft size={20} /> {examMode === 'practice' ? 'Practice' : 'Mock Exam'} Result
        </button>

        <div className="score-circle-container" style={{ '--percentage': percentage }}>
          <div className="score-circle-inner">
            <span style={{color: 'var(--color-orange)', marginBottom:'0.5rem'}}>👑</span>
            <h2>{percentage}%</h2>
            <p>Score</p>
          </div>
        </div>

        <h1 className="result-title">{percentage >= 50 ? 'Great Job' : 'Keep Practicing'}, {user?.name}!</h1>
        <p className="result-subtitle">You answered {score} out of {total} questions correctly.</p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)'}}>
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-info">
              <p>Correct</p>
              <h4>{score}</h4>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-red)'}}>
              <XCircle size={20} />
            </div>
            <div className="stat-info">
              <p>Wrong</p>
              <h4>{total - score}</h4>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-orange)'}}>
              <FileText size={20} />
            </div>
            <div className="stat-info">
              <p>Total Qs</p>
              <h4>{total}</h4>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-blue)'}}>
              <Clock size={20} />
            </div>
            <div className="stat-info">
              <p>Time Taken</p>
              <h4>{formatTime(timeSpent)}</h4>
            </div>
          </div>
        </div>

        <div className="result-actions">
          {/* Button to view all explanations & calculations */}
          <button 
            className="btn-full" 
            style={{background:'rgba(16, 185, 129, 0.15)', color:'var(--primary)', border:'1px solid var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem'}}
            onClick={() => setGameState('review')}
          >
            <Eye size={20} /> Review Solutions & Calculations
          </button>

          <button className="btn-full btn-primary-full" onClick={() => { setGameState('dashboard'); setCurrentTab('home'); setSelectedSubjects([]); }}>
            Back to Dashboard
          </button>
          <button className="btn-full btn-outline-full" onClick={() => { setGameState('dashboard'); setCurrentTab('subjects'); }}>
            <RefreshCw size={20} style={{display:'inline', verticalAlign:'middle', marginRight:'0.5rem'}}/> Try Another Exam
          </button>
        </div>
      </div>
    );
  };

  const renderBottomNav = () => (
    <div className="bottom-nav">
      <button className={`nav-item ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>
        <Home size={24} />
        <span>Home</span>
      </button>
      <button className={`nav-item ${currentTab === 'subjects' ? 'active' : ''}`} onClick={() => setCurrentTab('subjects')}>
        <PlayCircle size={24} />
        <span>Practice</span>
      </button>
      <button className={`nav-item ${currentTab === 'plan' ? 'active' : ''}`} onClick={() => setCurrentTab('plan')}>
        <Calendar size={24} />
        <span>Plan</span>
      </button>
      <button className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => setCurrentTab('settings')}>
        <Settings size={24} />
        <span>Settings</span>
      </button>
    </div>
  );

  const renderPauseModal = () => (
    <div className="modal-backdrop" onClick={() => setShowPauseModal(false)}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{width:'56px', height:'56px', borderRadius:'16px', background:'rgba(16, 185, 129, 0.12)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem'}}>
          <Clock size={28} />
        </div>
        <h3 style={{fontSize:'1.3rem', fontWeight:700, marginBottom:'0.5rem', color:'var(--text-main)'}}>
          Pause Practice?
        </h3>
        <p style={{fontSize:'0.9rem', color:'var(--text-muted)', lineHeight:1.5, marginBottom:'1.5rem'}}>
          Your progress ({Object.keys(answers).length} of {currentQuestions.length} answered) is automatically saved. You can resume anytime from the dashboard.
        </p>

        <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
          <button 
            className="btn-full btn-primary-full" 
            onClick={() => {
              saveSessionNow();
              setShowPauseModal(false);
              setGameState('dashboard');
              setCurrentTab('home');
            }}
            style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem'}}
          >
            <Home size={18} /> Save & Return to Dashboard
          </button>

          <button 
            className="btn-full btn-outline-full"
            onClick={() => setShowPauseModal(false)}
          >
            Keep Practicing
          </button>

          <button 
            onClick={handleDiscardSession}
            style={{background:'transparent', border:'none', color:'var(--color-red)', fontSize:'0.85rem', fontWeight:600, padding:'0.5rem', cursor:'pointer', marginTop:'0.25rem'}}
          >
            Discard & Quit Session
          </button>
        </div>
      </div>
    </div>
  );

  const renderResumePrompt = () => {
    if (!activeSession || !activeSession.currentQuestions || activeSession.currentQuestions.length === 0) return null;
    return (
      <div className="modal-backdrop">
        <div className="modal-dialog">
          <div style={{width:'56px', height:'56px', borderRadius:'16px', background:'rgba(16, 185, 129, 0.12)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem'}}>
            <PlayCircle size={28} />
          </div>
          <h3 style={{fontSize:'1.3rem', fontWeight:700, marginBottom:'0.5rem', color:'var(--text-main)'}}>
            Resume Your Practice?
          </h3>
          <p style={{fontSize:'0.9rem', color:'var(--text-muted)', lineHeight:1.5, marginBottom:'1.5rem'}}>
            You have an unfinished practice session on Question {(activeSession.currentQuestionIndex || 0) + 1} with {Object.keys(activeSession.answers || {}).length} questions answered.
          </p>

          <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
            <button 
              className="btn-full btn-primary-full" 
              onClick={() => handleResumeSession()}
              style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem'}}
            >
              <PlayCircle size={18} /> Resume Practice Now
            </button>
            <button 
              className="btn-full btn-outline-full"
              onClick={() => setShowResumePrompt(false)}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="app-container">
        {renderLogin()}
      </div>
    );
  }

  return (
    <div className="app-container" key={gameState + currentTab}>
      {showPauseModal && renderPauseModal()}
      {showResumePrompt && renderResumePrompt()}

      {gameState === 'dashboard' && currentTab === 'home' && renderDashboard()}
      {gameState === 'dashboard' && currentTab === 'subjects' && renderSubjects()}
      {gameState === 'dashboard' && currentTab === 'plan' && renderPlan()}
      {gameState === 'dashboard' && currentTab === 'settings' && renderSettings()}
      
      {gameState === 'testing' && renderTesting()}
      {gameState === 'feedback' && (
        <>
          {renderTesting()}
          {renderFeedbackModal()}
        </>
      )}
      
      {gameState === 'results' && renderResults()}
      {gameState === 'review' && renderReviewScreen()}
      
      {gameState === 'dashboard' && renderBottomNav()}
    </div>
  );
}

export default App;
