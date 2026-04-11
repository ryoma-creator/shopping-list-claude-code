// デフォルト食材画像の選択肢（Cloudinaryにアップロード済み）
const CDN = 'https://res.cloudinary.com/dnm2fyhwt/image/upload'

export interface FoodImageOption {
  label: string   // 表示名
  url: string
  keywords: string[]  // マッチ用キーワード
}

export const FOOD_IMAGE_OPTIONS: FoodImageOption[] = [
  {
    label: 'Salmon / 鮭',
    url: `${CDN}/v1775896646/raw-fresh-salmon-meat-fillet-wooden-cutting-board_twzy3v.jpg`,
    keywords: ['salmon', 'サーモン', '鮭', 'さけ', 'シャケ', 'しゃけ', 'salmone', 'salmón', '연어'],
  },
  {
    label: 'Yogurt / ヨーグルト',
    url: `${CDN}/v1775896646/organic-yogurt-bowl-with-oats-table_nzagzo.jpg`,
    keywords: ['yogurt', 'yoghurt', 'greek yogurt', 'greek yoghurt', 'ヨーグルト', 'よーぐると', 'グリークヨーグルト', 'yaourt', 'yogur', '요거트'],
  },
  {
    label: 'Banana / バナナ',
    url: `${CDN}/v1775896645/high-angle-shot-banana-isolated-white-surface_jviohg.jpg`,
    keywords: ['banana', 'バナナ', 'ばなな', 'banane', 'plátano', '바나나'],
  },
  {
    label: 'ひき肉 / Ground meat',
    url: `${CDN}/v1775896644/%E3%81%B2%E3%81%8D%E8%82%89_o4kdxq.jpg`,
    keywords: ['ひき肉', 'ひきにく', '挽肉', '合い挽き', '合いびき', 'あいびき', 'ground meat', 'ground beef', 'minced meat', 'mince', '다짐육'],
  },
  {
    label: '豚肉 / Pork',
    url: `${CDN}/v1775896644/%E8%B1%9A%E8%82%89_ru4edj.jpg`,
    keywords: ['豚肉', 'ぶたにく', 'ぶた', 'pork', 'ポーク', 'maiale', 'cerdo', 'porc', '돼지고기'],
  },
  {
    label: '牛肉 / Beef',
    url: `${CDN}/v1775896644/%E7%89%9B%E8%82%89_n3sbtv.jpg`,
    keywords: ['牛肉', 'ぎゅうにく', 'ぎゅう', 'beef', 'ビーフ', 'manzo', 'ternera', 'boeuf', '소고기', 'steak'],
  },
  {
    label: '大根 / Daikon',
    url: `${CDN}/v1775896644/%E5%A4%A7%E6%A0%B9_tuu5p6.jpg`,
    keywords: ['大根', 'だいこん', 'daikon', 'radish', '무', 'rábano'],
  },
  {
    label: 'にんじん / Carrot',
    url: `${CDN}/v1775896644/%E3%81%AB%E3%82%93%E3%81%98%E3%82%93_uhj0ix.jpg`,
    keywords: ['にんじん', '人参', 'ニンジン', 'carrot', 'carota', 'zanahoria', 'carotte', '당근'],
  },
  {
    label: '鶏肉 / Chicken',
    url: `${CDN}/v1775896643/%E9%B6%8F%E8%82%89_r7nt5i.png`,
    keywords: ['鶏肉', 'とりにく', 'とり', 'chicken', 'チキン', 'pollo', 'poulet', '닭고기'],
  },
  {
    label: 'ポテト / Potato',
    url: `${CDN}/v1775896643/%E3%82%B7%E3%82%99%E3%83%A3%E3%82%AB%E3%82%99%E3%82%A4%E3%83%A2_w9bblm.jpg`,
    keywords: ['じゃがいも', 'ジャガイモ', '馬鈴薯', 'potato', 'ポテト', 'patata', 'pomme de terre', '감자'],
  },
  {
    label: 'もやし / Bean sprouts',
    url: `${CDN}/v1775896643/%E3%82%82%E3%82%84%E3%81%97_cb1ej1.jpg`,
    keywords: ['もやし', 'モヤシ', 'bean sprout', 'sprout', '콩나물'],
  },
  {
    label: 'スイカ / Watermelon',
    url: `${CDN}/v1775896643/%E3%82%B9%E3%82%A4%E3%82%AB_fflx4u.jpg`,
    keywords: ['スイカ', 'すいか', '西瓜', 'watermelon', 'anguria', 'sandía', '수박'],
  },
  {
    label: 'Monster Energy',
    url: `${CDN}/v1775896642/%E3%83%A2%E3%83%B3%E3%82%B9%E3%82%BF%E3%83%BC_umn76k.jpg`,
    keywords: ['モンスター', 'monster energy', 'monster', '몬스터'],
  },
  {
    label: 'ポカリスウェット',
    url: `${CDN}/v1775896642/%E3%83%9B%E3%82%9A%E3%82%AB%E3%83%AA%E3%82%B9%E3%82%A6%E3%82%A7%E3%83%83%E3%83%88_rswquw.jpg`,
    keywords: ['ポカリ', 'pocari', 'ポカリスウェット', 'pocari sweat'],
  },
]
