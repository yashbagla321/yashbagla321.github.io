const canvas = document.getElementById("adaptiveCanvas");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const data = window.ADAPTIVE_LOCALIZATION_DATA;

const state = {
  index: reduceMotion.matches ? Math.floor(data.closedLoop.length * 0.55) : 0,
  playing: !reduceMotion.matches,
  lastTick: 0,
};

const elements = {
  step: document.getElementById("adaptiveStep"),
  targetError: document.getElementById("adaptiveTargetError"),
  beaconError: document.getElementById("adaptiveBeaconError"),
  yawError: document.getElementById("adaptiveYawError"),
  toggle: document.getElementById("adaptiveToggle"),
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function bounds() {
  const values = [];
  for (const row of data.closedLoop) {
    values.push(row.robot_x, row.target_estimate_x, row.robot_y, row.target_estimate_y);
  }
  values.push(data.trueTarget.x, data.trueTarget.y);
  for (const beacon of data.trueBeacons) {
    values.push(beacon.x, beacon.y);
  }
  const min = Math.min(...values) - 0.75;
  const max = Math.max(...values) + 0.75;
  return { min, max };
}

function makeView() {
  const rect = canvas.getBoundingClientRect();
  const box = bounds();
  const scale = Math.min(rect.width, rect.height) / (box.max - box.min) * 0.86;
  const center = (box.min + box.max) / 2;
  return {
    scale,
    point(point) {
      return {
        x: rect.width / 2 + (point.x - center) * scale,
        y: rect.height / 2 - (point.y - center) * scale,
      };
    },
  };
}

function drawGrid(view) {
  const box = bounds();
  ctx.fillStyle = "#f8f6f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(23, 33, 36, 0.08)";
  ctx.lineWidth = 1;
  for (let value = Math.floor(box.min); value <= Math.ceil(box.max); value += 1) {
    const a = view.point({ x: value, y: box.min });
    const b = view.point({ x: value, y: box.max });
    const c = view.point({ x: box.min, y: value });
    const d = view.point({ x: box.max, y: value });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }
}

function drawPoint(view, point, color, radius, stroke = "#ffffff") {
  const screen = view.point(point);
  ctx.fillStyle = color;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawRing(view, point, color, radius) {
  const screen = view.point(point);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPolyline(view, rows, accessor, color, width, dash = []) {
  if (rows.length < 2) {
    return;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  rows.forEach((row, index) => {
    const screen = view.point(accessor(row));
    if (index === 0) {
      ctx.moveTo(screen.x, screen.y);
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLabel(view, point, text, color, dx = 10, dy = -10) {
  const screen = view.point(point);
  ctx.font = "700 12px Inter, sans-serif";
  ctx.fillStyle = color;
  ctx.fillText(text, screen.x + dx, screen.y + dy);
}

function drawLegend() {
  const items = [
    ["Robot path", "#0c6b63"],
    ["Target estimate", "#245f9f"],
    ["True target", "#b5583b"],
    ["True beacons", "#172124"],
    ["Estimated beacons", "#c99328"],
  ];
  ctx.save();
  ctx.font = "700 12px Inter, sans-serif";
  const x = 18;
  const y = 18;
  const width = 172;
  const height = 28 + items.length * 22;
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

function drawScene() {
  resizeCanvas();
  const view = makeView();
  const rows = data.closedLoop.slice(0, state.index + 1);
  const current = data.closedLoop[state.index];

  drawGrid(view);
  drawPolyline(view, rows, (row) => ({ x: row.robot_x, y: row.robot_y }), "#0c6b63", 3);
  drawPolyline(
    view,
    rows,
    (row) => ({ x: row.target_estimate_x, y: row.target_estimate_y }),
    "#245f9f",
    2,
    [6, 6]
  );

  drawPoint(view, data.initialRobot, "#0c6b63", 6);
  drawRing(view, data.initialRobot, "#0c6b63", 10);
  drawLabel(view, data.initialRobot, "initial robot", "#0c6b63", 12, 20);
  drawPoint(view, data.trueTarget, "#b5583b", 8);
  drawRing(view, data.trueTarget, "#b5583b", 12);
  drawLabel(view, data.trueTarget, "hidden target", "#b5583b", 12, -14);

  data.trueBeacons.forEach((beacon, index) => {
    drawPoint(view, beacon, "#172124", 7);
    drawLabel(view, beacon, `beacon ${index + 1}`, "#172124", 10, index === 0 ? 18 : -12);
  });

  data.beaconEstimates.forEach((beacon) => {
    drawPoint(view, { x: beacon.estimate_x, y: beacon.estimate_y }, "#c99328", 5);
  });

  const robot = { x: current.robot_x, y: current.robot_y };
  const targetEstimate = { x: current.target_estimate_x, y: current.target_estimate_y };
  drawPolyline(view, [robot, targetEstimate], (point) => point, "rgba(36, 95, 159, 0.45)", 1.5, [4, 4]);
  drawPoint(view, targetEstimate, "#245f9f", 7);
  drawPoint(view, robot, "#0c6b63", 8);
  drawLegend();

  elements.step.textContent = `${current.step} / ${data.closedLoop[data.closedLoop.length - 1].step}`;
  elements.targetError.textContent = current.target_error.toFixed(4);
  elements.beaconError.textContent = current.beacon_position_rmse.toFixed(4);
  elements.yawError.textContent = current.beacon_yaw_rmse.toFixed(4);
  elements.toggle.textContent = state.playing ? "Pause" : "Play";
}

function tick(time) {
  if (state.playing && time - state.lastTick > 80) {
    state.index = state.index >= data.closedLoop.length - 1 ? 0 : state.index + 1;
    state.lastTick = time;
  }
  drawScene();
  requestAnimationFrame(tick);
}

elements.toggle.addEventListener("click", () => {
  state.playing = !state.playing;
  drawScene();
});

const syncMotion = () => {
  state.playing = !reduceMotion.matches;
  if (reduceMotion.matches) {
    state.index = Math.floor(data.closedLoop.length * 0.55);
  }
  drawScene();
};

if (reduceMotion.addEventListener) {
  reduceMotion.addEventListener("change", syncMotion);
} else {
  reduceMotion.addListener(syncMotion);
}

window.addEventListener("resize", drawScene);
requestAnimationFrame(tick);
