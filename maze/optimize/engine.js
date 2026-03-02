// engine.js (final stable: system main loop + guard + sync steps + score limit + goal stop + only-in-system)

// ===== 全域狀態 =====
let workspace = null;
let systemMainBlockId = null;
let __inSystemLoop__ = false;
let __silentMode__ = false;

let map = null;
let player = { x: 1, y: 1 };
let score = 0;
let problems = [];
let currentProblem = null;
let reachedGoal = false;

// ===== Canvas =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const CELL_SIZE = 25;

// ===== 初始化 Blockly =====
function initBlockly(toolboxXml) {
  workspace = Blockly.inject('blocklyDiv', {
    toolbox: toolboxXml,
    grid: { spacing: 20, length: 3, colour: '#ccc', snap: false },
    zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 2.5, minScale: 0.4, scaleSpeed: 1.1 },
    move: { scrollbars: true, drag: true, wheel: true },
    trashcan: true,
    renderer: 'zelos',
    theme: Blockly.Themes.Classic,
  });

  Blockly.svgResize(workspace);
  setTimeout(() => Blockly.svgResize(workspace), 50);
  window.addEventListener('resize', () => Blockly.svgResize(workspace));

  // 🔒 插入系統主積木（固定存在、不可刪）
  const xmlText = `
    <xml>
      <block type="system_main_loop" x="40" y="40"></block>
    </xml>
  `;
  const dom = Blockly.utils.xml.textToDom(xmlText);
  Blockly.Xml.domToWorkspace(dom, workspace);

  const blocks = workspace.getBlocksByType('system_main_loop', false);
  if (blocks.length > 0) {
    const b = blocks[0];
    systemMainBlockId = b.id;
    b.setDeletable(false);
    b.setMovable(false);
    b.setEditable(false);
  }

  // ===== Guard：防刪 / 防複製 / 防亂接 =====
  workspace.addChangeListener((event) => {
    ensureSystemMainBlock();

    const blocks = workspace.getBlocksByType('system_main_loop', false);
    if (blocks.length === 0) return;

    const b = blocks[0];
    if (b.getPreviousBlock()) {
      b.unplug(true);
      b.moveBy(40, 40);
      alert("⚠️ 系統主積木必須放在最外層，不能接在其他積木後面");
    }
  });
}

// ===== 畫地圖 =====
function draw() {
  if (__silentMode__) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 1; y <= map.rows; y++) {
    for (let x = 1; x <= map.cols; x++) {
      const px = (x - 1) * CELL_SIZE;
      const py = (map.rows - y) * CELL_SIZE;
      ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

      const key = `${x},${y}`;
      const coin = map.coins[key] ?? 0;
      if (coin > 0) {
        ctx.fillStyle = "#333";
        ctx.font = "16px sans-serif";
        ctx.fillText(coin, px + 5, py + 20);
      }
    }
  }

  ctx.fillStyle = "#cfc";
  ctx.fillRect((map.start.x - 1) * CELL_SIZE, (map.rows - map.start.y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  ctx.fillStyle = "#ccf";
  ctx.fillRect((map.goal.x - 1) * CELL_SIZE, (map.rows - map.goal.y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);

  ctx.beginPath();
  ctx.arc(
    (player.x - 0.5) * CELL_SIZE,
    (map.rows - player.y + 0.5) * CELL_SIZE,
    CELL_SIZE / 4, 0, Math.PI * 2
  );
  ctx.fillStyle = "red";
  ctx.fill();
}

// ===== API =====
function moveRight() {
  if (!__inSystemLoop__) {
    throw new Error("⚠️ move_direction 只能放在『開始執行（系統專用）』積木裡！");
  }
  if (reachedGoal) return;
  if (player.x < map.cols) { player.x++; onStep(); }
}

function moveUp() {
  if (!__inSystemLoop__) {
    throw new Error("⚠️ move_direction 只能放在『開始執行（系統專用）』積木裡！");
  }
  if (reachedGoal) return;
  if (player.y < map.rows) { player.y++; onStep(); }
}

function getCoinAt(x, y) { return map.coins[`${x},${y}`] ?? 0; }
function getPlayerX() { return player.x; }
function getPlayerY() { return player.y; }
function getScore() { return score; }
function getMaxX() { return map.cols; }
function getMaxY() { return map.rows; }

function showResult(msg) {
  const el = document.getElementById('score');
  el.textContent += `（${msg}）`;
}

// ===== 每一步 =====
function onStep() {
  const key = `${player.x},${player.y}`;
  const coin = map.coins[key] ?? 0;
  if (coin > 0) {
    score += coin;
    map.coins[key] = 0;
  }

  if (!__silentMode__) {
    draw();
    updateScoreUI();
  }

  if (player.x === map.goal.x && player.y === map.goal.y) {
    reachedGoal = true;
    if (!__silentMode__) showResult("🎉 成功到達終點！");
  }

  if (!__silentMode__) {
    console.log(`step -> pos=(y=${player.y}, x=${player.x}), score=${score}`);
  }
}

// ===== UI =====
function updateScoreUI() {
  document.getElementById("score").textContent =
    `分數：${score} / ${currentProblem.maxScore}`;
}

function resizeCanvasToMap() {
  canvas.width = map.cols * CELL_SIZE;
  canvas.height = map.rows * CELL_SIZE;
}

function convertCoinsMatrixToMap(matrix) {
  const coins = {};
  const rows = matrix.length;
  const cols = matrix[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const y = rows - r;
      const x = c + 1;
      coins[`${x},${y}`] = matrix[r][c];
    }
  }
  return coins;
}

// ===== 載入題目 =====
async function loadProblems() {
  const res = await fetch('problems.json');
  const data = await res.json();
  problems = data.problems;

  const select = document.getElementById('problemSelect');
  select.innerHTML = '';
  for (const p of problems) {
    if (p.hidden) continue;

    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `第 ${p.id} 關：${p.title}`;
    select.appendChild(opt);
  }

  loadProblem(problems[0].id);
  select.onchange = () => loadProblem(Number(select.value));
}

function loadProblem(id) {
  if (!workspace) return;

  const p = problems.find(p => p.id === id);
  if (!p) return;

  currentProblem = p;
  map = {
    rows: p.rows,
    cols: p.cols,
    start: { ...p.start },
    goal: { ...p.goal },
    coins: convertCoinsMatrixToMap(p.coins)
  };

  if (!__silentMode__) {
    resizeCanvasToMap();
  }
  reset();

  const blocks = workspace.getBlocksByType('system_main_loop', false);
  if (blocks.length > 0) {
    blocks[0].setFieldValue(String(currentProblem.maxSteps), 'STEPS');
  }
}

// ===== 系統主迴圈 =====
async function __runSystemMainLoop__(callback) {
  const maxSteps = currentProblem.maxSteps;
  __inSystemLoop__ = true;

  for (let i = 0; i < maxSteps; i++) {
    if (reachedGoal) return;
    await callback(i);
    if (!__silentMode__) {
      await sleep(400);   // 原本動畫用
    }
  }

  __inSystemLoop__ = false;

  if (!reachedGoal) {
    alert("❌ 沒在步數限制內到終點");
  }
}

function ensureSystemMainBlock() {
  if (!workspace) return;

  const blocks = workspace.getBlocksByType('system_main_loop', false);

  if (blocks.length === 0) {
    const xmlText = `
      <xml>
        <block type="system_main_loop" x="40" y="40"></block>
      </xml>
    `;
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xmlText), workspace);
    return;
  }

  if (blocks.length > 1) {
    for (let i = 1; i < blocks.length; i++) blocks[i].dispose(true);
  }

  const b = blocks[0];
  b.setDeletable(false);
  b.setMovable(false);
  b.setEditable(false);
  systemMainBlockId = b.id;
}

