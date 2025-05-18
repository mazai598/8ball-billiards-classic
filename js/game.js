let engine = Matter.Engine.create();
let world = engine.world;
engine.gravity.y = 0;

// 优化时间步长，减少穿透
engine.timing.timeScale = 1;
engine.timing.delta = 1000 / 60;

let balls = [];
let cueBall;
let cue = { x: 300, y: 300, angle: 0, length: 300 };
let player1Score = 0, player2Score = 0;
let currentPlayer = 1;
let player1Type = null, player2Type = null;
let aiTimeout = null;

// 蓄力相关变量
let isCharging = false;
let chargeStartTime = 0;
let chargePower = 0;
const maxChargeTime = 3000; // 3 秒
const maxForce = 0.1; // 最大力度

// 加载图像
let tableImg = new Image();
tableImg.src = "assets/images/table.png";
let cueImg = new Image();
cueImg.src = "assets/images/cue.png";
let ballImgs = [];
for (let i = 1; i <= 15; i++) {
    let img = new Image();
    img.src = `assets/images/balls/ball_${i}.png`;
    ballImgs[i] = img;
}
let cueBallImg = new Image();
cueBallImg.src = "assets/images/balls/cue_ball.png";

// 加载音效
let hitSound = new Audio("assets/sounds/hit.wav");
let pocketSound = new Audio("assets/sounds/pocket.wav");
let bgm = new Audio("assets/sounds/bgm.mp3");
bgm.loop = true;

// 球袋位置和尺寸（美化洞口大小）
const pockets = [
    { x: 50, y: 50, radius: 55 },
    { x: 600, y: 50, radius: 55 },
    { x: 1150, y: 50, radius: 55 },
    { x: 50, y: 550, radius: 55 },
    { x: 600, y: 550, radius: 55 },
    { x: 1150, y: 550, radius: 55 }
];

function initGame(ctx, mode, diff, canvas) {
    window.gameMode = mode;
    window.difficulty = diff;

    bgm.play().catch(err => console.log("Audio play failed:", err));

    cueBall = Matter.Bodies.circle(300, 300, 20, {
        label: "cueBall",
        restitution: 0.9,
        friction: 0.05,
        mass: 1
    });
    Matter.World.add(world, cueBall);

    const ballPositions = [
        { x: 800, y: 300, id: 1 },
        { x: 840, y: 280, id: 2 },
        { x: 840, y: 320, id: 3 },
        { x: 880, y: 260, id: 4 },
        { x: 880, y: 300, id: 8 },
        { x: 880, y: 340, id: 5 },
        { x: 920, y: 240, id: 6 },
        { x: 920, y: 280, id: 7 },
        { x: 920, y: 320, id: 9 },
        { x: 920, y: 360, id: 10 },
        { x: 960, y: 220, id: 11 },
        { x: 960, y: 260, id: 12 },
        { x: 960, y: 300, id: 13 },
        { x: 960, y: 340, id: 14 },
        { x: 960, y: 380, id: 15 }
    ];

    ballPositions.forEach(pos => {
        let ball = Matter.Bodies.circle(pos.x, pos.y, 20, {
            label: `ball_${pos.id}`,
            restitution: 0.9,
            friction: 0.05,
            mass: 1
        });
        balls.push(ball);
        Matter.World.add(world, ball);
    });

    Matter.World.add(world, [
        Matter.Bodies.rectangle(600, 25, 1200, 50, { isStatic: true, label: "wall", friction: 0.1 }),
        Matter.Bodies.rectangle(600, 575, 1200, 50, { isStatic: true, label: "wall", friction: 0.1 }),
        Matter.Bodies.rectangle(25, 300, 50, 600, { isStatic: true, label: "wall", friction: 0.1 }),
        Matter.Bodies.rectangle(1175, 300, 50, 600, { isStatic: true, label: "wall", friction: 0.1 })
    ]);

    Matter.Events.on(engine, "collisionStart", (event) => {
        event.pairs.forEach(pair => {
            if (pair.bodyA.label.includes("ball") && pair.bodyB.label.includes("ball")) {
                hitSound.play();
            }
        });
    });

    Matter.Engine.run(engine);
    render(ctx);
}

