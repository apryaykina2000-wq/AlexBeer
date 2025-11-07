
/* AlexBeer - Runner Game (RU)
 * - Сцены: Boot -> Menu -> Game -> Result
 * - Фон, облака, горы, земля/трава рисуются кодом
 * - Собирашки: пиво, рыба, бокал (по 1 очку)
 * - Медали: 20/40/60
 * - Рекорд сохраняется в localStorage
 */

const WIDTH = 540;
const HEIGHT = 960;
const TARGET_SCORE = 60;

const STORAGE_KEY_BEST = 'alexbeer_best';

const palette = {
  bgTop: 0x85d7d0,
  bgBottom: 0xcfeee7,
  hillFar: 0x9fd5cc,
  hillNear: 0x7fc2ba,
  cloud: 0xffffff,
  ground: 0x8f563b,
  grass: 0x66d06b,
  grassDark: 0x3a9a43,
  uiTeal: 0x196c6c,
  uiBtn: 0xf4a62b,
  uiBtnShadow: 0xa96e15,
  medalBronze: 0xcd7f32,
  medalSilver: 0xbfc0c0,
  medalGold: 0xffd700
};

class BootScene extends Phaser.Scene {
  constructor(){ super('Boot'); }
  preload(){
    // Игрок (3 бега + 2 прыжка) — отдельные текстуры
    this.load.image('player_run_1','assets/img/player_run_1.png');
    this.load.image('player_run_2','assets/img/player_run_2.png');
    this.load.image('player_run_3','assets/img/player_run_3.png');
    this.load.image('player_jump_1','assets/img/player_jump_1.png');
    this.load.image('player_jump_2','assets/img/player_jump_2.png');

    // Предметы
    this.load.image('item_beer','assets/img/item_beer.png');
    this.load.image('item_fish','assets/img/item_fish.png');
    this.load.image('item_glass','assets/img/item_glass.png');

    // Аудио (опционально, если присланы)
    this.load.audio('sfx_jump',['assets/audio/jump.ogg','assets/audio/jump.mp3']);
    this.load.audio('sfx_item',['assets/audio/coin.ogg','assets/audio/coin.mp3']);
    this.load.audio('sfx_win',['assets/audio/win.ogg','assets/audio/win.mp3']);
    this.load.audio('music',['assets/audio/music.ogg','assets/audio/music.mp3']);

    // Сгенерируем текстуры для фона/земли/кнопок/конфетти
    this.createGeneratedTextures();
  }
  create(){
    this.scene.start('Menu');
  }

