import "server-only";

import { TOKEN_PATTERN } from "@/lib/guest-store";
import { listHouseholds } from "@/lib/guests";
import { addressLine } from "@/lib/names";
import { incrementScore, listScores } from "@/lib/score-store";

export type ScorePlace = {
  name: string;
  hits: number;
  yours: boolean;
};

export type ScoreBoard = {
  you: number;
  top: ScorePlace[];
};

const TOP = 5;

// Names come from the live guest list, so a removed household drops off the board.
async function boardFor(token: string): Promise<ScoreBoard | null> {
  const [scores, households] = await Promise.all([listScores(), listHouseholds()]);
  const viewer = households.find((household) => household.token === token);
  if (!viewer) return null;

  const named = new Map(households.map((household) => [household.token, household]));
  const ranked = scores
    .filter((score) => score.hits > 0 && named.has(score.token))
    .sort((a, b) => b.hits - a.hits || a.updatedAt.localeCompare(b.updatedAt));

  return {
    you: scores.find((score) => score.token === token)?.hits ?? 0,
    top: ranked.slice(0, TOP).map((score) => ({
      name: addressLine(named.get(score.token)!.people),
      hits: score.hits,
      yours: score.token === token,
    })),
  };
}

export function readScoreBoard(token: string): Promise<ScoreBoard | null> {
  if (!TOKEN_PATTERN.test(token)) return Promise.resolve(null);
  return boardFor(token);
}

export async function recordScore(token: string): Promise<ScoreBoard | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const households = await listHouseholds();
  if (!households.some((household) => household.token === token)) return null;
  await incrementScore(token);
  return boardFor(token);
}
