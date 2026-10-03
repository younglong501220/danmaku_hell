import { ShipConfig, ShipType } from '../types/game';

export const SHIPS: Record<ShipType, ShipConfig> = {
  TYPE_A: {
    id: 'TYPE_A',
    name: 'DO-N82 [赤・紅蜂]',
    subName: 'HIGH SPEED / WIDE SHOT',
    color: '#ee1133',
    accentColor: '#ffbb00',
    speed: 5.4,
    focusSpeed: 2.2,
    shotType: '3-Way Vulcan / Micro Laser',
    description: '經典紅色蜂型主戰機。機動性頂尖，廣角扇形機砲適合清雜兵，雷射極具穿透力。'
  },
  TYPE_B: {
    id: 'TYPE_B',
    name: 'DO-P24 [綠・碧蜂]',
    subName: 'BALANCED / TARGETING',
    color: '#00cc66',
    accentColor: '#00ffff',
    speed: 4.8,
    focusSpeed: 2.0,
    shotType: 'Twin Gun / Spiral Focus',
    description: '全能平衡型戰機。配備副翼轉動彈道，聚焦時射束穩定，新手與進階皆宜。'
  },
  TYPE_C: {
    id: 'TYPE_C',
    name: 'DO-S55 [藍・蒼蜂]',
    subName: 'HEAVY FIREPOWER / HYPER BEAM',
    color: '#2277ff',
    accentColor: '#ff00aa',
    speed: 4.3,
    focusSpeed: 1.8,
    shotType: '5-Way Heavy Shot / Mega Laser',
    description: '重火力砲艇。基礎速度略慢，但正面爆發火力居全機種之冠，摧毀大型 Boss 速度極快。'
  }
};
