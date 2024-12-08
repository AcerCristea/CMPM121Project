// ---------- Translated Logic ----------

const PlantType = {
  NoneType:0,
  Wheat:1,
  Corn:2,
  Rice:3
};

class PlantDefinition {
  constructor(name,type){
    this.name=name;
    this.type=type;
    this.growth_conditions=[];
  }
}

class PlantDefinitionBuilder {
  constructor(name,type){
    this.definition=new PlantDefinition(name,type);
  }
  requireSunAbove(threshold){ this.definition.growth_conditions.push(ctx=>ctx.sun>threshold);return this;}
  requireMoistureAbove(threshold){this.definition.growth_conditions.push(ctx=>ctx.moisture>threshold);return this;}
  requireMoistureBetween(min_val,max_val){this.definition.growth_conditions.push(ctx=>ctx.moisture>=min_val&&ctx.moisture<=max_val);return this;}
  requireAdjacentSameType(count){
    this.definition.growth_conditions.push(ctx=>{
      const neighbors=ctx.getNeighbors();
      const same_count=neighbors.filter(n=>n===this.definition.type).length;
      return same_count>=count;
    });
    return this;
  }
  requireAdjacentAnyType(count){
    this.definition.growth_conditions.push(ctx=>{
      const neighbors=ctx.getNeighbors();
      const non_empty=neighbors.filter(n=>n!==PlantType.NoneType).length;
      return non_empty>=count;
    });
    return this;
  }
  requireTurnGreaterThan(turn_number){
    this.definition.growth_conditions.push(ctx=>ctx.turn>turn_number);return this;
  }
  requireWeatherEventActive(event_name){
    this.definition.growth_conditions.push(ctx=>ctx.isWeatherEventActive(event_name));return this;
  }
  done(){return this.definition;}
}

function definePlant(name,type){
  return new PlantDefinitionBuilder(name,type);
}

const PlantRegistry={
  plants:{},
  register(def){this.plants[def.type]=def;},
  get_definition(type){return this.plants[type];}
};

PlantRegistry.register(
  definePlant("Wheat",PlantType.Wheat)
    .requireMoistureAbove(10)
    .requireAdjacentSameType(1)
    .done()
);
PlantRegistry.register(
  definePlant("Corn",PlantType.Corn)
    .requireSunAbove(128)
    .done()
);
PlantRegistry.register(
  definePlant("Rice",PlantType.Rice)
    .requireMoistureBetween(10,25)
    .requireAdjacentAnyType(2)
    .done()
);

const GRID_WIDTH=20;
const GRID_HEIGHT=15;
const CELL_DATA_SIZE=4;
const PLAYER_DATA_SIZE=2;
const TURN_DATA_SIZE=4;
const CELL_COUNT=GRID_WIDTH*GRID_HEIGHT;
const GRID_DATA_SIZE=CELL_COUNT*CELL_DATA_SIZE;
const GAME_STATE_SIZE=GRID_DATA_SIZE+PLAYER_DATA_SIZE+TURN_DATA_SIZE;

const Direction={Up:'up',Down:'down',Left:'left',Right:'right'};

function getCellIndex(x,y){
  return (y*GRID_WIDTH+x)*CELL_DATA_SIZE;
}
function getPlantTypeFromString(t){
  t=t.toLowerCase();
  if(t==='wheat')return PlantType.Wheat;
  if(t==='corn')return PlantType.Corn;
  if(t==='rice')return PlantType.Rice;
  return PlantType.NoneType;
}
function getPlantChar(pType){
  switch(pType){
    case PlantType.Wheat:return 'W';
    case PlantType.Corn:return 'C';
    case PlantType.Rice:return 'R';
    default:return '.';
  }
}

// Global Variables
let scenario=null;
let scenarioKey='easy_start';
let gameState=[];
let actionMode='none';
let victoryConditionMet=false;
let fullyGrownPlantsReaped=0;
let history=[];
let future=[];
let availablePlantTypes=['Wheat','Corn','Rice'];
let activeWeatherEvents={};
let debugMode=false;

