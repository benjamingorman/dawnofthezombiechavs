var game = new Phaser.Game(1024, 768, Phaser.AUTO, 'game');

//Player
var player;
var nextFire;
var fireRate = 200;
var playerIsMoving = false

//Map
var map;
var emitter;
var layer;

//Objects
var bullets;

//Enemies
var enemies;
var enemyFrequency;

//UI
var hud;
var crosshair;
var score;
var scoreText;
var dangerText;
var titleStyle = {
    font: "70px \"Courier New\"",
    fill: "#fff",
    align: "center"
};
var buttonStyle = {
    font: "56px \"Courier New\"",
    fill: "#fff",
    align: "center"
};
var hudStyle = {
    font: "28px \"Courier New\"",
    fill: "#fff",
};

//Sound
var music;

var mainMenu = {
	preload: function() {
		game.load.spritesheet('player', 'assets/images/animations_player.png', 40, 28);
		game.load.spritesheet('fire_bullet', 'assets/images/animations_fire.png', 16, 8);
    game.load.spritesheet('enemy', 'assets/images/animations_enemy_1.png', 32, 32);
    game.load.image('menuButton', 'assets/images/button_menu.png');
    game.load.image('playButton', 'assets/images/button_play.png');
    game.load.image('crosshair', 'assets/images/crosshair.png');
    game.load.spritesheet('arrows', 'assets/images/arrows.png', 64, 64);

    game.load.image('tiles', 'assets/map/tileset.png');
   	game.load.tilemap('map', 'assets/map/tilemap.json', null, Phaser.Tilemap.TILED_JSON);
   	game.load.image('rain', 'assets/images/raindrop.png');

   	// AUDIO
   	game.load.audio('storm', ['assets/audio/chavstorm.ogg']);
   	game.load.audio('gunshot', ['assets/audio/gunshot.ogg']);
   	game.load.audio('lightning', ['assets/audio/lightning.ogg']);
	},

	create: function() {
		game.world.height = 768;
		game.world.width = 1024;
		game.camera.focusOnXY(game.world.centerX, game.world.centerY);

    this.makeButton(
      game.world.centerX, 
      game.world.centerY,
      'playButton',
      function() {game.state.start('playState')},
      'Play',
      buttonStyle
    );

    var highScoreStyle = buttonStyle;
    highScoreStyle.font = "38px \"Courier New\"";
    this.makeButton(
      game.world.centerX, 
      game.world.centerY + 150,
      'playButton',
      function() {game.state.start('highScoreState')},
      'High Scores',
      highScoreStyle
    );

    var titleText = game.add.text(game.world.centerX, game.world.centerY - 200, 'Dawn of the Zombie Chavs', titleStyle);
    titleText.anchor.setTo(0.5, 0.5);

    var subTitle = game.add.text(game.world.centerX, game.world.centerY - 150, 'by Ben Gorman', hudStyle);
    subTitle.anchor.setTo(0.5, 0.5);
	},

	makeButton: function(x, y, imageName, func, text, style) {
		var button = game.add.button(x, y, imageName, func, this);
		button.anchor.setTo(0.5, 0.5);
		button.scale.setTo(2, 2);

		var buttonText = game.add.text(x, y, text, style);
    buttonText.anchor.setTo(0.5, 0.5);
	},

};

var highScoreState = {
  create: function() {
    $.get( "highscore", function( data ) {
      game.add.text(250, 75, "Top survivors",  titleStyle);
      game.add.text(400, 200, "Name",  buttonStyle);
      game.add.text(600, 200, "Score", buttonStyle);

      for (n=1; n < 6; n++) {
        /* data arrives in json as {1: ["bob", 100] ... 5: ["david", 7]} */
        var parsedData = JSON.parse(data);
        var name    = parsedData[n][0];
        var score   = parsedData[n][1];

        game.add.text(350, 200 + 50 * n, n,       buttonStyle);
        game.add.text(400, 200 + 50 * n, name,    buttonStyle);
        game.add.text(600, 200 + 50 * n, score,   buttonStyle);
      };
      
    });

    this.makeButton(
      512, 
      650,
      'menuButton',
      function() {game.state.start('mainMenu')},
      'Back',
      buttonStyle
    );
  },

  makeButton: function(x, y, imageName, func, text, style) {
    var button = game.add.button(x, y, imageName, func, this);
    button.anchor.setTo(0.5, 0.5);
    button.scale.setTo(2, 2);

    var buttonText = game.add.text(x, y, text, style);
    buttonText.anchor.setTo(0.5, 0.5);
  },
}

