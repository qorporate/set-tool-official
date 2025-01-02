// src/classes/team.ts
class Team {
  name;
  wins;
  draws;
  losses;
  currentStreak;
  constructor(name) {
    this.name = name;
    this.wins = 0;
    this.draws = 0;
    this.losses = 0;
    this.currentStreak = 0;
  }
}

// src/classes/matchSlot.ts
class MatchSlot {
  position;
  team;
  constructor(position) {
    this.position = position;
    this.team = null;
  }
  setTeam(team) {
    this.team = team;
  }
  clear() {
    this.team = null;
  }
  isEmpty() {
    return this.team === null;
  }
}

// src/classes/queue.ts
class Queue {
  items;
  constructor() {
    this.items = [];
  }
  enqueue(item) {
    this.items.push(item);
  }
  dequeue() {
    return this.items.shift();
  }
  peek() {
    return this.items[0];
  }
  isEmpty() {
    return this.items.length === 0;
  }
  size() {
    return this.items.length;
  }
  remove(teamName) {
    this.items = this.items.filter((team) => team.name !== teamName);
  }
  moveUp(teamName) {
    const index = this.items.findIndex((team) => team.name === teamName);
    if (index > 0) {
      const temp = this.items[index];
      this.items[index] = this.items[index - 1];
      this.items[index - 1] = temp;
    }
  }
  moveDown(teamName) {
    const index = this.items.findIndex((team) => team.name === teamName);
    if (index < this.items.length - 1) {
      const temp = this.items[index];
      this.items[index] = this.items[index + 1];
      this.items[index + 1] = temp;
    }
  }
}

// src/classes/gameState.ts
class GameState {
  static WAITING_FOR_TEAMS = "WAITING_FOR_TEAMS";
  static MATCH_IN_PROGRESS = "MATCH_IN_PROGRESS";
  static WINNER_NEEDS_CHALLENGER = "WINNER_NEEDS_CHALLENGER";
}

