import { METEORITE_SPAWN_INTERVAL } from '../constants';

/**
 * 难度系统服务
 * 负责处理随时间推移的生成频率计算和难度系数调整
 */
export const difficultyService = {
  /**
   * 根据生存时间计算当前的生成间隔
   * @param survivalSecs 生存秒数
   * @param spawnBoost 天赋加成
   * @param perkMult 强化卡牌倍率
   * @returns 毫秒级的生成间隔
   */
  calculateSpawnInterval(survivalSecs: number, spawnBoost: number, perkMult: number): number {
    // 显著加快难度曲线：由 20s 缩减为 12s 一个跨度，并增加非线性加速
    const timeFactor = 1 + (survivalSecs / 12) + Math.pow(survivalSecs / 60, 1.5);
    const baseInterval = METEORITE_SPAWN_INTERVAL / (1 + spawnBoost);
    
    // 返回调整后的间隔，最小限制在 350ms 防止由于计算过快导致的性能压力，但提升了极限频率
    return Math.max(350, baseInterval / (perkMult * timeFactor));
  },

  /**
   * 计算屏外生成所需的最小距离
   * @param width 屏幕宽
   * @param height 屏幕高
   * @returns 屏外生成圆半径
   */
  getSpawnDistance(width: number, height: number): number {
    // 使用勾股定理计算对角线一半，并加上额外 150 像素的安全裕量确保完全在屏外
    return Math.sqrt(width ** 2 + height ** 2) / 2 + 150;
  }
};