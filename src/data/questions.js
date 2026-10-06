export const subjectsData = {
  english: {
    name: "Use of English",
    questions: [
      { id: 1, text: "Choose the word most nearly opposite in meaning to the italicized word: The man's behavior was rather 'eccentric'.", options: ["Normal", "Strange", "Erratic", "Peculiar"], answer: 0, explanation: "Eccentric means unconventional or slightly strange. The opposite is Normal." },
      { id: 2, text: "Complete the sentence: The team ___ of eleven players.", options: ["consist", "consists", "comprises", "comprise"], answer: 1, explanation: "The team is a singular collective noun, so it takes a singular verb 'consists'." },
      { id: 3, text: "Identify the figure of speech: 'The leaves danced in the wind.'", options: ["Simile", "Metaphor", "Personification", "Hyperbole"], answer: 2, explanation: "Personification gives human qualities (dancing) to non-human things (leaves)." },
      { id: 4, text: "Which of the following is correctly spelt?", options: ["Accomodation", "Accommodation", "Accomodasion", "Acommodation"], answer: 1, explanation: "Accommodation is spelt with double 'c' and double 'm'." },
      { id: 5, text: "Choose the correct option: Neither the teacher nor the students ___ present.", options: ["was", "were", "is", "has been"], answer: 1, explanation: "In a 'neither/nor' construction, the verb agrees with the noun closest to it (students, plural)." }
    ]
  },
  mathematics: {
    name: "Mathematics",
    questions: [
      { id: 1, text: "If log 2 = 0.3010 and log 3 = 0.4771, evaluate log 6", options: ["0.7781", "0.1761", "0.9030", "0.9542"], answer: 0, explanation: "log 6 = log(2 * 3) = log 2 + log 3 = 0.3010 + 0.4771 = 0.7781" },
      { id: 2, text: "Solve for x: 2x - 5 = 3x + 2", options: ["-7", "7", "3", "-3"], answer: 0, explanation: "2x - 3x = 2 + 5 -> -x = 7 -> x = -7" },
      { id: 3, text: "Find the derivative of y = x^3 - 2x^2 + 5", options: ["3x^2 - 4x", "3x^2 - 2x + 5", "x^2 - 4x", "3x^2 + 4x"], answer: 0, explanation: "dy/dx = d(x^3)/dx - d(2x^2)/dx + d(5)/dx = 3x^2 - 4x" },
      { id: 4, text: "What is the probability of getting a sum of 7 when two fair dice are rolled?", options: ["1/6", "1/12", "1/36", "7/36"], answer: 0, explanation: "Favorable outcomes (1,6), (2,5), (3,4), (4,3), (5,2), (6,1). Total outcomes = 36. Prob = 6/36 = 1/6." },
      { id: 5, text: "Evaluate the integral of 2x dx from x=0 to x=2", options: ["2", "4", "8", "0"], answer: 1, explanation: "Integral of 2x is x^2. Evaluated from 0 to 2 gives 2^2 - 0^2 = 4." }
    ]
  },
  physics: {
    name: "Physics",
    questions: [
      { id: 1, text: "The SI unit of force is:", options: ["Joule", "Watt", "Newton", "Pascal"], answer: 2, explanation: "Force is measured in Newtons (N)." },
      { id: 2, text: "Calculate the kinetic energy of a 2kg body moving with a velocity of 5m/s.", options: ["10 J", "25 J", "50 J", "5 J"], answer: 1, explanation: "KE = 1/2 * m * v^2 = 1/2 * 2 * 25 = 25 J." },
      { id: 3, text: "Which of the following is a scalar quantity?", options: ["Velocity", "Acceleration", "Force", "Speed"], answer: 3, explanation: "Speed has only magnitude, making it a scalar. The others have direction (vectors)." },
      { id: 4, text: "The phenomenon where a wave changes direction as it passes from one medium to another is called:", options: ["Reflection", "Refraction", "Diffraction", "Interference"], answer: 1, explanation: "Refraction is the bending of light (or any wave) as it passes between media of different densities." },
      { id: 5, text: "Ohm's Law relates which three quantities?", options: ["Voltage, Current, Resistance", "Work, Energy, Power", "Force, Mass, Acceleration", "Charge, Distance, Force"], answer: 0, explanation: "Ohm's Law: V = I * R (Voltage = Current * Resistance)." }
    ]
  },
  chemistry: {
    name: "Chemistry",
    questions: [
      { id: 1, text: "What is the chemical symbol for Gold?", options: ["Ag", "Au", "Pb", "Fe"], answer: 1, explanation: "Au is the symbol for Gold, from the Latin word 'aurum'." },
      { id: 2, text: "Which of the following is a noble gas?", options: ["Nitrogen", "Oxygen", "Chlorine", "Argon"], answer: 3, explanation: "Argon is a noble gas (Group 18), known for its lack of chemical reactivity." },
      { id: 3, text: "The pH of a neutral solution at 25°C is:", options: ["0", "7", "14", "1"], answer: 1, explanation: "Neutral solutions have a pH of 7." },
      { id: 4, text: "What type of bond is formed when electrons are shared between atoms?", options: ["Ionic", "Covalent", "Metallic", "Hydrogen"], answer: 1, explanation: "Covalent bonds involve the sharing of electron pairs between atoms." },
      { id: 5, text: "An isotope has the same number of protons but a different number of:", options: ["Electrons", "Ions", "Neutrons", "Atoms"], answer: 2, explanation: "Isotopes are variants of an element with different numbers of neutrons (different mass number)." }
    ]
  }
};
