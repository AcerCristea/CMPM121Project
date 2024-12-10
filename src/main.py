#!/usr/bin/env python3

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
    - Undo: 'undo'
    - Redo: 'redo'
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
