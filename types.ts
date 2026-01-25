export interface GameStats {
  fragmentsCollected: number;
  coresCollected: number;
  meteoritesDestroyed: number;
  totalDamageDealt: number;
  bulletsFired: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface GameObject extends Point {
  vx: number;
  vy: number;
  radius: number;
}

export interface Bullet extends GameObject {
  distanceTraveled: number;
  maxDistance: number;
  isIce?: boolean;
  isFire?: boolean;
  isHoming?: boolean;
}

export interface Meteorite extends GameObject {
  hp: number;
  maxHp: number;
  rotation: number;
  rotationSpeed: number;
  spawnTime: number;
  isBoss?: boolean;
  isUpgraded?: boolean;
  slowTimer?: number;
  burnTimer?: number;
  flashTimer?: number;
  flashColor?: string;
  craters?: {x: number, y: number, r: number}[];
  vertices: Point[];
  targetId?: number;
}

export interface Fragment extends GameObject {
  color: string;
  opacity: number;
  isMovingToTurret?: boolean;
  isCore?: boolean;
}

export interface VisualEffect extends Point {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type PerkId = 'extraBullets' | 'reduceCooldown' | 'increaseDamage' | 'homing' | 'ice' | 'fire' | 'moreMeteorites';

export interface Perk {
  id: PerkId;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export type SkinId = 'DEFAULT' | 'SPRING_FESTIVAL' | 'LGBT';

export type TalentId = 'cooldown' | 'damage' | 'spawnRate' | 'fragmentValue' | 'bulletTrail' | 'magnetRange';

export interface TalentNode {
  id: TalentId;
  name: string;
  description: string;
  maxLevel: number;
  costPerLevel: number;
  prerequisiteId?: TalentId;
  branch: 1 | 2 | 3;
}

export interface TalentState {
  levels: Record<TalentId, number>;
  totalFragments: number;
  totalCores: number;
  currentSkin: SkinId;
  version?: number;
  lastUpdated?: number;
}