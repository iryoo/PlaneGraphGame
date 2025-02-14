const MAP_SIZE = 4;
const DISPLAY_SIZE = 800;
const INTERVAL = DISPLAY_SIZE / MAP_SIZE;
const PADDING = INTERVAL / 2;
const VERTEX_RADIUS = INTERVAL / 6;
const TEXT_SIZE = INTERVAL / 4;

let game;
let ui;
let mousePos;

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
  constructor(_pos, _size) {
    this.pos = _pos;
    this.size = _size;
    this.state = 0;
    this.col = null;
  }
  setState(turn) {
    this.state = turn;
    this.setColor(turn, 1);
  }
  setColor(turn, isSolid) {
    if (turn == 1 && !isSolid) this.col = color(147, 224, 255);
    else if (turn == 1 && isSolid) this.col = color(80, 150, 255);
    else if (turn == -1 && !isSolid) this.col = color(255, 178, 132);
    else if (turn == -1 && isSolid) this.col = color(255, 77, 42);
    else this.col = color(0, 0, 0, 0);
  }

  drawVertex() {
    push();
    fill(this.col);
    circle(this.pos.x, this.pos.y, this.size);
    pop();
  }
}

class Edge {
  constructor(_turn, _begin, _end) {
    this.begin = _begin;
    this.end = _end;
    this.state = _turn;
    this.col = null;
  }

  setEndPos(end) {
    this.end = end;
  }

  setColor(isSolid) {
    if (this.state == 1 && !isSolid) this.col = color(147, 224, 255);
    else if (this.state == 1 && isSolid) this.col = color(80, 150, 255);
    else if (this.state == -1 && !isSolid) this.col = color(255, 178, 132);
    else if (this.state == -1 && isSolid) this.col = color(255, 77, 42);
  }

  drawEdge() {
    push();
    stroke(this.col);
    strokeWeight(20);
    line(this.begin.x, this.begin.y, this.end.x, this.end.y);
    pop();
  }
}

class Game {
  constructor() {
    this.turn = 1;
    this.rounds = 1;
    this.vertices = [];
    this.edges = [];
    this.incompleteEdge = null;
    this.isCreatingEdge = false;
    this.beginPos = null;

    //頂点を配置する
    for (let i = 0; i < MAP_SIZE; i++) {
      this.vertices[i] = [];
      for (let j = 0; j < MAP_SIZE; j++) {
        let vertexPos = new Vec2(PADDING + INTERVAL * i, PADDING + INTERVAL * j);
        this.vertices[i][j] = new Vertex(vertexPos, VERTEX_RADIUS * 2);
      }
    }
  }

  nextTurn() {
    this.turn *= -1;
    this.rounds++;
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
    for (let i = 0; i < MAP_SIZE; i++) {
      for (let j = 0; j < MAP_SIZE; j++) {
        if (this.vertices[i][j].state != 0) {
          let vertexPos = this.vertices[i][j].pos;
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

  canCreateVertex(x, y) {
    let enable = true;
    let vertexPos = this.vertices[x][y].pos;

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

  mouseDown() {
    if (!this.isCreatingEdge) {
      for (let i = 0; i < MAP_SIZE; i++) {
        for (let j = 0; j < MAP_SIZE; j++) {
          if (this.vertices[i][j].pos.sub(mousePos).len() < VERTEX_RADIUS) {
            
            //頂点を作る
            if (this.vertices[i][j].state == 0) {
              if (this.canCreateVertex(i, j)) {
                this.vertices[i][j].setState(this.turn);
                this.nextTurn();
              }

              //辺を作るモードに切り替える
            } else if (this.rounds >= 6 && this.vertices[i][j].state == this.turn) {
              this.beginPos = this.vertices[i][j].pos;
              this.incompleteEdge = new Edge(this.turn, this.beginPos, mousePos);
              this.isCreatingEdge = true;
            }
          }
        }
      }
    } else {
      for (let i = 0; i < MAP_SIZE; i++) {
        for (let j = 0; j < MAP_SIZE; j++) {
          if (this.vertices[i][j].pos.sub(mousePos).len() < VERTEX_RADIUS) {
            
            //辺を作る
            if (this.vertices[i][j].state == this.turn) {
              let endPos = this.vertices[i][j].pos;
              if (this.canCreateEdge(this.beginPos, endPos)) {
                this.edges.push(new Edge(this.turn, this.beginPos, endPos));
                this.nextTurn();
              }
            }
          }
        }
      }
      this.isCreatingEdge = false;
    }
  }
}

class UI {
  constructor() {}

  drawVertices() {
    for (let i = 0; i < MAP_SIZE; i++) {
      for (let j = 0; j < MAP_SIZE; j++) {
        if (game.vertices[i][j].state == 0 && !game.isCreatingEdge && game.canCreateVertex(i, j)) {
          if (game.vertices[i][j].pos.sub(mousePos).len() < VERTEX_RADIUS) {
            game.vertices[i][j].setColor(game.turn, false);
          } else {
            game.vertices[i][j].setColor(0, false);
          }
        }
        game.vertices[i][j].drawVertex();
      }
    }
  }

  drawIncompleteEdges() {
    if (game.isCreatingEdge) {
      game.incompleteEdge.setColor(false);
      game.incompleteEdge.setEndPos(mousePos);
      game.incompleteEdge.drawEdge();
    }
  }

  drawEdges() {
    for (let edge of game.edges) {
      edge.setColor(true);
      edge.drawEdge();
    }
  }

  displayRound(r) {
    //現在のラウンド表示
    textSize(TEXT_SIZE);
    textAlign(LEFT, TOP);
    strokeWeight(6);
    if (game.turn == 1) fill(80, 150, 255);
    else if (game.turn == -1) fill(255, 77, 42);
    text(r, 20, 20);
  }
}

function setup() {
  createCanvas(DISPLAY_SIZE, DISPLAY_SIZE);
  game = new Game();
  ui = new UI();
}

function draw() {
  mousePos = new Vec2(mouseX, mouseY);

  //描画
  background(91, 150, 60);
  stroke(0, 51, 0);
  strokeWeight(3);

  ui.drawVertices();
  ui.drawEdges();
  ui.drawIncompleteEdges();
  ui.displayRound(game.rounds);
}

function mousePressed() {
  game.mouseDown();
}

function keyPressed() {
  //パス
  if (key == "s") {
    skipTurn();
  }

  //新しいゲーム
  if (key == "r") {
    newGame();
  }
}

function skipTurn() {
  game.nextTurn();
}

function newGame() {
  game = new Game();
}

/*
やること
・得点計算
・1手前に戻る→Gameクラスを複数インスタンスすることでできるのでは？
・スマホのタップに対応させる
・マップサイズが6の時だけ頂点を越えた辺が作れるバグの修正（頂点と辺は座標ではなく、二次元配列のインデックスとして持つべき）
*/
