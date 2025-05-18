function updateScore(player1, player2) {
    // 移除分数更新逻辑，因为已删除分数面板
}

function drawGuideLine(ctx, cueBall, angle) {
    // 主辅助线：从白球边缘开始，不穿过球体
    const ballRadius = 20;
    const startX = cueBall.position.x + Math.cos(angle) * (ballRadius + 2); // 略微外延
    const startY = cueBall.position.y + Math.sin(angle) * (ballRadius + 2);
    const gradient = ctx.createLinearGradient(startX, startY, 
        startX + Math.cos(angle) * 1000, startY + Math.sin(angle) * 1000);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * 1000, startY + Math.sin(angle) * 1000);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 反射虚线：优化显示被击球走向
    balls.forEach(ball => {
        const dist = Math.sqrt(
            Math.pow(ball.position.x - cueBall.position.x, 2) +
            Math.pow(ball.position.y - cueBall.position.y, 2)
        );
        if (dist < 60 && dist > ballRadius * 2) { // 扩展检测范围，避开白球
            const collisionAngle = Math.atan2(
                ball.position.y - cueBall.position.y,
                ball.position.x - cueBall.position.x
            );
            const reflectAngle = 2 * collisionAngle - angle; // 反射角度
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                let x = ball.position.x + Math.cos(reflectAngle) * i * 25;
                let y = ball.position.y + Math.sin(reflectAngle) * i * 25;
                if (i === 0) ctx.moveTo(ball.position.x, ball.position.y);
                else ctx.lineTo(x, y);
            }
            ctx.setLineDash([6, 6]);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });
}