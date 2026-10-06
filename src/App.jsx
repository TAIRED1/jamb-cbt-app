import React, { useState, useEffect } from 'react';
import subjectsData from './data/offline_questions.json';
import { Clock, CheckCircle2, XCircle, ArrowRight, ArrowLeft, RefreshCw, BookOpen } from 'lucide-react';

function App() {
  const [gameState, setGameState] = useState('home'); // home, testing, results
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { index: selectedOptionIndex }
  const [timeLeft, setTimeLeft] = useState(0);

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
    
    // Combine questions from selected subjects
    let combined = [];
    selectedSubjects.forEach(sub => {
      const qs = subjectsData[sub].questions.map(q => ({
        ...q,
        subject: subjectsData[sub].name
      }));
      combined = [...combined, ...qs];
    });
    
    // In a real app, we'd shuffle. Here we just take them as is.
    setCurrentQuestions(combined);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTimeLeft(combined.length * 60); // 1 minute per question
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
      <h1>JAMB CBT Master</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.1rem' }}>
        Experience the real CBT environment. Select up to 4 subjects to begin your mock exam.
      </p>
      
      <div className="subject-grid">
        {Object.keys(subjectsData).map(key => (
          <div 
            key={key} 
            className={`subject-card ${selectedSubjects.includes(key) ? 'selected' : ''}`}
            onClick={() => toggleSubject(key)}
          >
            <BookOpen size={20} color={selectedSubjects.includes(key) ? 'var(--primary)' : 'var(--text-muted)'} />
            {subjectsData[key].name}
          </div>
        ))}
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={startExam}
        disabled={selectedSubjects.length === 0}
        style={{ marginTop: '1rem', width: '100%', padding: '1rem' }}
      >
        Start Mock Exam ({selectedSubjects.length}/4) <ArrowRight size={20} />
      </button>
    </div>
  );

  const renderTesting = () => {
    const q = currentQuestions[currentQuestionIndex];
    const letters = ['A', 'B', 'C', 'D'];
    
    return (
      <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto', width: '100%', padding: '2rem' }}>
        <div className="cbt-header">
          <div>
            <div style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>
              SUBJECT: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{q.subject.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '0.25rem' }}>
              Question {currentQuestionIndex + 1} of {currentQuestions.length}
            </div>
          </div>
          <div className="timer">
            <Clock size={20} />
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
              <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: opt }} />
            </button>
          ))}
        </div>

        <div className="cbt-footer">
          <button 
            className="btn btn-outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft size={18} /> Previous
          </button>
          
          {currentQuestionIndex === currentQuestions.length - 1 ? (
            <button className="btn btn-primary" style={{ background: 'var(--secondary)' }} onClick={submitExam}>
              Submit Exam <CheckCircle2 size={18} />
            </button>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={() => setCurrentQuestionIndex(prev => Math.min(currentQuestions.length - 1, prev + 1))}
            >
              Next <ArrowRight size={18} />
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
      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div className="result-card">
          <h1>Exam Results</h1>
          <div className="score-circle" style={{ '--percentage': percentage }}>
            <div className="score-inner">
              <h2>{score}/{total}</h2>
              <span style={{ color: 'var(--text-muted)' }}>Score</span>
            </div>
          </div>
          
          <button className="btn btn-primary" onClick={() => { setGameState('home'); setSelectedSubjects([]); }}>
            <RefreshCw size={18} /> Take Another Mock
          </button>
        </div>

        <div className="review-section">
          <h2 style={{ marginBottom: '1.5rem' }}>Detailed Review</h2>
          {currentQuestions.map((q, idx) => {
            const isCorrect = answers[idx] === q.answer;
            const letters = ['A', 'B', 'C', 'D'];
            
            return (
              <div key={idx} className={`review-item ${isCorrect ? 'correct' : 'wrong'}`}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  {isCorrect ? <CheckCircle2 color="var(--secondary)" size={20} style={{ flexShrink: 0, marginTop: '3px' }}/> : <XCircle color="var(--danger)" size={20} style={{ flexShrink: 0, marginTop: '3px' }}/>}
                  <span style={{ fontWeight: 600 }}>Question {idx + 1} ({q.subject}):</span> <span dangerouslySetInnerHTML={{ __html: q.text }} />
                </div>
                
                <div style={{ marginLeft: '1.75rem' }}>
                  <div style={{ color: isCorrect ? 'var(--text-main)' : 'var(--danger)' }}>
                    Your answer: <strong>{answers[idx] !== undefined ? `${letters[answers[idx]]}. ` : 'Skipped'}</strong>
                    {answers[idx] !== undefined && <span dangerouslySetInnerHTML={{ __html: q.options[answers[idx]] }} />}
                  </div>
                  {!isCorrect && (
                    <div style={{ color: 'var(--secondary)' }}>
                      Correct answer: <strong>{letters[q.answer]}. </strong><span dangerouslySetInnerHTML={{ __html: q.options[q.answer] }} />
                    </div>
                  )}
                  <div className="explanation">
                    <strong>Explanation:</strong> <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {gameState === 'home' && renderHome()}
      {gameState === 'testing' && renderTesting()}
      {gameState === 'results' && renderResults()}
    </div>
  );
}

export default App;