var playState = {
  create: function() {
  	// MAP 
  	this.physics.startSystem(Phaser.Physics.ARCADE);
  	map = game.add.tilemap('map');
  	map.addTilesetImage('tiles');
  	layer = map.createLayer('Tile Layer 1');
    layer.resizeWorld(); // Sets the world size to match the size of this layer.
    //map.setCollisionBetween(0, 100);

    //Make it RAIN
		emitter = game.add.emitter(game.world.centerX, 0, 2000); //max particles = 1000
		emitter.width = game.world.width;
		emitter.makeParticles('rain');
		emitter.maxParticleScale = 1;
		emitter.minParticleScale = 0.5;
		emitter.setYSpeed(500, 800);
		emitter.setXSpeed(-5, 5);
		emitter.minRotation = 0;
		emitter.maxRotation = 0;
		emitter.start(false, 800, 10, 0); //explode, lifespan, quantity, forcequantity
  	
    // PLAYER
 		player = this.add.sprite(this.world.centerX, this.world.centerY, 'player');
    player.anchor.setTo(0.9, 0.6);
    game.physics.arcade.enable(player);
    player.body.collideWorldBounds = true;
    game.camera.follow(player);

		player.animations.add('idle', [0], 10, false);
		player.animations.add('walk', [1, 2], 10, true);

		// CROSSHAIR
		crosshair = this.add.sprite(this.world.centerX, this.world.centerY, 'crosshair'); 
		$('#game').addClass('hiddencursor');

    // ENEMIES
    enemies = game.add.group();
    enemies.enableBody = true;
    enemies.physicsBodyType = Phaser.Physics.ARCADE;
    enemyFrequency = 0.01;

    // BULLETS
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.setAll('outOfBoundsKill', true);
    nextFire = game.time.now;

    // HUD
    hud = game.add.group();
    hud.fixedToCamera = true;
    score = 0;
    scoreText = game.add.text(5,0, 'Score: 0', hudStyle, hud);
    dangerText = game.add.text(250,0, 'Danger level: 100', hudStyle, hud);
    instructionText = game.add.text(5, 738, 'Move with the arrow keys and click to shoot', hudStyle, hud);

    game.time.events.loop(Phaser.Timer.SECOND, function() { score ++ },   this);
    game.time.events.loop(Phaser.Timer.SECOND, this.updateEnemyFrequency, this);

    // CONTROLS
    cursors = game.input.keyboard.createCursorKeys();

    // AUDIO
    music = game.sound.play('storm');
  },
   
  update: function() {
    // CROSSHAIR
    crosshair.x = game.input.mousePointer.x + game.camera.x;
    crosshair.y = game.input.mousePointer.y + game.camera.y;

  	// ENEMIES
    if (Math.random() < enemyFrequency) this.spawnEnemy();
    
    enemies.forEach(function (enemy) {
     	game.physics.arcade.moveToObject(
     		enemy, //the object to be moved
     		player, //destination object
     		200 //speed
     	);
     	enemy.rotation = game.physics.arcade.angleBetween(enemy, player)
    });
    
    // PLAYER
    var speed = 6;
    if (game.input.activePointer.isDown) this.fire();
    player.rotation = game.physics.arcade.angleToPointer(player);

    // Input detection
    var pressedLeft   = cursors.left.isDown
    var pressedRight  = cursors.right.isDown
    var pressedUp     = cursors.up.isDown
    var pressedDown   = cursors.down.isDown
    var pressedAny    = pressedLeft || pressedRight || pressedUp || pressedDown

    // Animation control
    if (pressedAny)   { playerIsMoving = true;  player.play('walk') }
    else              { playerIsMoving = false; player.play('idle') };

    // Player movement control
    if (pressedLeft)  { player.x -= speed };
    if (pressedRight) { player.x += speed };
    if (pressedUp)    { player.y -= speed };
    if (pressedDown)  { player.y += speed };

    // COLLISIONS
   	game.physics.arcade.collide(
   		bullets, 
   		enemies, 
   		this.bulletHitsEnemy, // The function to call if they collide
   		null, // optional argument acts as an additional check to carry out before calling the function
   		this //the context to run it in
   	);

   	game.physics.arcade.collide(
   		enemies, 
   		player, 
   		this.enemyHitsPlayer
   	);

    // MAP
   	emitter.x = game.camera.x;
   	emitter.y = game.camera.y;

    // UI
    this.updateScore();
  },

  spawnEnemy: function() {
    console.log("spawned an enemy");
  	var locations = {
  		'top': 		[Math.random() * this.world.width, -32],
  		'right': 	[this.world.width + 32, Math.random() * this.world.height],
  		'bottom': 	[Math.random() * this.world.width, this.world.height + 32],
  		'left': 	[-32, Math.random() * this.world.height]
  	};

  	var loc = game.rnd.pick(['top', 'right', 'bottom', 'left']);
  	var x = locations[loc][0];
  	var y = locations[loc][1];
  	var enemy = enemies.create(x, y, 'enemy');

  	enemy.animations.add('walk', [0, 1], 10, true);
  	enemy.play('walk');
  	enemy.anchor.setTo(0.5, 0.5);
  },

  fire: function() {
    if (game.time.now > nextFire ) {
    	// variable used to limit the firing rate
      nextFire = game.time.now + fireRate;

      var bullet = bullets.create(player.x, player.y, 'fire_bullet');
      bullet.animations.add('fire', [0, 1, 2], false);
      bullet.play('fire');

      bullet.rotation = game.physics.arcade.angleToPointer(bullet);
      game.physics.arcade.moveToPointer(bullet, 1500);
      game.sound.play('gunshot');
    }
	},

	bulletHitsEnemy: function(bullet, enemy) {
		bullet.kill();
		enemy.kill();
		score += 5;
	},

	enemyHitsPlayer: function(enemy, player) {
		player.kill();
		music.stop();
		game.sound.play('lightning');
		game.state.start('gameOver');  
	},

  updateEnemyFrequency: function() {
    enemyFrequency += 0.0002;
    dangerText.setText('Danger level: ' + Math.floor(enemyFrequency * 10000));
  },

	updateScore: function() {
		scoreText.setText('Score: ' + score);
	}
};

