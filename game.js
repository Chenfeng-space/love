/* ============================================================
   笔尖戳过的夏天 —— 游戏主逻辑 (墨迹渐显 + 悄悄话 + 心电感应)
   ============================================================ */

// ---------- ① 全局状态 ----------
let story = null;
let currentId = null;
let affection = 0;
let typeTimer = null; 
let effectInterval = null; 
let unlockedImages = [];

const memoryPhotos = ["photo1.jpg", "photo2.jpg", "photo3.jpg", "photo4.jpg", "photo5.jpg"];
let currentPhotoIndex = 0;
let isEnding = false; 

// ---------- ② DOM 元素引用 ----------
const bgLayer          = document.getElementById("bg-layer");
const dialogueText     = document.getElementById("dialogue-text");
const choicesBox       = document.getElementById("choices");
const musicBtn         = document.getElementById("music-toggle");
const insertImgBox     = document.getElementById("insert-img-box");
const affectionDisplay = document.getElementById("affection-display");
const hud              = document.getElementById("hud");
const collectionBadge  = document.getElementById("collection-badge");
const startScreen      = document.getElementById("start-screen");
const startBtn         = document.getElementById("start-btn");
const effectLayer      = document.getElementById("effect-layer");
const innerWhisper     = document.getElementById("inner-whisper");

// 👇 新增：心电感应元素
const sensorBtn = document.getElementById("sensor-btn");
const sensorLayer = document.getElementById("sensor-layer");

// 轮播弹窗
const memoryModal = document.getElementById("memory-modal");
const memoryImg = document.getElementById("memory-img");
const prevPhotoBtn = document.getElementById("prev-photo");
const nextPhotoBtn = document.getElementById("next-photo");
const closeMemoryBtn = document.getElementById("close-memory");

// 静候提示
const waitToast = document.getElementById("wait-toast");
let toastTimer = null;

// ---------- ③ 音乐管理 ----------
const audio = new Audio();
audio.loop = true;
let currentBgm = null;
let musicOn = true;

function playBgm(name) {
  if (!name) return;
  if (name === currentBgm) return;
  currentBgm = name;
  audio.src = `audio/${name}.mp3`;
  if (musicOn) audio.play().catch(() => {});
}

musicBtn.addEventListener("click", () => {
  musicOn = !musicOn;
  if (musicOn) {
    musicBtn.textContent = "🔊";
    audio.play().catch(() => {});
  } else {
    musicBtn.textContent = "🔇";
    audio.pause();
  }
});

// ---------- ④ 更新面板与悄悄话 ----------
const whisperLines = {
  gain: ["他好像很高兴…… (๑•̀ㅂ•́)و✧", "窗外的风都变轻了。🍃", "我是不是离他近了一点？✨", "偷偷看一眼，应该没被发现吧。👀", "心脏跳得有点快…… (///▽///)"],
  loss: ["是不是说错话了？ (｡•́︿•̀｡)", "他大概没在意吧…… 🍂", "空气突然安静了。💧", "好想躲起来…… (´；ω；｀)", "他会不会觉得我很奇怪？💦"]
};

function updateHUD(changeVal = 0) {
  affectionDisplay.textContent = affection;
  hud.classList.add("hud-bump");
  setTimeout(() => hud.classList.remove("hud-bump"), 300);

  if (changeVal !== 0) {
    let text = "";
    if (changeVal > 0) {
      text = whisperLines.gain[Math.floor(Math.random() * whisperLines.gain.length)];
    } else {
      text = whisperLines.loss[Math.floor(Math.random() * whisperLines.loss.length)];
    }
    
    innerWhisper.textContent = text;
    innerWhisper.classList.remove("hidden");
    void innerWhisper.offsetWidth; 
    innerWhisper.classList.add("show");

    setTimeout(() => {
      innerWhisper.classList.remove("show");
      setTimeout(() => innerWhisper.classList.add("hidden"), 500);
    }, 2500);
  }
}

// 墨迹渐显文字引擎
function renderText(text) {
  if (typeTimer) clearTimeout(typeTimer);
  dialogueText.innerHTML = "";
  if (!text) return;

  const chars = text.split("");
  chars.forEach((char, index) => {
    const span = document.createElement("span");
    span.className = "text-char";
    span.textContent = char === " " ? "\u00A0" : char;
    span.style.animationDelay = `${index * 0.04}s`;
    dialogueText.appendChild(span);
  });
}

