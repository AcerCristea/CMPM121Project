import json
import os
import sys
import random

# Enums and Data Structures
class PlantType:
    NoneType = 0
    Wheat = 1
    Corn = 2
    Rice = 3

# Growth DSL
class PlantDefinition:
    def __init__(self, name, plant_type):
        self.name = name
        self.type = plant_type
        self.growth_conditions = []

class PlantDefinitionBuilder:
    def __init__(self, name, plant_type):
        self.definition = PlantDefinition(name, plant_type)

    def requireSunAbove(self, threshold):
        self.definition.growth_conditions.append(lambda ctx: ctx["sun"] > threshold)
        return self

    def requireMoistureAbove(self, threshold):
        self.definition.growth_conditions.append(lambda ctx: ctx["moisture"] > threshold)
        return self

    def requireMoistureBetween(self, min_val, max_val):
        self.definition.growth_conditions.append(lambda ctx: min_val <= ctx["moisture"] <= max_val)
        return self

    def requireAdjacentSameType(self, count):
        def cond(ctx):
            neighbors = ctx["getNeighbors"]()
            same_count = sum(1 for n in neighbors if n == self.definition.type)
            return same_count >= count
        self.definition.growth_conditions.append(cond)
        return self

    def requireAdjacentAnyType(self, count):
        def cond(ctx):
            neighbors = ctx["getNeighbors"]()
            non_empty = sum(1 for n in neighbors if n != PlantType.NoneType)
            return non_empty >= count
        self.definition.growth_conditions.append(cond)
        return self

    def requireTurnGreaterThan(self, turn_number):
        self.definition.growth_conditions.append(lambda ctx: ctx["turn"] > turn_number)
        return self

    def requireWeatherEventActive(self, event_name):
        self.definition.growth_conditions.append(lambda ctx: ctx["isWeatherEventActive"](event_name))
        return self

    def done(self):
        return self.definition

def define_plant(name, plant_type):
    return PlantDefinitionBuilder(name, plant_type)

class PlantRegistry:
    plants = {}

    @classmethod
    def register(cls, definition):
        cls.plants[definition.type] = definition

    @classmethod
    def get_definition(cls, plant_type):
        return cls.plants.get(plant_type, None)

# Adjust thresholds to match your system (sun/moisture discrete values)
PlantRegistry.register(
    define_plant("Wheat", PlantType.Wheat)
    .requireMoistureAbove(10)  # adjusted from large values to a practical threshold
    .requireAdjacentSameType(1)
    .done()
)

PlantRegistry.register(
    define_plant("Corn", PlantType.Corn)
    .requireSunAbove(128)
    .done()
)

PlantRegistry.register(
    define_plant("Rice", PlantType.Rice)
    .requireMoistureBetween(10, 25)
    .requireAdjacentAnyType(2)
    .done()
)

GRID_WIDTH = 20
GRID_HEIGHT = 15
CELL_DATA_SIZE = 4  # sun, moisture, plantType, growthLevel
PLAYER_DATA_SIZE = 2
TURN_DATA_SIZE = 4
CELL_COUNT = GRID_WIDTH * GRID_HEIGHT
GRID_DATA_SIZE = CELL_COUNT * CELL_DATA_SIZE
GAME_STATE_SIZE = GRID_DATA_SIZE + PLAYER_DATA_SIZE + TURN_DATA_SIZE

class Direction:
    Up = "up"
    Down = "down"
    Left = "left"
    Right = "right"

