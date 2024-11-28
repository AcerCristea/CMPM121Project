// Wrap your code inside the window.onload event
window.onload = () => {
  // Define the canvas and context inside the event handler
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const nextTurnButton = document.getElementById('nextTurnButton') as HTMLButtonElement;

  // Game settings
  const GRID_WIDTH = 20;
  const GRID_HEIGHT = 15;
  const CELL_SIZE = 40;

  // Enumerations for directions
  enum Direction {
    Up,
    Down,
    Left,
    Right,
  }

  // Plant types
  enum PlantType {
    Wheat,
    Corn,
    Rice,
  }

  // Plant class
  class Plant {
    type: PlantType;
    growthLevel: number;

    constructor(type: PlantType) {
      this.type = type;
      this.growthLevel = 1;
    }

    // Method to grow the plant
    grow() {
      if (this.growthLevel < 3) {
        this.growthLevel++;
      }
    }
  }

  // Cell class
  class Cell {
    x: number;
    y: number;
    sun: number;
    water: number;
    moisture: number;
    plant: Plant | null;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
      this.sun = 0;
      this.water = 0;
      this.moisture = 0;
      this.plant = null;
    }

    // Update cell resources each turn
    updateResources() {
      this.sun = Math.random(); // Sun cannot be stored
      this.water = Math.random(); // Incoming water
      this.moisture += this.water * 0.5; // Accumulate moisture
      this.moisture = Math.min(this.moisture, 1); // Cap moisture at 1
    }
  }

  // Player class
  class Player {
    x: number;
    y: number;

    constructor() {
      this.x = Math.floor(GRID_WIDTH / 2);
      this.y = Math.floor(GRID_HEIGHT / 2);
    }

    move(direction: Direction) {
      switch (direction) {
        case Direction.Up:
          if (this.y > 0) this.y--;
          break;
        case Direction.Down:
          if (this.y < GRID_HEIGHT - 1) this.y++;
          break;
        case Direction.Left:
          if (this.x > 0) this.x--;
          break;
        case Direction.Right:
          if (this.x < GRID_WIDTH - 1) this.x++;
          break;
      }
    }

    // Check if a cell is adjacent to the player
    isAdjacent(cellX: number, cellY: number): boolean {
      const dx = Math.abs(this.x - cellX);
      const dy = Math.abs(this.y - cellY);
      return dx + dy === 1; // Adjacent if exactly one cell away
    }
  }

  // Game class
  class Game {
    grid: Cell[][];
    player: Player;
    turn: number;
    actionMode: 'none' | 'sow' | 'reap';
    victoryConditionMet: boolean;
    fullyGrownPlantsReaped: number; // New variable to track reaped fully grown plants

    // Color mapping for plant types and growth levels
    private plantGrowthColors: { [key in PlantType]: string[] } = {
      [PlantType.Wheat]: ['goldenrod', 'darkgoldenrod', 'black'],
      [PlantType.Corn]: ['yellowgreen', 'green', 'black'],
      [PlantType.Rice]: ['lightblue', 'blue', 'black'],
    };

    constructor() {
      this.grid = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        const column: Cell[] = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
          column.push(new Cell(x, y));
        }
        this.grid.push(column);
      }
      this.player = new Player();
      this.turn = -1;
      this.actionMode = 'none';
      this.victoryConditionMet = false;
      this.fullyGrownPlantsReaped = 0; // Initialize counter

      // Event listeners for player movement and actions
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));
      nextTurnButton.addEventListener('click', () => this.nextTurn());

      // Start the game loop
      this.gameLoop();

      this.nextTurn();
    }

    handleKeyDown(event: KeyboardEvent) {
      if (this.victoryConditionMet) {
        return; // Ignore input after victory
      }

      if (this.actionMode === 'none') {
        switch (event.key) {
          case 'ArrowUp':
            this.player.move(Direction.Up);
            break;
          case 'ArrowDown':
            this.player.move(Direction.Down);
            break;
          case 'ArrowLeft':
            this.player.move(Direction.Left);
            break;
          case 'ArrowRight':
            this.player.move(Direction.Right);
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
    }

    performAction(direction: Direction) {
      // Determine the target cell based on direction
      let targetX = this.player.x;
      let targetY = this.player.y;
      switch (direction) {
        case Direction.Up:
          targetY = this.player.y - 1;
          break;
        case Direction.Down:
          targetY = this.player.y + 1;
          break;
        case Direction.Left:
          targetX = this.player.x - 1;
          break;
        case Direction.Right:
          targetX = this.player.x + 1;
          break;
      }

      // Check if target cell is within bounds
      if (
        targetX < 0 ||
        targetX >= GRID_WIDTH ||
        targetY < 0 ||
        targetY >= GRID_HEIGHT
      ) {
        return;
      }

      const cell = this.grid[targetX][targetY];

      if (this.actionMode === 'sow') {
        if (!cell.plant) {
          // For simplicity, sow a random plant type
          const plantType = this.getRandomPlantType();
          cell.plant = new Plant(plantType);
        }
      } else if (this.actionMode === 'reap') {
        if (cell.plant) {
          // Check if the plant is fully grown
          if (cell.plant.growthLevel >= 3) {
            this.fullyGrownPlantsReaped++;
          }
          cell.plant = null;

          // Check victory condition after reaping
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

      this.turn++;
      // Update resources and grow plants
      for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
          const cell = this.grid[x][y];
          cell.updateResources();

          // Grow the plant if conditions are met
          if (cell.plant) {
            const canGrow = this.checkGrowthConditions(cell);
            if (canGrow) {
              cell.plant.grow();
            }
          }
        }
      }

      this.draw();
    }

    checkGrowthConditions(cell: Cell): boolean {
      // Conditions: enough sun, moisture, and spatial rules
      const hasEnoughSun = cell.sun > 0.5;
      const hasEnoughMoisture = cell.moisture > 0.5;

      // Spatial rule: at least one adjacent cell has a plant of the same type
      let hasAdjacentSameType = false;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          // Skip the current cell and diagonals
          if (
            (dx === 0 && dy === 0) ||
            Math.abs(dx) + Math.abs(dy) !== 1
          ) {
            continue;
          }
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          if (
            nx >= 0 &&
            nx < GRID_WIDTH &&
            ny >= 0 &&
            ny < GRID_HEIGHT
          ) {
            const neighbor = this.grid[nx][ny];
            if (
              neighbor.plant &&
              neighbor.plant.type === cell.plant!.type
            ) {
              hasAdjacentSameType = true;
              break;
            }
          }
        }
        if (hasAdjacentSameType) {
          break;
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
          const cell = this.grid[x][y];

          // Determine cell color based on sun and moisture levels
          ctx.fillStyle = this.getCellColor(cell);
          ctx.fillRect(
            x * CELL_SIZE,
            y * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
          );

          ctx.strokeStyle = '#ccc';
          ctx.strokeRect(
            x * CELL_SIZE,
            y * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
          );

          // Draw the plant
          if (cell.plant) {
            ctx.fillStyle = this.getPlantColor(cell.plant);
            ctx.fillRect(
              x * CELL_SIZE + 5,
              y * CELL_SIZE + 5,
              CELL_SIZE - 10,
              CELL_SIZE - 10
            );
          }
        }
      }

      // Draw the player
      ctx.fillStyle = 'red';
      ctx.fillRect(
        this.player.x * CELL_SIZE,
        this.player.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );

      // Indicate action mode
      if (this.actionMode !== 'none') {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(
          `Select direction to ${this.actionMode}`,
          10,
          30
        );
      }

      // Display the number of fully grown plants reaped
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.fillText(
        `Fully grown plants reaped: ${this.fullyGrownPlantsReaped}`,
        10,
        canvas.height - 10
      );
    }

    getCellColor(cell: Cell): string {
      const hasSun = cell.sun > 0.5;
      const hasMoisture = cell.moisture > 0.5;

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

    getPlantColor(plant: Plant): string {
      return this.plantGrowthColors[plant.type][plant.growthLevel - 1];
    }
  }

  // Initialize the game
  const game = new Game();
};
