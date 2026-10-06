import React, { useState, useEffect } from 'react';
import subjectsData from './data/offline_questions.json';
import { Clock, CheckCircle2, XCircle, ArrowRight, ArrowLeft, RefreshCw, BookOpen, Moon, Sun } from 'lucide-react';

function App() {
  const [gameState, setGameState] = useState('home'); // home, testing, results
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { index: selectedOptionIndex }
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Default to dark mode for that premium "cool reading" vibe
  const [isDarkMode, setIsDarkMode] = useState(true);

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
      if (selectedSubjects.length < 4) { // Max 4 subjects for JAMB
        setSelectedSubjects(prev => [...prev, subjectKey]);
      }
    }
  };

  const startExam = () => {
    if (selectedSubjects.length === 0) return;
    
    // Combine questions from selected subjects - but limit them like real JAMB!
    let combined = [];
    selectedSubjects.forEach(sub => {
      // Get questions for the subject
      let qs = subjectsData[sub].questions;
      
      // Shuffle the questions array so you get different questions every time
      qs = [...qs].sort(() => 0.5 - Math.random());
      
      // JAMB format: Use 60 questions for English, 40 for others
      let limit = sub.toLowerCase() === 'english' ? 60 : 40;
      
      qs = qs.slice(0, limit).map(q => ({
        ...q,
        subject: subjectsData[sub].name
      }));
      combined = [...combined, ...qs];
    });
    
    // Shuffle the final combined list slightly to mix subjects, or leave them grouped
    // Let's leave them grouped so they can navigate sequentially like subjects
    
    setCurrentQuestions(combined);
    setAnswers({});
    setCurrentQuestionIndex(0);
    
    // Standard JAMB time: 2 hours (120 mins) for 4 subjects (approx 180 questions). Let's do 40 secs per question to be safe.
    setTimeLeft(combined.length * 40); 
    setGameState('testing');
  };

  const submitExam = () => {
    setGameState('results');
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: optionIndex
    }));
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
      <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.25rem', lineHeight: '1.6' }}>
        Experience the real CBT environment with dark mode for strain-free reading. Select up to 4 subjects to begin your mock exam.
      </p>
      
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
        Start Mock Exam ({selectedSubjects.length}/4) <ArrowRight size={24} />
      </button>
    </div>
  );

  const renderTesting = () => {
    const q = currentQuestions[currentQuestionIndex];
    const letters = ['A', 'B', 'C', 'D'];
    
    return (
      <div className="glass-card" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '3rem' }}>
        <div className="cbt-header">
          <div>
            <div className="subject-badge">{q.subject.toUpperCase()}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.5rem' }}>
              Question {currentQuestionIndex + 1} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1.2rem' }}>of {currentQuestions.length}</span>
            </div>
          </div>
          <div className="timer">
            <Clock size={24} />
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="question-area" dangerouslySetInnerHTML={{ __html: q.text }} />

        <div className="options-list">
          {q.options.map((opt, idx) => (
            <button 
              key={idx}
              className={`option-btn ${answers[currentQuestionIndex] === idx ? 'selected' : ''}`}
              onClick={() => handleSelectOption(idx)}
            >
              <div className="option-letter">{letters[idx]}</div>
              <span style={{ flex: 1, lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: opt }} />
            </button>
          ))}
        </div>

        <div className="cbt-footer">
          <button 
            className="btn btn-outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft size={20} /> Previous
          </button>
          
          {currentQuestionIndex === currentQuestions.length - 1 ? (
            <button className="btn btn-primary" style={{ background: 'var(--secondary)' }} onClick={submitExam}>
              Submit Exam <CheckCircle2 size={20} />
            </button>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={() => setCurrentQuestionIndex(prev => Math.min(currentQuestions.length - 1, prev + 1))}
            >
              Next <ArrowRight size={20} />
            </button>
          )}
        </div>

        <div className="nav-grid">
          {currentQuestions.map((_, idx) => (
            <button 
              key={idx}
              className={`nav-btn ${answers[idx] !== undefined ? 'answered' : ''} ${currentQuestionIndex === idx ? 'active' : ''}`}
              onClick={() => setCurrentQuestionIndex(idx)}
            >
              {idx + 1}
            </button>
          ))}
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
            <RefreshCw size={20} /> Take Another Mock Exam
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
