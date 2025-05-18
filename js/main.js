let canvas = document.getElementById("game-canvas");
let ctx = canvas.getContext("2d");
canvas.width = 1200;
canvas.height = 600;

let gameMode;
let difficulty = "easy";

function setDifficulty(value) {
    difficulty = value;
}

function startGame(mode) {
    gameMode = mode;
    document.getElementById("menu").style.display = "none";
    initGame(ctx, mode, difficulty, canvas);
}

// 动态绑定按钮事件
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("single-mode-btn").addEventListener("click", () => startGame("single"));
    document.getElementById("multi-mode-btn").addEventListener("click", () => startGame("multi"));
});