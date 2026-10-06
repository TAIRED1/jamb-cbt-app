import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACCESS_TOKEN = "ALOC-4a5ecaf2041408d1f1ee"; 
const SUBJECTS = ['english', 'mathematics', 'physics', 'chemistry', 'biology', 'commerce', 'accounting'];
const MAX_REQUESTS_PER_SUBJECT = 150; // Try up to 150 times per subject
const MAX_CONSECUTIVE_FAILS = 25; // Don't give up until 25 batches in a row yield 0 new questions

// The known maximums from the ALOC dashboard
const ALOC_TOTALS = {
  english: 962,
  mathematics: 1041,
  physics: 681,
  chemistry: 881,
  biology: 1041,
  commerce: 1041,
  accounting: 1041
};

const outputPath = path.join(__dirname, 'offline_questions.json');
let outputData = {};

// Load existing data to save API calls and time
if (fs.existsSync(outputPath)) {
  console.log('Loading existing questions to avoid starting from scratch...');
  const existingRaw = fs.readFileSync(outputPath, 'utf8');
  try {
    outputData = JSON.parse(existingRaw);
  } catch(e) {
    console.error('Failed to parse existing JSON, starting fresh.');
  }
}

console.log('Starting EXTREMELY AGGRESSIVE download to squeeze out the remaining questions...');

async function fetchSubjectBatch(subject) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'questions.aloc.com.ng',
      path: `/api/v2/m?subject=${subject}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'AccessToken': ACCESS_TOKEN,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  for (const subject of SUBJECTS) {
    console.log(`\n--- Mining ${subject.toUpperCase()} ---`);
    const uniqueQuestions = new Map();
    
    // Pre-populate with existing questions if any
    if (outputData[subject] && outputData[subject].questions) {
      outputData[subject].questions.forEach(q => {
        uniqueQuestions.set(q.id, q);
      });
      console.log(`Loaded ${uniqueQuestions.size} existing ${subject} questions.`);
    }

    let consecutiveDuplicateBatches = 0;
    const targetTotal = ALOC_TOTALS[subject] || 1000;

    for (let i = 0; i < MAX_REQUESTS_PER_SUBJECT; i++) {
      if (uniqueQuestions.size >= targetTotal) {
        console.log(`\nReached dashboard maximum for ${subject} (${uniqueQuestions.size}/${targetTotal})! Moving on...`);
        break;
      }

      try {
        const response = await fetchSubjectBatch(subject);
        if (response && response.data && Array.isArray(response.data)) {
          let newQuestionsAdded = 0;
          
          for (const q of response.data) {
            if (!uniqueQuestions.has(q.id)) {
              uniqueQuestions.set(q.id, {
                id: q.id,
                text: q.question,
                options: [q.option.a || '', q.option.b || '', q.option.c || '', q.option.d || ''],
                answer: q.answer === 'a' ? 0 : q.answer === 'b' ? 1 : q.answer === 'c' ? 2 : 3,
                explanation: q.solution || "No explanation provided."
              });
              newQuestionsAdded++;
            }
          }
          
          process.stdout.write(`Attempt ${i+1}: Found ${newQuestionsAdded} new. (Total gathered: ${uniqueQuestions.size}/${targetTotal})\r`);
          
          if (newQuestionsAdded === 0) {
            consecutiveDuplicateBatches++;
            if (consecutiveDuplicateBatches >= MAX_CONSECUTIVE_FAILS) {
              console.log(`\nStopping early for ${subject}, no new questions found in ${MAX_CONSECUTIVE_FAILS} consecutive batches. We likely squeezed it dry.`);
              break;
            }
          } else {
            // Reset consecutive fails if we found at least one new question
            consecutiveDuplicateBatches = 0;
          }
        } else {
            console.log(`\nWarning: API didn't return an array for ${subject}. It might be rate-limiting us.`);
            await delay(2000); // Wait longer if API acts up
        }
      } catch (e) {
        console.error(`\nError fetching ${subject}:`, e.message);
      }
      
      // Delay to avoid overwhelming the server
      await delay(700); 
    }

    outputData[subject] = {
      name: subject.charAt(0).toUpperCase() + subject.slice(1),
      questions: Array.from(uniqueQuestions.values())
    };
    
    // Save incrementally so we don't lose data if it crashes
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n✅ Finished ${subject} with ${uniqueQuestions.size} unique questions! (Saved to disk)`);
  }

  console.log(`\n🎉 EXTREME FETCH COMPLETE! Final database has ${Object.keys(outputData).reduce((acc, cur) => acc + outputData[cur].questions.length, 0)} questions!`);
}

run();
