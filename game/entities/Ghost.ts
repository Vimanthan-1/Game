
import Phaser from 'phaser';
import { HEARING_THRESHOLD } from '../../types';
import { audioService } from '../../services/AudioManager';

export class Ghost extends Phaser.GameObjects.Container {
  public body!: Phaser.Physics.Arcade.Body;

  private sprite: Phaser.GameObjects.Sprite;
  private patrolTarget: Phaser.Math.Vector2;
  private isChasing: boolean = false;
  private isInvestigating: boolean = false;
  private lastKnownNoiseSource: Phaser.Math.Vector2 | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.sprite = scene.add.sprite(0, 0, 'ghost_f1');
    this.sprite.setDisplaySize(40, 40);
    (this as any).add(this.sprite);

    if (this.sprite.anims) {
        this.sprite.play('ghost_float');
    }

    scene.tweens.add({
        targets: this.sprite,
        y: { from: -4, to: 4 },
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
    });

    scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
    });

    this.body.setCircle(20);
    this.body.setOffset(-20, -20);
    
    this.patrolTarget = new Phaser.Math.Vector2((this as any).x, (this as any).y);
    (this as any).setDepth(160);
  }

  update(playerPos: Phaser.Math.Vector2, playerNoise: number) {
    if (this.isInvestigating) return;

    const distToPlayer = Phaser.Math.Distance.Between((this as any).x, (this as any).y, playerPos.x, playerPos.y);
    const hearingRange = playerNoise * 7; 
    
    if (playerNoise > HEARING_THRESHOLD && distToPlayer < hearingRange) {
      if (!this.isChasing) {
        this.isChasing = true;
        audioService.playGhostDetection();
      }
      this.lastKnownNoiseSource = playerPos.clone();
    }

    if (this.isChasing && this.lastKnownNoiseSource) {
      (this as any).scene.physics.moveToObject(this, this.lastKnownNoiseSource, 190);
      
      const distToNoise = Phaser.Math.Distance.Between((this as any).x, (this as any).y, this.lastKnownNoiseSource.x, this.lastKnownNoiseSource.y);
      if (distToNoise < 30) {
        this.investigate();
      }
    } else {
      (this as any).scene.physics.moveToObject(this, this.patrolTarget, 100);
      if (Phaser.Math.Distance.Between((this as any).x, (this as any).y, this.patrolTarget.x, this.patrolTarget.y) < 30) {
        this.pickNewPatrolTarget();
      }
    }

    const targetAlpha = this.isChasing ? 0.9 : 0.6;
    this.sprite.setAlpha(Phaser.Math.Linear(this.sprite.alpha, targetAlpha, 0.05));
  }

  private investigate() {
    this.isInvestigating = true;
    this.isChasing = false;
    this.lastKnownNoiseSource = null;
    this.body.setVelocity(0, 0);

    // Rotate around randomly to "search"
    (this as any).scene.tweens.add({
        targets: this.sprite,
        angle: 360,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => {
            this.isInvestigating = false;
            this.pickNewPatrolTarget();
        }
    });
  }

  private pickNewPatrolTarget() {
    const gridX = Phaser.Math.Between(0, 2);
    const gridY = Phaser.Math.Between(0, 2);
    const targetX = gridX * 400 + 200;
    const targetY = gridY * 400 + 200;

    this.patrolTarget.set(
        targetX + (Math.random() - 0.5) * 300, 
        targetY + (Math.random() - 0.5) * 300
    );
  }
}