  createGeneratedTextures(){
    // Небо градиентом: используем RenderTexture
    const rt = this.add.renderTexture(0,0,WIDTH,HEIGHT).setVisible(false);
    const grad = this.add.graphics();
    const steps = 32;
    for (let i=0;i<steps;i++){
      const t = i/(steps-1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(palette.bgTop),
        Phaser.Display.Color.ValueToColor(palette.bgBottom),
        steps-1, i
      );
      grad.fillStyle(Phaser.Display.Color.GetColor(color.r,color.g,color.b), 1);
      grad.fillRect(0, t*HEIGHT, WIDTH, HEIGHT/steps+1);
    }
    rt.draw(grad);
    rt.saveTexture('bg_gradient');
    grad.destroy(); rt.destroy();

    // Силуэты гор (дальние и ближние)
    function makeHillTex(key, color=0x7fb1a9, amp=30, baseY=360, seed=0){
      const g = this.add.graphics();
      g.fillStyle(color,1);
      g.beginPath();
      g.moveTo(0, HEIGHT);
      g.lineTo(0, baseY);
      const segments = 6;
      const rnd = new Phaser.Math.RandomDataGenerator([seed]);
      for(let i=1;i<=segments;i++){
        const x = (i/segments)*WIDTH;
        const y = baseY - amp + rnd.frac()*amp*2;
        g.lineTo(x,y);
      }
      g.lineTo(WIDTH, HEIGHT);
      g.closePath();
      g.fillPath();
      const rt2 = this.add.renderTexture(0,0,WIDTH,HEIGHT).setVisible(false);
      rt2.draw(g);
      rt2.saveTexture(key);
      g.destroy(); rt2.destroy();
    }
    makeHillTex.call(this,'hill_far', palette.hillFar, 25, 340, 1);
    makeHillTex.call(this,'hill_near', palette.hillNear, 35, 380, 2);

    // Облако
    {
      const g = this.add.graphics();
      g.fillStyle(palette.cloud,1);
      g.fillCircle(40,20,20);
      g.fillCircle(60,30,22);
      g.fillCircle(25,30,18);
      g.fillRoundedRect(15,30,60,22,10);
      const rt3 = this.add.renderTexture(0,0,96,64).setVisible(false);
      rt3.draw(g);
      rt3.saveTexture('cloud');
      g.destroy(); rt3.destroy();
    }

    // Земля с травой (тайл шириной 512)
    {
      const w=512, h=120;
      const g = this.add.graphics();
      // земля
      g.fillStyle(palette.ground,1);
      g.fillRoundedRect(0,40,w,h-40,16);
      g.lineStyle(6, 0x5d3b24, 1);
      g.strokeRoundedRect(0,40,w,h-40,16);
      // травяной слой
      g.fillStyle(palette.grassDark,1);
      g.fillRect(0,35,w,10);
      g.fillStyle(palette.grass,1);
      for(let x=0;x<w;x+=16){
        g.fillEllipse(x+8,40,18,10);
      }
      const rt4 = this.add.renderTexture(0,0,w,h).setVisible(false);
      rt4.draw(g);
      rt4.saveTexture('ground_tile');
      g.destroy(); rt4.destroy();
    }

    // Кнопка
    {
      const g = this.add.graphics();
      g.fillStyle(palette.uiBtnShadow,1);
      g.fillRoundedRect(8,8,360,110,22);
      g.fillStyle(palette.uiBtn,1);
      g.fillRoundedRect(0,0,360,110,22);
      const rt5 = this.add.renderTexture(0,0,380,130).setVisible(false);
      rt5.draw(g);
      rt5.saveTexture('btn_large');
      g.destroy(); rt5.destroy();
    }

    // Препятствие (генерик)
    {
      const g = this.add.graphics();
      g.fillStyle(0x9c633d,1);
      g.fillRoundedRect(0,0,60,80,12);
      g.lineStyle(4,0x5d3b24,1);
      g.strokeRoundedRect(0,0,60,80,12);
      const rt6 = this.add.renderTexture(0,0,64,84).setVisible(false);
      rt6.draw(g);
      rt6.saveTexture('obstacle_block');
      g.destroy(); rt6.destroy();
    }

    // Конфетти кусочки (несколько цветов)
    const confColors = [0xff6b6b,0xffd93d,0x6bcfff,0xb28dff,0x4caf50];
    for (let i=0;i<confColors.length;i++){
      const g = this.add.graphics();
      g.fillStyle(confColors[i],1);
      g.fillRect(0,0,8,14);
      const rt = this.add.renderTexture(0,0,8,14).setVisible(false);
      rt.draw(g);
      rt.saveTexture('confetti_'+i);
      g.destroy(); rt.destroy();
    }
  }
}

