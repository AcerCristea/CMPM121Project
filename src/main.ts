// Wrap your code inside the window.onload event
window.onload = () => {
  // Define the canvas and context inside the event handler
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const nextTurnButton = document.getElementById('nextTurnButton') as HTMLButtonElement;
  const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
  const loadButton = document.getElementById('loadButton') as HTMLButtonElement;
  const undoButton = document.getElementById('undoButton') as HTMLButtonElement;
  const redoButton = document.getElementById('redoButton') as HTMLButtonElement;

  // Game settings
  const GRID_WIDTH = 20;
  const GRID_HEIGHT = 15;
  const CELL_SIZE = 40;
  const CELL_COUNT = GRID_WIDTH * GRID_HEIGHT;
  const CELL_DATA_SIZE = 4; // sun, moisture, plantType, growthLevel
  const PLAYER_DATA_SIZE = 2; // playerX, playerY
  const TURN_DATA_SIZE = 4; // turn number (Uint32)
  const GRID_DATA_SIZE = CELL_COUNT * CELL_DATA_SIZE;
  const GAME_STATE_SIZE = GRID_DATA_SIZE + PLAYER_DATA_SIZE + TURN_DATA_SIZE;

  // Enumerations for directions
  enum Direction {
    Up,
    Down,
    Left,
    Right,
  }

  // Plant types
  enum PlantType {
    None = 0,
    Wheat = 1,
    Corn = 2,
    Rice = 3,
  }

  // Game class
  class Game {
    gameState: Uint8Array;
    actionMode: 'none' | 'sow' | 'reap';
    victoryConditionMet: boolean;
    fullyGrownPlantsReaped: number;
    history: Uint8Array[]; // For undo functionality
    future: Uint8Array[]; // For redo functionality

    // Color mapping for plant types and growth levels
    private plantGrowthColors: { [key in PlantType]: string[] } = {
      [PlantType.Wheat]: ['goldenrod', 'darkgoldenrod', 'black'],
      [PlantType.Corn]: ['yellowgreen', 'green', 'black'],
      [PlantType.Rice]: ['lightblue', 'blue', 'black'],
      [PlantType.None]: ['', '', ''],
    };

    constructor() {
      this.gameState = new Uint8Array(GAME_STATE_SIZE);
      this.actionMode = 'none';
      this.victoryConditionMet = false;
      this.fullyGrownPlantsReaped = 0;
      this.history = [];
      this.future = [];

      // Initialize game state
      this.initializeGameState();

      // Event listeners for player movement and actions
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));
      nextTurnButton.addEventListener('click', () => this.nextTurn());
      saveButton.addEventListener('click', () => this.saveGame());
      loadButton.addEventListener('click', () => this.loadGame());
      undoButton.addEventListener('click', () => this.undo());
      redoButton.addEventListener('click', () => this.redo());

      // Check for auto-save
      this.checkAutoSave();

      // Start the game loop
      this.gameLoop();
    }

    initializeGameState() {
      // Initialize cells
      for (let i = 0; i < GRID_DATA_SIZE; i += CELL_DATA_SIZE) {
        // Set sun, moisture, plantType, growthLevel to zero
        this.gameState[i] = 0; // sun
        this.gameState[i + 1] = 0; // moisture
        this.gameState[i + 2] = PlantType.None; // plantType
        this.gameState[i + 3] = 0; // growthLevel
      }

      // Initialize player position to center
      this.setPlayerPosition(Math.floor(GRID_WIDTH / 2), Math.floor(GRID_HEIGHT / 2));

      // Initialize turn number
      this.setTurnNumber(0);

      // Save initial state for undo functionality
      this.pushStateToHistory();
    }

    getCellIndex(x: number, y: number): number {
      return (y * GRID_WIDTH + x) * CELL_DATA_SIZE;
    }

    setPlayerPosition(x: number, y: number) {
      const playerIndex = GRID_DATA_SIZE;
      this.gameState[playerIndex] = x;
      this.gameState[playerIndex + 1] = y;
    }

    getPlayerX(): number {
      return this.gameState[GRID_DATA_SIZE];
    }

    getPlayerY(): number {
      return this.gameState[GRID_DATA_SIZE + 1];
    }

    setTurnNumber(turn: number) {
      const turnIndex = GRID_DATA_SIZE + PLAYER_DATA_SIZE;
      const view = new DataView(this.gameState.buffer);
      view.setUint32(turnIndex, turn);
    }

    getTurnNumber(): number {
      const turnIndex = GRID_DATA_SIZE + PLAYER_DATA_SIZE;
      const view = new DataView(this.gameState.buffer);
      return view.getUint32(turnIndex);
    }

    handleKeyDown(event: KeyboardEvent) {
      if (this.victoryConditionMet) {
        return; // Ignore input after victory
      }

      if (this.actionMode === 'none') {
        switch (event.key) {
          case 'ArrowUp':
            this.movePlayer(Direction.Up);
            break;
          case 'ArrowDown':
            this.movePlayer(Direction.Down);
            break;
          case 'ArrowLeft':
            this.movePlayer(Direction.Left);
            break;
          case 'ArrowRight':
            this.movePlayer(Direction.Right);
            break;
          case 's':
          case 'S':
            this.actionMode = 'sow';
            break;
          case 'r':
          case 'R':
            this.actionMode = 'reap';
            break;
        }
      } else {
        // Expecting a direction key for the action
        let direction: Direction | null = null;
        switch (event.key) {
          case 'ArrowUp':
            direction = Direction.Up;
            break;
          case 'ArrowDown':
            direction = Direction.Down;
            break;
          case 'ArrowLeft':
            direction = Direction.Left;
            break;
          case 'ArrowRight':
            direction = Direction.Right;
            break;
          default:
            // Invalid key, exit action mode
            this.actionMode = 'none';
            return;
        }

        if (direction !== null) {
          this.performAction(direction);
          this.actionMode = 'none';
        }
      }
      this.draw();

      // Auto-save after each action
      this.autoSaveGame();
    }

    movePlayer(direction: Direction) {
      let x = this.getPlayerX();
      let y = this.getPlayerY();
      switch (direction) {
        case Direction.Up:
          if (y > 0) y--;
          break;
        case Direction.Down:
          if (y < GRID_HEIGHT - 1) y++;
          break;
        case Direction.Left:
          if (x > 0) x--;
          break;
        case Direction.Right:
          if (x < GRID_WIDTH - 1) x++;
          break;
      }
      this.setPlayerPosition(x, y);

      // Save state for undo
      this.pushStateToHistory();
    }

    performAction(direction: Direction) {
      let x = this.getPlayerX();
      let y = this.getPlayerY();
      let targetX = x;
      let targetY = y;
      switch (direction) {
        case Direction.Up:
          targetY = y - 1;
          break;
        case Direction.Down:
          targetY = y + 1;
          break;
        case Direction.Left:
          targetX = x - 1;
          break;
        case Direction.Right:
          targetX = x + 1;
          break;
      }

      if (targetX < 0 || targetX >= GRID_WIDTH || targetY < 0 || targetY >= GRID_HEIGHT) {
        return;
      }

      const cellIndex = this.getCellIndex(targetX, targetY);

      if (this.actionMode === 'sow') {
        const plantType = this.gameState[cellIndex + 2];
        if (plantType === PlantType.None) {
          const newPlantType = this.getRandomPlantType();
          this.gameState[cellIndex + 2] = newPlantType;
          this.gameState[cellIndex + 3] = 1; // growthLevel
          // Save state for undo
          this.pushStateToHistory();
        }
      } else if (this.actionMode === 'reap') {
        const plantType = this.gameState[cellIndex + 2];
        const growthLevel = this.gameState[cellIndex + 3];
        if (plantType !== PlantType.None) {
          if (growthLevel >= 3) {
            this.fullyGrownPlantsReaped++;
          }
          this.gameState[cellIndex + 2] = PlantType.None;
          this.gameState[cellIndex + 3] = 0;
          // Save state for undo
          this.pushStateToHistory();
          // Check victory condition
          this.checkVictoryCondition();
        }
      }
    }

    getRandomPlantType(): PlantType {
      const plantTypes = [PlantType.Wheat, PlantType.Corn, PlantType.Rice];
      const randomIndex = Math.floor(Math.random() * plantTypes.length);
      return plantTypes[randomIndex];
    }

    nextTurn() {
      if (this.victoryConditionMet) {
        return; // Game already won
      }

      let turn = this.getTurnNumber();
      turn++;
      this.setTurnNumber(turn);

      // Update resources and grow plants
      for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
          const cellIndex = this.getCellIndex(x, y);
          // Update resources
          this.gameState[cellIndex] = Math.floor(Math.random() * 256); // sun
          const water = Math.floor(Math.random() * 256); // water
          let moisture = this.gameState[cellIndex + 1];
          moisture += Math.floor(water * 0.5);
          moisture = Math.min(moisture, 255);
          this.gameState[cellIndex + 1] = moisture;

          // Grow plants
          const plantType = this.gameState[cellIndex + 2];
          const growthLevel = this.gameState[cellIndex + 3];
          if (plantType !== PlantType.None && growthLevel < 3) {
            const canGrow = this.checkGrowthConditions(x, y);
            if (canGrow) {
              this.gameState[cellIndex + 3] = growthLevel + 1;
            }
          }
        }
      }

      // Save state for undo
      this.pushStateToHistory();

      this.draw();

      // Auto-save after turn
      this.autoSaveGame();
    }

    checkGrowthConditions(x: number, y: number): boolean {
      const cellIndex = this.getCellIndex(x, y);
      const sun = this.gameState[cellIndex];
      const moisture = this.gameState[cellIndex + 1];
      const plantType = this.gameState[cellIndex + 2];

      const hasEnoughSun = sun > 128;
      const hasEnoughMoisture = moisture > 128;

      // Spatial rule: at least one adjacent cell has a plant of the same type
      let hasAdjacentSameType = false;
      const directions = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
      ];

      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
          const neighborIndex = this.getCellIndex(nx, ny);
          const neighborPlantType = this.gameState[neighborIndex + 2];
          if (neighborPlantType === plantType) {
            hasAdjacentSameType = true;
            break;
          }
        }
      }

      return hasEnoughSun && hasEnoughMoisture && hasAdjacentSameType;
    }

    checkVictoryCondition() {
      if (this.fullyGrownPlantsReaped >= 3) {
        this.victoryConditionMet = true;
        alert('Victory! You have reaped at least 3 fully grown plants.');
      }
    }

    gameLoop() {
      this.draw();
    }

    draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the grid
      for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
          const cellIndex = this.getCellIndex(x, y);
          const sun = this.gameState[cellIndex];
          const moisture = this.gameState[cellIndex + 1];
          const plantType = this.gameState[cellIndex + 2];
          const growthLevel = this.gameState[cellIndex + 3];

          // Determine cell color based on sun and moisture levels
          ctx.fillStyle = this.getCellColor(sun, moisture);
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

          ctx.strokeStyle = '#ccc';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

          // Draw the plant
          if (plantType !== PlantType.None) {
            ctx.fillStyle = this.plantGrowthColors[plantType][growthLevel - 1];
            ctx.fillRect(x * CELL_SIZE + 5, y * CELL_SIZE + 5, CELL_SIZE - 10, CELL_SIZE - 10);
          }
        }
      }

      // Draw the player
      const playerX = this.getPlayerX();
      const playerY = this.getPlayerY();
      ctx.fillStyle = 'red';
      ctx.fillRect(playerX * CELL_SIZE, playerY * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      // Indicate action mode
      if (this.actionMode !== 'none') {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(`Select direction to ${this.actionMode}`, 10, 30);
      }

      // Display the number of fully grown plants reaped
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.fillText(`Fully grown plants reaped: ${this.fullyGrownPlantsReaped}`, 10, canvas.height - 10);
    }

    getCellColor(sun: number, moisture: number): string {
      const hasSun = sun > 128;
      const hasMoisture = moisture > 128;

      if (hasSun && hasMoisture) {
        // Both sun and water
        return '#aaffaa'; // Light green
      } else if (hasSun && !hasMoisture) {
        // Sun but no water
        return '#ffffaa'; // Light yellow
      } else if (!hasSun && hasMoisture) {
        // Water but no sun
        return '#aaaaff'; // Light blue
      } else {
        // Neither sun nor water
        return '#dddddd'; // Light gray
      }
    }

    // Save game state to localStorage, including history
    saveGame() {
      const saveName = prompt('Enter a name for your save:');
      if (saveName) {
        const saveData = {
          gameState: Array.from(this.gameState),
          history: this.history.map(state => Array.from(state)),
          fullyGrownPlantsReaped: this.fullyGrownPlantsReaped,
        };
        localStorage.setItem(`save_${saveName}`, JSON.stringify(saveData));
        alert(`Game saved as "${saveName}"`);
      }
    }

    // Load game state from localStorage, including history
    loadGame() {
      const saveName = prompt('Enter the name of the save to load:');
      if (saveName) {
        const savedData = localStorage.getItem(`save_${saveName}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          this.gameState = Uint8Array.from(parsedData.gameState);
          this.history = parsedData.history.map((state: number[]) => Uint8Array.from(state));
          this.fullyGrownPlantsReaped = parsedData.fullyGrownPlantsReaped || 0;
          this.future = [];
          this.victoryConditionMet = false;
          this.draw();
          alert(`Game "${saveName}" loaded.`);
        } else {
          alert(`Save "${saveName}" not found.`);
        }
      }
    }

    // Auto-save game state, including history
    autoSaveGame() {
      const autoSaveData = {
        gameState: Array.from(this.gameState),
        history: this.history.map(state => Array.from(state)),
        fullyGrownPlantsReaped: this.fullyGrownPlantsReaped,
      };
      localStorage.setItem('autosave', JSON.stringify(autoSaveData));
    }

    // Check for auto-save on startup, including history
    checkAutoSave() {
      const autoSaveData = localStorage.getItem('autosave');
      if (autoSaveData) {
        const continueGame = confirm('An auto-save was found. Do you want to continue where you left off?');
        if (continueGame) {
          const parsedData = JSON.parse(autoSaveData);
          this.gameState = Uint8Array.from(parsedData.gameState);
          this.history = parsedData.history.map((state: number[]) => Uint8Array.from(state));
          this.fullyGrownPlantsReaped = parsedData.fullyGrownPlantsReaped || 0;
          this.future = [];
          this.victoryConditionMet = false;
          this.draw();
        }
      }
    }

    // Undo functionality
    undo() {
      if (this.history.length > 1) {
        this.future.push(this.history.pop()!); // Move current state to future stack
        this.gameState = Uint8Array.from(this.history[this.history.length - 1]);
        this.draw();
      }
    }

    // Redo functionality
    redo() {
      if (this.future.length > 0) {
        const nextState = this.future.pop()!;
        this.history.push(nextState);
        this.gameState = Uint8Array.from(nextState);
        this.draw();
      }
    }

    // Save current state to history
    pushStateToHistory() {
      // Limit history size if necessary
      if (this.history.length > 100) {
        this.history.shift();
      }
      this.history.push(Uint8Array.from(this.gameState));
      this.future = []; // Clear future stack on new action
    }
  }

  // Initialize the game
  const game = new Game();
};