function render(ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tableImg, 0, 0, canvas.width, canvas.height);

    balls.forEach(ball => {
        const id = parseInt(ball.label.split("_")[1]);
        ctx.save();
        ctx.translate(ball.position.x, ball.position.y);
        ctx.drawImage(ballImgs[id], -20, -20, 40, 40);
        ctx.restore();

        pockets.forEach(pocket => {
            const dist = Math.sqrt(
                Math.pow(ball.position.x - pocket.x, 2) +
                Math.pow(ball.position.y - pocket.y, 2)
            );
            if (dist < pocket.radius) {
                let scale = Math.max(0, (pocket.radius - dist) / pocket.radius);
                ctx.drawImage(ballImgs[id], -20 * scale, -20 * scale, 40 * scale, 40 * scale);
                if (scale <= 0) {
                    Matter.World.remove(world, ball);
                    balls = balls.filter(b => b !== ball);
                    pocketSound.play();
                    handlePocketedBall(id);
                }
            }
        });
    });

    ctx.save();
    ctx.translate(cueBall.position.x, cueBall.position.y);
    ctx.drawImage(cueBallImg, -20, -20, 40, 40);
    ctx.restore();

    pockets.forEach(pocket => {
        const dist = Math.sqrt(
            Math.pow(cueBall.position.x - pocket.x, 2) +
            Math.pow(cueBall.position.y - pocket.y, 2)
        );
        if (dist < pocket.radius) {
            Matter.Body.setPosition(cueBall, { x: 300, y: 300 });
            Matter.Body.setVelocity(cueBall, { x: 0, y: 0 });
            switchPlayer();
        }
    });

    if (areBallsStopped()) {
        // 以球杆尾部为起点，尾部靠近白球，蓄力时向后移动
        const baseOffset = 25; // 尾部与白球的距离
        const chargeOffset = isCharging ? chargePower * 30 : 0; // 蓄力时后移，最大 30 像素
        cue.x = cueBall.position.x - Math.cos(cue.angle) * (baseOffset + chargeOffset);
        cue.y = cueBall.position.y - Math.sin(cue.angle) * (baseOffset + chargeOffset);

        ctx.save();
        ctx.translate(cue.x, cue.y);
        ctx.rotate(cue.angle);
        ctx.drawImage(cueImg, -300, -10, 300, 20); // 球杆尺寸 300x20，尾部在 (0, 0)，前端向左延伸
        ctx.restore();
        drawGuideLine(ctx, cueBall, cue.angle);

        // 蓄力条从绿色渐变到红色
        if (isCharging) {
            const chargeTime = Date.now() - chargeStartTime;
            chargePower = Math.min(chargeTime / maxChargeTime, 1);
            const barWidth = 200 * chargePower;
            const r = Math.floor(255 * chargePower);
            const g = Math.floor(255 * (1 - chargePower));
            ctx.fillStyle = `rgba(${r}, ${g}, 0, 0.7)`;
            ctx.fillRect(cueBall.position.x - 100, cueBall.position.y + 40, barWidth, 10);
        }
    }

    if (window.gameMode === "single" && currentPlayer === 2 && areBallsStopped()) {
        clearTimeout(aiTimeout);
        aiTimeout = setTimeout(() => {
            aiPlay();
        }, 1000);
    }

    requestAnimationFrame(() => render(ctx));
}

function handlePocketedBall(id) {
    if (id === 8) {
        if ((currentPlayer === 1 && balls.every(b => {
            const ballId = parseInt(b.label.split("_")[1]);
            return ballId === 8 || (player1Type === "solid" ? ballId > 8 : ballId <= 7 || ballId === 8);
        })) || (currentPlayer === 2 && balls.every(b => {
            const ballId = parseInt(b.label.split("_")[1]);
            return ballId === 8 || (player2Type === "solid" ? ballId > 8 : ballId <= 7 || ballId === 8);
        }))) {
            alert(`玩家${currentPlayer} 获胜！`);
            window.location.reload();
        } else {
            alert(`玩家${currentPlayer} 输了！`);
            window.location.reload();
        }
    } else {
        if (player1Type === null && player2Type === null) {
            if (id <= 7) {
                player1Type = currentPlayer === 1 ? "solid" : "stripe";
                player2Type = currentPlayer === 1 ? "stripe" : "solid";
            } else {
                player1Type = currentPlayer === 1 ? "stripe" : "solid";
                player2Type = currentPlayer === 1 ? "solid" : "stripe";
            }
        }

        if ((currentPlayer === 1 && player1Type === "solid" && id <= 7) ||
            (currentPlayer === 1 && player1Type === "stripe" && id > 8) ||
            (currentPlayer === 2 && player2Type === "solid" && id <= 7) ||
            (currentPlayer === 2 && player2Type === "stripe" && id > 8)) {
            if (currentPlayer === 1) {
                player1Score++;
            } else {
                player2Score++;
            }
        } else {
            switchPlayer();
        }
    }
    updateScore(player1Score, player2Score);
}

