const canvas = document.getElementById("plannerCanvas");
const ctx = canvas.getContext("2d");

const colors = {
  ink: "#172124",
  teal: "#0c6b63",
  blue: "#245f9f",
  rust: "#b5583b",
  gold: "#c99328",
  paper: "#f8f6f0",
};

const obstacles = [
  { x: 0.28, y: 0.24, r: 0.09 },
  { x: 0.64, y: 0.34, r: 0.12 },
  { x: 0.47, y: 0.67, r: 0.1 },
  { x: 0.78, y: 0.72, r: 0.08 },
];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function pointOnPath(t, width, height, offset = 0) {
  const x = width * (0.11 + 0.78 * t);
  const wave = Math.sin(t * Math.PI * 2.4 + offset) * height * 0.12;
  const y = height * (0.72 - 0.44 * t) + wave;
  return { x, y };
}

function drawGrid(width, height) {
  ctx.fillStyle = "#203033";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(248, 246, 240, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawObstacles(width, height, time) {
  obstacles.forEach((obstacle, index) => {
    const wobble = Math.sin(time * 0.0012 + index) * 8;
    const x = obstacle.x * width + wobble;
    const y = obstacle.y * height + Math.cos(time * 0.001 + index) * 8;
    const r = obstacle.r * Math.min(width, height);

    ctx.fillStyle = "rgba(181, 88, 59, 0.24)";
    ctx.beginPath();
    ctx.arc(x, y, r * 1.65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(181, 88, 59, 0.72)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPath(width, height, time) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let layer = 0; layer < 3; layer += 1) {
    ctx.beginPath();
    for (let i = 0; i <= 110; i += 1) {
      const t = i / 110;
      const p = pointOnPath(t, width, height, layer * 0.58 + time * 0.00025);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = layer === 0 ? "rgba(248,246,240,0.86)" : "rgba(201,147,40,0.42)";
    ctx.lineWidth = layer === 0 ? 4 : 2;
    ctx.stroke();
  }
}

function drawAgents(width, height, time) {
  const primaryT = ((time * 0.00009) % 1 + 1) % 1;
  const agents = [
    { t: primaryT, color: colors.teal, size: 15 },
    { t: (primaryT + 0.22) % 1, color: colors.blue, size: 10 },
    { t: (primaryT + 0.58) % 1, color: colors.gold, size: 10 },
  ];

  agents.forEach((agent) => {
    const p = pointOnPath(agent.t, width, height, time * 0.00025);
    ctx.fillStyle = agent.color;
    ctx.strokeStyle = colors.paper;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, agent.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(248,246,240,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, agent.size * 4.2, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawStateMarker(x, y, color) {
  ctx.strokeStyle = "rgba(248,246,240,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
}

function drawLabels(width, height) {
  const start = pointOnPath(0, width, height);
  const goal = pointOnPath(1, width, height);

  drawStateMarker(start.x, start.y, colors.teal);
  drawStateMarker(goal.x, goal.y, colors.gold);

  ctx.fillStyle = "rgba(248,246,240,0.82)";
  ctx.font = "700 13px Inter, sans-serif";
  ctx.fillText("start state", start.x - 8, start.y + 34);
  ctx.fillText("multi-agent route", width * 0.1, height * 0.13);
  ctx.fillText("uncertainty field", width * 0.63, height * 0.19);
  ctx.fillText("goal state", goal.x - 24, goal.y - 18);
}

function render(time = 0) {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  drawGrid(width, height);
  drawObstacles(width, height, time);
  drawPath(width, height, time);
  drawAgents(width, height, time);
  drawLabels(width, height);

  requestAnimationFrame(render);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(render);

document.querySelectorAll(".headshot-photo").forEach((frame) => {
  const images = frame.querySelectorAll("img");

  const updateFallback = () => {
    const hasImage = Array.from(images).some(
      (img) => img.complete && img.naturalWidth > 0
    );
    frame.classList.toggle("is-fallback", !hasImage);
  };

  images.forEach((img) => {
    img.addEventListener("error", updateFallback);
    img.addEventListener("load", updateFallback);
  });

  updateFallback();
});

const backToTop = document.querySelector(".back-to-top");

if (backToTop) {
  const toggleBackToTop = () => {
    backToTop.classList.toggle("is-visible", window.scrollY > 420);
  };

  window.addEventListener("scroll", toggleBackToTop, { passive: true });
  toggleBackToTop();
}
