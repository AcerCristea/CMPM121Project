class Credits extends Phaser.Scene {
  constructor() {
    super("creditsScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);

    this.add.text(game.config.width/2, 50, "Music", { fontSize: '48px', fill: '#ff0000' }).setOrigin(0.5);

    let startY = 100;
    let stepY = 40;
    let links = [
      "https://pixabay.com/music/synthwave-synthwave-80s-110045/",
      "https://freesound.org/people/tim.kahn/sounds/44876/",
      "https://freesound.org/people/JustInvoke/sounds/138490/",
      "https://freesound.org/people/Eponn/sounds/619835/"
    ];

    links.forEach((link, index) => {
      this.add.text(game.config.width/2, startY + index * stepY, link, { fontSize: '24px', fill: '#FFF' }).setOrigin(0.5);
    });

    this.add.text(game.config.width/2, 300, "Art", { fontSize: '48px', fill: '#0000FF' }).setOrigin(0.5);
    this.add.text(game.config.width/2, 350, "Keaton Shawhan", { fontSize: '24px', fill: '#FFF' }).setOrigin(0.5);

    this.add.text(game.config.width/2, 430, "Gameplay", { fontSize: '48px', fill: '#FFFF00' }).setOrigin(0.5);
    this.add.text(game.config.width/2, 480, "Keaton Shawhan", { fontSize: '24px', fill: '#FFF' }).setOrigin(0.5);

    let backButton = this.add.text(game.config.width/2, game.config.height - 50, "Back to Menu", { fontSize: '32px', fill: '#FFF' }).setOrigin(0.5);
    backButton.setInteractive();
    backButton.on('pointerdown', () => this.scene.start('menuScene'));
  }
}