// ---------- ⑤ 特效引擎 ----------
function renderEffect(effectType) {
  if (effectInterval) clearInterval(effectInterval);
  effectLayer.className = ""; 
  effectLayer.innerHTML = ""; 
  if (!effectType) return;

  if (effectType === "sunlight") {
    effectLayer.classList.add("effect-sunlight");
    effectInterval = setInterval(() => {
      const dust = document.createElement("div");
      dust.className = "dust-particle";
      dust.style.left = Math.random() * 100 + "%";
      dust.style.top = Math.random() * 100 + "%";
      dust.style.width = dust.style.height = Math.random() * 4 + 1 + "px";
      dust.style.animationDuration = Math.random() * 5 + 5 + "s";
      effectLayer.appendChild(dust);
      setTimeout(() => dust.remove(), 8000);
    }, 200);
  } else if (effectType === "rain") {
    effectLayer.classList.add("effect-rain");
    effectInterval = setInterval(() => {
      const drop = document.createElement("div");
      drop.className = "rain-drop";
      drop.style.left = Math.random() * 100 + "%";
      drop.style.animationDuration = Math.random() * 0.5 + 0.5 + "s";
      effectLayer.appendChild(drop);
      setTimeout(() => drop.remove(), 1000);
    }, 50);
  } else if (effectType === "paper") {
    effectInterval = setInterval(() => {
      const paper = document.createElement("div");
      paper.className = "paper-fragment";
      paper.style.left = Math.random() * 100 + "%";
      paper.style.animationDuration = Math.random() * 5 + 5 + "s";
      effectLayer.appendChild(paper);
      setTimeout(() => paper.remove(), 10000);
    }, 800);
  } else if (effectType === "fireflies") {
    effectLayer.classList.add("effect-night");
    for(let i = 0; i < 20; i++) {
      const fly = document.createElement("div");
      fly.className = "firefly";
      fly.style.left = Math.random() * 100 + "%";
      fly.style.top = Math.random() * 100 + "%";
      fly.style.animationDuration = Math.random() * 3 + 2 + "s";
      fly.style.animationDelay = Math.random() * 3 + "s";
      effectLayer.appendChild(fly);
    }
  }
}

// ---------- ⑥ 渲染节点 ----------
function renderNode(id) {
  isEnding = false; 
  const node = story.nodes[id];
  if (!node) { console.error("找不到节点：", id); return; }

  currentId = id;
  bgLayer.style.backgroundImage = `url(images/${node.bg})`;
  renderEffect(node.effect);

  if (node.insert_img) {
    insertImgBox.innerHTML = `<img src="images/${node.insert_img}" alt="插图">`;
    insertImgBox.style.display = "block";
  } else {
    insertImgBox.style.display = "none";
    insertImgBox.innerHTML = "";
  }

  playBgm(node.bgm);
  choicesBox.innerHTML = "";

  renderText(node.text);

  if (node.type === "quiz") renderQuiz(node);
  else renderChoices(node);
}

function renderChoices(node) {
  node.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.textContent = choice.text;
    btn.style.animationDelay = `${index * 0.08}s`;
    
    btn.addEventListener("click", () => {
      if (choice.collect) {
        collectionBadge.classList.add("unlocked");
        if (node.insert_img && !unlockedImages.includes(node.insert_img)) {
          unlockedImages.push(node.insert_img);
        }
      }
      
      const affChange = choice.affection || 0;
      affection += affChange;
      updateHUD(affChange); 
      goNext(choice.next);
    });
    choicesBox.appendChild(btn);
  });
}

function renderQuiz(node) {
  node.options.forEach((opt, index) => {
    const btn = document.createElement("button");
    btn.textContent = opt.text;
    btn.style.animationDelay = `${index * 0.08}s`;
    btn.addEventListener("click", () => {
      goNext(opt.correct ? node.next_correct : node.next_wrong);
    });
    choicesBox.appendChild(btn);
  });
}

function goNext(nextId) {
  if (nextId === "ENDING") renderEnding();
  else renderNode(nextId);
}

// ---------- ⑦ 结局与轮播 ----------
function renderEnding() {
  renderEffect(null);
  isEnding = true; 

  let key = "C";
  if (affection >= story.endings.A.min) key = "A";
  else if (affection >= story.endings.B.min) key = "B";

  const title = story.endings[key].text;
  const body  = story.endingTexts[key];

  dialogueText.innerHTML = `<strong style="font-size:20px; color:#ffd700;">${title}</strong><br><br>${body}`;
  choicesBox.innerHTML = "";
  const btn = document.createElement("button");
  btn.textContent = "↻ 重新开始";
  btn.addEventListener("click", restart);
  choicesBox.appendChild(btn);

  if (unlockedImages.length > 0) {
    collectionBadge.classList.add("highlight");
  }
}