function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    document.getElementById("current-player").textContent = currentPlayer === 1 ? "玩家1" : (window.gameMode === "single" ? "AI" : "玩家2");
}

function areBallsStopped() {
    return balls.every(ball => {
        const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
        return speed < 0.05;
    }) && Math.sqrt(cueBall.velocity.x ** 2 + cueBall.velocity.y ** 2) < 0.05;
}

function aiPlay() {
    let targetBall = null;
    let minDistToPocket = Infinity;

    balls.forEach(ball => {
        const id = parseInt(ball.label.split("_")[1]);
        if (id !== 8 && (
            (player2Type === "solid" && id <= 7) ||
            (player2Type === "stripe" && id > 8)
        )) {
            pockets.forEach(pocket => {
                const distToPocket = Math.sqrt(
                    Math.pow(ball.position.x - pocket.x, 2) +
                    Math.pow(ball.position.y - pocket.y, 2)
                );
                if (distToPocket < minDistToPocket) {
                    minDistToPocket = distToPocket;
                    targetBall = ball;
                }
            });
        }
    });

    if (!targetBall) {
        targetBall = balls.find(ball => parseInt(ball.label.split("_")[1]) === 8);
        if (!targetBall && balls.length > 0) {
            targetBall = balls[0];
        }
    }

    if (targetBall) {
        let angle = Math.atan2(
            targetBall.position.y - cueBall.position.y,
            targetBall.position.x - cueBall.position.x
        );
        const error = {
            easy: 0.3,
            medium: 0.15,
            hard: 0.05
        }[window.difficulty];
        angle += (Math.random() - 0.5) * error;

        cue.angle = angle;
        const force = {
            easy: 0.03,
            medium: 0.04,
            hard: 0.05
        }[window.difficulty];
        Matter.Body.applyForce(cueBall, cueBall.position, {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force
        });
    }
}

canvas.addEventListener("mousemove", (e) => {
    if (areBallsStopped() && (window.gameMode === "multi" || currentPlayer === 1)) {
        let rect = canvas.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        let mouseY = e.clientY - rect.top;
        cue.angle = Math.atan2(mouseY - cueBall.position.y, mouseX - cueBall.position.x);
        // 更新球杆位置，尾部靠近白球
        const dist = Math.sqrt((mouseX - cueBall.position.x) ** 2 + (mouseY - cueBall.position.y) ** 2);
        const baseOffset = 25;
        const chargeOffset = isCharging ? chargePower * 30 : 0;
        cue.x = cueBall.position.x - Math.cos(cue.angle) * (baseOffset + chargeOffset);
        cue.y = cueBall.position.y - Math.sin(cue.angle) * (baseOffset + chargeOffset);
    }
});

canvas.addEventListener("mousedown", () => {
    if (areBallsStopped() && (window.gameMode === "multi" || currentPlayer === 1)) {
        isCharging = true;
        chargeStartTime = Date.now();
        chargePower = 0;
    }
});

canvas.addEventListener("mouseup", () => {
    if (areBallsStopped() && (window.gameMode === "multi" || currentPlayer === 1) && isCharging) {
        isCharging = false;
        const force = maxForce * chargePower;
        Matter.Body.applyForce(cueBall, cueBall.position, {
            x: Math.cos(cue.angle) * force,
            y: Math.sin(cue.angle) * force
        });
        chargePower = 0;
    }
});
