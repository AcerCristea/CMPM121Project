class Play extends Phaser.Scene {
  constructor() {
      super('playScene')
  }

  preload() {
      this.load.spritesheet('character', './assets/spritesheets/spritesheet.png', {
          frameWidth: 100
      })
      this.load.image('platform', './assets/platform_sprite.png');
      this.load.image('background', './assets/background_sprite.png');
  }

  create() {
      this.cameras.main.setBackgroundColor(0xDDDDDD);
      this.background = this.add.tileSprite(0, 0, 0, 0, 'background').setOrigin(0, 0);
      this.music = this.sound.add('loop', {loop: true}).setVolume(0.1);
      this.lose_game = this.sound.add('lose_game').setVolume(0.2);
      this.music.play();
      
      this.highScore = localStorage.getItem('highScore') || 0;

      cursors = this.input.keyboard.createCursorKeys();

      this.anims.create({
          key: 'idle',
          frameRate: 0,
          repeat: -1,
          frames: this.anims.generateFrameNumbers('character', {
              start: 0,
              end: 0
          })
      })
      this.anims.create({
          key: 'walk-left',
          frameRate: 5,
          repeat: -1,
          frames: this.anims.generateFrameNumbers('character', {
              start: 3,
              end: 4
          })
      })
      this.anims.create({
          key: 'walk-right',
          frameRate: 5,
          repeat: -1,
          frames: this.anims.generateFrameNumbers('character', {
              start: 1,
              end: 2
          })
      })
      this.anims.create({
          key: 'jump',
          frameRate: 0,
          repeat: -1,
          frames: this.anims.generateFrameNumbers('character', {
              start: 5,
              end: 5
          })
      })
      width = game.config.width;
      height = game.config.height;
      this.player = this.physics.add.sprite(width/2, height/2, 'character', 1).setScale(1);
      this.player.body.setGravityY(2000);

      this.player.body.setCollideWorldBounds(true);
      this.player.body.setSize(30, 73).setOffset(37, 20);
      this.PLAYER_VELOCITY = 350;
      this.player.setDragX(2000);
      
      this.floor = this.physics.add.staticGroup();

      // Create a black rectangle
      let floorRect = this.add.rectangle(width/2, height - 25, width, 50, 0x000000).setOrigin(0.5, 0.5);

      // Add the rectangle to the static physics group so it acts as a solid object
      this.floor.add(floorRect);
      this.physics.add.collider(this.player, this.floor);

      // initialize score
      this.playerScore = 0;
      this.scoreBoard = this.physics.add.staticGroup();

      // Create a black rectangle
      let scoreRect = this.add.rectangle(width/2, 25, width, 50, 0x000000).setOrigin(0.5, 0.5);

      // Add the rectangle to the static physics group so it acts as a solid object
      this.scoreBoard.add(scoreRect);
      this.physics.add.collider(this.player, this.scoreBoard);
      

      this.random_array = [];
      for (var i = 150; i < 400; i++) {
          this.random_array.push(i); 
      }

      // Platforms group
      this.platforms = this.physics.add.staticGroup();

      let randomHeight = Phaser.Math.RND.pick(this.random_array);
      this.platform1 = new Platform(this, width, randomHeight);
      this.platform1.initPlatform(1, 2);
      this.platforms.add(this.platform1);

      randomHeight = Phaser.Math.RND.pick(this.random_array);
      this.platform2 = new Platform(this, width + 400, randomHeight);
      this.platform2.initPlatform(1, 2);
      this.platforms.add(this.platform2);

      randomHeight = Phaser.Math.RND.pick(this.random_array);
      this.platform3 = new Platform(this, width + 800, randomHeight);
      this.platform3.initPlatform(1, 2);
      this.platforms.add(this.platform3);

      this.physics.add.collider(this.player, this.platforms, this.onPlatformCollided, null, this);


      this.lives = 3;
      this.played = false;

      this.gameTime = 0;
      this.gameTimerEvent = this.time.addEvent({
          delay: 1000,
          callback: this.updateGameTime,
          callbackScope: this,
          loop: true
      });

      this.timeText = this.add.text(16, 16, 'Time: 0', { fontSize: '32px', fill: '#FFF' });

      this.highScoreText = this.add.text(game.config.width - 16, 16, 'High Score: ' + this.highScore, { fontSize: '32px', fill: '#FFF'});
      this.highScoreText.setOrigin(1, 0);

      this.livesText = this.add.text(360, 16, 'Lives: ', { fontSize: '32px', fill: '#FFF' });
    }

  update() {
    if (this.lives > 0){
        this.timeText.setText('Time: ' + this.gameTime);
        this.livesText.setText('Lives: ' + this.lives);
        this.background.tilePositionX += (1+this.gameTime/100);
        const ACCELERATION = 500;

        if (cursors.left.isDown) {
            this.player.setAccelerationX(-ACCELERATION);
            this.player.play("walk-left", true);
        } 
        else if (cursors.right.isDown) {
            this.player.setAccelerationX(ACCELERATION);
            this.player.play("walk-right", true);
        } 
        else {
            // When no left/right arrow key is pressed, stop accelerating the player
            this.player.setAccelerationX(0);
            this.player.play("idle", true);
        }

        // Jumping
        if (cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-1300);
        }

        if (!this.player.body.touching.down) {
            this.player.play("jump", true);
        }
        this.platform1.update();
        this.platform2.update();
        this.platform3.update();
    }else{
        this.death();
    }
  }
  onPlatformCollided(player, platform) {
    if (player.body.touching.down && !platform.jumped) {
        this.cameras.main.setBackgroundColor(platform.color);
        this.sound.play("land");
        platform.setWhite();
    }
  }
  death(){
    if (!this.played){
        this.livesText.setText('Lives: ' + 0);
        let overlay = this.add.rectangle(game.config.width / 2, game.config.height / 2, game.config.width, game.config.height, 0x000000);
        overlay.alpha = 0.75;
        this.finalTimeText = this.add.text(game.config.width / 2, game.config.height / 2 - 100, 'You died!', { fontSize: '96px', fill: '#FFF' }).setOrigin(0.5);
        this.finalTimeText = this.add.text(game.config.width / 2, game.config.height / 2, 'Final Time: ' + this.gameTime, { fontSize: '76px', fill: '#FFF' }).setOrigin(0.5);
        this.lose_game.play();
        this.played = true;
        this.music.stop();
        let restartButton = this.add.text(game.config.width / 2, game.config.height / 2 + 100, 'Restart', { fontSize: '64px', fill: '#FFF' }).setOrigin(0.5).setInteractive();

        restartButton.on('pointerdown', () => { 
            this.scene.start('menuScene'); 
        });
        if (this.gameTime > this.highScore) {
          this.highScore = this.gameTime;
          this.highScoreText.setText('High Score: ' + this.highScore);
          localStorage.setItem('highScore', this.highScore);
      }
    }
  }
  updateGameTime() {
    if (this.lives > 0) {
        this.gameTime += 1; // Increment by one second
    }
}

}