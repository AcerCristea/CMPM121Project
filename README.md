# Devlog Entry - 11/21/24

## Introducing the team
Keaton: Tools Lead - Research alternative tools, identify good ones, and help every other team member set them up

Zoe: Assistant Tools and Design

Cal: Engine Lead - Research alternative engines, get buy-in from teammates on the choice, and teach peers how to use it

Jake: Design Lead - Responsible for setting the creative direction of the project, and establishing the look and feel of the game

Acer: Assistant Engine and Design
<br /><br />


## Tools and materials

### Engines, libraries, frameworks, and platforms used and why
We chose TypeScript combined with HTML5 as the backbone of our project because of its alignment with our team's prior experience from previous demos. We didn't want to use Phaser because we thought it would limit the functionality and potential of the game, and we were unsure how it would work with TypeScript. There are also a lot of online resources and documentation for TypeScript to guide our learning and further assist with the development process.

### Programming Languages used and why
TypeScript serves as our primary programming language, complementing its powerful features with CSS and HTML for styling and structure. This will be ideal for implementing specific game mechanics for our project while adhering to software requirements.

### Other tools (IDE, image editor, 3D editor) used and why
Possible tools that we will use are Piskel and Pixilart for designing assets that support multiple resolutions, and animations, and can be saved on a spritesheet. Since we intend to source some assets online, TypeScript's integration with external resources ensures we can incorporate these elements seamlessly. To code we will mostly be using Visual Studio Code.

### Alternate platform choice
In the event that our current setup does not meet our needs, we have identified TypeScript combined with Three.js as a strong alternate platform choice. Three.js offers extensive functionality for 3D rendering and advanced visual effects. While it might increase the complexity of development, its compatibility with TypeScript ensures that the transition would not require a complete overhaul of our existing codebase or skill set.
<br /><br />

## Outlook

### What is your team hoping to accomplish that other teams might not attempt?
We hope to be able to implement our own creative touch that makes our project stand out from the rest of the teams. We would like to stray away from the original theme and implement our own twist. We also want to add animations to our game to give it a more polished look.
### What do you anticipate being the hardest or riskiest part of the project?
The hardest or riskiest part of the project would probably be the scale. A common theme I find when creating games in general, but especially as a team, is when developers start to get excited about an idea they are passionate about, trying to complete a product that might not always be viable. We will have to focus on finishing the required and core components of our game before we get ahead of ourselves, making sure our end result is easily scalable and readable, even if that means less features.

<br></br>

## How we satisfied the software requirements
### F0.a 2D controller
The game features a player class that represents the character controlled by the player. Using the arrow keys to move around the world on a 2D plane. This will snap the player into the correct spot in the world. 

### F0.b Turn based simulation
Time advancement in the game is managed through a button labeled "Next Turn" the player can press at anytime throughout the game. Clicking this button triggers the nextTurn function which increments the turn counter as well as updates the sun and water levels of each space. 

### F0.c reap or sow plants
The game allows the players the reap or sow plants only on adjacent cells realitve to the player position. When they either reap(r) or sow(s), they must also choose a direction to do the action. This will then perform the action on the cell they have choosen.

### F0.d Sun and water levels in cells
Each cell contains sun, water, and moisture properties. The updateResources function randomly assigns new values to these properties using the Math.random() function after each turn. The sun levels are reset after every turn, but the water is stored. Saving half the water from the previous turn, allowing the water levels to build up over time. 

### F0.e Plant has distinct type and growth level
Plants are represented by the plant class, which is given a type, either wheat, corn, or rice. When the plant is sown, it's given a random type, starting at level 1. The plants will grow unless they are level 3 already.

### F0.f Spatial rules for plant growth
Plant growth is governed by the checkGrowthConditions method within the Game class. For a plant to grow, the following conditions must be met:
 - Sun and moisture levels must be sufficient (sun > 0.5) (moisture > 0.5).
 - Plants must have be adjacent to at least one of the same type of plant. Only checking up, down, left, and right, not diagonols. 
 
### F0.g
The victory condition is when the player reaps at least 3 fully grown plants. This is tracked using the fullyGrownPlantsReaped counter within the Game class. Each time the player reaps a plant, the performAction method checks if the plant's growthLevel is 3 or higher before incrementing the counter. Once the player has reaped 3 plants, the game will alert the player they have won. 

## Reflection
We originally thought that we were going to use the Unity game engine to complete this assingment, but because most of the team members didn't know how to use Unity, we decided to use Phaser and typescript. We were struggling to get our Phaser project started, so we just decided to use HTML 5 and typescript instead and stick to the theme of the class. Everyone was more comfortable creating our final project with a language and resources we were learning in class. 


# Devlog Entry - 12/4/24

## How we satisfied the software requirements
### F0.a 2D controller
Same as last week.

### F0.b Turn-based simulation
Same as last week.

### F0.c reap or sow plants
Same as last week.

### F0.d Sun and water levels in cells
Same as last week.