// UI
const scenarioSelect=document.getElementById('scenarioSelect');
const startGameButton=document.getElementById('startGameButton');
const infoDiv=document.getElementById('info');
const gridDisplay=document.getElementById('gridDisplay');

startGameButton.addEventListener('click',()=>{
  scenarioKey=scenarioSelect.value;
  fetchScenarioAndStart(scenarioKey);
});

function fetchScenarioAndStart(key){
  fetch(`scenarios/${key}.json`)
    .then(r=>r.json())
    .then(data=>{
      scenario=data;
      startGame();
    });
}

function startGame(){
  const gState=new Array(GAME_STATE_SIZE).fill(0);
  for(let i=0;i<GRID_DATA_SIZE;i+=CELL_DATA_SIZE){
    gState[i]=0;
    gState[i+1]=0;
    gState[i+2]=PlantType.NoneType;
    gState[i+3]=0;
  }

  let sc=scenario.startingConditions;
  let playerX=sc.playerPosition[0];
  let playerY=sc.playerPosition[1];
  let playerIndex=GRID_DATA_SIZE;
  gState[playerIndex]=playerX;
  gState[playerIndex+1]=playerY;

  for(const cellData of sc.grid){
    let cIndex=getCellIndex(cellData.x,cellData.y);
    gState[cIndex+2]=getPlantTypeFromString(cellData.plantType);
    gState[cIndex+3]=cellData.growthLevel;
  }

  // turn=0
  gState[GRID_DATA_SIZE+PLAYER_DATA_SIZE]=0;

  gameState=gState;
  fullyGrownPlantsReaped=scenario.startingConditions.fullyGrownPlantsReaped||0;
  history=[gState.slice()];
  future=[];
  victoryConditionMet=false;
  actionMode='none';
  availablePlantTypes=['Wheat','Corn','Rice'];
  activeWeatherEvents={};
  debugMode=false;
  draw();
}

function getPlayerX(){return gameState[GRID_DATA_SIZE];}
function getPlayerY(){return gameState[GRID_DATA_SIZE+1];}
function getTurnNumber(){return gameState[GRID_DATA_SIZE+PLAYER_DATA_SIZE];}

function pushStateToHistory(newGameState){
  if(history.length>100)history.shift();
  history.push(newGameState.slice());
  future=[];
  gameState=newGameState;
  draw();
}

function movePlayer(direction){
  let newG=gameState.slice();
  let x=getPlayerX();
  let y=getPlayerY();
  if(direction===Direction.Up&&y>0)y--;
  if(direction===Direction.Down&&y<GRID_HEIGHT-1)y++;
  if(direction===Direction.Left&&x>0)x--;
  if(direction===Direction.Right&&x<GRID_WIDTH-1)x++;
  newG[GRID_DATA_SIZE]=x;
  newG[GRID_DATA_SIZE+1]=y;
  pushStateToHistory(newG);
}

function performAction(direction){
  let dx=0,dy=0;
  if(direction==='up')dy=-1;
  else if(direction==='down')dy=1;
  else if(direction==='left')dx=-1;
  else if(direction==='right')dx=1;
  else {
    alert(t("Invalid direction."));
    return;
  }

  let x=getPlayerX();
  let y=getPlayerY();
  let targetX=x+dx;let targetY=y+dy;
  if(targetX<0||targetX>=GRID_WIDTH||targetY<0||targetY>=GRID_HEIGHT){
    alert(t("Cannot perform action outside the grid."));
    return;
  }
  let cIndex=getCellIndex(targetX,targetY);
  let newG=gameState.slice();
  let plantType=newG[cIndex+2];
  let growthLevel=newG[cIndex+3];

  if(actionMode==='sow'){
    if(plantType===PlantType.NoneType){
      let newPlant=getRandomPlantType();
      newG[cIndex+2]=newPlant;
      newG[cIndex+3]=1;
      pushStateToHistory(newG);
      alert(t("Sowed a seed."));
    }else{
      alert(t("There's already a plant here."));
    }
  }else if(actionMode==='reap'){
    if(plantType!==PlantType.NoneType){
      if(growthLevel>=3)fullyGrownPlantsReaped++;
      newG[cIndex+2]=PlantType.NoneType;
      newG[cIndex+3]=0;
      pushStateToHistory(newG);
      checkVictoryCondition();
      alert(t("Reaped a plant."));
    }else{
      alert(t("No plant here to reap."));
    }
  }
}

