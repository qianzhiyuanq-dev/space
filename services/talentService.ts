import { TalentId, TalentNode, TalentState, SkinId } from '../types';

const STORAGE_KEY = 'stellar_sentinel_save_v1';
const CURRENT_VERSION = 1;

export const TALENT_NODES: TalentNode[] = [
  { id: 'cooldown', name: '急速装填', description: '减少子弹射击冷却', maxLevel: 5, costPerLevel: 5, branch: 1 },
  { id: 'bulletTrail', name: '能量轨迹', description: '增加子弹飞行速度', maxLevel: 3, costPerLevel: 25, prerequisiteId: 'cooldown', branch: 1 },
  { id: 'damage', name: '强化弹药', description: '提升子弹杀伤力', maxLevel: 5, costPerLevel: 10, branch: 2 },
  { id: 'spawnRate', name: '引力信标', description: '吸引更多陨石刷新', maxLevel: 5, costPerLevel: 5, branch: 3 },
  { id: 'fragmentValue', name: '高效回收', description: '产生更多能量碎片', maxLevel: 3, costPerLevel: 30, prerequisiteId: 'spawnRate', branch: 3 },
  { id: 'magnetRange', name: '磁场扩张', description: '增加光标回收碎片的范围', maxLevel: 3, costPerLevel: 25, prerequisiteId: 'spawnRate', branch: 3 },
];

const initialState: TalentState = {
  levels: {
    cooldown: 0,
    damage: 0,
    spawnRate: 0,
    fragmentValue: 0,
    bulletTrail: 0,
    magnetRange: 0
  },
  totalFragments: 0,
  totalCores: 0,
  currentSkin: 'DEFAULT'
};

export const talentService = {
  getState(): TalentState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return { ...initialState };
      const parsed = JSON.parse(saved);
      const mergedLevels = { ...initialState.levels, ...(parsed.levels || {}) };
      return {
        levels: mergedLevels,
        totalFragments: typeof parsed.totalFragments === 'number' ? parsed.totalFragments : 0,
        totalCores: typeof parsed.totalCores === 'number' ? parsed.totalCores : 0,
        currentSkin: parsed.currentSkin || 'DEFAULT',
        version: parsed.version || CURRENT_VERSION
      };
    } catch (e) {
      console.error("存档读取失败", e);
      return { ...initialState };
    }
  },

  saveState(state: TalentState) {
    const dataToSave = {
      levels: state.levels,
      totalFragments: state.totalFragments,
      totalCores: state.totalCores,
      currentSkin: state.currentSkin,
      version: CURRENT_VERSION,
      lastUpdated: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  },

  setSkin(skin: SkinId) {
    const state = this.getState();
    state.currentSkin = skin;
    this.saveState(state);
  },

  resetState() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('stellar_sentinel_talents');
    return { ...initialState };
  },

  addCurrency(fragments: number, cores: number) {
    const state = this.getState();
    state.totalFragments += fragments;
    state.totalCores += cores;
    this.saveState(state);
  },

  upgradeTalent(id: TalentId): boolean {
    const state = this.getState();
    const node = TALENT_NODES.find(n => n.id === id);
    if (!node || (state.levels[id] || 0) >= node.maxLevel) return false;
    if (node.prerequisiteId && (state.levels[node.prerequisiteId] || 0) === 0) return false;
    const cost = node.costPerLevel * ((state.levels[id] || 0) + 1);
    if (state.totalFragments < cost) return false;
    state.totalFragments -= cost;
    state.levels[id] = (state.levels[id] || 0) + 1;
    this.saveState(state);
    return true;
  },

  getBonuses() {
    const state = this.getState();
    return {
      cooldownReduction: (state.levels.cooldown || 0) * 150,
      damageBoost: (state.levels.damage || 0) * 2,
      spawnBoost: (state.levels.spawnRate || 0) * 0.2,
      fragmentBonus: state.levels.fragmentValue || 0,
      bulletSpeedBoost: (state.levels.bulletTrail || 0) * 1.5,
      magnetRangeBoost: (state.levels.magnetRange || 0) * 20,
    };
  }
};