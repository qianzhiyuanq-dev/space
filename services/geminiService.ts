
import { GoogleGenAI } from "@google/genai";
import { GameStats } from "../types";

export const getGameSummaryLore = async (stats: GameStats): Promise<string> => {
  // Initialize Gemini API with the required parameter format
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    你现在是“星际卫士”防卫军的最高统帅。请针对以下战报，直接对刚刚撤出战场的飞行员（玩家）进行简短、硬核且极具临场感的点评：
    - 收集能量碎片: ${stats.fragmentsCollected}
    - 击毁敌对陨石: ${stats.meteoritesDestroyed}
    - 造成的总破坏: ${stats.totalDamageDealt}
    - 消耗弹药基数: ${stats.bulletsFired}

    要求：
    1. 语气要像是在指挥舰桥上通过加密频道直接对话。
    2. 风格应结合硬核科幻、军官的威严，或者一点老派军人的黑色幽默。
    3. 评价要简短有力，控制在 2 句话内。
    4. 不要包含“评价如下”之类的废话，直接输出对话内容。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text?.trim() || "数据传输受损，但你的战绩将被星系铭记。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "通讯中心暂时离线，你的英勇事迹已存入黑匣子。";
  }
};
