const assets = [
    'assets/images/background.png',
    'assets/images/table.png',
    'assets/images/cue.png',
    'assets/images/balls/ball_1.png',
    'assets/images/balls/ball_2.png',
    'assets/images/balls/ball_3.png',
    'assets/images/balls/ball_4.png',
    'assets/images/balls/ball_5.png',
    'assets/images/balls/ball_6.png',
    'assets/images/balls/ball_7.png',
    'assets/images/balls/ball_8.png',
    'assets/images/balls/ball_9.png',
    'assets/images/balls/ball_10.png',
    'assets/images/balls/ball_11.png',
    'assets/images/balls/ball_12.png',
    'assets/images/balls/ball_13.png',
    'assets/images/balls/ball_14.png',
    'assets/images/balls/ball_15.png',
    'assets/images/balls/cue_ball.png',
    'assets/sounds/hit.wav',
    'assets/sounds/pocket.wav',
    'assets/sounds/bgm.mp3'
];

let loadedAssets = 0;
const progressBar = document.getElementById('progress');

function updateProgress() {
    loadedAssets++;
    const progressPercent = (loadedAssets / assets.length) * 100;
    progressBar.style.width = progressPercent + '%';
    if (loadedAssets === assets.length) {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }
}

assets.forEach(asset => {
    if (asset.endsWith('.png')) {
        const img = new Image();
        img.src = asset;
        img.onload = updateProgress;
        img.onerror = () => {
            console.error(`Failed to load ${asset}`);
            updateProgress();
        };
    } else if (asset.endsWith('.wav') || asset.endsWith('.mp3')) {
        const audio = new Audio();
        audio.src = asset;
        audio.oncanplaythrough = updateProgress;
        audio.onerror = () => {
            console.error(`Failed to load ${asset}`);
            updateProgress();
        };
    }
});