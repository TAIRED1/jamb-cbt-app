import React, { useState, useEffect } from 'react';
import subjectsData from './data/offline_questions.json';
import { Clock, CheckCircle2, XCircle, ArrowRight, ArrowLeft, RefreshCw, BookOpen, Moon, Sun, Calculator as CalcIcon, LogOut, Settings } from 'lucide-react';
import Calculator from './Calculator';
import './Calculator.css';

function App() {
  const [gameState, setGameState] = useState('home'); // home, testing, results
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { index: selectedOptionIndex }
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Settings
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [examMode, setExamMode] = useState('practice'); // 'practice' or 'exam'
  const [questionsPerSubject, setQuestionsPerSubject] = useState(40);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  // Timer Effect
  useEffect(() => {
    let timer;
    if (gameState === 'testing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

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
    } catch (e) {
      console.log("Audio not supported on this device");
    }
  };

  const startExam = () => {
    if (selectedSubjects.length === 0) return;
    
    let combined = [];
    selectedSubjects.forEach(sub => {
      let qs = subjectsData[sub].questions;
      qs = [...qs].sort(() => 0.5 - Math.random());
      
      // Use standard JAMB format if 40 is selected, else use the exact limit chosen
      let limit = questionsPerSubject;
      if (questionsPerSubject === 40 && sub.toLowerCase() === 'english') {
        limit = 60; // Standard JAMB gives 60 for english
      }
      
      qs = qs.slice(0, limit).map(q => ({
        ...q,
        subject: subjectsData[sub].name
      }));
      combined = [...combined, ...qs];
    });
    
    setCurrentQuestions(combined);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTimeLeft(combined.length * 40); 
    setGameState('testing');
    setShowCalculator(false);
  };

  const submitExam = () => {
    if(window.confirm("Are you sure you want to end the test?")) {
      setGameState('results');
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIndex) => {
    // If in practice mode and already answered, don't allow changing
    if (examMode === 'practice' && answers[currentQuestionIndex] !== undefined) {
      return;
    }

    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: optionIndex
    }));

    if (examMode === 'practice') {
      const q = currentQuestions[currentQuestionIndex];
      playSound(optionIndex === q.answer);
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
  const renderHome = () => (
    <div className="glass-card hero-section">
      <h1>TAIRED JAMB CBT PRACTICE</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1.25rem', lineHeight: '1.6' }}>
        Experience the real CBT environment.
      </p>

      <button className="btn btn-outline" style={{ marginBottom: '2rem' }} onClick={() => setShowSettings(!showSettings)}>
        <Settings size={20} /> Settings
      </button>

      {showSettings && (
        <div style={{ background: 'var(--surface-solid)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', textAlign: 'left', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Test Configuration</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Test Mode:</label>
            <select 
              value={examMode} 
              onChange={(e) => setExamMode(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'var(--surface-hover)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
            >
              <option value="practice">Practice Mode (Instant Feedback & Sound)</option>
              <option value="exam">Exam Mode (Real JAMB Experience)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Questions Per Subject:</label>
            <select 
              value={questionsPerSubject} 
              onChange={(e) => setQuestionsPerSubject(Number(e.target.value))}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'var(--surface-hover)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
            >
              <option value={10}>10 Questions (Quick Quiz)</option>
              <option value={20}>20 Questions (Short Test)</option>
              <option value={40}>40 Questions (Standard JAMB)</option>
            </select>
          </div>
        </div>
      )}
      
      <div className="subject-grid">
        {Object.keys(subjectsData).map(key => (
          <div 
            key={key} 
            className={`subject-card ${selectedSubjects.includes(key) ? 'selected' : ''}`}
            onClick={() => toggleSubject(key)}
          >
            <BookOpen size={24} color={selectedSubjects.includes(key) ? '#fff' : 'var(--text-muted)'} />
            {subjectsData[key].name}
          </div>
        ))}
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={startExam}
        disabled={selectedSubjects.length === 0}
        style={{ marginTop: '2rem', width: '100%', padding: '1.25rem', fontSize: '1.25rem' }}
      >
        Start {examMode === 'practice' ? 'Practice' : 'Exam'} ({selectedSubjects.length}/4) <ArrowRight size={24} />
      </button>
    </div>
  );

  const renderTesting = () => {
    const q = currentQuestions[currentQuestionIndex];
    const letters = ['A', 'B', 'C', 'D'];
    const hasAnswered = answers[currentQuestionIndex] !== undefined;
    
    return (
      <div className="glass-card" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '3rem', position: 'relative' }}>
        
        {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}

        <div className="cbt-header">
          <div>
            <div className="subject-badge">{q.subject.toUpperCase()}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.5rem' }}>
              Question {currentQuestionIndex + 1} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1.2rem' }}>of {currentQuestions.length}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => setShowCalculator(!showCalculator)}>
              <CalcIcon size={20} /> Calculator
            </button>
            <div className="timer">
              <Clock size={24} />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="question-area">
          <div dangerouslySetInnerHTML={{ __html: q.text }} />
          {q.image && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <img src={q.image} alt="diagram" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>
          )}
        </div>

        <div className="options-list">
          {q.options.map((opt, idx) => {
            let optionClass = '';
            let letterBg = '';
            
            if (hasAnswered) {
              if (examMode === 'practice') {
                if (idx === q.answer) {
                  optionClass = 'correct-opt'; 
                  letterBg = 'var(--secondary)';
                } else if (idx === answers[currentQuestionIndex]) {
                  optionClass = 'wrong-opt';
                  letterBg = 'var(--danger)';
                }
              } else {
                if (idx === answers[currentQuestionIndex]) {
                  optionClass = 'selected';
                }
              }
            }

            return (
              <button 
                key={idx}
                className={`option-btn ${optionClass}`}
                onClick={() => handleSelectOption(idx)}
                style={optionClass === 'correct-opt' ? { borderColor: 'var(--secondary)', background: 'rgba(16, 185, 129, 0.05)' } : optionClass === 'wrong-opt' ? { borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' } : {}}
              >
                <div className="option-letter" style={letterBg ? { background: letterBg, color: 'white' } : {}}>{letters[idx]}</div>
                <span style={{ flex: 1, lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: opt }} />
              </button>
            )
          })}
        </div>

        {examMode === 'practice' && hasAnswered && q.explanation && q.explanation.length > 5 && (
          <div className="explanation" style={{ marginTop: '2rem' }}>
            <strong style={{ color: 'var(--text-main)' }}>Explanation:</strong> <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
          </div>
        )}

        <div className="cbt-footer" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <button 
            className="btn btn-outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft size={20} /> Previous
          </button>
          
          <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={submitExam}>
            <LogOut size={20} /> End Exam Early
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => {
              if (currentQuestionIndex === currentQuestions.length - 1) {
                submitExam();
              } else {
                setCurrentQuestionIndex(prev => Math.min(currentQuestions.length - 1, prev + 1))
              }
            }}
          >
            {currentQuestionIndex === currentQuestions.length - 1 ? 'Submit Exam' : 'Next Question'} <ArrowRight size={20} />
          </button>
        </div>

        <div className="nav-grid">
          {currentQuestions.map((_, idx) => {
            let cls = '';
            if (answers[idx] !== undefined) {
              if (examMode === 'practice') {
                cls = answers[idx] === currentQuestions[idx].answer ? 'answered-correct' : 'answered-wrong';
              } else {
                cls = 'answered';
              }
            }
            if (currentQuestionIndex === idx) cls += ' active';
            
            return (
              <button 
                key={idx}
                className={`nav-btn ${cls}`}
                onClick={() => setCurrentQuestionIndex(idx)}
                style={cls.includes('answered-correct') ? { background: 'var(--secondary)', color: 'white', borderColor: 'var(--secondary)' } : cls.includes('answered-wrong') ? { background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' } : {}}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    const score = calculateScore();
    const total = currentQuestions.length;
    const percentage = Math.round((score / total) * 100);
    
    return (
      <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto', width: '100%', padding: '3rem' }}>
        <div className="result-card">
          <h1>Exam Results</h1>
          <div className="score-circle" style={{ '--percentage': percentage }}>
            <div className="score-inner">
              <h2>{score}/{total}</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 600 }}>Final Score</span>
            </div>
          </div>
          
          <button className="btn btn-primary" onClick={() => { setGameState('home'); setSelectedSubjects([]); }} style={{ padding: '1rem 3rem' }}>
            <RefreshCw size={20} /> Go to Dashboard
          </button>
        </div>

        <div className="review-section">
          <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Detailed Review</h2>
          {currentQuestions.map((q, idx) => {
            const isCorrect = answers[idx] === q.answer;
            const letters = ['A', 'B', 'C', 'D'];
            
            return (
              <div key={idx} className={`review-item ${isCorrect ? 'correct' : 'wrong'}`}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  {isCorrect ? <CheckCircle2 color="var(--secondary)" size={28} style={{ flexShrink: 0, marginTop: '2px' }}/> : <XCircle color="var(--danger)" size={28} style={{ flexShrink: 0, marginTop: '2px' }}/>}
                  <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Q{idx + 1} ({q.subject})</span>
                    <div style={{ marginTop: '0.5rem', color: 'var(--text-main)', fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: q.text }} />
                    {q.image && <img src={q.image} alt="diagram" style={{ maxWidth: '100%', marginTop: '1rem', borderRadius: '8px' }} />}
                  </div>
                </div>
                
                <div style={{ marginLeft: '2.75rem', fontSize: '1.1rem' }}>
                  <div style={{ color: isCorrect ? 'var(--text-main)' : 'var(--danger)', marginBottom: '0.5rem' }}>
                    Your answer: <strong>{answers[idx] !== undefined ? `${letters[answers[idx]]}. ` : 'Skipped'}</strong>
                    {answers[idx] !== undefined && <span dangerouslySetInnerHTML={{ __html: q.options[answers[idx]] }} />}
                  </div>
                  {!isCorrect && (
                    <div style={{ color: 'var(--secondary)', marginBottom: '0.5rem' }}>
                      Correct answer: <strong>{letters[q.answer]}. </strong><span dangerouslySetInnerHTML={{ __html: q.options[q.answer] }} />
                    </div>
                  )}
                  {q.explanation && q.explanation.length > 5 && (
                    <div className="explanation">
                      <strong style={{ color: 'var(--text-main)' }}>Explanation:</strong> <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <button 
        className="theme-toggle" 
        onClick={() => setIsDarkMode(!isDarkMode)}
        aria-label="Toggle Dark Mode"
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="app-container">
        {gameState === 'home' && renderHome()}
        {gameState === 'testing' && renderTesting()}
        {gameState === 'results' && renderResults()}
      </div>
    </>
  );
}

export default App;
