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
    this.adjacentEdges = [];
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

class GridGraph {
  constructor(mapSize) {
    this.rows = mapSize;
    this.cols = mapSize;
    this.V = pow(mapSize, 2);
    this.adjList = new Map();
    this.coordinates = new Map();
    this.edges = new Set();

    for (let r = 0; r < mapSize; r++) {
      for (let c = 0; c < mapSize; c++) {
        const vertex = this.coordToVertex(r, c);
        this.adjList.set(vertex, []);
        this.coordinates.set(vertex, [r, c]);
      }
    }
  }

  coordToVertex(row, col) {
    return row * this.cols + col;
  }

  vertexToCoord(vertex) {
    return this.coordinates.get(vertex);
  }

  addEdge(r1, c1, r2, c2) {
    const v1 = this.coordToVertex(r1, c1);
    const v2 = this.coordToVertex(r2, c2);

    if (!this.adjList.has(v1) || !this.adjList.has(v2)) return;

    const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join(",");
    this.edges.add(edgeKey);

    this.adjList.get(v1).push(v2);
    this.adjList.get(v2).push(v1);
  }

  hasEdge(v1, v2) {
    const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join(",");
    return this.edges.has(edgeKey);
  }

  // 2つの閉路が辺を共有しているかチェック
  hasSharedEdge(cycle1, cycle2) {
    const edges1 = new Set();
    for (let i = 0; i < cycle1.length; i++) {
      const v1 = cycle1[i];
      const v2 = cycle1[(i + 1) % cycle1.length];
      edges1.add([Math.min(v1, v2), Math.max(v1, v2)].join(","));
    }

    for (let i = 0; i < cycle2.length; i++) {
      const v1 = cycle2[i];
      const v2 = cycle2[(i + 1) % cycle2.length];
      const edge = [Math.min(v1, v2), Math.max(v1, v2)].join(",");
      if (edges1.has(edge)) {
        return true;
      }
    }
    return false;
  }

  normalizeCycle(cycle) {
    if (cycle.length === 0) return [];

    let rotations = [];
    for (let i = 0; i < cycle.length; i++) {
      const rotation = [...cycle.slice(i), ...cycle.slice(0, i)];
      const reversed = [...rotation].reverse();
      rotations.push(rotation, reversed);
    }

    return rotations.map((rot) => rot.join(",")).sort()[0];
  }

  findCyclesArea() {
    let allCycles = [];
    let processedCycles = new Set();

    const calculateArea = (cycle) => {
      const coords = cycle.map((v) => this.vertexToCoord(v));
      let area = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        const [x1, y1] = coords[i];
        const [x2, y2] = coords[i + 1];
        area += x1 * y2 - x2 * y1;
      }
      const [x1, y1] = coords[coords.length - 1];
      const [x2, y2] = coords[0];
      area += x1 * y2 - x2 * y1;
      return Math.abs(area) / 2;
    };

    const findCycles = (start, visited = new Set(), path = [], parent = -1) => {
      visited.add(start);
      path.push(start);

      for (let neighbor of this.adjList.get(start)) {
        if (!visited.has(neighbor)) {
          findCycles(neighbor, visited, path, start);
        } else if (neighbor !== parent && path.includes(neighbor)) {
          let cycle = [];
          let index = path.indexOf(neighbor);
          cycle = path.slice(index);

          let isValid = true;
          for (let i = 0; i < cycle.length - 1; i++) {
            if (!this.hasEdge(cycle[i], cycle[i + 1])) {
              isValid = false;
              break;
            }
          }
          if (!this.hasEdge(cycle[cycle.length - 1], cycle[0])) {
            isValid = false;
          }

          if (isValid) {
            const normalizedCycle = this.normalizeCycle(cycle);
            if (!processedCycles.has(normalizedCycle)) {
              const area = calculateArea(cycle);
              if (area > 0) {
                allCycles.push({
                  cycle: cycle,
                  area: area,
                });
                processedCycles.add(normalizedCycle);
              }
            }
          }
        }
      }

      path.pop();
      visited.delete(start);
    };

    for (let v = 0; v < this.V; v++) {
      findCycles(v);
    }

    allCycles.sort((a, b) => b.area - a.area);

    // 辺を共有する閉路のみを除外
    let finalCycles = [];
    for (let i = 0; i < allCycles.length; i++) {
      let shouldInclude = true;
      for (let j = 0; j < finalCycles.length; j++) {
        if (this.hasSharedEdge(allCycles[i].cycle, finalCycles[j].cycle)) {
          shouldInclude = false;
          break;
        }
      }

      if (shouldInclude) {
        finalCycles.push(allCycles[i]);
      }
    }

    const totalArea = finalCycles.reduce((sum, cycle) => sum + cycle.area, 0);

    return {
      totalArea,
      cycles: finalCycles,
    };
  }
}

class Game {
  constructor(_mapSize) {
    this.mapSize = _mapSize;
    this.turn = 1;
    this.round = 1;
    this.vertices = [];
    this.edges = [];
    this.incompleteEdge = null;
    this.isCreatingEdge = false;
    this.beginPos = null;

    //頂点を配置する
    for (let i = 0; i < pow(_mapSize, 2); i++) {
      let x = i % this.mapSize;
      let y = floor(i / _mapSize);
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
    for (let i = 0; i < pow(this.mapSize, 2); i++) {
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
      let check1 =
        fromV1ToV2.cross(fromV1ToV3) * fromV1ToV2.cross(fromV1ToV4) < 0;
      let check2 =
        fromV3ToV4.cross(fromV3ToV1) * fromV3ToV4.cross(fromV3ToV2) < 0;
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
    background(255);
    stroke(51);
    strokeWeight(2);

    this.drawVertices();
    this.drawEdges();
    this.drawIncompleteEdges();
    this.displayRound(this.round);
  }

  drawVertices() {
    let isMouseOnVertex = (i) =>
      this.fromPosToWorldPos(this.vertices[i].pos).sub(mouseWorldPos).len() <
      VERTEX_RADIUS;
    for (let i = 0; i < pow(this.mapSize, 2); i++) {
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
    if (this.turn == 1) roundText.style.color = "#5096ff";
    else if (this.turn == -1) roundText.style.color = "#ff4d2a";
    roundText.textContent = r;
  }
}
