var express = require('express')

var path = require('path');
var bodyParser = require("body-parser");
var app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// serve static webpages for the interface out of www folder
app.use('/', express.static('./src'))

// line indexes are

// horizontal : 0
// vertical : 1
// positive diagonal: 2
// negative diagonal: 3

const wordGameTiles = [
  { tile: 'A', count: 9,  value: 1, lines: [2] }, { tile: 'B', count: 2, value: 3, lines: [1] },
  { tile: 'C', count: 2,  value: 3, lines: [0] }, { tile: 'D', count: 4, value: 2, lines: [1] },
  { tile: 'E', count: 12,  value: 1, lines: [3] }, { tile: 'F', count: 2, value: 4, lines: [1] },
  { tile: 'G', count: 3,  value: 2, lines: [1] }, { tile: 'H', count: 2, value: 4, lines: [0] },
  { tile: 'I', count: 9,  value: 1, lines: [3] }, { tile: 'J', count: 1, value: 8, lines: [0,1] },
  { tile: 'K', count: 1,  value: 5, lines: [0] }, { tile: 'L', count: 4, value: 1, lines: [0] },
  { tile: 'M', count: 2,  value: 3, lines: [1] }, { tile: 'N', count: 6, value: 1, lines: [0] },
  { tile: 'O', count: 8,  value: 1, lines: [2] }, { tile: 'P', count: 2, value: 3, lines: [1] },
  { tile: 'Q', count: 1,  value: 10, lines: [0,1] }, { tile: 'R', count: 6, value: 1, lines: [0] },
  { tile: 'S', count: 4,  value: 1, lines: [0] }, { tile: 'T', count: 6, value: 1, lines: [1] },
  { tile: 'U', count: 4,  value: 1, lines: [3] }, { tile: 'V', count: 2, value: 4, lines: [2,3] },
  { tile: 'W', count: 2,  value: 4, lines: [0,1] }, { tile: 'X', count: 1, value: 8, lines: [2,3] },
  { tile: 'Y', count: 2,  value: 4, lines: [0,1] }, { tile: 'Z', count: 1, value: 10, lines: [2,3] }
];

const numberGameTiles = [
  { tile: '1', count: 15,  value: 1, lines: [0] }, { tile: '2', count: 15, value: 3, lines: [1] },
  { tile: '3', count: 15,  value: 3, lines: [0] }, { tile: '4', count: 15, value: 2, lines: [1] },
  { tile: '5', count: 15,  value: 1, lines: [0] }, { tile: '6', count: 15, value: 4, lines: [1] },
  { tile: '7', count: 15,  value: 2, lines: [0] }, { tile: '8', count: 15, value: 4, lines: [1] },
  { tile: '9', count: 15,  value: 1, lines: [0] }, { tile: '10', count: 15, value: 8, lines: [1] }
];

const shuffleIterations = 5000;
const playerHandSize = 8;
const playerColors = ["Orange", "SkyBlue", "YellowGreen", "Aqua", "Violet", "Ivory"];

var currentGame = {};
currentGame.currentPlayer = 0;
currentGame.boardSize = 0;
currentGame.numPlayers = 0;
currentGame.handSize = 0;
currentGame.teamSize = 0
currentGame.moves = [];
currentGame.players = [];
currentGame.availableTiles = [];

// Get tracks data for the specified frame in the specified chunk
app.post('/getCurrentGamePlayers', function (req, res) {
  console.log(currentGame.players);
  res.send(currentGame.players);
});

app.post('/getCurrentGame', function (req, res) {
  res.send({ count: currentGame.players.length });
});

app.post('/startNewGame', function (req, res) {
  currentGame = {};
  currentGame.currentPlayer = 0;
  currentGame.blockByLightIntersection = parseInt(req.body.blockByLightIntersection) ? true : false;
  currentGame.gameType = req.body.gameType;
  currentGame.currentPlayerPlacedTiles = false;
  currentGame.boardSize = parseInt(req.body.boardSize);
  currentGame.numPlayers = parseInt(req.body.numPlayers);
  currentGame.handSize = parseInt(req.body.handSize);
  currentGame.teamSize = parseInt(req.body.teamSize);
  currentGame.moves = [];
  currentGame.players = initializePlayers(currentGame.numPlayers, currentGame.teamSize);
  currentGame.availableTiles = getShuffledGameTiles(currentGame);

  fillPlayerHands(currentGame);

  console.log("Started New Game");
  res.redirect('/watch');
});