function updatePhoto() {
  if (memoryPhotos.length === 0) return;
  memoryImg.src = `images/${memoryPhotos[currentPhotoIndex]}`;
}
function openMemoryModal() {
  if (memoryPhotos.length === 0) return;
  updatePhoto();
  memoryModal.classList.remove("hidden");
  playBgm("bgm_warm"); 
}
prevPhotoBtn.addEventListener("click", () => {
  currentPhotoIndex = (currentPhotoIndex - 1 + memoryPhotos.length) % memoryPhotos.length;
  updatePhoto();
});
nextPhotoBtn.addEventListener("click", () => {
  currentPhotoIndex = (currentPhotoIndex + 1) % memoryPhotos.length;
  updatePhoto();
});
closeMemoryBtn.addEventListener("click", () => memoryModal.classList.add("hidden"));

collectionBadge.addEventListener("click", () => {
  if (!isEnding) {
    waitToast.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => waitToast.classList.add("hidden"), 2000);
  } else {
    openMemoryModal();
  }
});

// ---------- 👇 新增：心电感应逻辑 ----------
const secretWords = [
  "其实我早就把那个发夹当成月亮，哪怕它只是白昼里的一朵落花。🌺🌙", 
  "操场上的风从来不会为谁停留，可他经过时，万物都安静了一瞬。🍂🌪️", 
  "那天的架空层风很轻，我一直知道你在。📜🍂",
  "为了能离他近一点，我把最枯燥的物理题，做了一遍又一遍。📏🔭",
  "他写字的时候，手肘离我好近，我连呼吸都不敢太用力。🫁🫣",
  "如果时间能停在那个下午就好了，好幸福呜呜呜✨。"
];

sensorBtn.addEventListener("click", () => {
  sensorLayer.classList.remove("hidden");
});

// 鼠标/手指滑动时的波纹与文字
let lastSpawnTime = 0;

function handleSensorMove(e) {
  if (sensorLayer.classList.contains("hidden")) return;

  // 兼容手机端触摸
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  // 防止滑动太快生成太多元素卡顿，每 150 毫秒生成一次
  const now = Date.now();
  if (now - lastSpawnTime < 150) return;
  lastSpawnTime = now;

  // 1. 生成粉色波纹
  const ripple = document.createElement("div");
  ripple.className = "sensor-ripple";
  ripple.style.left = clientX + "px";
  ripple.style.top = clientY + "px";
  sensorLayer.appendChild(ripple);
  setTimeout(() => ripple.remove(), 800);

  // 2. 随机概率生成隐藏情话
  if (Math.random() > 0.8) {
    const secret = document.createElement("div");
    secret.className = "sensor-secret";
    secret.textContent = secretWords[Math.floor(Math.random() * secretWords.length)];
    secret.style.left = clientX + "px";
    secret.style.top = clientY + "px";
    // 稍微随机偏移一下，避免完全重叠
    secret.style.marginLeft = (Math.random() * 40 - 20) + "px";
    sensorLayer.appendChild(secret);
    setTimeout(() => secret.remove(), 2000);
  }
}

sensorLayer.addEventListener("mousemove", handleSensorMove);
sensorLayer.addEventListener("touchmove", handleSensorMove, { passive: true });

// 点击雷达层空白处退出雷达
sensorLayer.addEventListener("click", (e) => {
  // 如果点的是提示语就不退出
  if (e.target.classList.contains("sensor-hint")) return;
  sensorLayer.classList.add("hidden");
});

// ---------- ⑧ 重置与初始化 ----------
function restart() {
  affection = 0;
  currentBgm = null;
  currentPhotoIndex = 0;
  isEnding = false;
  unlockedImages = []; 
  updateHUD(0); 
  collectionBadge.classList.remove("unlocked");
  collectionBadge.classList.remove("highlight");
  memoryModal.classList.add("hidden");
  waitToast.classList.add("hidden");
  innerWhisper.classList.add("hidden");
  sensorLayer.classList.add("hidden");
  renderNode(story.meta.start);
}

async function init() {
  try {
    const res = await fetch("story.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    story = await res.json();
    updateHUD(0); 
    renderNode(story.meta.start);
  } catch (err) {
    dialogueText.textContent = "剧本读取失败：" + err.message;
  }
}

startBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  if (currentBgm) audio.play().catch(() => {});
});

init();