const canvas = document.getElementById("ccrrtCanvas");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const palette = ["#0c6b63", "#2f7dd1", "#d94b4b", "#c99328"];

const state = {
  scenario: null,
  summary: null,
  trajectories: new Map(),
  maxTime: 0,
  currentTime: 0,
  playing: !reduceMotion.matches,
  lastTick: 0,
  frame: null,
};

const elements = {
  scenario: document.getElementById("ccrrtScenario"),
  status: document.getElementById("ccrrtStatus"),
  time: document.getElementById("ccrrtTime"),
  replans: document.getElementById("ccrrtReplans"),
  steps: document.getElementById("ccrrtSteps"),
  toggle: document.getElementById("ccrrtToggle"),
};

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  const trajectories = new Map();

  for (const line of lines) {
    const cells = line.split(",");
    const row = {
      agentId: Number(cells[index.agent_id]),
      timestep: Number(cells[index.timestep]),
      x: Number(cells[index.x]),
      y: Number(cells[index.y]),
      variance: Number(cells[index.variance]),
      replanned: cells[index.replanned] === "1",
    };

    if (!trajectories.has(row.agentId)) {
      trajectories.set(row.agentId, []);
    }
    trajectories.get(row.agentId).push(row);
    state.maxTime = Math.max(state.maxTime, row.timestep);
  }

  for (const rows of trajectories.values()) {
    rows.sort((a, b) => a.timestep - b.timestep);
  }

  return trajectories;
}

function toPoint(value) {
  return { x: Number(value[0]), y: Number(value[1]) };
}

function rowAtTime(rows, timestep) {
  let current = rows[0];
  for (const row of rows) {
    if (row.timestep <= timestep) {
      current = row;
    } else {
      break;
    }
  }
  return current;
}