class Game:
    def __init__(self, scenario):
        self.gameState = [0]*(GAME_STATE_SIZE)
        self.actionMode = 'none'
        self.victoryConditionMet = False
        self.fullyGrownPlantsReaped = scenario['startingConditions']['fullyGrownPlantsReaped']
        self.history = []
        self.future = []
        self.scenario = scenario
        self.availablePlantTypes = ["Wheat", "Corn", "Rice"]
        self.activeWeatherEvents = {}
        self.debugMode = False

        self.initializeGameState()
        self.pushStateToHistory()

    def initializeGameState(self):
        for i in range(0, GRID_DATA_SIZE, CELL_DATA_SIZE):
            self.gameState[i]   = 0     # sun
            self.gameState[i+1] = 0     # moisture
            self.gameState[i+2] = PlantType.NoneType
            self.gameState[i+3] = 0

        sc = self.scenario['startingConditions']
        self.setPlayerPosition(sc['playerPosition'][0], sc['playerPosition'][1])
        for cellData in sc['grid']:
            cellIndex = self.getCellIndex(cellData['x'], cellData['y'])
            self.gameState[cellIndex+2] = self.getPlantTypeFromString(cellData['plantType'])
            self.gameState[cellIndex+3] = cellData['growthLevel']

        self.setTurnNumber(0)

    def getPlantTypeFromString(self, t):
        t = t.lower()
        if t == 'wheat': return PlantType.Wheat
        elif t == 'corn': return PlantType.Corn
        elif t == 'rice': return PlantType.Rice
        return PlantType.NoneType

    def getCellIndex(self, x, y):
        return (y * GRID_WIDTH + x)*CELL_DATA_SIZE

    def setPlayerPosition(self, x, y):
        playerIndex = GRID_DATA_SIZE
        self.gameState[playerIndex] = x
        self.gameState[playerIndex+1] = y

    def getPlayerX(self):
        return self.gameState[GRID_DATA_SIZE]

    def getPlayerY(self):
        return self.gameState[GRID_DATA_SIZE+1]

    def setTurnNumber(self, turn):
        turnIndex = GRID_DATA_SIZE + PLAYER_DATA_SIZE
        self.gameState[turnIndex] = turn

    def getTurnNumber(self):
        turnIndex = GRID_DATA_SIZE + PLAYER_DATA_SIZE
        return self.gameState[turnIndex]

    def handleInputCommand(self, cmd):
        parts = cmd.strip().split()
        if len(parts) == 0:
            return

        if self.victoryConditionMet:
            print("You already achieved victory!")
            return

        if parts[0] in ['w','a','s','d'] and self.actionMode == 'none':
            direction_map = {
                'w': Direction.Up,
                's': Direction.Down,
                'a': Direction.Left,
                'd': Direction.Right
            }
            d = direction_map[parts[0]]
            self.movePlayer(d)
            self.draw()
            self.autoSaveGame()
        elif parts[0] == 'sow':
            if len(parts) < 2:
                print("Specify direction: sow up/down/left/right")
                return
            direction = parts[1]
            if self.actionMode == 'none':
                self.actionMode = 'sow'
                self.performAction(direction)
                self.actionMode = 'none'
                self.draw()
                self.autoSaveGame()
        elif parts[0] == 'reap':
            if len(parts) < 2:
                print("Specify direction: reap up/down/left/right")
                return
            direction = parts[1]
            if self.actionMode == 'none':
                self.actionMode = 'reap'
                self.performAction(direction)
                self.actionMode = 'none'
                self.draw()
                self.autoSaveGame()
        elif parts[0] == 'n':
            self.nextTurn()
        elif parts[0] == 'debug':
            self.debugMode = not self.debugMode
            self.draw()
        elif parts[0] == 'q':
            print("Quitting...")
            sys.exit(0)
        else:
            print("Unknown command.")

    def movePlayer(self, direction):
        x = self.getPlayerX()
        y = self.getPlayerY()

        if direction == Direction.Up and y > 0: y -= 1
        elif direction == Direction.Down and y < GRID_HEIGHT - 1: y += 1
        elif direction == Direction.Left and x > 0: x -= 1
        elif direction == Direction.Right and x < GRID_WIDTH - 1: x += 1

        self.setPlayerPosition(x, y)
        self.pushStateToHistory()

    def performAction(self, direction):
        dx, dy = 0,0
        if direction == 'up': dy = -1
        elif direction == 'down': dy = 1
        elif direction == 'left': dx = -1
        elif direction == 'right': dx = 1
        else:
            print("Invalid direction.")
            return

        x = self.getPlayerX()
        y = self.getPlayerY()
        targetX = x+dx
        targetY = y+dy

        if targetX < 0 or targetX >= GRID_WIDTH or targetY < 0 or targetY >= GRID_HEIGHT:
            print("Cannot perform action outside the grid.")
            return

        cellIndex = self.getCellIndex(targetX, targetY)

        if self.actionMode == 'sow':
            plantType = self.gameState[cellIndex+2]
            if plantType == PlantType.NoneType:
                newPlant = self.getRandomPlantType()
                self.gameState[cellIndex+2] = newPlant
                self.gameState[cellIndex+3] = 1
                self.pushStateToHistory()
                print("Sowed a seed.")
            else:
                print("There's already a plant here.")
        elif self.actionMode == 'reap':
            plantType = self.gameState[cellIndex+2]
            growthLevel = self.gameState[cellIndex+3]
            if plantType != PlantType.NoneType:
                if growthLevel >= 3:
                    self.fullyGrownPlantsReaped += 1
                self.gameState[cellIndex+2] = PlantType.NoneType
                self.gameState[cellIndex+3] = 0
                self.pushStateToHistory()
                self.checkVictoryCondition()
                print("Reaped a plant.")
            else:
                print("No plant here to reap.")

    def getRandomPlantType(self):
        pt_name = random.choice(self.availablePlantTypes)
        return self.getPlantTypeFromString(pt_name)

    def nextTurn(self):
        if self.victoryConditionMet:
            print("You already achieved victory!")
            return
        turn = self.getTurnNumber()
        turn += 1
        self.setTurnNumber(turn)

        self.handleScheduledEvents(turn)

        for x in range(GRID_WIDTH):
            for y in range(GRID_HEIGHT):
                cellIndex = self.getCellIndex(x, y)
                sun = 255 if random.random() < self.getCurrentSunChance() else 0
                self.gameState[cellIndex] = sun
                rain = 255 if random.random() < self.getCurrentRainChance() else 0
                moisture = self.gameState[cellIndex+1]
                moisture += int(rain*0.5)
                if moisture > 255: moisture = 255
                self.gameState[cellIndex+1] = moisture

                plantType = self.gameState[cellIndex+2]
                growthLevel = self.gameState[cellIndex+3]
                if plantType != PlantType.NoneType and growthLevel < 3:
                    if self.checkGrowthConditions(x,y):
                        self.gameState[cellIndex+3] = growthLevel+1

        self.pushStateToHistory()
        self.draw()
        self.autoSaveGame()

    def checkGrowthConditions(self, x, y):
        cellIndex = self.getCellIndex(x, y)
        sun = self.gameState[cellIndex]
        moisture = self.gameState[cellIndex+1]
        plantType = self.gameState[cellIndex+2]

        if plantType == PlantType.NoneType:
            return False
        definition = PlantRegistry.get_definition(plantType)
        if definition is None:
            return False

        def getNeighbors():
            directions = [(-1,0),(1,0),(0,-1),(0,1)]
            neighbors = []
            for dx, dy in directions:
                nx, ny = x+dx, y+dy
                if 0 <= nx < GRID_WIDTH and 0 <= ny < GRID_HEIGHT:
                    nIndex = self.getCellIndex(nx, ny)
                    neighbors.append(self.gameState[nIndex+2])
            return neighbors

        def isWeatherEventActive(eventName):
            return self.activeWeatherEvents.get(eventName,0) > 0

        ctx = {
            "sun": sun,
            "moisture": moisture,
            "turn": self.getTurnNumber(),
            "getNeighbors": getNeighbors,
            "isWeatherEventActive": isWeatherEventActive
        }

        return all(cond(ctx) for cond in definition.growth_conditions)

    def checkVictoryCondition(self):
        vc = self.scenario['victoryCondition']
        if vc['type'] == 'reap_plants':
            if self.fullyGrownPlantsReaped >= vc['target']:
                self.victoryConditionMet = True
                print(f"Victory! You have reaped at least {vc['target']} fully grown plants.")

    def handleScheduledEvents(self, turn):
        for event in self.scenario['weatherPolicy']['events']:
            if event['turn'] == turn:
                self.activateWeatherEvent(event)
        for event in self.scenario['scheduledEvents']:
            if event['turn'] == turn:
                self.handleEvent(event)

        to_remove = []
        for et in self.activeWeatherEvents:
            self.activeWeatherEvents[et] -= 1
            if self.activeWeatherEvents[et] <= 0:
                to_remove.append(et)
        for et in to_remove:
            del self.activeWeatherEvents[et]

    def activateWeatherEvent(self, event):
        self.activeWeatherEvents[event['type']] = event.get('duration',1)

    def handleEvent(self, event):
        if event['action'] == 'unlock_plant_type' and 'plantType' in event:
            self.unlockPlantType(event['plantType'])

    def unlockPlantType(self, plantType):
        if plantType not in self.availablePlantTypes:
            self.availablePlantTypes.append(plantType)

    def getCurrentSunChance(self):
        sunChance = self.scenario['weatherPolicy']['sunChance']
        if 'Drought' in self.activeWeatherEvents:
            sunChance += 0.2
        return min(sunChance, 1.0)

    def getCurrentRainChance(self):
        rainChance = self.scenario['weatherPolicy']['rainChance']
        if 'Drought' in self.activeWeatherEvents:
            rainChance -= 0.3
        if 'Rainstorm' in self.activeWeatherEvents:
            rainChance += 0.5
        if rainChance < 0: rainChance = 0
        if rainChance > 1: rainChance = 1
        return rainChance

    def gameLoop(self):
        self.draw()
        while True:
            cmd = input("> ")
            self.handleInputCommand(cmd)

    def draw(self):
        plantChar = {
            PlantType.NoneType: '.',
            PlantType.Wheat: 'W',
            PlantType.Corn: 'C',
            PlantType.Rice: 'R'
        }

        playerX = self.getPlayerX()
        playerY = self.getPlayerY()

        # We'll use a fixed width for each cell and debug info for alignment
        # Let's choose width=9 characters for each cell and each debug entry.
        cell_width = 9

        for y in range(GRID_HEIGHT):
            row_data = []
            debug_data = []
            for x in range(GRID_WIDTH):
                cellIndex = self.getCellIndex(x,y)
                sun = self.gameState[cellIndex]
                moisture = self.gameState[cellIndex+1]
                pType = self.gameState[cellIndex+2]
                growthLevel = self.gameState[cellIndex+3]

                ch = plantChar[pType]
                if x == playerX and y == playerY:
                    ch = 'P'
                
                # If debug mode: append growth level to plant if there's a plant
                display_cell = ch
                if self.debugMode and pType != PlantType.NoneType:
                    display_cell = f"{ch}{growthLevel}"

                # Format the cell with fixed width (right-aligned)
                row_data.append(f"{display_cell:>{cell_width}}")

                if self.debugMode:
                    # Format sun/moist line too
                    # Max length "S255M255"=8 chars, we have cell_width=9 is fine
                    debug_str = f"S{sun}M{moisture}"
                    debug_data.append(f"{debug_str:>{cell_width}}")

            print("".join(row_data))
            if self.debugMode:
                print("".join(debug_data))

        print(f"Fully grown plants reaped: {self.fullyGrownPlantsReaped}")
        if self.debugMode:
            print("(Debug mode ON)")

    def saveGame(self):
        saveName = input("Enter a name for your save: ")
        if saveName:
            saveData = {
                "gameState": self.gameState,
                "history": [list(st) for st in self.history],
                "fullyGrownPlantsReaped": self.fullyGrownPlantsReaped
            }
            with open(f"{saveName}.json","w") as f:
                json.dump(saveData, f)
            print(f'Game saved as "{saveName}"')

    def loadGame(self):
        saveName = input("Enter the name of the save to load: ")
        if saveName:
            if os.path.exists(f"{saveName}.json"):
                with open(f"{saveName}.json","r") as f:
                    parsedData = json.load(f)
                self.gameState = parsedData["gameState"]
                self.history = [list(st) for st in parsedData["history"]]
                self.fullyGrownPlantsReaped = parsedData.get("fullyGrownPlantsReaped",0)
                self.future = []
                self.victoryConditionMet = False
                self.draw()
                print(f'Game "{saveName}" loaded.')
            else:
                print(f'Save "{saveName}" not found.')

    def autoSaveGame(self):
        autoSaveData = {
            "gameState": self.gameState,
            "history": [list(st) for st in self.history],
            "fullyGrownPlantsReaped": self.fullyGrownPlantsReaped,
        }
        with open("autosave.json","w") as f:
            json.dump(autoSaveData,f)

    def checkAutoSave(self):
        if os.path.exists("autosave.json"):
            ans = input("An auto-save was found. Do you want to continue where you left off? (y/n) ")
            if ans.lower().startswith('y'):
                with open("autosave.json","r") as f:
                    parsedData = json.load(f)
                self.gameState = parsedData["gameState"]
                self.history = [list(st) for st in parsedData["history"]]
                self.fullyGrownPlantsReaped = parsedData.get("fullyGrownPlantsReaped",0)
                self.future = []
                self.victoryConditionMet = False
                self.draw()

    def undo(self):
        if len(self.history) > 1:
            self.future.append(self.history.pop())
            self.gameState = list(self.history[-1])
            self.draw()

    def redo(self):
        if len(self.future) > 0:
            nextState = self.future.pop()
            self.history.append(nextState)
            self.gameState = list(nextState)
            self.draw()

    def pushStateToHistory(self):
        if len(self.history) > 100:
            self.history.pop(0)
        self.history.append(list(self.gameState))


