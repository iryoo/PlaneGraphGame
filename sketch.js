const MAP_SIZE = 4;
const DISPLAY_SIZE = 800;
const INTERVAL = DISPLAY_SIZE / MAP_SIZE;
const PADDING = INTERVAL / 2;
const VERTEX_RADIUS = INTERVAL / 6;
const LINE_SIZE = VERTEX_RADIUS / 2;
const TEXT_SIZE = INTERVAL / 4;

let game;
let mouseWorldPos;

class Vec2 {
  constructor(_x, _y) {
    this.x = _x;
    this.y = _y;
  }

  add(b) {
    let a = this;
    return new Vec2(a.x + b.x, a.y + b.y);
  }

  sub(b) {
    let a = this;
    return new Vec2(a.x - b.x, a.y - b.y);
  }

  mul(s) {
    let a = this;
    return new Vec2(s * a.x, s * a.y);
  }

  len() {
    let a = this;
    return sqrt(a.x ** 2 + a.y ** 2);
  }

  dot(b) {
    let a = this;
    return a.x * b.x + a.y * b.y;
  }

  cross(b) {
    let a = this;
    return a.x * b.y - a.y * b.x;
  }
}

class Vertex {
  constructor(_pos) {
    this.pos = _pos;
    this.state = 0;
    this.col = null;
    this.setColor(0, false);
  }

  setState(_state) {
    this.state = _state;
    this.setColor(_state, true);
  }

  setColor(turn, isSolid) {
    let c = color(0, 0, 0, 0);
    if (turn == 1 && !isSolid) c = color(147, 224, 255);
    else if (turn == 1 && isSolid) c = color(80, 150, 255);
    else if (turn == -1 && !isSolid) c = color(255, 178, 132);
    else if (turn == -1 && isSolid) c = color(255, 77, 42);
    this.col = c;
  }

  drawVertex(radius) {
    push();
    fill(this.col);
    let worldPos = game.fromPosToWorldPos(this.pos);
    circle(worldPos.x, worldPos.y, 2 * radius);
    pop();
  }
}

class Edge {
  constructor(_isSolid, _state, _begin, _end) {
    this.begin = _begin;
    this.end = _end;
    this.state = _state;
    this.col = this.getColor(_isSolid);
  }

  setEndPos(_end) {
    this.end = _end;
  }

  getColor(isSolid) {
    let c = color(0, 0, 0, 0);
    let state = this.state;
    if (state == 1 && !isSolid) c = color(147, 224, 255);
    else if (state == 1 && isSolid) c = color(80, 150, 255);
    else if (state == -1 && !isSolid) c = color(255, 178, 132);
    else if (state == -1 && isSolid) c = color(255, 77, 42);
    return c;
  }

  drawEdge(size) {
    push();
    stroke(this.col);
    strokeWeight(size);
    let worldPosBegin = game.fromPosToWorldPos(this.begin);
    let worldPosEnd = game.fromPosToWorldPos(this.end);
    line(worldPosBegin.x, worldPosBegin.y, worldPosEnd.x, worldPosEnd.y);
    pop();
  }
}

class Game {
  constructor() {
    this.turn = 1;
    this.round = 1;
    this.vertices = [];
    this.edges = [];
    this.incompleteEdge = null;
    this.isCreatingEdge = false;
    this.beginPos = null;

    //頂点を配置する
    for (let i = 0; i < pow(MAP_SIZE, 2); i++) {
      let x = i % MAP_SIZE;
      let y = floor(i / MAP_SIZE);
      let vertexPos = new Vec2(x, y);
      this.vertices[i] = new Vertex(vertexPos);
    }
  }

  nextTurn() {
    this.turn *= -1;
    this.round++;
  }

  fromPosToWorldPos(pos) {
    let worldPosX = PADDING + INTERVAL * pos.x;
    let worldPosY = PADDING + INTERVAL * pos.y;
    return new Vec2(worldPosX, worldPosY);
  }

  fromWorldPosToPos(worldPos) {
    let posX = (worldPos.x - PADDING) / INTERVAL;
    let posY = (worldPos.y - PADDING) / INTERVAL;
    return new Vec2(posX, posY);
  }