### F0.e Plant has distinct type and growth level
Same as last week.

### F0.f Spatial rules for plant growth
Same as last week.
 
### F0.g
Same as last week.

### F1.a Backing game in a single contiguous byte array
The game state for the grid is stored in a single byte array called gameState. This array uses an Array of Structures (AoS) format where each grid cell's data is grouped together and stored. All grid operations (e.g., plant growth, resource updates, player interactions) are performed directly on this byte array. Any additional representations (like visual grids) are decoded from this array as needed, ensuring the byte array remains the primary format. ![image](https://github.com/user-attachments/assets/e7bffa6a-dd47-4cde-a2db-7c8095a59525)


### F1.b Manually save game progress
A system for saving game progress in multiple slots is implemented using localStorage. Each save slot stores thhe gameState byte array, game state data (e.g., player position, turn number, reaped plants), and the name of the scenario used.

### F1.c Auto-saving
The game automatically saves progress to a dedicated "auto-save" entry in local storage after each turn. The auto-save entry is different from manual saves but can be loaded if it is found in local storage when the game starts up.
 
### F1.d Undo/Redo major choices
The game's state history is maintained using a stack. When a saved game is loaded, the undo stack is re-made, including all previous states up to the point of the save. This makes sure players can undo all the way to the start of the session, even if they continue from a saved game.

## Reflection
We ended up having to do quite a bit of research to complete some of the specified requirements. All of us have experience with Phaser and TypeScript, but in order to complete the tasks we had to venture out of our comfort zones. We had some trouble with the byte arrays, but we were eventually able to work through it. We really liked some of the features we implemented for player feedback, such as letting the player choose the direction they want to plant their seeds or the way we handle player saves. It has given us much more creative freedom to make our game more interesting. We haven't changed any tools or materials since we initially started our project. In terms of development roles, we have all been working together and tackling the same tasks, straying outside of our original assigned roles. 

# Devlog Entry - 12/7/24

## How we satisfied the software requirements
### F0 + F1
No major changes were made in terms of F0 and F1, so the F0 and F1 requirements are still met.

### F2.a External DSL for Scenario Design
For our external DSL, we based it on JSON because we felt that it was easy and readable in case we wanted to modify or add more scenarios.

Below is an example of one of our scenarios:
```json
{
 "scenarioName": "Drought Challenge",
 "startingConditions": {
   "playerPosition": [10, 10],
   "fullyGrownPlantsReaped": 0,
   "grid": []
 },
 "weatherPolicy": {
   "sunChance": 0.9,
   "rainChance": 0.1,
   "events": [
     {
       "turn": 5,
       "type": "Drought",
       "duration": 5
     }
   ]
 },
 "victoryCondition": {
   "type": "reap_plants",
   "target": 5
 },
 "scheduledEvents": []
}
```

The natural language explanation of this code is that the scenario is called “Drought Challenge” and the weather consists of rain having a decreased chance to show up and an increased chance for sun to show up. An event happens on turn 5 called “Drought” which lasts for 5 turns and decreases the rain chance even more, and increases the sun chance even more. The victory condition has also changed so the player must reap 5 fully grown plants instead of 3 by default.

### F2.b Internal DSL for Plants and Growth Conditions
Our internal DSL was written in Python and we had to change a few of our growth conditions from before since each plant had the same growth condition as before. We added 2 other growth conditions: One where a plant needs sun in order to grow, and the other one where a plant needs to be next to at least 2 other plants of any type for it to grow.

Below is an example of one of our plants:
```python
class PlantDefinition:
   def __init__(self, name, plant_type):
       self.name = name
       self.type = plant_type
       self.growth_conditions = []


class PlantDefinitionBuilder:
   def __init__(self, name, plant_type):
       self.definition = PlantDefinition(name, plant_type)


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


PlantRegistry.register(
   define_plant("Wheat", PlantType.Wheat)
   .requireMoistureAbove(10)
   .requireAdjacentSameType(1)
   .done()
)
```

The natural language explanation of this is that Wheat is getting defined as a plant and registered in the PlantRegistry class. For the Wheat to grow, it requires a moisture level of at least 10 and requires another wheat to be adjacent to it.

### F2.c Switch to Alternate Platform
We transitioned our project from TypeScript to Python. We decided to stray away from our originally proposed idea of Unity and switching to Godot because we thought it would have been really hard to learn within the limited time we had. The JSON files that held our scenarios were compatible with Python, so we did not have to make any changes to our external DSL. However, we had to reimplement the event scheduling and the growth mechanics to work with Python.

## Reflection
It was a cool way to learn how external and internal DSLs worked, and see how it gave us an advantage for when we would have to switch to a different language or platform. We had some struggles initially, but after researching more about what DSLs actually were, it became easier to understand and we were able to implement it into our game quickly. Switching platforms from TypeScript to Python was a challenge that we thought we would struggle with a lot, but with the help of an LLM-based assistant, it became a lot easier to convert between the two languages. Although we did have a couple issues, they were solved relatively quickly.