function dynamicObstacleAtTime(obstacle, timestep) {
  const points = obstacle.waypoints.map(toPoint);
  const index = Math.max(0, Math.min(points.length - 1, Math.round(timestep / 2)));
  return points[index];
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function makeView() {
  const bounds = state.scenario.bounds;
  const min = bounds.min;
  const max = bounds.max;
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;
  const scale = Math.min(width, height) / (max - min) * 0.86;
  const center = (min + max) / 2;

  return {
    scale,
    point(point) {
      return {
        x: width / 2 + (point.x - center) * scale,
        y: height / 2 - (point.y - center) * scale,
      };
    },
  };
}

function drawGrid(view) {
  const bounds = state.scenario.bounds;
  ctx.fillStyle = "#f8f6f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(23, 33, 36, 0.08)";
  ctx.lineWidth = 1;

  for (let value = Math.floor(bounds.min); value <= Math.ceil(bounds.max); value += 1) {
    const a = view.point({ x: value, y: bounds.min });
    const b = view.point({ x: value, y: bounds.max });
    const c = view.point({ x: bounds.min, y: value });
    const d = view.point({ x: bounds.max, y: value });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }
}

function drawCircle(view, point, radius, fill, stroke = fill, lineWidth = 1.5) {
  const screen = view.point(point);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius * view.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawPath(view, rows, color) {
  const visible = rows.filter((row) => row.timestep <= state.currentTime);
  if (visible.length < 2) {
    return;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  visible.forEach((row, index) => {
    const point = view.point(row);
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();
}

function drawScenario(view) {
  for (const obstacle of state.scenario.static_obstacles) {
    drawCircle(view, toPoint(obstacle.center), obstacle.radius, "#172124", "#101719", 2);
  }

  for (const obstacle of state.scenario.dynamic_obstacles) {
    const path = obstacle.waypoints.map(toPoint);
    ctx.strokeStyle = "rgba(181, 88, 59, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    path.forEach((point, index) => {
      const screen = view.point(point);
      if (index === 0) {
        ctx.moveTo(screen.x, screen.y);
      } else {
        ctx.lineTo(screen.x, screen.y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    const current = dynamicObstacleAtTime(obstacle, state.currentTime);
    drawCircle(view, current, Math.sqrt(obstacle.initial_variance), "rgba(181, 88, 59, 0.18)", "rgba(181, 88, 59, 0.45)");
    drawCircle(view, current, 0.18, "#b5583b", "#f8f6f0", 2);
  }

  for (const agent of state.scenario.agents) {
    const color = palette[agent.id % palette.length];
    drawCircle(view, toPoint(agent.start), 0.18, color, "#ffffff", 2);
    drawCircle(view, toPoint(agent.goal), 0.22, "rgba(255, 255, 255, 0)", color, 3);
  }
}

function drawAgents(view) {
  for (const [agentId, rows] of state.trajectories.entries()) {
    const color = palette[agentId % palette.length];
    drawPath(view, rows, color);

    for (const row of rows) {
      if (row.replanned && row.timestep <= state.currentTime) {
        drawCircle(view, row, 0.12, "rgba(255, 255, 255, 0)", "#c99328", 2);
      }
    }

    const current = rowAtTime(rows, state.currentTime);
    if (current) {
      drawCircle(view, current, Math.sqrt(current.variance), hexToRgba(color, 0.12), hexToRgba(color, 0.35));
      drawCircle(view, current, 0.2, color, "#ffffff", 2);
    }
  }
}

function drawLegend() {
  const items = [
    ["Priority robot", palette[0]],
    ["Yielding robot", palette[1]],
    ["Static obstacles", "#172124"],
    ["Dynamic obstacle", "#b5583b"],
    ["Replan point", "#c99328"],
  ];
  const x = 18;
  const y = 18;
  const width = 184;
  const height = 28 + items.length * 22;

  ctx.save();
  ctx.font = "700 12px Inter, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.strokeStyle = "rgba(23, 33, 36, 0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#172124";
  ctx.fillText("Legend", x + 12, y + 20);
  items.forEach(([label, color], index) => {
    const rowY = y + 42 + index * 22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 17, rowY - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#34413f";
    ctx.fillText(label, x + 30, rowY);
  });
  ctx.restore();
}

function updateMetrics() {
  elements.scenario.textContent = "Priority yielding";
  elements.status.textContent = state.summary.success ? "success" : "incomplete";
  elements.time.textContent = `${state.currentTime} / ${state.maxTime}`;
  elements.replans.textContent = String(state.summary.replan_count);
  elements.steps.textContent = String(state.summary.total_steps);
  elements.toggle.textContent = state.playing ? "Pause" : "Play";
}

function draw() {
  if (!state.scenario || !state.summary) {
    return;
  }

  resizeCanvas();
  const view = makeView();
  drawGrid(view);
  drawScenario(view);
  drawAgents(view);
  drawLegend();
  updateMetrics();
}

function tick(time) {
  if (state.playing && time - state.lastTick > 105) {
    state.currentTime = state.currentTime >= state.maxTime ? 0 : state.currentTime + 1;
    state.lastTick = time;
  }
  draw();
  state.frame = requestAnimationFrame(tick);
}

async function loadReplay() {
  let scenario;
  let summary;
  let trajectories;

  if (window.CCRRT_REPLAY_DATA) {
    ({ scenario, summary, trajectories } = window.CCRRT_REPLAY_DATA);
  } else {
    [scenario, summary, trajectories] = await Promise.all([
      fetch("data/scenario.json").then((response) => response.json()),
      fetch("data/summary.json").then((response) => response.json()),
      fetch("data/trajectories.csv").then((response) => response.text()),
    ]);
  }

  state.scenario = scenario;
  state.summary = summary;
  state.trajectories = parseCsv(trajectories);
  state.currentTime = reduceMotion.matches ? Math.floor(state.maxTime * 0.55) : 0;
  state.playing = !reduceMotion.matches;
  tick(0);
}

elements.toggle.addEventListener("click", () => {
  state.playing = !state.playing;
  updateMetrics();
});

window.addEventListener("resize", draw);
const updateMotionPreference = () => {
  state.playing = !reduceMotion.matches;
  if (reduceMotion.matches) {
    state.currentTime = Math.floor(state.maxTime * 0.55);
  }
  updateMetrics();
};

if (reduceMotion.addEventListener) {
  reduceMotion.addEventListener("change", updateMotionPreference);
} else {
  reduceMotion.addListener(updateMotionPreference);
}

loadReplay().catch(() => {
  elements.status.textContent = "could not load replay";
});