// src/classes/gameManager.ts
class GameManager {
  slotA;
  slotB;
  queue;
  currentState;
  errorTimeout;
  undoStack;
  redoStack;
  constructor() {
    this.slotA = new MatchSlot("A");
    this.slotB = new MatchSlot("B");
    this.queue = new Queue;
    this.errorTimeout = null;
    this.currentState = GameState.WAITING_FOR_TEAMS;
    this.loadGameState();
    this.undoStack = [this.captureCurrentState()];
    this.redoStack = [];
    this.initializeEventListeners();
    this.updateDisplay();
  }
  undo() {
    if (this.undoStack.length <= 1) {
      console.log("There are no actions to undo.");
      return;
    }
    const stateToRedo = this.undoStack.pop();
    this.redoStack.push(stateToRedo);
    const previousState = this.undoStack[this.undoStack.length - 1];
    this.restoreState(previousState);
  }
  redo() {
    if (this.redoStack.length === 0) {
      console.log("There are no actions to redo.");
      return;
    }
    const stateToUndo = this.redoStack.pop();
    this.undoStack.push(stateToUndo);
    this.restoreState(stateToUndo);
  }
  deepCopyTeam(team) {
    if (!team)
      return null;
    return {
      name: team.name,
      wins: team.wins,
      losses: team.losses,
      draws: team.draws,
      currentStreak: team.currentStreak
    };
  }
  showError(message) {
    const errorDiv = document.getElementById("error-message");
    if (!errorDiv) {
      throw Error("Uh Oh! Can't show an error!");
    }
    errorDiv.textContent = message;
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    this.errorTimeout = setTimeout(() => {
      errorDiv.textContent = "";
    }, 3000);
  }
  addTeam() {
    const input = document.getElementById("new-team-name");
    if (!input) {
      throw new Error("Uh oh! Can't get the new team name!");
    }
    const teamName = input.value.trim().toUpperCase();
    if (!teamName) {
      this.showError("Please enter a team name");
      return;
    }
    if (this.queue.items.some((team) => team.name === teamName) || this.slotA.team?.name === teamName || this.slotB.team?.name === teamName) {
      this.showError("Team name already exists");
      return;
    }
    const newTeam = new Team(teamName);
    this.queue.enqueue(newTeam);
    input.value = "";
    if (!this.slotA.team || !this.slotB.team) {
      this.setupNextMatch();
    }
    this.saveGameState();
    this.updateUndoStack(this.captureCurrentState());
    this.updateDisplay();
  }
  removeTeam(teamName) {
    if (this.slotA.team?.name === teamName || this.slotB.team?.name === teamName) {
      this.slotA.team = null;
      this.slotB.team = null;
      this.setupNextMatch();
    }
    this.queue.remove(teamName);
    this.saveGameState();
    this.updateUndoStack(this.captureCurrentState());
    this.updateDisplay();
  }
  moveTeamUp(teamName) {
    this.queue.moveUp(teamName);
    this.saveGameState();
    this.updateUndoStack(this.captureCurrentState());
    this.updateDisplay();
  }
  moveTeamDown(teamName) {
    this.queue.moveDown(teamName);
    this.saveGameState();
    this.updateUndoStack(this.captureCurrentState());
    this.updateDisplay();
  }
  loadGameState() {
    const savedState = localStorage.getItem("gameState");
    if (savedState) {
      const state = JSON.parse(savedState);
      this.queue.items = state.queueItems.map((item) => item);
      this.slotA.team = state.teamInMatchA ? state.teamInMatchA : null;
      this.slotB.team = state.teamInMatchB ? state.teamInMatchB : null;
      this.currentState = state.currentState;
    }
  }
  saveGameState() {
    const state = this.captureCurrentState();
    localStorage.setItem("gameState", JSON.stringify(state));
  }
  updateUndoStack(state) {
    this.undoStack.push(state);
    this.redoStack = [];
  }
  captureCurrentState() {
    return {
      queueItems: this.queue.items.map((team) => this.deepCopyTeam(team)),
      teamInMatchA: this.deepCopyTeam(this.slotA.team),
      teamInMatchB: this.deepCopyTeam(this.slotB.team),
      currentState: this.currentState
    };
  }
  restoreState(state) {
    this.queue.items = state.queueItems.map((team) => this.deepCopyTeam(team));
    this.slotA.team = this.deepCopyTeam(state.teamInMatchA);
    this.slotB.team = this.deepCopyTeam(state.teamInMatchB);
    this.currentState = state.currentState;
    this.saveGameState();
    this.updateDisplay();
  }
  resetGame() {
    const confirmation = confirm("Are you sure you want to reset the game? This action is unrecoverable.");
    if (confirmation) {
      localStorage.removeItem("gameState");
      location.reload();
    }
  }
  editTeamName(oldName) {
    const newName = prompt("Enter new team name:", oldName)?.trim().toUpperCase();
    if (!newName || newName === oldName) {
      return;
    }
    if (this.queue.items.some((team2) => team2.name === newName) || this.slotA.team?.name === newName || this.slotB.team?.name === newName) {
      this.showError("Team name already exists");
      return;
    }
    const team = this.queue.items.find((team2) => team2.name === oldName);
    if (team) {
      team.name = newName;
    }
    if (this.slotA.team?.name === oldName) {
      this.slotA.team.name = newName;
    }
    if (this.slotB.team?.name === oldName) {
      this.slotB.team.name = newName;
    }
    this.saveGameState();
    this.updateUndoStack(this.captureCurrentState());
    this.updateDisplay();
  }
  swapTeamInMatch(slot) {
    if (this.queue.isEmpty()) {
      this.showError("No teams in queue to swap");
      return;
    }
    const teamToSwap = slot === "A" ? this.slotA.team : this.slotB.team;
    if (!teamToSwap) {
      this.showError(`No team in slot ${slot} to swap`);
      return;
    }
    const newTeam = this.queue.items[0];
    if (!newTeam) {
      throw new Error("Queue is empty");
    }
    if (slot === "A") {
      this.slotA.setTeam(newTeam);
    } else {
      this.slotB.setTeam(newTeam);
    }
    this.queue.items[0] = teamToSwap;
    this.saveGameState();
    this.updateUndoStack(this.captureCurrentState());
    this.updateDisplay();
  }
  handleResult(result) {
    if (this.slotA.isEmpty() || this.slotB.isEmpty()) {
      return;
    }
    if (!this.slotA.team) {
      throw new Error("Uh oh! There's no team in slot A!");
    }
    if (!this.slotB.team) {
      throw new Error("Uh oh! There's no team in slot B!");
    }
    if (result === "team1") {
      this.slotA.team.wins++;
      this.slotA.team.currentStreak++;
      this.slotB.team.losses++;
      this.slotB.team.currentStreak = 0;
      if (this.queue.items.length > 0) {
        this.queue.enqueue(this.slotB.team);
        this.slotB.clear();
        this.currentState = GameState.WINNER_NEEDS_CHALLENGER;
      }
    } else if (result === "team2") {
      this.slotB.team.wins++;
      this.slotB.team.currentStreak++;
      this.slotA.team.losses++;
      this.slotA.team.currentStreak = 0;
      if (this.queue.items.length > 0) {
        this.queue.enqueue(this.slotA.team);
        this.slotA.clear();
        this.currentState = GameState.WINNER_NEEDS_CHALLENGER;
      }
    } else if (result === "draw") {
      this.slotA.team.draws++;
      this.slotA.team.currentStreak = 0;
      this.slotB.team.draws++;
      this.slotB.team.currentStreak = 0;
      if (this.slotA.team.wins <= this.slotB.team.wins) {
        this.queue.enqueue(this.slotA.team);
        this.queue.enqueue(this.slotB.team);
      } else {
        this.queue.enqueue(this.slotB.team);
        this.queue.enqueue(this.slotA.team);
      }
      this.slotA.clear();
      this.slotB.clear();
      this.currentState = GameState.WAITING_FOR_TEAMS;
    }
    this.setupNextMatch();
    this.saveGameState();
    this.updateUndoStack(this.captureCurrentState());
    this.updateDisplay();
  }
  updateDrawButton() {
    const drawButton = document.getElementById("draw-button");
    if (!drawButton) {
      return;
    }
    drawButton.hidden = this.queue.size() <= 1;
  }
  updateSwapButton() {
    const team1SwapButton = document.getElementById("team1-swap-button");
    if (!team1SwapButton) {
      throw new Error("Uh oh! No swap button for team 1.");
    }
    const team2SwapButton = document.getElementById("team2-swap-button");
    if (!team2SwapButton) {
      throw new Error("Uh oh! No swap button for team 2.");
    }
    if (this.queue.isEmpty()) {
      team1SwapButton.disabled = true;
      team2SwapButton.disabled = true;
    } else {
      team1SwapButton.disabled = false;
      team2SwapButton.disabled = false;
    }
  }
  updateUndoRedoButtons() {
    const undoButton = document.getElementById("undo-button");
    if (!undoButton) {
      throw new Error("Uh oh! No swap button for team 1.");
    }
    const redoButton = document.getElementById("redo-button");
    if (!redoButton) {
      throw new Error("Uh oh! No swap button for team 2.");
    }
    undoButton.disabled = this.undoStack.length <= 1;
    redoButton.disabled = this.redoStack.length === 0;
  }
  updateDisplay() {
    const matchDisplay = document.getElementById("match-display");
    if (!matchDisplay) {
      throw new Error("Uh oh! Can't get the match display element.");
    }
    const currentMatch = document.getElementById("current-match");
    if (!currentMatch) {
      throw new Error("Uh oh! Can't get the current match element!");
    }
    const buttons = document.querySelector(".buttons");
    if (!buttons) {
      throw new Error("Uh oh! Can't  get the buttons element!");
    }
    if (!this.slotA.isEmpty() && !this.slotB.isEmpty()) {
      if (!this.slotA.team) {
        throw new Error("Uh oh! There's no team in slot A!");
      }
      if (!this.slotB.team) {
        throw new Error("Uh oh! There's no team in slot B!");
      }
      currentMatch.style.display = "flex";
      buttons.style.display = "flex";
      getElementByQuerySelector(getElementById("team1"), "h2").textContent = this.slotA.team.name;
      getElementById("team1-stats").textContent = this.formatTeamStats(this.slotA.team);
      getElementById("team1-streak").textContent = this.slotA.team.currentStreak.toString();
      getElementByQuerySelector(getElementById("team2"), "h2").textContent = this.slotB.team.name;
      getElementById("team2-stats").textContent = this.formatTeamStats(this.slotB.team);
      getElementById("team2-streak").textContent = this.slotB.team.currentStreak.toString();
      getElementById("left-team-name").textContent = `${this.slotA.team.name} Wins`;
      getElementById("right-team-name").textContent = `${this.slotB.team.name} Wins`;
      const existingNoMatch = matchDisplay.querySelector(".no-match");
      if (existingNoMatch) {
        existingNoMatch.remove();
      }
      if (this.queue.size() < 1) {
        const noMatch = document.createElement("div");
        noMatch.className = "no-match";
        noMatch.textContent = "Add more teams to swap out losers";
        matchDisplay.appendChild(noMatch);
      }
    } else {
      currentMatch.style.display = "none";
      buttons.style.display = "none";
      const existingNoMatch = matchDisplay.querySelector(".no-match");
      if (existingNoMatch) {
        existingNoMatch.remove();
      }
      const noMatch = document.createElement("div");
      noMatch.className = "no-match";
      noMatch.textContent = "Add more teams to start matches";
      matchDisplay.appendChild(noMatch);
    }
    this.updateQueueDisplay();
    this.updateDrawButton();
    this.updateSwapButton();
    this.updateUndoRedoButtons();
    function getElementById(id) {
      const element = document.getElementById(id);
      if (!element) {
        throw new Error(`Uh oh! Can't get element with id ${id}`);
      }
      return element;
    }
    function getElementByQuerySelector(element, selector) {
      const innerElement = element.querySelector(selector);
      if (!innerElement) {
        throw new Error(`Uh oh! Can't get element with selector ${selector}`);
      }
      return innerElement;
    }
  }
  formatTeamStats(team) {
    return `${team.wins}W | ${team.draws}D | ${team.losses}L`;
  }
  updateQueueDisplay() {
    const queueList = document.getElementById("queue-list");
    if (!queueList) {
      throw new Error("Uh oh! Can't get the queue list element!");
    }
    queueList.innerHTML = "";
    this.queue.items.forEach((team, index) => {
      const li = document.createElement("li");
      li.className = "queue-item";
      li.innerHTML = `
            <span><b>${team.name}</b><br/><em>${this.formatTeamStats(team)}</em></span>
            <div class="queue-item-buttons">
                <button class="move-button" onclick="game.moveTeamUp('${team.name}')" ${index === 0 ? "disabled" : ""} aria-label="Move ${team.name} up">
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button class="move-button" onclick="game.moveTeamDown('${team.name}')" ${index === this.queue.items.length - 1 ? "disabled" : ""} aria-label="Move ${team.name} down">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <button class="edit-team-button match-team-button" onclick="game.editTeamName('${team.name}')" aria-label="Edit ${team.name}">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="remove-team" onclick="game.removeTeam('${team.name}')" aria-label="Remove ${team.name}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
      queueList.appendChild(li);
    });
    const waitingCount = document.getElementById("waiting-count");
    if (!waitingCount) {
      throw new Error("Uh oh! Can't get the waiting count element!");
    }
    waitingCount.textContent = `(${this.queue.size()} waiting)`;
  }
  setupNextMatch() {
    switch (this.currentState) {
      case GameState.WAITING_FOR_TEAMS:
        if (this.queue.size() >= 2) {
          const teamA = getTeamFromQueue(this);
          teamA.currentStreak = 0;
          const teamB = getTeamFromQueue(this);
          teamB.currentStreak = 0;
          this.slotA.setTeam(teamA);
          this.slotB.setTeam(teamB);
          this.currentState = GameState.MATCH_IN_PROGRESS;
        }
        break;
      case GameState.WINNER_NEEDS_CHALLENGER:
        if (this.queue.size() >= 1) {
          if (!this.slotA.isEmpty()) {
            const newTeam = getTeamFromQueue(this);
            newTeam.currentStreak = 0;
            this.slotB.setTeam(newTeam);
          } else {
            const newTeam = getTeamFromQueue(this);
            newTeam.currentStreak = 0;
            this.slotA.setTeam(newTeam);
          }
          this.currentState = GameState.MATCH_IN_PROGRESS;
        }
        break;
    }
    function getTeamFromQueue(gameManager) {
      const team = gameManager.queue.dequeue();
      if (team) {
        return team;
      } else {
        throw new Error("");
      }
    }
  }
  initializeEventListeners() {
    const newTeamNameElement = document.getElementById("new-team-name");
    if (!newTeamNameElement) {
      throw new Error("Uh oh! Can't init event listeners.");
    }
    newTeamNameElement.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.addTeam();
      }
    });
  }
}

// src/index.ts
var game = new GameManager;