def load_scenario(name):
    with open(f"scenarios/{name}.json","r") as f:
        return json.load(f)

def main():
    print("Welcome to the Farming Game (Python Version)!")
    print("Choose a scenario:")
    print("1. Easy Start")
    print("2. Drought Challenge")
    print("3. Survival Challenge")
    choice = input("> ")
    scenario_name_map = {
        '1': 'easy_start',
        '2': 'drought_challenge',
        '3': 'survival_challenge'
    }
    scenario_key = scenario_name_map.get(choice, 'easy_start')
    scenario = load_scenario(scenario_key)

    game = Game(scenario)

    print("""
    Instructions:
    =============

    Game Modes:
    - Easy Start: A gentle introduction, stable conditions. Victory: Reap 3 plants.
    - Drought Challenge: Scarce moisture, drought event. Victory: Reap 5 plants.
    - Survival Challenge: Multiple events, changing conditions. Victory: Reap 5 plants.

    Crop Types:
    - W: Wheat
    - C: Corn
    - R: Rice
    - P: Player
    - .: Empty cell

    Without debug mode, each cell shows just a letter.
    In debug mode (type 'debug'):
    - Plants show growth level (e.g., W2)
    - Below each row, sun/moist data is shown in columns aligned with cells.

    Plant Growth Requirements:
    - Wheat: Moderate moisture, at least one Wheat neighbor.
    - Corn: High sun, no neighbor requirement.
    - Rice: Moderate moisture, at least two adjacent plants of any type.

    Controls:
    - Move: w=up, s=down, a=left, d=right
    - Sow: 'sow up', 'sow down', 'sow left', 'sow right'
    - Reap: 'reap up', 'reap down', 'reap left', 'reap right'
    - Next Turn: 'n'
    - Debug Mode: 'debug' toggles numeric data
    - Quit: 'q'

    Press Enter to start playing...
    """)
    input()

    game.checkAutoSave()
    game.gameLoop()

if __name__ == "__main__":
    main()
