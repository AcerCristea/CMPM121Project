// main.ts
import easyStartScenario from "./scenarios/easy_start.json" assert { type: "json" };
import droughtChallengeScenario from "./scenarios/drought_challenge.json" assert { type: "json" };
import survivalChallengeScenario from "./scenarios/survival_challenge.json" assert { type: "json" };

interface GrowthContext {
  sun: number;
  moisture: number;
  getNeighbors: () => PlantType[];
  turn: number;
  isWeatherEventActive: (eventName: string) => boolean;  // Add this line
}

type GrowthCondition = (ctx: GrowthContext) => boolean;

interface PlantDefinition {
  name: string;
  type: PlantType;
  // A list of conditions that must ALL be met for the plant to grow this turn
  growthConditions: GrowthCondition[];
}

// A builder pattern for defining a plant and its conditions
class PlantDefinitionBuilder {
  private definition: PlantDefinition;

  constructor(name: string, type: PlantType) {
    this.definition = {
      name,
      type,
      growthConditions: []
    };
  }

  requireSunAbove(threshold: number): PlantDefinitionBuilder {
    this.definition.growthConditions.push(ctx => ctx.sun > threshold);
    return this;
  }

  requireMoistureAbove(threshold: number): PlantDefinitionBuilder {
    this.definition.growthConditions.push(ctx => ctx.moisture > threshold);
    return this;
  }

  requireMoistureBetween(min: number, max: number): PlantDefinitionBuilder {
    this.definition.growthConditions.push(ctx => ctx.moisture >= min && ctx.moisture <= max);
    return this;
  }

  requireAdjacentSameType(count: number): PlantDefinitionBuilder {
    this.definition.growthConditions.push(ctx => {
      const neighbors = ctx.getNeighbors();
      const sameTypeCount = neighbors.filter(n => n === this.definition.type).length;
      return sameTypeCount >= count;
    });
    return this;
  }

  requireAdjacentAnyType(count: number): PlantDefinitionBuilder {
    this.definition.growthConditions.push(ctx => {
      const neighbors = ctx.getNeighbors();
      return neighbors.filter(n => n !== PlantType.None).length >= count;
    });
    return this;
  }

  requireTurnGreaterThan(turnNumber: number): PlantDefinitionBuilder {
    this.definition.growthConditions.push(ctx => ctx.turn > turnNumber);
    return this;
  }

  // Add more condition methods as needed, for example checking for weather events:
  requireWeatherEventActive(eventName: string): PlantDefinitionBuilder {
    this.definition.growthConditions.push(ctx => ctx.isWeatherEventActive(eventName));
    return this;
  }

  done(): PlantDefinition {
    return this.definition;
  }
}

// A registry to hold all plant definitions
class PlantRegistry {
  private static plants: Map<PlantType, PlantDefinition> = new Map();

  static register(def: PlantDefinition) {
    this.plants.set(def.type, def);
  }

  static getDefinition(type: PlantType): PlantDefinition | undefined {
    return this.plants.get(type);
  }
}

// Helper function to define a plant
function definePlant(name: string, type: PlantType): PlantDefinitionBuilder {
  return new PlantDefinitionBuilder(name, type);
}

// Scenario Interfaces
interface Scenario {
  scenarioName: string;
  startingConditions: StartingConditions;
  weatherPolicy: WeatherPolicy;
  victoryCondition: VictoryCondition;
  scheduledEvents: ScheduledEvent[];
}
interface StartingConditions {
  playerPosition: number[]; // instead of [number, number]
  fullyGrownPlantsReaped: number;
  grid: CellData[];
}

interface CellData {
  x: number;
  y: number;
  plantType: string;
  growthLevel: number;
}

interface WeatherPolicy {
  sunChance: number;
  rainChance: number;
  events: WeatherEvent[];
}

interface WeatherEvent {
  turn: number;
  type: string;
  duration?: number;
  effect?: string;
}

interface VictoryCondition {
  type: string;
  target: number;
}

interface ScheduledEvent {
  turn: number;
  action: string;
  plantType?: string;
}

// Game Constants
const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const CELL_SIZE = 40;
const CELL_COUNT = GRID_WIDTH * GRID_HEIGHT;
const CELL_DATA_SIZE = 4; // sun, moisture, plantType, growthLevel
const PLAYER_DATA_SIZE = 2; // playerX, playerY
const TURN_DATA_SIZE = 4; // turn number (Uint32)
const GRID_DATA_SIZE = CELL_COUNT * CELL_DATA_SIZE;
const GAME_STATE_SIZE = GRID_DATA_SIZE + PLAYER_DATA_SIZE + TURN_DATA_SIZE;

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

