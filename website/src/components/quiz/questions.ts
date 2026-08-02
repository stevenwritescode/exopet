export type QuizAnswers = {
  enclosure: string;
  animals: string;
  water_infrastructure: string[];
  control: string[];
  monitor: string[];
  alerts: string;
  pain_point: string;
  buy_or_build: string;
};

export type Question = {
  key: keyof QuizAnswers;
  prompt: string;
  multi: boolean;
  options: { value: string; label: string }[];
};

export const QUESTIONS: Question[] = [
  {
    key: 'enclosure',
    prompt: 'What kind of enclosure do you keep?',
    multi: false,
    options: [
      { value: 'freshwater', label: 'Freshwater aquarium' },
      { value: 'saltwater', label: 'Saltwater aquarium' },
      { value: 'paludarium', label: 'Paludarium or vivarium' },
      { value: 'terrarium', label: 'Terrarium (reptile or amphibian)' },
      { value: 'multiple', label: 'Multiple, or something else' },
    ],
  },
  {
    key: 'animals',
    prompt: 'Who lives there?',
    multi: false,
    options: [
      { value: 'fish', label: 'Fish' },
      { value: 'amphibian', label: 'Axolotl or other amphibian' },
      { value: 'reptile', label: 'Reptile' },
      { value: 'invertebrates', label: 'Invertebrates' },
      { value: 'plants', label: 'Plants, mostly' },
      { value: 'mix', label: 'A mix' },
    ],
  },
  {
    key: 'water_infrastructure',
    prompt: 'What water infrastructure do you have?',
    multi: true,
    options: [
      { value: 'sump', label: 'A sump' },
      { value: 'reservoir', label: 'A reservoir or top-off container' },
      { value: 'drain', label: 'Drain access nearby' },
      { value: 'none', label: 'None of these' },
    ],
  },
  {
    key: 'control',
    prompt: 'What equipment would you want ExoPet to control?',
    multi: true,
    options: [
      { value: 'return_pump', label: 'Return or circulation pump' },
      { value: 'dosing_pump', label: 'Dosing pump' },
      { value: 'valves', label: 'Solenoid or motorized valves' },
      { value: 'heater', label: 'Heater' },
      { value: 'lights', label: 'Lights' },
      { value: 'mister', label: 'Mister or fogger' },
      { value: 'feeder', label: 'Auto feeder' },
      { value: 'none', label: 'Nothing yet, just curious' },
    ],
  },
  {
    key: 'monitor',
    prompt: 'What would you want monitored?',
    multi: true,
    options: [
      { value: 'temperature', label: 'Temperature' },
      { value: 'ph', label: 'pH' },
      { value: 'water_level', label: 'Water level' },
      { value: 'humidity', label: 'Humidity' },
      { value: 'salinity', label: 'Salinity or TDS' },
      { value: 'leak', label: 'Leak detection' },
    ],
  },
  {
    key: 'alerts',
    prompt: 'How should ExoPet get your attention?',
    multi: false,
    options: [
      { value: 'all', label: 'Notify me about anything off' },
      { value: 'critical_only', label: 'Only emergencies — leaks, temp spikes' },
      { value: 'none', label: 'I would just check a dashboard' },
    ],
  },
  {
    key: 'pain_point',
    prompt: 'What is the maintenance chore you would most like to lose?',
    multi: false,
    options: [
      { value: 'water_changes', label: 'Water changes' },
      { value: 'top_offs', label: 'Top-offs' },
      { value: 'dosing', label: 'Dosing' },
      { value: 'feeding', label: 'Feeding' },
      { value: 'misting', label: 'Misting and humidity' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'remembering', label: 'Remembering what I did last' },
    ],
  },
  {
    key: 'buy_or_build',
    prompt: 'If ExoPet fits your setup, would you rather…',
    multi: false,
    options: [
      { value: 'kit', label: 'Buy a ready-made kit' },
      { value: 'diy', label: 'Build it myself from a guide' },
      { value: 'exploring', label: 'Just exploring for now' },
    ],
  },
];
