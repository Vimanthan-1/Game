import Phaser from 'phaser';
import { MovementMode } from '../../types';
import { audioService } from '../../services/AudioManager';

export class Player extends Phaser.GameObjects.Container {
  public body!: Phaser.Physics.Arcade.Body;

  private sprite: Phaser.GameObjects.Sprite;
  private currentMode: MovementMode = MovementMode.STILL;
  private footstepTimer: number = 0;
  private rippleTimer: number = 0;
  public noiseLevel: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.sprite = scene.add.sprite(0, 0, 'player_walk_1');
    (this as any).add(this.sprite);

    this.body.setCollideWorldBounds(true);
    this.body.setSize(32, 32);
    this.body.setOffset(-16, -16);
    this.body.setBounce(0.1);
    
    (this as any).setDepth(150);
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, shift: Phaser.Input.Keyboard.Key, ctrl: Phaser.Input.Keyboard.Key) {
    if (!this.body) return;

    let speed = 150;
    this.currentMode = MovementMode.WALK;
    let noiseInc = 0.6;
    let animSpeedScale = 1;

    if (shift.isDown) {
      speed = 280;
      this.currentMode = MovementMode.SPRINT;
      noiseInc = 2.2;
      animSpeedScale = 1.8;
    } else if (ctrl.isDown) {
      speed = 80;
      this.currentMode = MovementMode.SLOW;
      noiseInc = 0.15;
      animSpeedScale = 0.5;
    }

    let vx = 0;
    let vy = 0;

    if (cursors.left.isDown) vx = -speed;
    else if (cursors.right.isDown) vx = speed;

    if (cursors.up.isDown) vy = -speed;
    else if (cursors.down.isDown) vy = speed;

    if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
    }

    this.body.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
        const angle = Math.atan2(vy, vx) * (180 / Math.PI);
        this.sprite.setAngle(angle);
        
        this.sprite.play('player_walk', true);
        this.sprite.anims.timeScale = animSpeedScale;
        
        this.noiseLevel = Math.min(100, this.noiseLevel + noiseInc);
        
        // Ripples for loud movement
        this.rippleTimer++;
        if (this.currentMode === MovementMode.SPRINT && this.rippleTimer % 15 === 0) {
            // Fix: Cast this to any to access scene which has custom method spawnNoiseRipple
            (this as any).scene.spawnNoiseRipple((this as any).x, (this as any).y, 1.2);
        } else if (this.currentMode === MovementMode.WALK && this.rippleTimer % 40 === 0) {
            // Fix: Cast this to any to access scene which has custom method spawnNoiseRipple
            (this as any).scene.spawnNoiseRipple((this as any).x, (this as any).y, 0.6);
        }

        // Footsteps
        this.footstepTimer++;
        const interval = this.currentMode === MovementMode.SPRINT ? 10 : (this.currentMode === MovementMode.SLOW ? 35 : 20);
        if (this.footstepTimer >= interval) {
          audioService.playFootstep(noiseInc);
          this.footstepTimer = 0;
        }
    } else {
        this.currentMode = MovementMode.STILL;
        this.noiseLevel = Math.max(0, this.noiseLevel - 1.2);
        this.sprite.stop();
        this.sprite.setTexture('player_walk_1');
    }

    if (this.noiseLevel > 80 && (vx !== 0 || vy !== 0)) {
        this.sprite.setX(Math.random() * 2 - 1);
    } else {
        this.sprite.setX(0);
    }
  }

  handleCollision() {
    // Noise penalty for collision
    this.noiseLevel = Math.min(100, this.noiseLevel + 25);
    
    // Physical feedback
    (this as any).scene.spawnNoiseRipple((this as any).x, (this as any).y, 2.0);
    (this as any).scene.cameras.main.shake(100, 0.005);
  }
}
