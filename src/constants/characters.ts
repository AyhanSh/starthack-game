import type { CharacterDef } from '../types';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'analyst',
    name: 'THE ANALYST',
    title: 'The Analyst',
    accentColor: '#40c4ff',
    flavourQuote: "Spreadsheets don't lie. People do.",
    description: 'Calm, methodical, diversification-focused.',
  },
  {
    id: 'hustler',
    name: 'THE HUSTLER',
    title: 'The Hustler',
    accentColor: '#ff6d00',
    flavourQuote: 'Sleep is for people without alpha.',
    description: 'Aggressive, trend-chasing, high-risk.',
  },
  {
    id: 'retiree',
    name: 'THE RETIREE',
    title: 'The Retiree',
    accentColor: '#66bb6a',
    flavourQuote: "I've seen three crashes. I'll see three more.",
    description: 'Cautious, preservation-focused.',
  },
  {
    id: 'student',
    name: 'THE STUDENT',
    title: 'The Student',
    accentColor: '#ce93d8',
    flavourQuote: 'I watched one YouTube video. How hard can it be?',
    description: 'Curious, balanced but naive.',
  },
];

export function getCharacterById(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