enum PlantType {
  None = 0,
  Wheat = 1,
  Corn = 2,
  Rice = 3,
}

// Register plants using the DSL
PlantRegistry.register(
  definePlant("Wheat", PlantType.Wheat)
    .requireMoistureAbove(64)
    .requireAdjacentSameType(1) // at least one Wheat neighbor
    .done()
);

PlantRegistry.register(
  definePlant("Corn", PlantType.Corn)
    .requireSunAbove(128)
    // No neighbor requirement
    .done()
);

PlantRegistry.register(
  definePlant("Rice", PlantType.Rice)
    .requireMoistureBetween(50, 200) // needs a range of moisture
    .requireAdjacentAnyType(2) // needs at least 2 neighbors of any plant
    .done()
);


// DOM Elements
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const canvasBox = document.getElementById('canvasBox') as HTMLDivElement;
const controls = document.getElementById('controls') as HTMLDivElement;
const bigBox = document.getElementById('bigBox') as HTMLDivElement;
const scenarioSelection = document.getElementById('scenarioSelection') as HTMLDivElement;

const nextTurnButton = document.getElementById('nextTurnButton') as HTMLButtonElement;
const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
const loadButton = document.getElementById('loadButton') as HTMLButtonElement;
const undoButton = document.getElementById('undoButton') as HTMLButtonElement;
const redoButton = document.getElementById('redoButton') as HTMLButtonElement;
const scenarioSelect = document.getElementById('scenarioSelect') as HTMLSelectElement;
const startGameButton = document.getElementById('startGameButton') as HTMLButtonElement;
const gameInstructions = document.getElementById('gameInstructions') as HTMLParagraphElement;

gameInstructions.innerHTML = `
  <h2>Instructions</h2>

  <strong>Game Modes:</strong>
  <ul>
    <li><strong>Easy Start:</strong> A gentle introduction with stable conditions. Perfect for beginners. Victory requires reaping 3 fully grown plants.</li>
    <li><strong>Drought Challenge:</strong> A harsher environment focused on water scarcity. A drought event makes moisture harder to maintain. You must reap 5 fully grown plants to win.</li>
    <li><strong>Survival Challenge:</strong> A dynamic environment with multiple events and balanced but changeable conditions. Unlocks new plants mid-game and requires adaptability. Victory requires reaping 5 fully grown plants.</li>
  </ul>

  <strong>Crop Types:</strong>
  <ul>
    <li><span style="color: blue;">Blue</span>: Rice</li>
    <li><span style="color: Orange;">Orange</span>: Wheat</li>
    <li><span style="color: green;">Green</span>: Corn</li>
  </ul>
  
  <strong>Soil Conditions:</strong>
  <ul>
    <li><span style="color: yellow;">Yellow</span>: High sun level</li>
    <li><span style="color: blue;">Blue</span>: High water level</li>
    <li>Shades of Green: Various mixes of sun and water.<br>Lighter green often means moderate sun and moisture.</li>
  </ul>

  <strong>Plant Growth Requirements:</strong>
  <ul>
    <li><strong>Wheat (Yellow):</strong> Needs moderate moisture and at least one neighboring Wheat plant.</li>
    <li><strong>Corn (Green):</strong> Requires high sun levels, doesn't care about neighbors.</li>
    <li><strong>Rice (Blue):</strong> Needs moderate moisture and at least two adjacent plants (of any type).</li>
  </ul>

  <strong>Game Controls:</strong>
  <p>Move player: <kbd>↑</kbd>, <kbd>↓</kbd>, <kbd>←</kbd>, <kbd>→</kbd></p>
  <p>Sow a seed: Press <kbd>S</kbd> and choose a direction with arrow keys.</p>
  <p>Reap a plant: Press <kbd>R</kbd> and choose a direction with arrow keys.</p>
  <p><strong>Toggle Debug Mode:</strong> Press <kbd>D</kbd> to show numeric sun/moisture values inside each cell for easier interpretation.</p>
`;


gameInstructions.style.padding = '15px';
gameInstructions.style.border = '2px solid #ccc';
gameInstructions.style.borderRadius = '8px';
gameInstructions.style.backgroundColor = '#f9f9f9';
gameInstructions.style.color = '#333';
gameInstructions.style.fontFamily = 'Arial, sans-serif';
gameInstructions.style.maxWidth = '600px';
gameInstructions.style.margin = '20px auto';
gameInstructions.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';

