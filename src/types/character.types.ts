export type CharacterID = 'analyst' | 'hustler' | 'retiree' | 'student';

export type AnimationState =
  | 'idle'
  | 'typing'
  | 'excited'
  | 'worried'
  | 'panic'
  | 'celebrating'
  | 'defeated'
  | 'standing'
  | 'standingVictory'
  | 'standingDefeat';

export type SpriteFrame = string[][];

export interface CharacterDef {
  id: CharacterID;
  name: string;
  title: string;
  accentColor: string;
  flavourQuote: string;
  description: string;
}
