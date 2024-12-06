class Queue {
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

class Team {
    constructor(name) {
        this.name = name;
        this.wins = 0;
        this.currentStreak = 0;
    }
}

class GameState {
    static WAITING_FOR_TEAMS = "WAITING_FOR_TEAMS";
    static MATCH_IN_PROGRESS = "MATCH_IN_PROGRESS";
    static WINNER_NEEDS_CHALLENGER = "WINNER_NEEDS_CHALLENGER";
}

class MatchSlot {
    constructor(position) {
        this.position = position; // 'A' or 'B'
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

class GameManager {
    constructor() {
        this.slotA = new MatchSlot("A");
        this.slotB = new MatchSlot("B");
        this.queue = new Queue();
        this.errorTimeout = null;
        this.currentState = GameState.WAITING_FOR_TEAMS;

        this.initializeEventListeners();
        this.loadGameState();
        this.updateDisplay();
    }

    showError(message) {
        const errorDiv = document.getElementById("error-message");
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
        const teamName = input.value.trim().toUpperCase();

        if (!teamName) {
            this.showError("Please enter a team name");
            return;
        }

        if (
            this.queue.items.some((team) => team.name === teamName) ||
            this.slotA.team?.name === teamName ||
            this.slotB.team?.name === teamName
        ) {
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
        this.updateDisplay();
    }

    removeTeam(teamName) {
        // If the team is in the current match, we need to handle that
        if (
            this.slotA.team?.name === teamName ||
            this.slotB.team?.name === teamName
        ) {
            this.slotA.team = null;
            this.slotB.team = null;
            this.setupNextMatch();
        }

        this.queue.remove(teamName);
        this.saveGameState();
        this.updateDisplay();
    }

    moveTeamUp(teamName) {
        this.queue.moveUp(teamName);
        this.saveGameState();
        this.updateDisplay();
    }

    moveTeamDown(teamName) {
        this.queue.moveDown(teamName);
        this.saveGameState();
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
            this.updateDisplay();
        }
    }

    saveGameState() {
        const state = {
            queueItems: this.queue.items,
            teamInMatchA: this.slotA.team,
            teamInMatchB: this.slotB.team,
            currentState: this.currentState,
        };
        localStorage.setItem("gameState", JSON.stringify(state));
    }

    resetGame() {
        localStorage.removeItem("gameState");
        location.reload(); // Refresh the page
    }

    editTeamName(oldName) {
        const newName = prompt("Enter new team name:", oldName)
            ?.trim()
            .toUpperCase();

        if (!newName || newName === oldName) {
            return;
        }

        // Check if new name already exists
        if (
            this.queue.items.some((team) => team.name === newName) ||
            this.slotA.team?.name === newName ||
            this.slotB.team?.name === newName
        ) {
            this.showError("Team name already exists");
            return;
        }

        // Update name in queue
        const team = this.queue.items.find((team) => team.name === oldName);
        if (team) {
            team.name = newName;
        }

        // Update name in slots if necessary
        if (this.slotA.team?.name === oldName) {
            this.slotA.team.name = newName;
        }
        if (this.slotB.team?.name === oldName) {
            this.slotB.team.name = newName;
        }

        this.saveGameState();
        this.updateDisplay();
    }

    handleResult(result) {
        if (this.slotA.isEmpty() || this.slotB.isEmpty()) {
            return;
        }

        if (result === "team1") {
            this.slotA.team.wins++;
            this.slotA.team.currentStreak++;

            this.slotB.team.currentStreak = 0;

            if (this.queue.items.length > 0) {
                this.queue.enqueue(this.slotB.team);
                this.slotB.clear();

                this.currentState = GameState.WINNER_NEEDS_CHALLENGER;
            }
        } else if (result === "team2") {
            this.slotB.team.wins++;
            this.slotB.team.currentStreak++;

            this.slotA.team.currentStreak = 0;

            if (this.queue.items.length > 0) {
                this.queue.enqueue(this.slotA.team);
                this.slotA.clear();

                // winner stays in their slot. no swap.
                this.currentState = GameState.WINNER_NEEDS_CHALLENGER;
            }
        } else if (result === "draw") {
            this.slotA.team.currentStreak = 0;
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

        // we don't save state here, because the next method alters the state again
        this.setupNextMatch();
    }

    updateDrawButton() {
        const drawButton = document.getElementById("draw-button");
        if (!drawButton) {
            return;
        }

        // Disable draw button if there's only one or no teams waiting
        drawButton.disabled = this.queue.size() <= 1;
    }

    updateDisplay() {
        const matchDisplay = document.getElementById("match-display");

        if (!this.slotA.isEmpty() && !this.slotB.isEmpty()) {
            document.getElementById("current-match").style.display = "flex";
            document.querySelector(".buttons").style.display = "flex";

            document.getElementById("team1").querySelector("h2").textContent =
                this.slotA.team.name;
            document.getElementById("team1-wins").textContent =
                this.slotA.team.wins;
            document.getElementById("team1-streak").textContent =
                this.slotA.team.currentStreak;

            document.getElementById("team2").querySelector("h2").textContent =
                this.slotB.team.name;
            document.getElementById("team2-wins").textContent =
                this.slotB.team.wins;
            document.getElementById("team2-streak").textContent =
                this.slotB.team.currentStreak;

            // Update no-match message based on queue size
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
            document.getElementById("current-match").style.display = "none";
            document.querySelector(".buttons").style.display = "none";

            const existingNoMatch = matchDisplay.querySelector(".no-match");
            if (existingNoMatch) {
                existingNoMatch.remove();
            }

            const noMatch = document.createElement("div");
            noMatch.className = "no-match";
            noMatch.textContent = "Add more teams to start matches";
            matchDisplay.appendChild(noMatch);
        }

        // Update queue display
        const queueList = document.getElementById("queue-list");
        queueList.innerHTML = "";
        this.queue.items.forEach((team, index) => {
            const li = document.createElement("li");
            li.className = "queue-item";
            li.innerHTML = `
                <span>${team.name} (Wins: ${team.wins})</span>
                <div class="queue-item-buttons">
                <button class="move-button" onclick="game.moveTeamUp('${
                    team.name
                }')" ${index === 0 ? "disabled" : ""}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-up"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <button class="move-button" onclick="game.moveTeamDown('${
                team.name
            }')" ${index === this.queue.items.length - 1 ? "disabled" : ""}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <button class="edit-team" onclick="game.editTeamName('${
                team.name
            }')">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
                    <button class="remove-team" onclick="game.removeTeam('${
                        team.name
                    }')">Remove</button>
                </div>
            `;
            queueList.appendChild(li);
        });

        // Update waiting count
        const waitingCount = document.getElementById("waiting-count");
        waitingCount.textContent = `(${this.queue.size()} waiting)`;

        // Update draw button state
        this.updateDrawButton();
    }

    setupNextMatch() {
        switch (this.currentState) {
            case GameState.WAITING_FOR_TEAMS:
                if (this.queue.size() >= 2) {
                    this.slotA.setTeam(this.queue.dequeue());
                    this.slotB.setTeam(this.queue.dequeue());
                    this.currentState = GameState.MATCH_IN_PROGRESS;
                }
                break;

            case GameState.WINNER_NEEDS_CHALLENGER:
                if (this.queue.size() >= 1) {
                    // Check which slot has the winner
                    if (!this.slotA.isEmpty()) {
                        // Winner in A, fill B
                        this.slotB.setTeam(this.queue.dequeue());
                    } else {
                        // Winner in B, fill A
                        this.slotA.setTeam(this.queue.dequeue());
                    }
                    this.currentState = GameState.MATCH_IN_PROGRESS;
                }
                break;
        }

        this.saveGameState();
        this.updateDisplay();
    }

    initializeEventListeners() {
        document
            .getElementById("new-team-name")
            .addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    this.addTeam();
                }
            });
    }
}

const game = new GameManager();