canvas.style.minWidth = "800px"
canvas.style.maxHeight = "600px"
canvas.style.marginTop = "10px"
canvas.style.marginBottom = "20px"

controls.style.display = "flex"
controls.style.flexDirection = "row"
canvasBox.style.display = "flex"
canvasBox.style.flexDirection = "column"
bigBox.style.display = "flex"
bigBox.style.flexDirection = "row"
bigBox.style.margin = "10px"

scenarioSelection.style.margin ="10px"
class Game {
  gameState: Uint8Array;
  actionMode: 'none' | 'sow' | 'reap';
  victoryConditionMet: boolean;
  fullyGrownPlantsReaped: number;
  history: Uint8Array[];
  future: Uint8Array[];
  scenario: Scenario;
  availablePlantTypes: string[] = ['Wheat', 'Corn', 'Rice'];
  activeWeatherEvents: { [key: string]: number } = {};
  debugMode: boolean = false;


  private plantGrowthColors: { [key in PlantType]: string[] } = {
    [PlantType.Wheat]: ['goldenrod', 'darkgoldenrod', 'black'],
    [PlantType.Corn]: ['yellowgreen', 'green', 'black'],
    [PlantType.Rice]: ['lightblue', 'blue', 'black'],
    [PlantType.None]: ['', '', ''],
  };

  constructor(scenario: Scenario) {
    this.gameState = new Uint8Array(GAME_STATE_SIZE);
    this.actionMode = 'none';
    this.victoryConditionMet = false;
    this.fullyGrownPlantsReaped = 0;
    this.history = [];
    this.future = [];
    this.scenario = scenario;

    this.initializeGameState();

    nextTurnButton.addEventListener('click', () => this.nextTurn());
    saveButton.addEventListener('click', () => this.saveGame());
    loadButton.addEventListener('click', () => this.loadGame());
    undoButton.addEventListener('click', () => this.undo());
    redoButton.addEventListener('click', () => this.redo());
    window.addEventListener('keydown', (e) => {
      // Handle debug mode toggle
      if (e.key === 'D' || e.key === 'd') {
        this.debugMode = !this.debugMode;
        this.draw();
        return; // After toggling debug mode, you may or may not want to return early
      }
    
      // Otherwise, handle normal key input for movement, sowing, etc.
      this.handleKeyDown(e);
    });
    

    this.checkAutoSave();
    this.gameLoop();
  }

  initializeGameState() {
    for (let i = 0; i < GRID_DATA_SIZE; i += CELL_DATA_SIZE) {
      this.gameState[i] = 0;     // sun
      this.gameState[i + 1] = 0; // moisture
      this.gameState[i + 2] = PlantType.None;
      this.gameState[i + 3] = 0;
    }

    const sc = this.scenario.startingConditions;
    this.setPlayerPosition(sc.playerPosition[0], sc.playerPosition[1]);
    this.fullyGrownPlantsReaped = sc.fullyGrownPlantsReaped;

    for (const cellData of sc.grid) {
      const cellIndex = this.getCellIndex(cellData.x, cellData.y);
      this.gameState[cellIndex + 2] = this.getPlantTypeFromString(cellData.plantType);
      this.gameState[cellIndex + 3] = cellData.growthLevel;
    }

    this.setTurnNumber(0);
    this.pushStateToHistory();
  }

