export type MonsoonAlertLevel = "high" | "moderate" | "caution" | "none";

export interface MonsoonAlert {
  level: MonsoonAlertLevel;
  seasonName: string;
  advice: string;
}

const EAST_COAST_CITIES = new Set([
  "Kota Bharu",
  "Kuala Terengganu",
  "Kuantan",
]);

const BORNEO_CITIES = new Set([
  "Kota Kinabalu",
  "Kuching",
]);

export function getMonsoonAlert(
  cityName: string,
  month: number // 1-indexed (January = 1)
): MonsoonAlert {
  if (EAST_COAST_CITIES.has(cityName)) {
    // Northeast Monsoon: Nov–Mar
    if (month === 11 || month === 12 || month <= 3) {
      return {
        level: "high",
        seasonName: "Northeast Monsoon",
        advice:
          "Heavy rain & flooding risk on East Coast — avoid riding in low-lying areas.",
      };
    }
    // Inter-monsoon: Apr and Oct
    if (month === 4 || month === 10) {
      return {
        level: "caution",
        seasonName: "Inter-Monsoon",
        advice: "Afternoon thunderstorms likely — check radar before departing.",
      };
    }
    return { level: "none", seasonName: "", advice: "" };
  }

  if (BORNEO_CITIES.has(cityName)) {
    // Two wet peaks: Nov–Mar and May–Sep
    if (month >= 11 || month <= 3) {
      return {
        level: "moderate",
        seasonName: "Wet Season (NE Influence)",
        advice: "Borneo wet season — expect daily rain, ride with care.",
      };
    }
    if (month >= 5 && month <= 9) {
      return {
        level: "moderate",
        seasonName: "Wet Season (SW Influence)",
        advice: "Borneo wet season — expect daily rain, ride with care.",
      };
    }
    return { level: "none", seasonName: "", advice: "" };
  }

  // West Coast (KL, Shah Alam, Petaling Jaya, George Town, Johor Bahru, Ipoh, Melaka)
  // Southwest Monsoon: May–Sep
  if (month >= 5 && month <= 9) {
    return {
      level: "moderate",
      seasonName: "Southwest Monsoon",
      advice:
        "Moderate rain on West Coast — roads may be slippery in evenings.",
    };
  }
  // Inter-monsoon: Apr and Oct
  if (month === 4 || month === 10) {
    return {
      level: "caution",
      seasonName: "Inter-Monsoon",
      advice: "Afternoon thunderstorms likely — check radar before departing.",
    };
  }
  return { level: "none", seasonName: "", advice: "" };
}