function getRandomPlantType(){
  let pt_name=availablePlantTypes[Math.floor(Math.random()*availablePlantTypes.length)];
  return getPlantTypeFromString(pt_name);
}

function nextTurn(){
  if(victoryConditionMet){
    alert(t("You already achieved victory!"));
    return;
  }
  let turn=getTurnNumber()+1;
  let newG=gameState.slice();
  newG[GRID_DATA_SIZE+PLAYER_DATA_SIZE]=turn;

  handleScheduledEvents(turn,newG);

  for(let x=0;x<GRID_WIDTH;x++){
    for(let y=0;y<GRID_HEIGHT;y++){
      let cIndex=getCellIndex(x,y);
      let sun=(Math.random()<getCurrentSunChance())?255:0;
      newG[cIndex]=sun;
      let rain=(Math.random()<getCurrentRainChance())?255:0;
      let moisture=newG[cIndex+1];
      moisture+=Math.floor(rain*0.5);
      if(moisture>255)moisture=255;
      newG[cIndex+1]=moisture;

      let pType=newG[cIndex+2];
      let growthLevel=newG[cIndex+3];
      if(pType!==PlantType.NoneType&&growthLevel<3){
        if(checkGrowthConditions(x,y,newG)){
          newG[cIndex+3]=growthLevel+1;
        }
      }
    }
  }
  pushStateToHistory(newG);
}

function checkGrowthConditions(x,y,gState){
  let cIndex=getCellIndex(x,y);
  let sun=gState[cIndex];
  let moisture=gState[cIndex+1];
  let pType=gState[cIndex+2];
  if(pType===PlantType.NoneType)return false;
  let definition=PlantRegistry.get_definition(pType);
  if(!definition)return false;

  function getNeighbors(){
    let dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    let neighbors=[];
    for(let [dx,dy] of dirs){
      let nx=x+dx;let ny=y+dy;
      if(nx>=0&&nx<GRID_WIDTH&&ny>=0&&ny<GRID_HEIGHT){
        let nIndex=getCellIndex(nx,ny);
        neighbors.push(gState[nIndex+2]);
      }
    }
    return neighbors;
  }
  function isWeatherEventActive(eName){
    return (activeWeatherEvents[eName]||0)>0;
  }
  let ctx={sun,moisture,turn:getTurnNumber(),getNeighbors,isWeatherEventActive};
  return definition.growth_conditions.every(cond=>cond(ctx));
}

function checkVictoryCondition(){
  let vc=scenario.victoryCondition;
  if(vc.type==='reap_plants'){
    if(fullyGrownPlantsReaped>=vc.target){
      victoryConditionMet=true;
      alert(t(`Victory! You have reaped at least ${vc.target} fully grown plants.`));
    }
  }
}

function handleScheduledEvents(turn,gState){
  scenario.weatherPolicy.events.forEach(event=>{
    if(event.turn===turn) activateWeatherEvent(event,gState);
  });
  scenario.scheduledEvents.forEach(event=>{
    if(event.turn===turn) handleEvent(event,gState);

  });

  let newEv={...activeWeatherEvents};
  for(let et in newEv){
    newEv[et]-=1;
    if(newEv[et]<=0)delete newEv[et];
  }
  activeWeatherEvents=newEv;
}

function activateWeatherEvent(event,gState){
  let newEv={...activeWeatherEvents};
  newEv[event.type]=event.duration||1;
  activeWeatherEvents=newEv;
}

function handleEvent(event,gState){
  if(event.action==='unlock_plant_type' && event.plantType){
    if(!availablePlantTypes.includes(event.plantType)){
      availablePlantTypes.push(event.plantType);
    }
  }
}