  getPlantTypeFromString(type: string): PlantType {
    switch (type.toLowerCase()) {
      case 'wheat': return PlantType.Wheat;
      case 'corn': return PlantType.Corn;
      case 'rice': return PlantType.Rice;
      default: return PlantType.None;
    }
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
    if (this.victoryConditionMet) return;

    if (this.actionMode === 'none') {
      switch (event.key) {
        case 'ArrowUp': this.movePlayer(Direction.Up); break;
        case 'ArrowDown': this.movePlayer(Direction.Down); break;
        case 'ArrowLeft': this.movePlayer(Direction.Left); break;
        case 'ArrowRight': this.movePlayer(Direction.Right); break;
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
      let direction: Direction | null = null;
      switch (event.key) {
        case 'ArrowUp': direction = Direction.Up; break;
        case 'ArrowDown': direction = Direction.Down; break;
        case 'ArrowLeft': direction = Direction.Left; break;
        case 'ArrowRight': direction = Direction.Right; break;
        default:
          this.actionMode = 'none';
          return;
      }

      if (direction !== null) {
        this.performAction(direction);
        this.actionMode = 'none';
      }
    }
    this.draw();
    this.autoSaveGame();
  }

  movePlayer(direction: Direction) {
    let x = this.getPlayerX();
    let y = this.getPlayerY();

    switch (direction) {
      case Direction.Up: if (y > 0) y--; break;
      case Direction.Down: if (y < GRID_HEIGHT - 1) y++; break;
      case Direction.Left: if (x > 0) x--; break;
      case Direction.Right: if (x < GRID_WIDTH - 1) x++; break;
    }

    this.setPlayerPosition(x, y);
    this.pushStateToHistory();
  }

  performAction(direction: Direction) {
    let x = this.getPlayerX();
    let y = this.getPlayerY();
    let targetX = x;
    let targetY = y;

    switch (direction) {
      case Direction.Up: targetY = y - 1; break;
      case Direction.Down: targetY = y + 1; break;
      case Direction.Left: targetX = x - 1; break;
      case Direction.Right: targetX = x + 1; break;
    }

    if (targetX < 0 || targetX >= GRID_WIDTH || targetY < 0 || targetY >= GRID_HEIGHT) return;

    const cellIndex = this.getCellIndex(targetX, targetY);

    if (this.actionMode === 'sow') {
      const plantType = this.gameState[cellIndex + 2];
      if (plantType === PlantType.None) {
        const newPlantType = this.getRandomPlantType();
        this.gameState[cellIndex + 2] = newPlantType;
        this.gameState[cellIndex + 3] = 1;
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
        this.pushStateToHistory();
        this.checkVictoryCondition();
      }
    }
  }

  getRandomPlantType(): PlantType {
    const plantTypes = this.availablePlantTypes;
    const randomIndex = Math.floor(Math.random() * plantTypes.length);
    return this.getPlantTypeFromString(plantTypes[randomIndex]);
  }

  nextTurn() {
    if (this.victoryConditionMet) return;

    let turn = this.getTurnNumber();
    turn++;
    this.setTurnNumber(turn);

    this.handleScheduledEvents(turn);

    for (let x = 0; x < GRID_WIDTH; x++) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        const cellIndex = this.getCellIndex(x, y);
        const sun = Math.random() < this.getCurrentSunChance() ? 255 : 0;
        this.gameState[cellIndex] = sun;

        const rain = Math.random() < this.getCurrentRainChance() ? 255 : 0;
        let moisture = this.gameState[cellIndex + 1];
        moisture += Math.floor(rain * 0.5);
        moisture = Math.min(moisture, 255);
        this.gameState[cellIndex + 1] = moisture;

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

    this.pushStateToHistory();
    this.draw();
    this.autoSaveGame();
  }

  checkGrowthConditions(x: number, y: number): boolean {
    const cellIndex = this.getCellIndex(x, y);
    const sun = this.gameState[cellIndex];
    const moisture = this.gameState[cellIndex + 1];
    const plantType = this.gameState[cellIndex + 2] as PlantType;
  
    // If no plant or definition, no growth
    if (plantType === PlantType.None) return false;
    const definition = PlantRegistry.getDefinition(plantType);
    if (!definition) return false;
  
    const ctx: GrowthContext = {
      sun,
      moisture,
      turn: this.getTurnNumber(),
      getNeighbors: () => {
        const directions = [
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
        ];
        const neighbors: PlantType[] = [];
        for (const dir of directions) {
          const nx = x + dir.dx;
          const ny = y + dir.dy;
          if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
            const neighborIndex = this.getCellIndex(nx, ny);
            neighbors.push(this.gameState[neighborIndex + 2] as PlantType);
          }
        }
        return neighbors;
      },
      isWeatherEventActive: (eventName: string) => {
        return (this.activeWeatherEvents[eventName] ?? 0) > 0;
      }
    };
  
    // Check all conditions
    return definition.growthConditions.every(cond => cond(ctx));
  }
  
  

  checkVictoryCondition() {
    const vc = this.scenario.victoryCondition;
    if (vc.type === 'reap_plants') {
      if (this.fullyGrownPlantsReaped >= vc.target) {
        this.victoryConditionMet = true;
        alert(`Victory! You have reaped at least ${vc.target} fully grown plants.`);
      }
    }
  }

  handleScheduledEvents(turn: number) {
    for (const event of this.scenario.weatherPolicy.events) {
      if (event.turn === turn) {
        this.activateWeatherEvent(event);
      }
    }

    for (const event of this.scenario.scheduledEvents) {
      if (event.turn === turn) {
        this.handleEvent(event);
      }
    }

    for (const eventType in this.activeWeatherEvents) {
      this.activeWeatherEvents[eventType]--;
      if (this.activeWeatherEvents[eventType] <= 0) {
        delete this.activeWeatherEvents[eventType];
      }
    }
  }

