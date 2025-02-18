const MAP_SIZE = 4;
const DISPLAY_SIZE = 800;
const INTERVAL = DISPLAY_SIZE / MAP_SIZE;
const PADDING = INTERVAL / 2;
const VERTEX_RADIUS = INTERVAL / 6;
const LINE_SIZE = VERTEX_RADIUS / 2;
const TEXT_SIZE = INTERVAL / 4;

let game;
let mouseWorldPos;

function setup() {
  createCanvas(DISPLAY_SIZE, DISPLAY_SIZE);
  game = new Game(MAP_SIZE);
}

function draw() {
  mouseWorldPos = new Vec2(mouseX, mouseY);
  game.drawAll();
}

function mousePressed() {
  let turn = game.turn;
  let round = game.round;
  let isMouseOnVertex = (i) =>
    game.fromPosToWorldPos(game.vertices[i].pos).sub(mouseWorldPos).len() <
    VERTEX_RADIUS;

  if (!game.isCreatingEdge) {
    for (let i = 0; i < pow(game.mapSize, 2); i++) {
      if (isMouseOnVertex(i)) {
        //頂点を作る
        if (game.vertices[i].state == 0) {
          if (game.canCreateVertex(i)) {
            game.vertices[i].setState(turn);
            game.nextTurn();
          }

          //辺を作るモードに切り替える
        } else if (round >= 6 && game.vertices[i].state == turn) {
          game.beginPos = game.vertices[i].pos;
          game.incompleteEdge = new Edge(
            false,
            turn,
            game.beginPos,
            mouseWorldPos
          );
          game.isCreatingEdge = true;
        }
      }
    }
  } else {
    for (let i = 0; i < pow(game.mapSize, 2); i++) {
      if (isMouseOnVertex(i)) {
        //辺を作る
        if (game.vertices[i].state == turn) {
          let endPos = game.vertices[i].pos;
          if (game.canCreateEdge(game.beginPos, endPos)) {
            let newEdge = new Edge(true, turn, game.beginPos, endPos);
            game.edges.push(newEdge);
            game.vertices[i].adjacentEdges.push(newEdge);
            game.vertices[
              newEdge.begin.x + game.mapSize * newEdge.begin.y
            ].adjacentEdges.push(newEdge);
            game.nextTurn();
          }
        }
      }
    }
    game.isCreatingEdge = false;
  }
}

let skipTurn = () => game.nextTurn();
let resetGame = () => (game = new Game(MAP_SIZE));
let calculateResult = () => {
  const graph1 = new GridGraph(game.mapSize);
  const graph2 = new GridGraph(game.mapSize);

  for (let edge of game.edges) {
    if (edge.state == 1) {
      graph1.addEdge(edge.begin.x, edge.begin.y, edge.end.x, edge.end.y);
    } else if (edge.state == -1) {
      graph2.addEdge(edge.begin.x, edge.begin.y, edge.end.x, edge.end.y);
    }
  }

  const result = (graph) => graph.findCyclesArea();
  
  const totalAreaResult1 = document.getElementById("totalAreaResult1");
  const totalAreaResult2 = document.getElementById("totalAreaResult2");
  totalAreaResult1.innerHTML = "先手の総面積: " + result(graph1).totalArea;
  totalAreaResult2.innerHTML = "後手の総面積: " + result(graph2).totalArea;
};

/*
やること
・1手前に戻る→（一日試行錯誤したが、できなかったので諦め）
・ボタンの装飾
*/