function getCurrentSunChance(){
  let sunChance=scenario.weatherPolicy.sunChance;
  if(activeWeatherEvents['Drought']) sunChance+=0.2;
  if(sunChance>1)sunChance=1;
  return sunChance;
}
function getCurrentRainChance(){
  let rainChance=scenario.weatherPolicy.rainChance;
  if(activeWeatherEvents['Drought']) rainChance-=0.3;
  if(activeWeatherEvents['Rainstorm']) rainChance+=0.5;
  if(rainChance<0)rainChance=0;if(rainChance>1)rainChance=1;
  return rainChance;
}

function undo(){
  if(history.length>1){
    let newHist=history.slice();
    let last=newHist.pop();
    future=[last,...future];
    gameState=[...newHist[newHist.length-1]];
    history=newHist;
    draw();
  }
}
function redo(){
  if(future.length>0){
    let newFut=future.slice();
    let nextState=newFut.shift();
    history=[...history,nextState];
    future=newFut;
    gameState=[...nextState];
    draw();
  }
}

function draw() {
  const plantChar = {
    [PlantType.NoneType]: '.',
    [PlantType.Wheat]: 'W',
    [PlantType.Corn]: 'C',
    [PlantType.Rice]: 'R'
  };

  const playerX = getPlayerX();
  const playerY = getPlayerY();

  const cell_width = 9; // same as in python code

  // Update info display
  infoDiv.textContent = t(`Fully grown plants reaped: ${fullyGrownPlantsReaped}${debugMode ? " (Debug mode ON)" : ""}${victoryConditionMet ? "\nVictory Achieved!" : ""}`);

  let output = "";
  for (let y = 0; y < GRID_HEIGHT; y++) {
    let row_data = [];
    let debug_data = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cIndex = getCellIndex(x, y);
      const sun = gameState[cIndex];
      const moisture = gameState[cIndex + 1];
      const pType = gameState[cIndex + 2];
      const growthLevel = gameState[cIndex + 3];

      let ch = plantChar[pType];
      if (x === playerX && y === playerY) {
        ch = 'P';
      }

      let display_cell = ch;
      if (debugMode && pType !== PlantType.NoneType) {
        display_cell = ch + growthLevel;
      }

      // Right-align the cell content to cell_width characters
      display_cell = display_cell.toString().padStart(cell_width, ' ');

      row_data.push(display_cell);

      if (debugMode) {
        const debug_str = `S${sun}M${moisture}`;
        // Also right-align debug string
        debug_data.push(debug_str.padStart(cell_width, ' '));
      }
    }
    // Join without spaces, just like python's `"".join(row_data)`
    output += row_data.join('') + "\n";
    if (debugMode) {
      output += debug_data.join('') + "\n";
    }
  }

  gridDisplay.textContent = output;
}


// Saving/Loading with localStorage
function saveGame() {
  const saveName=prompt(t("Enter a name for your save:"));
  if(!saveName)return;
  const saveData={
    gameState,
    history,
    future,
    fullyGrownPlantsReaped,
    victoryConditionMet,
    activeWeatherEvents,
    availablePlantTypes,
    debugMode,
    scenarioKey
  };
  localStorage.setItem(`save_${saveName}`, JSON.stringify(saveData));
  alert(t(`Game saved as "${saveName}"`));
}

function loadGame() {
  const saveName=prompt(t("Enter the name of the save to load:"));
  if(!saveName)return;
  const savedData=localStorage.getItem(`save_${saveName}`);
  if(!savedData){
    alert(t(`Save "${saveName}" not found.`));
    return;
  }
  const parsedData=JSON.parse(savedData);
  // Restore state
  gameState=parsedData.gameState;
  history=parsedData.history;
  future=parsedData.future;
  fullyGrownPlantsReaped=parsedData.fullyGrownPlantsReaped;
  victoryConditionMet=parsedData.victoryConditionMet;
  activeWeatherEvents=parsedData.activeWeatherEvents;
  availablePlantTypes=parsedData.availablePlantTypes;
  debugMode=parsedData.debugMode;
  scenarioKey=parsedData.scenarioKey;

  // Refetch scenario to ensure consistency
  fetch(`scenarios/${scenarioKey}.json`)
    .then(r=>r.json())
    .then(data=>{
      scenario=data;
      draw();
      alert(`Game "${saveName}" loaded.`);
    });
}