var gameOver = {
	create: function() {
		$('#game').removeClass('hiddencursor');

		game.camera.focusOnXY(game.world.centerX, game.world.centerY);
		var gameOverText = game.add.text(
			game.world.centerX, 
			game.world.centerY - 150, 
			"GAME OVER", 
			titleStyle
    );
    gameOverText.anchor.setTo(0.5);

    var scoreText = game.add.text(
      game.world.centerX, 
			game.world.centerY, 
			"You scored: " + score + " points", 
			hudStyle
    );
    scoreText.anchor.setTo(0.5);

    this.makeButton(
    	game.world.centerX - 150, 
    	game.world.centerY + 100,
    	'menuButton',
    	function() {game.state.start('mainMenu')},
    	'Menu',
    	buttonStyle
    );

    this.makeButton(
    	game.world.centerX + 150, 
    	game.world.centerY + 100,
    	'playButton',
    	function() {game.state.start('playState')},
    	'Play',
    	buttonStyle
    );

    $.post("highscore", {playerScore: score, playerName: "Ben"}, this.setHighScoreText);
	},

  setHighScoreText: function(text) {
    var highScoreText = game.add.text(
      game.world.centerX, 
      game.world.centerY + 250, 
      text, 
      buttonStyle
    );
    highScoreText.anchor.setTo(0.5, 0.5)
    scoreText.anchor.setTo(0.5);
  },

	makeButton: function(x, y, imageName, func, text, style) {
		var button = game.add.button(x, y, imageName, func, this);
		button.anchor.setTo(0.5, 0.5);
		button.scale.setTo(2, 2);

		var buttonText = game.add.text(
			x, 
			y, 
			text, 
			style
    );
    buttonText.anchor.setTo(0.5, 0.5);
	},

	update: function() {}, 
};

game.state.add('playState', playState);
game.state.add('mainMenu', mainMenu);
game.state.add('gameOver', gameOver);
game.state.add('highScoreState', highScoreState);
game.state.start('mainMenu');  