class MenuScene extends Phaser.Scene {
  constructor(){ super('Menu'); }
  create(){
    this.add.image(0,0,'bg_gradient').setOrigin(0);

    // Парллакс
    this.hillFar = this.add.image(0,0,'hill_far').setOrigin(0).setAlpha(0.7);
    this.hillNear = this.add.image(0,0,'hill_near').setOrigin(0).setAlpha(0.8);
    this.clouds = this.add.group();
    for (let i=0;i<6;i++){
      let c = this.add.image(Phaser.Math.Between(0,WIDTH), Phaser.Math.Between(50,180),'cloud');
      c.setAlpha(0.8);
      this.clouds.add(c);
    }

    // Заголовок
    const title = this.add.text(WIDTH/2, 140, 'ALEXBEER', {
      fontFamily: 'GameFont, Arial',
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#0d3b3b',
      strokeThickness: 10, shadow: { color: '#0d3b3b', fill: true, blur: 0, offsetX: 0, offsetY: 0 }
    }).setOrigin(0.5);

    // Best
    const best = parseInt(localStorage.getItem(STORAGE_KEY_BEST) || '0',10);
    const bestText = this.add.text(WIDTH/2, 220, 'РЕКОРД: ' + best, {
      fontFamily: 'GameFont, Arial',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#0d3b3b',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Витрина мини-скрин
    const preview = this.add.container(30,300).setDepth(0);
    const panel = this.add.rectangle(0,0, WIDTH-160, 260, 0xffffff, 0.2).setOrigin(0);
    panel.setStrokeStyle(6, 0x0d3b3b, 0.2);
    preview.add(panel);
    const pvGround = this.add.image(40, 200, 'ground_tile').setOrigin(0).setScale( (WIDTH-240)/512 , 1);
    preview.add(this.add.image(0,0,'hill_far').setOrigin(0).setAlpha(0.4).setScale(0.8));
    preview.add(this.add.image(0,0,'hill_near').setOrigin(0).setAlpha(0.5).setScale(0.8));
    preview.add(this.add.image(220,80,'cloud').setAlpha(0.6));
    preview.add(this.add.image(400,60,'cloud').setAlpha(0.6));
    preview.add(pvGround);
    // Превью игрока и предметов
    const pvPlayer = this.add.image(140, 190, 'player_run_1').setOrigin(0.5,1);
    preview.add(pvPlayer);
    let x0 = 260;
    ['item_beer','item_fish','item_glass'].forEach((k,i)=>{
      let it = this.add.image(x0+ i*60, 150, k);
      preview.add(it);
    });
    const pvObstacle = this.add.image( (WIDTH-160)-120, 190, 'obstacle_block').setOrigin(0.5,1);
    preview.add(pvObstacle);

    // Кнопка Play
    const btn = this.add.image(WIDTH/2, HEIGHT-180, 'btn_large').setInteractive({ useHandCursor: true });
    const label = this.add.text(btn.x, btn.y-4, 'ИГРАТЬ', {
      fontFamily: 'GameFont, Arial',
      fontSize: '52px',
      color: '#ffffff',
      stroke: '#7a4a12',
      strokeThickness: 10, shadow: { color: '#0d3b3b', fill: true, blur: 0, offsetX: 0, offsetY: 0 }
    }).setOrigin(0.5);
    btn.setDepth(10);
    label.setDepth(11);
    // fallback: tap anywhere starts game on mobile too
    this.input.once('pointerdown', ()=> this.scene.start('Game') );
    btn.on('pointerdown', ()=>{
      this.scene.start('Game');
    });

    // Лёгкая анимация облаков
    this.tweens.add({
      targets: this.clouds.getChildren(),
      x: '+=100',
      duration: 8000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }
}

class GameScene extends Phaser.Scene {
  constructor(){ super('Game'); }
  create(){
    // музыка
    this.music = this.sound.add('music', { volume: 0.25, loop: true });
    if (this.music) this.music.play();

    // фон
    this.add.image(0,0,'bg_gradient').setOrigin(0);
    this.hillFar = this.add.tileSprite(0,0,WIDTH,HEIGHT,'hill_far').setOrigin(0).setAlpha(0.7);
    this.hillNear = this.add.tileSprite(0,0,WIDTH,HEIGHT,'hill_near').setOrigin(0).setAlpha(0.8);
    this.clouds = this.add.group();
    for (let i=0;i<6;i++){
      let c = this.add.image(Phaser.Math.Between(0,WIDTH), Phaser.Math.Between(50,180),'cloud');
      c.setAlpha(0.8);
      this.clouds.add(c);
    }

    // земля
    this.ground = this.add.tileSprite(0, HEIGHT-180, WIDTH, 180, 'ground_tile').setOrigin(0);
    // лёгкое покачивание травы
    this.groundSwayTween = this.tweens.add({ targets: this.ground, y: '+=6', duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // физическая линия земли
    this.physics.world.setBounds(0,0,WIDTH,HEIGHT);
    this.groundY = HEIGHT-180+40; // линия травы
    // игрок
    this.player = this.physics.add.sprite(160, this.groundY, 'player_run_1').setOrigin(0.5,1);
    this.player.setScale(1.6);
    this.player.setCollideWorldBounds(true);
    this.player.body.setGravityY(1200);
    this.isOnGround = true;

    // Создаем анимации из отдельных текстур
    this.anims.create({
      key: 'run',
      frames: [{key:'player_run_1'},{key:'player_run_2'},{key:'player_run_3'}],
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'jump',
      frames: [{key:'player_jump_1'},{key:'player_jump_2'}],
      frameRate: 6,
      repeat: 0
    });
    this.player.play('run');

    // управление
    this.input.on('pointerdown', ()=> this.tryJump() );
    this.input.keyboard.on('keydown-SPACE', ()=> this.tryJump());
    this.input.keyboard.on('keydown-UP', ()=> this.tryJump());
    this.cursors = this.input.keyboard.createCursorKeys();

    // группы: препятствия и предметы
    this.obstacles = this.physics.add.group();
    this.items = this.physics.add.group();

    // столкновения
    this.physics.add.overlap(this.player, this.items, this.onCollect, null, this);
    this.physics.add.overlap(this.player, this.obstacles, this.onHit, null, this);

    // HUD
    this.score = 0;
    this.best = parseInt(localStorage.getItem(STORAGE_KEY_BEST) || '0',10);
    this.scoreText = this.add.text(20, 16, '0/60', {
      fontFamily: 'GameFont, Arial', fontSize: '28px', color: '#ffffff', stroke: '#0d3b3b', strokeThickness: 6
    });
    this.bestText = this.add.text(WIDTH-20, 16, 'Рекорд: '+this.best, {
      fontFamily: 'GameFont, Arial', fontSize: '28px', color: '#ffffff', stroke: '#0d3b3b', strokeThickness: 6
    }).setOrigin(1,0);

    // Спавнеры
    this.speed = 4.0;
    this.spawnTimer = 0;
    this.spawnInterval = 1600;

    this.itemTimer = 0;
    this.itemInterval = 1000;
  }

  tryJump(){
    // Разрешаем прыжок только с земли (простой вариант)
    if (this.player.body.blocked.down || this.player.y >= this.groundY-1){
      this.player.setVelocityY(-560);
      this.player.play('jump', true);
      if (this.sound.get('sfx_jump')) this.sound.play('sfx_jump', { volume: 0.5 });
      this.isOnGround = false;
    }
  }

  onCollect(player, item){
    item.destroy();
    this.score += 1;
    this.scoreText.setText(this.score + '/60');
    if (this.sound.get('sfx_item')) this.sound.play('sfx_item', { volume: 0.4 });
    if (this.score >= TARGET_SCORE){
      this.winGame();
    }
  }

  onHit(){
    this.loseGame();
  }

  winGame(){
    // Стоп музыка
    if (this.music) this.music.stop();
    // Конфетти
    this.makeConfetti();
    if (this.sound.get('sfx_win')) this.sound.play('sfx_win', { volume: 0.7 });
    this.time.delayedCall(1500, ()=>{
      this.scene.start('Result', { score: this.score, best: this.best, win:true });
    });
  }

  loseGame(){
    if (this.music) this.music.stop();
    this.scene.start('Result', { score: this.score, best: this.best, win:false });
  }

  makeConfetti(){
    const colorsCount = 5;
    for (let i=0;i<120;i++){
      const key = 'confetti_' + (i % colorsCount);
      const p = this.add.sprite(Phaser.Math.Between(0,WIDTH), -20, key);
      const dur = Phaser.Math.Between(900, 1400);
      this.tweens.add({
        targets: p,
        y: HEIGHT + 30,
        x: p.x + Phaser.Math.Between(-100,100),
        angle: Phaser.Math.Between(180,540),
        duration: dur,
        onComplete: ()=> p.destroy(),
        ease: 'Cubic.in'
      });
    }
  }

  update(time, delta){
    // Фон параллакс
    this.hillFar.tilePositionX += this.speed*0.2;
    this.hillNear.tilePositionX += this.speed*0.35;
    this.ground.tilePositionX += this.speed;

    // вернем беговую анимацию когда на земле
    if (this.player.body.velocity.y >= 0 && this.player.y >= this.groundY-1){
      if (!this.isOnGround){
        this.player.play('run', true);
        this.isOnGround = true;
      }
      this.player.y = this.groundY;
      this.player.body.blocked.down = true;
    }

    // Сложность растет
    if (this.score < 20){
      this.speed = 4.0;
      this.spawnInterval = 1600;
      this.itemInterval = 1000;
    } else if (this.score < 40){
      this.speed = 5.0;
      this.spawnInterval = 1300;
      this.itemInterval = 850;
    } else {
      this.speed = 6.0;
      this.spawnInterval = 1050;
      this.itemInterval = 750;
    }

    // Спавн препятствий
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval){
      this.spawnTimer = 0;
      this.spawnObstacle();
      // шанс двойного
      if (this.score >= 35 && Math.random() < 0.35){
        this.time.delayedCall(300, ()=> this.spawnObstacle());
      }
    }

    // Спавн предметов
    this.itemTimer += delta;
    if (this.itemTimer >= this.itemInterval){
      this.itemTimer = 0;
      this.spawnItemRow();
    }

    // Движение вперед (по сути, двигаем объекты влево)
    this.obstacles.getChildren().forEach(o=>{
      o.x -= this.speed*2.2;
      if (o.x < -100) o.destroy();
    });
    this.items.getChildren().forEach(it=>{
      it.x -= this.speed*2.2;
      if (it.x < -60) it.destroy();
      // покачивание
      it.y += Math.sin((time*0.005 + it._phase) ) * 0.3;
    });
  }

  spawnObstacle(){
    const o = this.obstacles.create(WIDTH+60, this.groundY, 'obstacle_block').setOrigin(0.5,1);
    o.body.allowGravity = false;
    o.setImmovable(true);
    // случайная высота/масштаб для разнообразия
    const s = Phaser.Math.FloatBetween(0.9, 1.15);
    o.setScale(s);
  }

  spawnItemRow(){
    // случайный тип предмета
    const keys = ['item_beer','item_fish','item_glass'];
    const key = keys[Math.floor(Math.random()*keys.length)];
    const count = Phaser.Math.Between(2,3);
    const baseY = this.groundY - Phaser.Math.Between(70, 120);
    const startX = WIDTH + 40;
    for (let i=0;i<count;i++){
      const it = this.items.create(startX + i*48, baseY, key).setOrigin(0.5,0.5);
      it.body.allowGravity = false;
      it._phase = Math.random()*Math.PI*2;
      it.setScale(0.8);
    }
  }
}

class ResultScene extends Phaser.Scene {
  constructor(){ super('Result'); }
  init(data){
    this.score = data.score || 0;
    this.best = data.best || 0;
    this.win = !!data.win;
  }
  create(){
    this.add.image(0,0,'bg_gradient').setOrigin(0);
    this.add.image(0,0,'hill_far').setOrigin(0).setAlpha(0.7);
    this.add.image(0,0,'hill_near').setOrigin(0).setAlpha(0.8);

    // Обновление рекорда
    if (this.score > this.best){
      this.best = this.score;
      localStorage.setItem(STORAGE_KEY_BEST, String(this.best));
    }

    // Заголовок
    const title = this.add.text(WIDTH/2, 100, this.win ? 'ПОБЕДА!' : 'ИТОГ', {
      fontFamily: 'GameFont, Arial',
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#0d3b3b',
      strokeThickness: 10, shadow: { color: '#0d3b3b', fill: true, blur: 0, offsetX: 0, offsetY: 0 }
    }).setOrigin(0.5);

    const sText = this.add.text(WIDTH/2, 170, `СЧЁТ: ${this.score} / 60`, {
      fontFamily: 'GameFont, Arial',
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#0d3b3b',
      strokeThickness: 6
    }).setOrigin(0.5);

    const bText = this.add.text(WIDTH/2, 220, `РЕКОРД: ${this.best}`, {
      fontFamily: 'GameFont, Arial',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#0d3b3b',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Медаль
    let medal = null;
    let medalName = '';
    if (this.score >= 60){ medal = palette.medalGold; medalName = 'ЗОЛОТО'; }
    else if (this.score >= 40){ medal = palette.medalSilver; medalName = 'СЕРЕБРО'; }
    else if (this.score >= 20){ medal = palette.medalBronze; medalName = 'БРОНЗА'; }

    if (medal){
      const g = this.add.graphics();
      g.fillStyle(medal, 1);
      g.fillCircle(WIDTH/2, 290, 36);
      g.lineStyle(6, 0x333333, 0.6);
      g.strokeCircle(WIDTH/2, 290, 36);
      this.add.text(WIDTH/2, 350, medalName, {
        fontFamily: 'GameFont, Arial',
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#0d3b3b',
        strokeThickness: 6
      }).setOrigin(0.5);
    }

    // Кнопки
    const btnAgain = this.add.image(WIDTH/2, HEIGHT-120, 'btn_large').setInteractive({useHandCursor:true});
    const labelAgain = this.add.text(btnAgain.x, btnAgain.y-4, 'ЕЩЁ РАЗ', {
      fontFamily: 'GameFont, Arial', fontSize: '40px', color: '#ffffff', stroke:'#7a4a12', strokeThickness:8
    }).setOrigin(0.5);
    btnAgain.on('pointerdown', ()=> this.scene.start('Game') );

    const btnMenu = this.add.image(WIDTH/2, HEIGHT-40, 'btn_large').setScale(0.6).setInteractive({useHandCursor:true});
    const labelMenu = this.add.text(btnMenu.x, btnMenu.y-2, 'МЕНЮ', {
      fontFamily: 'GameFont, Arial', fontSize: '28px', color: '#ffffff', stroke:'#7a4a12', strokeThickness:6
    }).setOrigin(0.5);
    btnMenu.on('pointerdown', ()=> this.scene.start('Menu') );
  }
}

const config = {
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT
  },
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#196c6c',
  parent: 'game-root',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [BootScene, MenuScene, GameScene, ResultScene]
};

new Phaser.Game(config);
