class Menu extends Phaser.Scene{
  constructor() {
    super("menuScene");
  }

  preload(){
    this.load.image('title_img', './assets/title_sprite.png');
    this.load.image('play_button', './assets/play_sprite.png');
    this.load.image('menu_border', './assets/menu_border.png');
    this.load.image('menu_character', './assets/sprite_stop_0.png');
    this.load.audio('menu_select', './assets/menu_select.mp3');
    this.load.audio('loop', './assets/synthwave-80s-110045.mp3');
    this.load.image('controls', './assets/controls.png');
    this.load.image('goal', './assets/goal.png');
    this.load.audio('lose_life', './assets/lose_life.flac');
    this.load.audio('land', './assets/land_on_platform.wav');
    this.load.audio('lose_game', './assets/lose_game.wav');
    this.load.image('help', './assets/help.png');
    this.load.image('credits_button', './assets/credits.png');
  }

  create(){
    this.player = this.physics.add.sprite(width/2, height/2, 'menu_character').setScale(2);
    this.player.y = 505;
    this.player.x = 1000;

    this.controls = this.add.sprite(0, 0, "controls").setScale(1.2).setTint(0x000000);
    this.controls.y = 200;
    this.controls.x = 200;

    this.goal = this.add.sprite(0, 0, "goal").setScale(1.2);
    this.goal.y = 200;
    this.goal.x = 800;

    this.help = this.add.sprite(0, 0, "help").setScale(1.3);
    this.help.y = 400;
    this.help.x = 800;

    this.centerX=game.config.width/2;
    this.centerY=game.config.height/2;
    this.cameras.main.setBackgroundColor(0xFFFFFF);

    this.menu_border = this.add.sprite(0, 0, "menu_border");
    this.menu_border.y = this.centerY;
    this.menu_border.x = this.centerX;

    this.play_button = this.physics.add.sprite(0, 0, "play_button");
    this.play_button.body.setSize(200, 70).setOffset(0, 40);


    this.play_button.y = this.centerY+100;
    this.play_button.x = this.centerX;
    this.play_button.setInteractive();
    this.input.on('gameobjectdown', this.playButtonClicked.bind(this));

    this.title_img = this.add.sprite(0, 0, "title_img");
    this.title_img.y = this.centerY-100;
    this.title_img.x = this.centerX;

    this.creditsButton = this.physics.add.sprite(0, 0, "credits_button").setScale(0.8);
    this.creditsButton.y = this.centerY + 200;
    this.creditsButton.x = this.centerX;
    this.creditsButton.setInteractive();
    this.creditsButton.on('pointerdown', () => this.scene.start("creditsScene"));

  }

  update() {
    this.player.x -= 5;
    if (this.player.x < -100){
      this.player.x = 1000;
    }
  }

  playButtonClicked(pointer, gameObject){
    if (gameObject === this.play_button) {
        this.sound.play('menu_select');
        this.scene.start("playScene");
    }
  }

}