  canCreateEdge(begin, end) {
    let enable = true;

    //始点と終点が同じ
    enable *= begin != end;

    //すでにそこには辺がある
    for (let edge of this.edges) {
      enable *= !(edge.begin == begin && edge.end == end);
      enable *= !(edge.begin == end && edge.end == begin);
    }

    //間に頂点がある
    for (let i = 0; i < pow(MAP_SIZE, 2); i++) {
      if (this.vertices[i].state != 0) {
        let vertexPos = this.vertices[i].pos;
        let dx1 = begin.x - vertexPos.x;
        let dx2 = end.x - vertexPos.x;
        let dy1 = begin.y - vertexPos.y;
        let dy2 = end.y - vertexPos.y;
        let check1 = dx2 * dy1 == dx1 * dy2; //同一直線上にある
        let check2 = dx1 * dx2 <= 0 && dy1 * dy2 <= 0; //頂点が辺の内側にある
        let check3 = vertexPos != begin && vertexPos != end; //頂点が始点または終点と重ならない
        enable *= !(check1 && check2 && check3);
      }
    }

    //辺が交差する
    for (let edge of this.edges) {
      let fromV1ToV2 = end.sub(begin);
      let fromV1ToV3 = edge.begin.sub(begin);
      let fromV1ToV4 = edge.end.sub(begin);
      let fromV3ToV4 = edge.end.sub(edge.begin);
      let fromV3ToV1 = begin.sub(edge.begin);
      let fromV3ToV2 = end.sub(edge.begin);
      let check1 = fromV1ToV2.cross(fromV1ToV3) * fromV1ToV2.cross(fromV1ToV4) < 0;
      let check2 = fromV3ToV4.cross(fromV3ToV1) * fromV3ToV4.cross(fromV3ToV2) < 0;
      enable *= !(check1 && check2);
    }

    return enable;
  }

  canCreateVertex(i) {
    let enable = true;
    let vertexPos = this.vertices[i].pos;

    //辺の間にある
    for (let edge of this.edges) {
      let dx1 = edge.begin.x - vertexPos.x;
      let dx2 = edge.end.x - vertexPos.x;
      let dy1 = edge.begin.y - vertexPos.y;
      let dy2 = edge.end.y - vertexPos.y;
      let check1 = dx2 * dy1 == dx1 * dy2; //同一直線上にある
      let check2 = dx1 * dx2 <= 0 && dy1 * dy2 <= 0; //頂点が辺の内側にある
      enable *= !(check1 && check2);
    }

    return enable;
  }

  drawAll() {
    background(91, 150, 60);
    stroke(0, 51, 0);
    strokeWeight(3);

    this.drawVertices();
    this.drawEdges();
    this.drawIncompleteEdges();
    this.displayRound(this.round);
  }

  drawVertices() {
    let isMouseOnVertex = (i) =>
      this.fromPosToWorldPos(this.vertices[i].pos).sub(mouseWorldPos).len() <
      VERTEX_RADIUS;
    for (let i = 0; i < pow(MAP_SIZE, 2); i++) {
      if (
        this.vertices[i].state == 0 &&
        !this.isCreatingEdge &&
        this.canCreateVertex(i)
      ) {
        if (isMouseOnVertex(i)) {
          this.vertices[i].setColor(this.turn, false);
        } else {
          this.vertices[i].setColor(0, false);
        }
      }
      this.vertices[i].drawVertex(VERTEX_RADIUS);
    }
  }

  drawIncompleteEdges() {
    if (this.isCreatingEdge) {
      this.incompleteEdge.setEndPos(this.fromWorldPosToPos(mouseWorldPos));
      this.incompleteEdge.drawEdge(LINE_SIZE);
    }
  }

  drawEdges() {
    for (let edge of this.edges) {
      edge.drawEdge(LINE_SIZE);
    }
  }

  displayRound(r) {
    //現在のラウンド表示
    textSize(TEXT_SIZE);
    textAlign(LEFT, TOP);
    strokeWeight(6);
    if (this.turn == 1) fill(80, 150, 255);
    else if (this.turn == -1) fill(255, 77, 42);
    text(r, 20, 20);
  }
}

function setup() {
  createCanvas(DISPLAY_SIZE, DISPLAY_SIZE);
  game = new Game();
  
  let skipButton = createButton("パス");
  skipButton.mousePressed(skipTurn);
  
  let resetButton = createButton("ゲームリセット");
  resetButton.mousePressed(reset);
  
  let resultButton = createButton("得点計算");
  resultButton.mousePressed(result);
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
    for (let i = 0; i < pow(MAP_SIZE, 2); i++) {
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
    for (let i = 0; i < pow(MAP_SIZE, 2); i++) {
      if (isMouseOnVertex(i)) {
        //辺を作る
        if (game.vertices[i].state == turn) {
          let endPos = game.vertices[i].pos;
          if (game.canCreateEdge(game.beginPos, endPos)) {
            game.edges.push(new Edge(true, turn, game.beginPos, endPos));
            game.nextTurn();
          }
        }
      }
    }
    game.isCreatingEdge = false;
  }
}

let skipTurn = _ => game.nextTurn();
let reset = _ => game = new Game();
let result = _ => {

}

/*
やること
・得点計算
・1手前に戻る→（一日試行錯誤したが、できなかったので諦め）
・ボタンをjsで書く
*/
