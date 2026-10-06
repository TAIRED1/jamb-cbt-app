import React, { useState } from 'react';
import { X } from 'lucide-react';

const Calculator = ({ onClose }) => {
  const [display, setDisplay] = useState('');

  const handleClick = (value) => {
    if (value === '=') {
      try {
        // Safe evaluation of simple math
        // eslint-disable-next-line
        setDisplay(eval(display).toString());
      } catch (e) {
        setDisplay('Error');
      }
    } else if (value === 'C') {
      setDisplay('');
    } else if (value === 'DEL') {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay(display + value);
    }
  };

  const buttons = [
    'C', 'DEL', '/', '*',
    '7', '8', '9', '-',
    '4', '5', '6', '+',
    '1', '2', '3', '=',
    '0', '.', '(', ')'
  ];

  return (
    <div className="calculator-container glass-card">
      <div className="calculator-header">
        <h4>Calculator</h4>
        <button onClick={onClose} className="close-btn"><X size={18} /></button>
      </div>
      <div className="calculator-display">
        {display || '0'}
      </div>
      <div className="calculator-grid">
        {buttons.map((btn, idx) => (
          <button 
            key={idx} 
            className={`calc-btn ${btn === '=' ? 'calc-btn-primary' : ''}`}
            onClick={() => handleClick(btn)}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Calculator;