app.post('/playTiles', function (req, res) {
  var playerIndex = parseInt(req.body.player);
  var tilesPlayed = req.body.tiles;

  console.log(playerIndex);
  console.log(tilesPlayed);

  if (!tilesPlayed){
    tilesPlayed = [];
  }

  if (playerIndex === currentGame.currentPlayer && !currentGame.currentPlayerPlacedTiles){

    console.log("in here");
    // Add to move
    var move = {};
    move.playerIndex = playerIndex;
    move.type = "tiles";
    move.tilesPlayed = tilesPlayed;
    currentGame.moves.push(move);

    currentGame.currentPlayerPlacedTiles = true;

    function remove(array, index) {
      if (index !== -1) {
          array.splice(index, 1);
      }
    }

    for (var i = 0; i < tilesPlayed.length; i++){
      for (var t = 0; t < currentGame.players[playerIndex].hand.length; t++){
        if (tilesPlayed[i].tile === currentGame.players[playerIndex].hand[t].tile){
          remove(currentGame.players[playerIndex].hand, t);
          break;
        }
      }
    }

    if (tilesPlayed.length === 0){
      addTileToHand();
    }
    else{
      fillPlayerHands();
    }

  }
  res.send(currentGame);
});

app.post('/getGameData', function (req, res) {
  res.send(currentGame);
});

app.post('/playToken', function (req, res) {
  var playerIndex = parseInt(req.body.playerIndex);
  var tokenPosition = req.body.position;

  if (playerIndex === currentGame.currentPlayer && currentGame.currentPlayerPlacedTiles){

    // Add to move
    var move = {};
    move.playerIndex = playerIndex;
    move.type = "token";
    move.position = [parseInt(tokenPosition[0]), parseInt(tokenPosition[1])];
    currentGame.moves.push(move);

    // Next Players turn
    currentGame.currentPlayerPlacedTiles = false;
    currentGame.currentPlayer = (currentGame.currentPlayer + 1) % currentGame.numPlayers;
  }
  res.send(currentGame);
});

function addTileToHand(){
  currentGame.players[currentGame.currentPlayer].hand.push(currentGame.availableTiles.pop());
}

function fillPlayerHands(){
  for (var i = 0; i < currentGame.players.length; i++){
    while(currentGame.players[i].hand.length < currentGame.handSize && currentGame.availableTiles.length > 0){
      currentGame.players[i].hand.push(currentGame.availableTiles.pop());
    }
  }
}

function initializePlayers(numPlayers, teamSize){
  var players = [];
  var totalTeams = numPlayers / teamSize;
  for (var i = 0; i < numPlayers; i++){
    var playerColorIndex =  i % totalTeams;
    var player = {};
    player.name = "player " + (i+1).toString();
    player.color = playerColors[playerColorIndex];
    player.hand = [];
    players.push(player);
  }
  return players;
}

function getShuffledGameTiles(currentGame){
  var shuffledGameTilesList = [];
  console.log(currentGame.gameType);
  if (currentGame.gameType == "numbers"){
    for (var i = 0; i < numberGameTiles.length; i++){
      for(var c = 0; c < numberGameTiles[i].count; c++){
        var gameTile = {};
        gameTile.tile = numberGameTiles[i].tile;
        gameTile.value = numberGameTiles[i].value;
        gameTile.lines = numberGameTiles[i].lines;
        shuffledGameTilesList.push(gameTile);
      }
    }
  }
  else{
    for (var i = 0; i < wordGameTiles.length; i++){
      for(var c = 0; c < wordGameTiles[i].count; c++){
        var gameTile = {};
        gameTile.tile = wordGameTiles[i].tile;
        gameTile.value = wordGameTiles[i].value;
        gameTile.lines = wordGameTiles[i].lines;
        shuffledGameTilesList.push(gameTile);
      }
    }
  }



  function getRandomTileIndex(){
    return  Math.floor((Math.random() * shuffledGameTilesList.length));
  }

  for (var i = 0; i < shuffleIterations; i++){
    var swapTile1Index = getRandomTileIndex();
    var swapTile2Index = getRandomTileIndex();
    var swapTile1Value = shuffledGameTilesList[swapTile1Index];
    var swapTile2Value = shuffledGameTilesList[swapTile2Index];
    shuffledGameTilesList[swapTile1Index] = swapTile2Value;
    shuffledGameTilesList[swapTile2Index] = swapTile1Value;
  }

  return shuffledGameTilesList;
}



app.listen(3000, () => console.log('Listening on port 3000'))
