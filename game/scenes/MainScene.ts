
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Ghost } from '../entities/Ghost';
import { GameState } from '../../types';
import { audioService } from '../../services/AudioManager';

const ITEMS = ['Ancient Key', 'Rusty Music Box', 'Bloodied Letter', 'Broken Compass', 'Antique Mirror'];

enum RoomType {
  KITCHEN = 'Kitchen',
  DINING = 'Dining Room',
  PANTRY = 'Pantry',
  LIBRARY = 'Library',
  LIVING_ROOM = 'Living Room',
  STUDY = 'Study',
  MASTER = 'Master Bedroom',
  BATHROOM = 'Bathroom',
  CONSERVATORY = 'Conservatory'
}

export class MainScene extends Phaser.Scene {
  public physics!: Phaser.Physics.Arcade.ArcadePhysics;
  public add!: Phaser.GameObjects.GameObjectFactory;
  public make!: Phaser.GameObjects.GameObjectCreator;
  public input!: Phaser.Input.InputPlugin;
  public cameras!: Phaser.Cameras.Scene2D.CameraManager;
  public events!: Phaser.Events.EventEmitter;
  public tweens!: Phaser.Tweens.TweenManager;
  public time!: Phaser.Time.Clock;
  public scene!: Phaser.Scenes.ScenePlugin;
  public anims!: Phaser.Animations.AnimationManager;
  // Fix: Explicitly declare textures property for TypeScript recognition
  public textures!: Phaser.Textures.TextureManager;

  private player!: Player;
  private ghost!: Ghost;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private furniture!: Phaser.Physics.Arcade.StaticGroup;
  private interactables!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private ctrlKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  
  private targetItemName: string = '';
  private winningInteractable!: Phaser.Physics.Arcade.Sprite;
  private roomText!: Phaser.GameObjects.Text;
  private interactionText!: Phaser.GameObjects.Text;
  private isSearching: boolean = false;
  private searchProgressBar!: Phaser.GameObjects.Graphics;
  private searchedDrawers: Set<Phaser.Physics.Arcade.Sprite> = new Set();
  private vignette!: Phaser.GameObjects.Image;
  private lastCollisionSoundTime: number = 0;

  constructor() {
    super('MainScene');
  }

  preload() {
    // Optimization: Skip procedural texture generation if they already exist (e.g. after a restart)
    if (this.textures.exists('player_walk_1')) return;

    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // -- PLAYER (Human Top-Down Design with Walk Cycle Frames) --
    const createPlayerFrame = (key: string, sway: number) => {
      graphics.clear();
      graphics.fillStyle(0x2563eb); // Blue shirt
      graphics.fillEllipse(14, 16, 12, 24);
      graphics.fillCircle(14 + sway, 16 - 10, 6);
      graphics.fillCircle(14 - sway, 16 + 10, 6);
      graphics.fillStyle(0xfde68a); // Skin tone
      graphics.fillCircle(14, 16, 8);
      graphics.fillStyle(0x451a03); // Dark brown hair
      graphics.fillEllipse(12, 16, 12, 14);
      graphics.fillStyle(0xfde68a);
      graphics.fillCircle(20, 16, 3);
      graphics.generateTexture(key, 32, 32);
    };

    createPlayerFrame('player_walk_1', 0);
    createPlayerFrame('player_walk_2', 3);
    createPlayerFrame('player_walk_3', 0);
    createPlayerFrame('player_walk_4', -3);
    
    // -- GHOST (Ethereal Frames) --
    const createGhostFrame = (key: string, tailLength: number, alpha: number) => {
      graphics.clear();
      graphics.fillStyle(0xffffff, alpha);
      graphics.fillCircle(16, 16, 12);
      graphics.fillTriangle(16 - tailLength, 16, 16, 16 - 10, 16, 16 + 10);
      graphics.generateTexture(key, 32, 32);
    };

    createGhostFrame('ghost_f1', 12, 0.6);
    createGhostFrame('ghost_f2', 15, 0.4);
    createGhostFrame('ghost_f3', 10, 0.7);

    // -- NOISE RIPPLE --
    graphics.clear();
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircle(32, 32, 30);
    graphics.generateTexture('ripple', 64, 64);
    
    // -- VIGNETTE --
    const vignetteSize = 1000;
    const canvas = document.createElement('canvas');
    canvas.width = vignetteSize;
    canvas.height = vignetteSize;
    const ctx = canvas.getContext('2d');
    if (ctx && !this.textures.exists('vignette_tex')) {
      const grd = ctx.createRadialGradient(vignetteSize/2, vignetteSize/2, 200, vignetteSize/2, vignetteSize/2, vignetteSize/2);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, vignetteSize, vignetteSize);
      // Fix: Use this.textures directly since it's now declared
      this.textures.addCanvas('vignette_tex', canvas);
    }

