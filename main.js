const roundText = document.getElementById("round");
const mapSize = document.getElementById("mapSize");
const mapSizeValueSpan = document.getElementById("mapSizeValue");
const ruleModal = document.getElementById("ruleModal");

const DISPLAY_SIZE = 500;
let MAP_SIZE = mapSize.value;
let INTERVAL = DISPLAY_SIZE / MAP_SIZE;
let PADDING = INTERVAL / 2;
let VERTEX_RADIUS = INTERVAL / 6;
let LINE_SIZE = VERTEX_RADIUS / 2;

function updateSizeSettings(s) {
  MAP_SIZE = mapSize.value;
  INTERVAL = DISPLAY_SIZE / MAP_SIZE;
  PADDING = INTERVAL / 2;
  VERTEX_RADIUS = INTERVAL / 6;
  LINE_SIZE = VERTEX_RADIUS / 2;
}

window.onload = function () {
  openModal();
};

function openModal() {
  ruleModal.style.display = 'flex';
}

function closeModal() {
  ruleModal.style.display = 'none';
}

mapSize.addEventListener("input", (event) => {
  updateSizeSettings(event.target.value);
  mapSizeValueSpan.textContent = event.target.value;
  game = new Game(MAP_SIZE);
  calculateResult();
});

let game;
let mouseWorldPos;

function setup() {
  createCanvas(DISPLAY_SIZE, DISPLAY_SIZE);
  const defaultCanvas0 = document.getElementById("defaultCanvas0");
  defaultCanvas0.style.maxWidth = "600px";
  defaultCanvas0.style.width = "95%";
  defaultCanvas0.style.height = "auto";
  game = new Game(MAP_SIZE);
}

function draw() {
  mouseWorldPos = new Vec2(mouseX, mouseY);
  game.drawAll();
}

/**
 * 頂点がクリックされ、辺を作成中でない場合の処理を行います。
 * 新しい頂点を配置するか、辺の作成を開始します。
 * @param {number} vertexIndex - クリックされた頂点のインデックス
 * @param {Vec2} worldMousePos - クリックされたワールド座標
 * @returns {boolean} アクションが実行された場合は true、そうでない場合は false
 */
function handleVertexPlacement(vertexIndex, worldMousePos) {
  const turn = game.turn;
  const round = game.round;
  const vertex = game.vertices[vertexIndex];

  if (vertex.state === 0) {
    // 新しい頂点を配置しようとする
    if (game.canCreateVertex(vertexIndex)) {
      vertex.setState(turn);
      game.nextTurn();
      return true; // 頂点を配置した
    }
  } else if (round >= 6 && vertex.state === turn) {
    // 辺の作成を開始しようとする
    game.beginPos = vertex.pos;
    // 不完全な辺の初期終点は現在のマウス位置
    game.incompleteEdge = new Edge(false, turn, game.beginPos, game.fromWorldPosToPos(worldMousePos));
    game.isCreatingEdge = true;
    return true; // 辺作成を開始した
  }
  return false; // 何も実行されなかった
}

/**
 * 頂点がクリックされ、辺を作成中の場合の処理を行います。
 * 辺を完成させようとします。
 * @param {number} endVertexIndex - クリックされた終点となる頂点のインデックス
 * @param {Vec2} beginPos - 辺の始点の位置
 * @returns {boolean} 辺が正常に作成された場合は true、そうでない場合は false
 */
function handleEdgeCompletion(endVertexIndex, beginPos) {
  const turn = game.turn;
  const endVertex = game.vertices[endVertexIndex];

  if (endVertex.state === turn) {
    const endPos = endVertex.pos;
    if (game.canCreateEdge(beginPos, endPos)) {
      const newEdge = new Edge(true, turn, beginPos, endPos);
      game.edges.push(newEdge);

      // 始点と終点の頂点に、接続された辺の情報を追加
      const beginVertexIndex = beginPos.y * game.mapSize + beginPos.x; // 始点のインデックスを計算
      if (game.vertices[beginVertexIndex]) { // 念のためインデックスの有効性を確認
        game.vertices[beginVertexIndex].adjacentEdges.push(newEdge);
      }
      endVertex.adjacentEdges.push(newEdge);

      game.nextTurn();
      return true; // 辺を作成した
    }
  }
  return false; // 辺を作成できなかった
}

/**
 * マウスのクリックまたはタッチ開始時の共通処理を行います。
 * クリック/タッチされた位置に基づいて、頂点の配置または辺の作成/完了を試みます。
 * @param {number} interactionX - クリック/タッチされたX座標 (ワールド座標)
 * @param {number} interactionY - クリック/タッチされたY座標 (ワールド座標)
 */
function handleInteractionStart(interactionX, interactionY) {
  const worldInteractionPos = new Vec2(interactionX, interactionY);

  let clickedVertexIndex = -1;
  const vertexRadiusCheck = 2 * VERTEX_RADIUS; // 計算をキャッシュ

  // クリック/タッチされた頂点があるか探す
  for (let i = 0; i < game.vertices.length; i++) {
    const vertexWorldPos = game.fromPosToWorldPos(game.vertices[i].pos);
    // 距離計算
    if (vertexWorldPos.sub(worldInteractionPos).len() < vertexRadiusCheck) {
      clickedVertexIndex = i;
      break; // 見つかったらループを抜ける
    }
  }

  if (game.isCreatingEdge) {
    // --- 辺を作成中の場合 ---
    let edgeCreated = false;
    if (clickedVertexIndex !== -1) {
      // 頂点がクリック/タッチされた場合、辺の完成を試みる
      edgeCreated = handleEdgeCompletion(clickedVertexIndex, game.beginPos);
    }
    // 辺の作成が成功したかどうかにかかわらず、クリック/タッチ後は常に辺作成モードを終了する
    game.isCreatingEdge = false;
    game.incompleteEdge = null; // 不完全な辺をクリア
    game.beginPos = null;       // 始点情報をクリア
  } else {
    // --- 辺を作成中でない場合 ---
    if (clickedVertexIndex !== -1) {
      // 頂点がクリック/タッチされた場合、頂点の配置または辺作成の開始を試みる
      handleVertexPlacement(clickedVertexIndex, worldInteractionPos);
    }
    // 辺を作成中でないときに何もない場所をクリック/タッチしても何もしない
  }
}


function mousePressed() {
  // mouseX, mouseY は p5.js がクリック位置に更新してくれる
  handleInteractionStart(mouseX, mouseY);
}

//タッチ機能がうまくいかないのでコメントアウト
// function touchStarted() {
//   handleInteractionStart(mouseX, mouseY);
//   return false;
// }

let skipTurn = () => game.nextTurn();

let resetGame = () => {
  game = new Game(MAP_SIZE);
  calculateResult();
};

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

  document.getElementById('firstPlayerArea').textContent = result(graph1).totalArea;
  document.getElementById('secondPlayerArea').textContent = result(graph2).totalArea;
};