// ===== 執行 =====
async function run() {
  reset();

  const code = Blockly.JavaScript.workspaceToCode(workspace);
  console.log("Generated code:\n", code);

  if (!code.includes('__SYSTEM_BEGIN__')) {
    alert("⚠️ 目前只執行前置計算，請把移動邏輯放進系統積木中");
    return;
  }

  try {
    const before = code.split('/*__SYSTEM_BEGIN__*/')[0];
    const system = code.split('/*__SYSTEM_BEGIN__*/')[1].split('/*__SYSTEM_END__*/')[0];
    const after  = code.split('/*__SYSTEM_END__*/')[1] || '';

    const finalCode = `
      (async () => {
        ${before}
        ${after}

        console.log("✅ 前置計算完成，開始執行系統主迴圈");

        ${system}
      })()
    `;

    await eval(finalCode);

  } catch (err) {
    console.error(err);
    alert("❌ 程式執行錯誤，請看 console");
  }
}

function reset() {
  if (!currentProblem) return;
  player.x = map.start.x;
  player.y = map.start.y;
  score = 0;
  reachedGoal = false;
  map.coins = convertCoinsMatrixToMap(currentProblem.coins);
  draw();
  updateScoreUI();

  console.clear();
  const consoleDiv = document.getElementById('console');
  if (consoleDiv) consoleDiv.textContent = '';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 匯出 / 匯入 =====
function exportProgram() {
  const json = Blockly.serialization.workspaces.save(workspace);
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my_program.blockly.json';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const json = JSON.parse(await file.text());
  Blockly.serialization.workspaces.load(json, workspace);
  ensureSystemMainBlock();
  e.target.value = '';
});

// ===== 批次測試（可見 / 全部含隱藏） =====

async function runAllVisible() {
  await runBatch(false);
}

async function runAllWithHidden() {
  await runBatch(true);
}

async function runBatch(includeHidden) {
  const list = includeHidden
    ? problems
    : problems.filter(p => !p.hidden);

  let total = 0;
  let report = [];

  __silentMode__ = true;

  for (const p of list) {
    loadProblem(p.id);
    await sleep(200); // 給畫面刷新

    try {
      await run(); // 用你現在穩定版 run()

      const passed = reachedGoal;
      const got = score;
      total += got;

      report.push({
        id: p.id,
        title: p.title,
        score: got,
        max: p.maxScore,
        passed
      });
    } catch (e) {
      report.push({
        id: p.id,
        title: p.title,
        score: 0,
        max: p.maxScore,
        passed: false,
        error: true
      });
    }
  }

  __silentMode__ = false;
  loadProblems();  //reset the display of 關卡 and 地圖

  showBatchResult(report, total);
}

function showBatchResult(list, total) {
  let msg = "📊 批次測試結果\n\n";

  let totalMax = 0;

  for (const r of list) {
    msg += `第 ${r.id} 關 ${r.title}： ${r.score}/${r.max} `;
    msg += r.passed ? "✅ 到終點\n" : "❌ 未到終點\n";
    totalMax += r.max;
  }

  msg += `\n🏆 總分：${total} / ${totalMax}`;
  alert(msg);
}

