import React, { useState, useEffect } from 'react';
import subjectsData from './data/offline_questions.json';
import { 
  Home, Target, PlayCircle, FileText, Calendar, 
  Settings, Bell, ArrowRight, ArrowLeft,
  CheckCircle2, XCircle, Calculator as CalcIcon, Flag, RefreshCw, X, Lightbulb, BellRing, User, ChevronRight, Moon, BookOpen, Clock, LogOut
} from 'lucide-react';
import Calculator from './Calculator';
import './Calculator.css';

function App() {
  const [user, setUser] = useState(null);
  const [loginName, setLoginName] = useState('');
  
  const [currentTab, setCurrentTab] = useState('home'); // home, practice, mock, subjects, settings, plan
  const [gameState, setGameState] = useState('dashboard'); // dashboard, testing, feedback, results
  
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { index: selectedOptionIndex }
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  
  // Settings & Progress
  const [examMode, setExamMode] = useState('practice'); 
  const [questionsPerSubject, setQuestionsPerSubject] = useState(40);
  const [showCalculator, setShowCalculator] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({});

  // Initialize Data
  useEffect(() => {
    const savedUser = localStorage.getItem('jamb_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    const savedStats = localStorage.getItem('jamb_stats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    } else {
      // Initialize stats
      const initStats = {};
      Object.keys(subjectsData).forEach(sub => {
        initStats[sub] = { answered: 0, correct: 0, total: subjectsData[sub].questions.length };
      });
      setStats(initStats);
      localStorage.setItem('jamb_stats', JSON.stringify(initStats));
    }
  }, []);

  // Timer
  useEffect(() => {
    let timer;
    if (gameState === 'testing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleLogin = () => {
    if (loginName.trim().length < 2) return;
    const newUser = {
      name: loginName.trim(),
      avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(loginName)}&backgroundColor=00E676,8B5CF6,3B82F6`
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

  const toggleSubject = (subjectKey) => {
    if (selectedSubjects.includes(subjectKey)) {
      setSelectedSubjects(prev => prev.filter(s => s !== subjectKey));
    } else {
      if (selectedSubjects.length < 4) {
        setSelectedSubjects(prev => [...prev, subjectKey]);
      }
    }
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

  const startExam = (modeOverride) => {
    if (selectedSubjects.length === 0) return;
    const modeToUse = modeOverride || examMode;
    setExamMode(modeToUse);
    
    let combined = [];
    selectedSubjects.forEach(sub => {
      let qs = subjectsData[sub].questions;
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
    
    setCurrentQuestions(combined);
    setAnswers({});
    setCurrentQuestionIndex(0);
    const duration = combined.length * 45; // 45 secs per question
    setTimeLeft(duration); 
    setTotalTime(duration);
    setGameState('testing');
    setShowCalculator(false);
  };

  const finishExam = () => {
    // Update Stats in local storage
    const newStats = { ...stats };
    currentQuestions.forEach((q, idx) => {
      if (answers[idx] !== undefined) {
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
    if (examMode === 'practice' && answers[currentQuestionIndex] !== undefined) {
      return; // already answered
    }

    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: optionIndex
    }));

    if (examMode === 'practice') {
      const q = currentQuestions[currentQuestionIndex];
      playSound(optionIndex === q.answer);
      setTimeout(() => setGameState('feedback'), 300);
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
         <h1 style={{color:'var(--text-main)', marginBottom:'0.5rem', fontSize:'1.5rem'}}>Welcome to JAMB CBT</h1>
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
            style={{opacity: loginName.length > 1 ? 1 : 0.5}}
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
          <div className="avatar" style={{border:'2px solid var(--primary)', padding:'2px'}}>
            <img src={user.avatar} alt="avatar" style={{width:'100%', height:'100%', borderRadius:'50%'}} />
          </div>
          <div className="welcome-text">
            <p>Welcome back,</p>
            <h1>{user.name} <span style={{fontSize:'1.2rem'}}>👑</span></h1>
          </div>
        </div>
        <div className="header-actions">
          <div className="icon-btn" onClick={() => setShowNotifications(true)}>
            <Bell size={20} />
            <div className="notification-dot"></div>
          </div>
        </div>
      </div>

      {showNotifications && (
        <div style={{position:'absolute', top:'70px', right:'1.5rem', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1rem', zIndex:100, width:'250px', boxShadow:'0 10px 30px rgba(0,0,0,0.5)'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
             <h4 style={{fontWeight:700}}>Notifications</h4>
             <X size={16} color="var(--text-muted)" onClick={()=>setShowNotifications(false)} style={{cursor:'pointer'}}/>
          </div>
          <div style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'0.75rem', borderBottom:'1px solid var(--border)', paddingBottom:'0.75rem'}}>
             <strong style={{color:'var(--primary)', display:'block'}}>Welcome {user.name}!</strong>
             Start your first practice session today to build momentum.
          </div>
          <div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>
             <strong style={{color:'var(--color-purple)', display:'block'}}>Mock Exams Available</strong>
             Simulate the real JAMB experience completely offline.
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
          <span className="active">You're on track!</span>
          <span>Target: 250+</span>
        </div>
      </div>

      <div className="actions-grid">
        <div className="action-card" onClick={() => { setExamMode('practice'); setCurrentTab('subjects'); }} style={{
          backgroundImage: `linear-gradient(to bottom, rgba(16,24,38,0.8), rgba(16,24,38,0.95)), url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80')`,
          backgroundSize: 'cover', backgroundPosition: 'center'
        }}>
          <div className="action-icon" style={{background: 'rgba(0, 230, 118, 0.15)', color: 'var(--primary)'}}>
            <PlayCircle size={24} />
          </div>
          <div>
            <h3 style={{color:'var(--text-main)'}}>Start Practice</h3>
            <p>Jump into a subject and sharpen your skills.</p>
          </div>
          <div className="action-arrow">
            <ArrowRight size={16} color="var(--primary)" />
          </div>
        </div>

        <div className="action-card" onClick={() => { setExamMode('exam'); setCurrentTab('subjects'); }} style={{
          backgroundImage: `linear-gradient(to bottom, rgba(16,24,38,0.8), rgba(16,24,38,0.95)), url('https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&q=80')`,
          backgroundSize: 'cover', backgroundPosition: 'center'
        }}>
          <div className="action-icon" style={{background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-purple)'}}>
            <FileText size={24} />
          </div>
          <div>
            <h3 style={{color:'var(--text-main)'}}>Take Mock Exam</h3>
            <p>Simulate the real JAMB experience (CBT style).</p>
          </div>
          <div className="action-arrow">
            <ArrowRight size={16} color="var(--color-purple)" />
          </div>
        </div>
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
                <div key={subKey} style={{background:'var(--bg-card)', padding:'1rem', borderRadius:'16px', border:'1px solid var(--border)'}}>
                  <div style={{display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'1rem'}}>
                    <div style={{background:`rgba(255,255,255,0.05)`, padding:'0.5rem', borderRadius:'8px', color: color}}>
                      {icons[i % icons.length]}
                    </div>
                    <span style={{fontSize:'0.85rem', fontWeight:600}}>{subjectsData[subKey]?.name || subKey}</span>
                  </div>
                  <div style={{textAlign:'center', fontWeight:700, fontSize:'1.5rem', color: color}}>{pct}%</div>
                  <div style={{textAlign:'center', fontSize:'0.75rem', color:'var(--text-muted)'}}>{stat.answered} / {stat.total}</div>
                </div>
              );
           })}
        </div>
      </div>
    </>
  );

  const renderPlan = () => {
    // Generate some mock recommendations based on stats
    const weakSubjects = Object.keys(stats).filter(s => stats[s].answered > 0 && (stats[s].correct / stats[s].answered) < 0.6);
    
    return (
      <div style={{padding:'1.5rem'}}>
         <h2 style={{fontSize:'1.5rem', fontWeight:700, marginBottom:'1.5rem'}}>Your Study Plan</h2>
         
         <div style={{background:'var(--bg-card)', padding:'1.5rem', borderRadius:'20px', border:'1px solid var(--border)', marginBottom:'2rem', position:'relative', overflow:'hidden'}}>
           <div style={{position:'absolute', right:'-20px', top:'-20px', opacity:0.1}}><Target size={120} color="var(--primary)"/></div>
           <h3 style={{color:'var(--primary)', marginBottom:'0.5rem'}}>Today's Objective</h3>
           <p style={{color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'1rem'}}>Complete 50 questions to maintain your streak.</p>
           <div style={{background:'var(--bg-main)', height:'8px', borderRadius:'4px', overflow:'hidden'}}>
             <div style={{width:'30%', background:'var(--primary)', height:'100%', borderRadius:'4px'}}></div>
           </div>
           <p style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.5rem', fontWeight:600}}>15 / 50 Completed</p>
         </div>
         
         <h3 style={{fontSize:'1.2rem', fontWeight:700, margin:'1.5rem 0 1rem'}}>Focus Areas (Weaknesses)</h3>
         <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            {weakSubjects.length === 0 ? (
              <div style={{background:'var(--bg-card)', padding:'1rem', borderRadius:'16px', border:'1px solid var(--border)', textAlign:'center'}}>
                 <p style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>No weak areas detected yet. Keep practicing!</p>
              </div>
            ) : (
              weakSubjects.map((subKey, i) => (
                <div key={subKey} style={{background:'var(--bg-card)', padding:'1rem', borderRadius:'16px', border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                   <div>
                     <h4 style={{color:'var(--color-orange)', marginBottom:'0.2rem'}}>{subjectsData[subKey]?.name}</h4>
                     <p style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Accuracy is below 60%. Needs review.</p>
                   </div>
                   <button onClick={()=>{ toggleSubject(subKey); setCurrentTab('subjects'); setExamMode('practice'); }} style={{background:'rgba(245, 158, 11, 0.1)', color:'var(--color-orange)', border:'none', padding:'0.5rem 1rem', borderRadius:'8px', fontWeight:600, cursor:'pointer'}}>
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
    <div style={{padding: '1.5rem'}}>
      <div className="test-header" style={{padding:'0 0 1.5rem', background:'transparent'}}>
        <button className="test-back-btn" onClick={() => setCurrentTab('home')}>
          <ArrowLeft size={20} /> Subjects
        </button>
      </div>
      
      <p style={{color:'var(--text-muted)', marginBottom:'1.5rem', fontSize:'0.9rem'}}>Select up to 4 subjects for your {examMode === 'practice' ? 'practice session' : 'mock exam'}.</p>

      {Object.keys(subjectsData).map(key => {
        const isSelected = selectedSubjects.includes(key);
        return (
          <div 
            key={key} 
            className={`subject-list-item ${isSelected ? 'selected' : ''}`}
            onClick={() => toggleSubject(key)}
          >
            <div className="subject-list-item-left">
              <div className="subject-list-icon" style={{background: isSelected ? 'var(--primary)' : 'var(--bg-card-hover)'}}>
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
        style={{marginTop: '2rem', opacity: selectedSubjects.length === 0 ? 0.5 : 1}}
      >
        Start {examMode === 'practice' ? 'Practice' : 'Mock Exam'} {selectedSubjects.length > 0 ? `(${selectedSubjects.length})` : ''}
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
            Dark Mode (Default)
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={true} readOnly />
            <span className="slider"></span>
          </label>
        </div>
        
        <div className="setting-item">
          <div className="setting-left">
            <BellRing size={20} color="var(--text-muted)"/>
            Sound Effects
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
            <option value="practice">Practice Mode (Instant Feedback)</option>
            <option value="exam">Mock Exam Mode</option>
          </select>

          <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem', color:'var(--text-muted)'}}>Questions per Subject</label>
          <select 
            value={questionsPerSubject} 
            onChange={(e) => setQuestionsPerSubject(Number(e.target.value))}
            style={{width:'100%', padding:'1rem', borderRadius:'12px', background:'var(--bg-card-hover)', color:'var(--text-main)', border:'1px solid var(--border)'}}
          >
            <option value={10}>10 Questions</option>
            <option value={20}>20 Questions</option>
            <option value={40}>40 Questions (Standard)</option>
          </select>
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
    const letters = ['A', 'B', 'C', 'D'];
    const hasAnswered = answers[currentQuestionIndex] !== undefined;
    
    return (
      <div style={{display:'flex', flexDirection:'column', flex:1}}>
        {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}

        <div className="test-header">
          <button className="test-back-btn" onClick={() => {
            if(window.confirm("Quit exam? Progress will not be saved.")) {
              setGameState('dashboard');
              setCurrentTab('home');
            }
          }}>
            <ArrowLeft size={20} /> Practice
          </button>
          
          <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
            <div className="test-timer">
              <Clock size={18} />
              {formatTime(timeLeft)}
            </div>
            <Settings size={20} color="var(--text-muted)" onClick={() => setShowCalculator(!showCalculator)} />
          </div>
        </div>

        <div className="test-progress-container">
          <div className="test-progress-text">
            {currentQuestionIndex + 1} / {currentQuestions.length}
          </div>
          <div className="test-progress-bar">
            <div className="test-progress-fill" style={{width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%`}}></div>
          </div>
        </div>

        <div className="test-content">
          <div className="subject-pill">
            <BookOpen size={14} />
            {q.subject}
          </div>

          <div className="question-text" dangerouslySetInnerHTML={{ __html: q.text }} />
          {q.image && (
            <div style={{ marginBottom: '2rem' }}>
              <img src={q.image} alt="diagram" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid var(--border)' }} />
            </div>
          )}

          <div className="options-container">
            {q.options.map((opt, idx) => {
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
                  <div className="option-letter-circle">{letters[idx]}</div>
                  <div className="option-text" dangerouslySetInnerHTML={{ __html: opt }} />
                  {rowCls === 'correct' && <CheckCircle2 size={24} color="var(--primary)" className="option-icon" />}
                  {rowCls === 'selected' && examMode === 'exam' && <CheckCircle2 size={24} color="var(--primary)" className="option-icon" />}
                </div>
              )
            })}
          </div>

          <div className="test-controls">
            <button 
              className="btn-test-nav btn-prev"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </button>
            
            <button 
              className="btn-test-nav btn-next"
              onClick={() => {
                if (currentQuestionIndex === currentQuestions.length - 1) {
                  finishExam();
                } else {
                  setCurrentQuestionIndex(prev => Math.min(currentQuestions.length - 1, prev + 1))
                }
              }}
            >
              {currentQuestionIndex === currentQuestions.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={20} />
            </button>
          </div>
        </div>

        <div className="test-footer">
          <button className="footer-tool-btn" onClick={() => setShowCalculator(!showCalculator)}>
            <CalcIcon size={20} /> Calculator
          </button>
          <button className="footer-tool-btn">
            <Flag size={20} /> Flag
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
        <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)'}} onClick={()=>setGameState('testing')}></div>
        <div className="feedback-modal">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
             <div className="feedback-header">
               <div className={`feedback-icon ${isCorrect ? 'correct' : 'wrong'}`}>
                 {isCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
               </div>
               <div>
                 <h3 style={{color: isCorrect ? 'var(--primary)' : 'var(--color-red)'}}>{isCorrect ? 'Correct!' : 'Incorrect'}</h3>
                 <p>{isCorrect ? "That's right. Well done!" : "Keep practicing to improve."}</p>
               </div>
             </div>
             <button onClick={()=>setGameState('testing')} style={{background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer'}}><X size={24}/></button>
          </div>

          {q.explanation && q.explanation.length > 5 && (
            <div className="feedback-explanation">
              <strong>Explanation:</strong>
              <div style={{marginTop:'0.5rem'}} dangerouslySetInnerHTML={{ __html: q.explanation }} />
            </div>
          )}

          <div className="key-takeaway">
            <Lightbulb className="icon" size={20} style={{flexShrink:0}}/>
            <div>
              <h4>Key Takeaway</h4>
              <p>Always double-check your steps to avoid simple mistakes.</p>
            </div>
          </div>

          <button 
            className="btn-full btn-primary-full"
            onClick={() => {
              setGameState('testing');
              if (currentQuestionIndex < currentQuestions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
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

  const renderResults = () => {
    const score = calculateScore();
    const total = currentQuestions.length;
    const percentage = Math.round((score / total) * 100);
    const timeSpent = totalTime - timeLeft;
    
    return (
      <div className="result-screen">
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
        <p className="result-subtitle">You're doing well. Keep practicing to reach 250+.</p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(0, 230, 118, 0.1)', color: 'var(--primary)'}}>
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
          <button className="btn-full btn-primary-full" onClick={() => { setGameState('dashboard'); setCurrentTab('home'); setSelectedSubjects([]); }}>
            Back to Dashboard
          </button>
          <button className="btn-full btn-outline-full" onClick={() => { setGameState('dashboard'); setCurrentTab('subjects'); }}>
            <RefreshCw size={20} style={{display:'inline', verticalAlign:'middle', marginRight:'0.5rem'}}/> Try Again
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

  // If no user is logged in, show Login Screen
  if (!user) {
    return (
      <div className="app-container">
        {renderLogin()}
      </div>
    );
  }

  return (
    <div className="app-container">
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
      
      {gameState === 'dashboard' && renderBottomNav()}
    </div>
  );
}

export default App;