    graphics.clear();
    
    // -- FURNITURE --
    graphics.fillStyle(0x4e342e); 
    graphics.fillRect(0, 0, 80, 40);
    graphics.lineStyle(1, 0x3e2723);
    graphics.strokeRect(0, 0, 80, 40);
    graphics.generateTexture('table', 80, 40);
    graphics.clear();

    graphics.fillStyle(0x283593); 
    graphics.fillRect(0, 0, 60, 100);
    graphics.fillStyle(0xeeeeee);
    graphics.fillRect(5, 5, 50, 30);
    graphics.generateTexture('bed', 60, 100);
    graphics.clear();

    graphics.fillStyle(0x3e2723);
    graphics.fillRect(0, 0, 40, 40);
    graphics.lineStyle(1, 0x211a14);
    graphics.strokeRect(0, 0, 40, 40);
    graphics.generateTexture('crate', 40, 40);
    graphics.clear();

    graphics.fillStyle(0x211a14);
    graphics.fillRect(0, 0, 120, 30);
    graphics.fillStyle(0x8d6e63);
    for(let i=0; i<4; i++) graphics.fillRect(10 + i*28, 5, 20, 20);
    graphics.generateTexture('bookshelf', 120, 30);
    graphics.clear();

    // -- DRAWER --
    graphics.fillStyle(0x8d6e63);
    graphics.fillRect(0, 0, 40, 30);
    graphics.lineStyle(2, 0x4e342e);
    graphics.strokeRect(0, 0, 40, 30);
    graphics.fillStyle(0xffd54f); 
    graphics.fillRect(15, 12, 10, 6); 
    graphics.generateTexture('drawer_closed', 40, 30);
    graphics.clear();

    graphics.fillStyle(0x4e342e); 
    graphics.fillRect(0, 0, 40, 30);
    graphics.fillStyle(0x8d6e63); 
    graphics.fillRect(0, 15, 40, 20); 
    graphics.lineStyle(2, 0x3e2723);
    graphics.strokeRect(0, 15, 40, 20);
    graphics.fillStyle(0xffd54f); 
    graphics.fillRect(15, 25, 10, 4); 
    graphics.generateTexture('drawer_open', 40, 35);
    graphics.clear();

    const generateFloor = (name: string, color: number) => {
        graphics.fillStyle(color);
        graphics.fillRect(0, 0, 64, 64);
        graphics.lineStyle(1, 0x000000, 0.1);
        graphics.strokeRect(0, 0, 64, 64);
        graphics.generateTexture(name, 64, 64);
        graphics.clear();
    };

