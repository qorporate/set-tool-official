import { Team } from "./classes/team";
import { GameState } from "./classes/gameState";

export type Slot = "A" | "B";

export interface State {
    queueItems: Team[];
    teamInMatchA: Team | null;
    teamInMatchB: Team | null;
    currentState: GameState;
}

export enum MatchResult {
    Team1 = "team1",
    Team2 = "team2",
    Draw = "draw",
}