  activateWeatherEvent(event: WeatherEvent) {
    this.activeWeatherEvents[event.type] = event.duration || 1;
  }

  handleEvent(event: ScheduledEvent) {
    if (event.action === 'unlock_plant_type' && event.plantType) {
      this.unlockPlantType(event.plantType);
    }
  }

  unlockPlantType(plantType: string) {
    if (!this.availablePlantTypes.includes(plantType)) {
      this.availablePlantTypes.push(plantType);
    }
  }

  getCurrentSunChance(): number {
    let sunChance = this.scenario.weatherPolicy.sunChance;
    if (this.activeWeatherEvents['Drought']) {
      sunChance += 0.2;
    }
    return Math.min(sunChance, 1);
  }

  getCurrentRainChance(): number {
    let rainChance = this.scenario.weatherPolicy.rainChance;
    if (this.activeWeatherEvents['Drought']) {
      rainChance -= 0.3;
    }
    if (this.activeWeatherEvents['Rainstorm']) {
      rainChance += 0.5;
    }
    return Math.max(0, Math.min(rainChance, 1));
  }

  gameLoop() {
    this.draw();
  }

  draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const cellIndex = this.getCellIndex(x, y);
      const sun = this.gameState[cellIndex];
      const moisture = this.gameState[cellIndex + 1];
      const plantType = this.gameState[cellIndex + 2];
      const growthLevel = this.gameState[cellIndex + 3];

      ctx.fillStyle = this.getCellColor(sun, moisture);
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = '#ccc';
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      if (plantType !== PlantType.None) {
        ctx.fillStyle = this.plantGrowthColors[plantType][growthLevel - 1];
        ctx.fillRect(x * CELL_SIZE + 5, y * CELL_SIZE + 5, CELL_SIZE - 10, CELL_SIZE - 10);
      }

      // If debug mode is on, show the numeric sun/moisture values
      if (this.debugMode) {
        ctx.fillStyle = 'red';
        ctx.font = '10px Arial';
        ctx.fillText(`Sun:${sun}`, x * CELL_SIZE + 2, y * CELL_SIZE + 10);
        ctx.fillText(`Moist:${moisture}`, x * CELL_SIZE + 2, y * CELL_SIZE + 20);
      }
    }
  }

  const playerX = this.getPlayerX();
  const playerY = this.getPlayerY();
  ctx.fillStyle = 'red';
  ctx.fillRect(playerX * CELL_SIZE, playerY * CELL_SIZE, CELL_SIZE, CELL_SIZE);

  if (this.actionMode !== 'none') {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Select direction to ${this.actionMode}`, 10, 30);
  }

  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';
  ctx.fillText(`Fully grown plants reaped: ${this.fullyGrownPlantsReaped}`, 10, canvas.height - 10);
}


  getCellColor(sun: number, moisture: number): string {
    const hasSun = sun > 128;
    const hasMoisture = moisture > 128;

    if (hasSun && hasMoisture) return '#aaffaa';
    if (hasSun && !hasMoisture) return '#ffffaa';
    if (!hasSun && hasMoisture) return '#aaaaff';
    return '#dddddd';
  }

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

  autoSaveGame() {
    const autoSaveData = {
      gameState: Array.from(this.gameState),
      history: this.history.map(state => Array.from(state)),
      fullyGrownPlantsReaped: this.fullyGrownPlantsReaped,
    };
    localStorage.setItem('autosave', JSON.stringify(autoSaveData));
  }

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

  undo() {
    if (this.history.length > 1) {
      this.future.push(this.history.pop()!);
      this.gameState = Uint8Array.from(this.history[this.history.length - 1]);
      this.draw();
    }
  }

  redo() {
    if (this.future.length > 0) {
      const nextState = this.future.pop()!;
      this.history.push(nextState);
      this.gameState = Uint8Array.from(nextState);
      this.draw();
    }
  }

  pushStateToHistory() {
    if (this.history.length > 100) {
      this.history.shift();
    }
    this.history.push(Uint8Array.from(this.gameState));
    this.future = [];
  }
}

// Scenario selection
const scenarioMap: { [key: string]: Scenario } = {
  easyStart: easyStartScenario,
  droughtChallenge: droughtChallengeScenario,
  survivalChallenge: survivalChallengeScenario,
};

let game: Game | null = null;

startGameButton.addEventListener('click', () => {
  const scenarioKey = scenarioSelect.value;
  const selectedScenario = scenarioMap[scenarioKey];

  if (game) {
    // Cleanup if necessary
  }

  game = new Game(selectedScenario);
});
