import { leagueTierForClub } from './careerLeague.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Game-balance model, not a real roster simulation. Ability earns playing time;
// the small newcomer penalty fades gradually, rather than jumping at age 18.
// CDB uses its competitive tier (3), not its unrestricted entry requirement.
export function seasonMinutesFor(age, overall, club, formRoll = .5) {
  const rating = clamp(Number(overall) || 0, 0, 100);
  const newcomerPenalty = clamp(21 - age, 0, 4);
  const competitionPenalty = (leagueTierForClub(club) - 1) * 1.5;
  // Low-level players can stay on the bench. This penalty fades with ability
  // and disappears at 65, preserving the established rotation for better players.
  const lowRatingPenalty = 5 * clamp((65 - rating) / 21, 0, 1);
  const variation = (clamp(Number(formRoll) || 0, 0, 1) - .5) * 5;
  return Math.round(clamp(12 + (rating - 40) * .55 - newcomerPenalty - competitionPenalty - lowRatingPenalty + variation, 0, 38));
}