// Integrate save/load into handleCommand
function handleCommand(cmd) {
  const parts=cmd.split(' ');
  if(victoryConditionMet && !(parts[0]==='debug'||parts[0]==='save'||parts[0]==='load')){
    alert(t("Game ended. Please restart or load another game."));
    return;
  }
  if(['w','a','s','d'].includes(parts[0]) && actionMode==='none'){
    const direction_map={w:Direction.Up,s:Direction.Down,a:Direction.Left,d:Direction.Right};
    movePlayer(direction_map[parts[0]]);
  }else if(parts[0]==='sow'){
    if(parts.length<2)return;
    if(actionMode==='none'){
      actionMode='sow';
      performAction(parts[1]);
      actionMode='none';
    }
  }else if(parts[0]==='reap'){
    if(parts.length<2)return;
    if(actionMode==='none'){
      actionMode='reap';
      performAction(parts[1]);
      actionMode='none';
    }
  }else if(parts[0]==='n'){
    nextTurn();
  }else if(parts[0]==='undo'){
    undo();
  }else if(parts[0]==='redo'){
    redo();
  }else if(parts[0]==='debug'){
    debugMode=!debugMode;
    draw();
  }else if(parts[0]==='save'){
    saveGame();
  }else if(parts[0]==='load'){
    loadGame();
  }else if(parts[0]==='q'){
    alert(t("Can't quit in browser!"));
  } else {
    alert(t("Unknown command."));
  }

  let currentLanguage = 'en';
const translations = {};

async function loadTranslations(lang) {
  if (!translations[lang]) {
    const response = await fetch(`locales/${lang}.json`);
    translations[lang] = await response.json();
  }
  currentLanguage = lang;
  console.log(translations)
  applyTranslations();
}

function t(key, params = {}) {
  const text = translations[currentLanguage]?.[key] || key;
  return text.replace(/\{\{(\w+)\}\}/g, (_, p) => params[p] || '');
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.getElementById("btnUp").textContent = t("up");
  document.getElementById("btnDown").textContent = t("down");
  document.getElementById("btnLeft").textContent = t("left");
  document.getElementById("btnRight").textContent = t("right");
  document.getElementById("btnSowUp").textContent = `${t("sow")} ${t("up")}`;
  document.getElementById("btnSowDown").textContent = `${t("sow")} ${t("down")}`;
  document.getElementById("btnSowLeft").textContent = `${t("sow")} ${t("left")}`;
  document.getElementById("btnSowRight").textContent = `${t("sow")} ${t("right")}`;
  document.getElementById("btnReapUp").textContent = `${t("reap")} ${t("up")}`;
  document.getElementById("btnReapDown").textContent = `${t("reap")} ${t("down")}`;
  document.getElementById("btnReapLeft").textContent = `${t("reap")} ${t("left")}`;
  document.getElementById("btnReapRight").textContent = `${t("reap")} ${t("right")}`;
  document.getElementById("btnNextTurn").textContent = t("next turn");
  document.getElementById("btnUndo").textContent = t("undo");
  document.getElementById("btnRedo").textContent = t("redo");
  document.getElementById("btnDebug").textContent = t("debug");
  document.getElementById("btnSave").textContent = t("save");
  document.getElementById("btnLoad").textContent = t("load");
}

// Load initial language
document.getElementById('languageSelect').addEventListener('change', e => {
  loadTranslations(e.target.value);
  document.documentElement.setAttribute('dir', e.target.value === 'ar' ? 'rtl' : 'ltr');
});

document.documentElement.setAttribute('dir', currentLanguage === 'ar' ? 'rtl' : 'ltr');

function changeLanguage() {
  const lang = document.getElementById("languageSelect").value;
}


// Initialize the default language
document.addEventListener('DOMContentLoaded', () => {
  changeLanguage();
  applyTranslations();
});

changeLanguage();
applyTranslations();

}