    generateFloor('floor_kitchen', 0xe0e0e0); 
    generateFloor('floor_dining', 0xa1887f);
    generateFloor('floor_pantry', 0x90a4ae);
    generateFloor('floor_library', 0xe0e0e0); 
    generateFloor('floor_hall', 0xe0e0e0);    
    generateFloor('floor_study', 0x81c784);
    generateFloor('floor_master', 0x7986cb);
    generateFloor('floor_bathroom', 0x4dd0e1);
    generateFloor('floor_conservatory', 0x4db6ac);
  }

  create() {
    this.physics.world.setBounds(0, 0, 1200, 1200);
    
    this.anims.create({
      key: 'player_walk',
      frames: [
        { key: 'player_walk_1' },
        { key: 'player_walk_2' },
        { key: 'player_walk_3' },
        { key: 'player_walk_4' }
      ],
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'ghost_float',
      frames: [
        { key: 'ghost_f1' },
        { key: 'ghost_f2' },
        { key: 'ghost_f3' },
        { key: 'ghost_f2' }
      ],
      frameRate: 8,
      repeat: -1
    });

    this.walls = this.physics.add.staticGroup();
    this.furniture = this.physics.add.staticGroup();
    this.interactables = this.physics.add.staticGroup();

    this.setupHouse();
    
    this.player = new Player(this, 600, 600);
    this.ghost = new Ghost(this, 1000, 1000);

    // Enhanced collision handling with debounced sound effect
    const onPlayerImpact = () => {
      const now = this.time.now;
      if (now > this.lastCollisionSoundTime + 400) {
        audioService.playCollision();
        this.player.handleCollision();
        this.lastCollisionSoundTime = now;
      }
    };

    this.physics.add.collider(this.player, this.walls, onPlayerImpact);
    this.physics.add.collider(this.player, this.furniture, onPlayerImpact);
    this.physics.add.collider(this.player, this.interactables, onPlayerImpact);
    this.physics.add.collider(this.ghost, this.walls);

    this.setupItem();

    this.physics.add.overlap(this.player, this.ghost, () => {
      this.events.emit('gameStateChange', GameState.GAME_OVER);
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.ctrlKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.roomText = this.add.text(400, 80, '', {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'serif',
        fontStyle: 'bold italic'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(310).setAlpha(0);

    this.interactionText = this.add.text(400, 500, '', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        backgroundColor: '#00000088',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(310).setVisible(false);

    this.searchProgressBar = this.add.graphics().setDepth(300);

    // Vignette layer
    this.vignette = this.add.image(400, 300, 'vignette_tex').setScrollFactor(0).setDepth(400).setDisplaySize(800, 600);

    this.cameras.main.setBounds(0, 0, 1200, 1200);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.events.emit('itemUpdate', this.targetItemName);
    this.scene.pause();
  }

  private setupHouse() {
    const floors = [
        'floor_kitchen', 'floor_dining', 'floor_pantry',
        'floor_library', 'floor_hall', 'floor_study',
        'floor_master', 'floor_bathroom', 'floor_conservatory'
    ];

    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const floorKey = floors[y * 3 + x];
            this.tileFloor(x * 400, y * 400, floorKey);
        }
    }

    this.addWall(600, 5, 1200, 10);
    this.addWall(600, 1195, 1200, 10);
    this.addWall(5, 600, 10, 1200);
    this.addWall(1195, 600, 10, 1200);

    const WALL_W = 20;
    const DOOR_SIZE = 140;
    const HALF_DOOR = DOOR_SIZE / 2;

    for (let i = 1; i < 3; i++) {
        const linePos = i * 400;
        this.addWall(linePos, (200 - HALF_DOOR) / 2, WALL_W, 200 - HALF_DOOR);
        this.addWall(linePos, 400, WALL_W, 400 - DOOR_SIZE);
        this.addWall(linePos, 800, WALL_W, 400 - DOOR_SIZE);
        this.addWall(linePos, 1100 + HALF_DOOR / 2, WALL_W, 200 - HALF_DOOR);
        this.addWall((200 - HALF_DOOR) / 2, linePos, 200 - HALF_DOOR, WALL_W);
        this.addWall(400, linePos, 400 - DOOR_SIZE, WALL_W);
        this.addWall(800, linePos, 400 - DOOR_SIZE, WALL_W);
        this.addWall(1100 + HALF_DOOR / 2, linePos, 200 - HALF_DOOR, WALL_W);
    }

    // --- KITCHEN (0,0) ---
    this.addFurniture(80, 80, 'table', 1.5);
    this.addFurniture(320, 80, 'table', 1.5);
    this.addFurniture(200, 200, 'table', 1.2);
    this.addInteractable(80, 40, 'drawer_closed');
    this.addInteractable(320, 40, 'drawer_closed');
    this.addFurniture(40, 300, 'crate');
    this.addFurniture(40, 360, 'crate');

    // --- DINING ROOM (400, 0) ---
    this.addFurniture(600, 200, 'table', 2.5);
    this.addInteractable(450, 50, 'drawer_closed');
    this.addInteractable(750, 50, 'drawer_closed');
    this.addFurniture(500, 150, 'crate');
    this.addFurniture(700, 150, 'crate');
    this.addFurniture(500, 250, 'crate');
    this.addFurniture(700, 250, 'crate');

    // --- PANTRY (800, 0) ---
    this.addFurniture(900, 100, 'bookshelf');
    this.addFurniture(1100, 100, 'bookshelf');
    this.addFurniture(900, 300, 'crate');
    this.addFurniture(940, 300, 'crate');
    this.addFurniture(900, 340, 'crate');
    this.addFurniture(1100, 300, 'crate');
    this.addInteractable(1000, 50, 'drawer_closed');

    // --- LIBRARY (0, 400) ---
    this.addFurniture(60, 460, 'bookshelf');
    this.addFurniture(60, 560, 'bookshelf');
    this.addFurniture(60, 660, 'bookshelf');
    this.addFurniture(60, 740, 'bookshelf');
    this.addFurniture(200, 600, 'table');
    this.addInteractable(350, 450, 'drawer_closed');
    this.addInteractable(350, 750, 'drawer_closed');

    // --- LIVING ROOM (400, 400) ---
    this.addFurniture(460, 460, 'table');
    this.addInteractable(460, 430, 'drawer_closed');
    this.addFurniture(740, 460, 'table');
    this.addInteractable(740, 430, 'drawer_closed');
    this.addFurniture(460, 740, 'table');
    this.addInteractable(460, 770, 'drawer_closed');
    this.addFurniture(740, 740, 'table');
    this.addInteractable(740, 770, 'drawer_closed');

    // --- STUDY (800, 400) ---
    this.addFurniture(1000, 500, 'table', 1.8);
    this.addInteractable(1000, 440, 'drawer_closed');
    this.addFurniture(860, 460, 'bookshelf');
    this.addFurniture(1140, 460, 'bookshelf');
    this.addFurniture(860, 740, 'crate');
    this.addInteractable(1140, 740, 'drawer_closed');

    // --- MASTER BEDROOM (0, 800) ---
    this.addFurniture(200, 1000, 'bed');
    this.addInteractable(100, 950, 'drawer_closed');
    this.addInteractable(300, 950, 'drawer_closed');
    this.addFurniture(80, 1140, 'bookshelf');
    this.addFurniture(320, 1140, 'bookshelf');

    // --- BATHROOM (400, 800) ---
    this.addFurniture(600, 1100, 'table', 1.5);
    this.addInteractable(520, 1150, 'drawer_closed');
    this.addInteractable(680, 1150, 'drawer_closed');
    this.addFurniture(440, 1140, 'crate');

    // --- CONSERVATORY (800, 800) ---
    this.addFurniture(1000, 1000, 'table', 1.2); 
    this.addFurniture(860, 860, 'crate');
    this.addFurniture(1140, 860, 'crate');
    this.addFurniture(860, 1140, 'crate');
    this.addFurniture(1140, 1140, 'crate');
    this.addInteractable(1000, 850, 'drawer_closed');
    this.addInteractable(1000, 1150, 'drawer_closed');
  }

  private tileFloor(x: number, y: number, key: string) {
    this.add.tileSprite(x + 200, y + 200, 400, 400, key).setDepth(-10);
  }

  private addWall(x: number, y: number, w: number, h: number) {
    if (w <= 0 || h <= 0) return;
    const wall = this.add.rectangle(x, y, w, h, 0x212121);
    this.physics.add.existing(wall, true);
    this.walls.add(wall as any);
  }

  private addFurniture(x: number, y: number, key: string, scaleX: number = 1) {
    const item = this.furniture.create(x, y, key);
    item.setScale(scaleX, 1);
    item.refreshBody();
    item.setDepth(10);
    this.add.rectangle(x+2, y+2, item.displayWidth, item.displayHeight, 0x000000, 0.2).setDepth(5);
  }

  private addInteractable(x: number, y: number, key: string) {
    const item = this.interactables.create(x, y, key);
    item.refreshBody();
    item.setDepth(11);
    this.add.rectangle(x+2, y+2, item.displayWidth, item.displayHeight, 0x000000, 0.2).setDepth(5);
  }

  private setupItem() {
    this.targetItemName = ITEMS[Phaser.Math.Between(0, ITEMS.length - 1)];
    const drawerList = this.interactables.getChildren() as Phaser.Physics.Arcade.Sprite[];
    this.winningInteractable = drawerList[Phaser.Math.Between(0, drawerList.length - 1)];
  }

  public spawnNoiseRipple(x: number, y: number, size: number) {
    const ripple = this.add.sprite(x, y, 'ripple');
    ripple.setScale(0.1);
    ripple.setAlpha(0.7);
    ripple.setDepth(50);
    this.tweens.add({
        targets: ripple,
        scale: size,
        alpha: 0,
        duration: 800,
        onComplete: () => ripple.destroy()
    });
  }

  update() {
    if (!this.player || this.isSearching) return;

    this.player.update(this.cursors, this.shiftKey, this.ctrlKey);
    this.ghost.update(new Phaser.Math.Vector2((this.player as any).x, (this.player as any).y), this.player.noiseLevel);
    
    this.updateRoomLabel();
    this.handleInteractions();
    this.events.emit('noiseUpdate', this.player.noiseLevel);
  }

  private handleInteractions() {
    const drawerList = this.interactables.getChildren() as Phaser.Physics.Arcade.Sprite[];
    let nearInteractable = false;

    drawerList.forEach(d => d.clearTint());

    for (const drawer of drawerList) {
        if (this.searchedDrawers.has(drawer)) continue;

        const dist = Phaser.Math.Distance.Between((this.player as any).x, (this.player as any).y, drawer.x, drawer.y);
        if (dist < 70) {
            nearInteractable = true;
            drawer.setTint(0xffff00);
            
            this.interactionText.setText('Press SPACE to Search');
            this.interactionText.setVisible(true);

            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                this.startSearch(drawer);
            }
            break;
        }
    }

    if (!nearInteractable) {
        this.interactionText.setVisible(false);
    }
  }

  private startSearch(drawer: Phaser.Physics.Arcade.Sprite) {
    this.isSearching = true;
    this.player.body.setVelocity(0, 0);
    this.interactionText.setText('Searching...');
    
    this.player.noiseLevel = Math.min(100, this.player.noiseLevel + 15);
    this.spawnNoiseRipple((this.player as any).x, (this.player as any).y, 1.5);

    let progress = 0;
    this.time.addEvent({
        delay: 20,
        callback: () => {
            progress += 0.013;
            this.updateSearchProgress(progress);
        },
        repeat: 75
    });

    this.time.delayedCall(1500, () => {
        this.isSearching = false;
        this.searchProgressBar.clear();
        this.searchedDrawers.add(drawer);
        drawer.setTexture('drawer_open');
        
        if (drawer === this.winningInteractable) {
            this.interactionText.setText('Found the ' + this.targetItemName + '!');
            this.events.emit('gameStateChange', GameState.VICTORY);
        } else {
            this.interactionText.setText('Empty...');
            this.time.delayedCall(1000, () => {
                if (this.interactionText.text === 'Empty...') {
                    this.interactionText.setVisible(false);
                }
            });
        }
    });
  }

  private updateSearchProgress(progress: number) {
    this.searchProgressBar.clear();
    const px = (this.player as any).x;
    const py = (this.player as any).y;
    this.searchProgressBar.fillStyle(0x000000, 0.7);
    this.searchProgressBar.fillRect(px - 20, py - 40, 40, 6);
    this.searchProgressBar.fillStyle(0xffffff, 1);
    this.searchProgressBar.fillRect(px - 20, py - 40, 40 * Math.min(progress, 1), 6);
  }

  private updateRoomLabel() {
    const px = (this.player as any).x;
    const py = (this.player as any).y;
    const gridX = Math.floor(px / 400);
    const gridY = Math.floor(py / 400);
    const index = Math.max(0, Math.min(8, gridY * 3 + gridX));

    const rooms = [
        RoomType.KITCHEN, RoomType.DINING, RoomType.PANTRY,
        RoomType.LIBRARY, RoomType.LIVING_ROOM, RoomType.STUDY,
        RoomType.MASTER, RoomType.BATHROOM, RoomType.CONSERVATORY
    ];

    const current = rooms[index] || 'The Unknown';
    if (this.roomText.text !== current) {
        this.roomText.setText(current);
        this.roomText.setAlpha(1);
        this.tweens.add({ targets: this.roomText, alpha: 0, duration: 2000, delay: 1000 });
    }
  }
}
