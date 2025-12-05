// ============================================================================
// GLOBAL DATA & CONFIG
// ============================================================================
const PLAYER_MAX_HP = 2000;
const REROLL_COUNT = 2; 
const DEFAULT_RESERVE = 5;

// --- New MP System Config ---
const PLAYER_START_MP = 2; // 初始 MP
const PLAYER_MAX_MP = 10;  // 最大 MP 上限

// --- Hand Card System Config ---
const MAX_HAND_SIZE = 12;      // 手牌堆疊上限
const HAND_REFILL_TARGET = 4;  // 回合開始補牌目標

// --- Localization ---
let currentLang = 'en'; // [MODIFIED] Default changed to English
const TEXTS = {
    zh: {
        boss_hand: "🤖 BOSS 手牌", player_hand: "👤 你的手牌", drag_here: "DRAG HERE",
        roll_btn: "擲骰子 (Start)", reroll_btn: "重擲", lock_btn: "鎖定手牌",
        confirm_btn: "確認選擇", confirm_fight_btn: "確認並戰鬥", end_turn_btn: "結束選擇 (換BOSS)",
        skip_btn: "回合結束 (跳過)", next_btn: "下一回合", restart_btn: "重新開始", menu_btn: "回首頁",
        round_end: "回合結束", deck_stats: "🎴 牌庫詳情", combo_name: "組合名稱",
        atk_pow: "攻擊力", remaining: "剩餘", paused: "(遊戲暫停中)",
        log_start: "🔥 遊戲開始！", log_roll_hand: "你擲出了手牌。",
        log_reroll: "重擲完成", log_no_dice: "次數用盡，請鎖定手牌。",
        log_store: "📥 存放 (備用骰 -1)", log_retrieve: "📤 取回 (備用骰 +1)",
        log_boss_roll: "BOSS 正在擲骰...", log_boss_lock: "BOSS 手牌已鎖定！",
        log_invalid: "無效攻擊！你的手牌無法組成任何目標。", log_no_card: "⚠️ 無牌可出，回合強制結束。",
        log_select_hint: "戰術選擇：點擊卡片循環切換組合 (Cycle)",
        log_select_tip: "👉 點擊卡片可選擇。若有多組解，再次點擊可切換。",
        log_cycle: "🔄 切換", log_cancel: "❌ 取消選擇", log_select: "✅ 選擇",
        log_no_dice_err: "❌ 骰子不足", log_boss_reveal: "👀 BOSS 亮出了它的目標...",
        log_boss_first: "⚠️ BOSS 先攻！它已經選擇了目標。", log_player_first: "⚡ 你獲得先攻！請優先選擇目標。",
        log_win: "衝突勝利！", log_lose: "衝突失敗！", log_tie: "雙方抵銷",
        log_atk: "發動攻擊！", log_boss_atk: "BOSS 發動攻擊！", log_miss: "雙方本回合無作為...",
        log_deck_reshuffle: "♻️ 牌庫用盡，洗切棄牌堆...", log_no_more_cards: "⚠️ 所有牌都在場上或手中！",
        log_mp_gain: "🔵 魔力回復:",
        instr_roll: "回合開始：請點擊「擲骰子」", instr_boss: "BOSS 正在擲骰...",
        instr_invalid: "無效攻擊！", instr_select_p1: "先手優勢：你先選 (對手等待中)",
        instr_select_p2: "後手局勢：對手已選 (你可以爭奪)", instr_resolve: "正在結算戰鬥...",
        rolls_left: "擲骰次數: ", 
        
        victory: "VICTORY", defeat: "DEFEAT",
        you_win: "🏆 你擊敗了 BOSS！", you_lose: "💀 你被擊敗了...", reserve_text: "Reserve: ",
        
        cards: { 
            "OnePair": "一對", "TwoPairs": "兩對", "ThreeKind": "三條", "MiniStraight": "小順子", "BigStraight": "大順子", "FullHouse": "葫蘆", "FourKind": "鐵支",
            "VampireFangs": "吸血鬼之牙", "ThornsArmor": "荊棘護甲", "BerserkerPact": "狂戰士契約",
            "SupplyDrop": "備用補給", "CursedChest": "詛咒寶箱", "GrowingBeast": "成長巨獸",
            "RottingApple": "腐爛蘋果", "Magnet": "磁力場", "ShieldGen": "護盾產生器",
            "Fusion": "融合", "Bomber": "炸彈客", "Underdog": "弱者逆襲", "TrueNeutral": "絕對中立",
            "Elemental": "元素相剋", "Roulette": "俄羅斯輪盤", "DoubleEdge": "雙面刃",
            "Mimic": "模仿者", "CounterStrike": "雙倍奉還", "MysteryBox": "神秘盒子",
            "GoblinBan6": "禁骰領域 (6)", "GoblinBuff1": "幸運一擊 (1)", "GoblinBuff2": "幸運一擊 (2)", "GoblinBuff3": "幸運一擊 (3)",
            "GoblinRank1": "秩序顛倒 I", "GoblinRank2": "秩序顛倒 II", "GoblinRank3": "秩序顛倒 III", "GoblinRank4": "秩序顛倒 IV", "GoblinRank5": "秩序顛倒 V", "GoblinRank6": "秩序顛倒 VI",
            "GoblinEven": "偶數共鳴", "GoblinOdd": "奇數共鳴", "GoblinTarget": "命運骰子"
        },
        
        effects: {
            lifesteal_tag: "🩸 吸血 {val}%", lifesteal_desc: "造成傷害的 {val}% 轉為 HP",
            thorns_tag: "🛡️ 敗北反傷 {val}", thorns_desc: "戰鬥失敗時，對 BOSS 造成 {val} 點傷害",
            pay_hp_tag: "🩸 耗{cost}血 ➡ +{dmg}傷", pay_hp_desc: "攻擊前扣除 {cost} HP 換取 {dmg} 攻擊力",
            reserve_tag: "📦 勝利+1備用骰", reserve_desc: "勝利後獲得 +1 備用骰欄位",
            curse_tag: "☠️ 回合結束扣 {val}血", curse_desc: "回合結束時若卡片還在，扣除玩家 {val} HP",
            gamble_coin_tag: "🪙 50%雙倍 / 50%資敵", gamble_coin_desc: "1/2 機率傷害翻倍，1/2 機率幫 BOSS 補血",
            growth_tag: "📈 每回 {sign}{val}攻", growth_desc: "回合結束時數值成長",
            chain_tag: "🔗 右側連鎖 x{val}", chain_desc: "勝利時，右側卡片攻擊力倍率 x{val}",
            parity_tag: "☯️ 全奇/偶 x{val}", parity_desc: "若骰子全為奇數或全為偶數，傷害 x{val}",
            crit_tag: "🎰 機率 x{val}傷", crit_desc: "有 {chance} 機率造成 {val} 倍傷害",
            overpower_tag: "⚔️ 平手視為勝", overpower_desc: "改變平手判定，平手時視為玩家勝利",
            hidden_tag: "❓ 數值隱藏", hidden_desc: "進場時隱藏攻擊力",
            explode_tag: "💣 勝利炸毀鄰居", explode_desc: "勝利時移除左右兩側的卡片",
            steal_tag: "🧲 進場吸攻", steal_desc: "進場偷取左右卡片攻擊力",
            guard_tag: "🛡️ 鄰居護盾", guard_desc: "左右鄰居無法被選定",
            evolve_tag: "🧬 平手進化", evolve_desc: "平手時變身為更強的卡片",
            invert_tag: "⤵️ 比小不比大", invert_desc: "點數總和較小的一方獲勝",
            ban_tag: "🚫 禁骰 {val}", ban_desc: "點數 {val} 無法使用",
            roll_tag: "🎯 指定點數", roll_desc: "進場隨機鎖定點數",
            rank_tag: "🔢 特殊順序", rank_desc: "改變比大小的點數順序",
            modify_tag: "⚡ 條件增傷", modify_desc: "滿足特定條件時傷害加倍",
        },

        boss_easy: "哥布林盜賊", boss_normal: "獸人戰士", boss_hard: "紅龍"
    },
    en: {
        boss_hand: "🤖 BOSS Hand", player_hand: "👤 Player Hand", drag_here: "DRAG HERE",
        roll_btn: "Roll Dice (Start)", reroll_btn: "Reroll", lock_btn: "Lock Hand",
        confirm_btn: "Confirm Selection", confirm_fight_btn: "Confirm & Fight", end_turn_btn: "End Turn (Pass to BOSS)",
        skip_btn: "End Turn (Skip)", next_btn: "Next Round", restart_btn: "Restart Game", menu_btn: "Back to Menu",
        round_end: "Round End", deck_stats: "🎴 Deck Stats", combo_name: "Combo",
        atk_pow: "DMG", remaining: "Left", paused: "(Game Paused)",
        log_start: "🔥 Game Start!", log_roll_hand: "You rolled your hand.",
        log_reroll: "Reroll complete", log_no_dice: "No rerolls left. Please lock hand.",
        log_store: "📥 Stored (Reserve -1)", log_retrieve: "📤 Retrieved (Reserve +1)",
        log_boss_roll: "BOSS is rolling...", log_boss_lock: "BOSS locked hand!",
        log_invalid: "Invalid! Your dice match nothing.", log_no_card: "⚠️ No cards available. Turn forced end.",
        log_select_hint: "Tactics: Click cards to cycle combos.", log_select_tip: "👉 Click to select. Click again to cycle variations.",
        log_cycle: "🔄 Cycled", log_cancel: "❌ Deselected", log_select: "✅ Selected",
        log_no_dice_err: "❌ Not enough dice", log_boss_reveal: "👀 BOSS reveals strategy...",
        log_boss_first: "⚠️ BOSS goes 1st! Targets selected.", log_player_first: "⚡ You go 1st! Select targets first.",
        log_win: "Clash WIN!", log_lose: "Clash LOST!", log_tie: "Clash TIE",
        log_atk: "Attack!", log_boss_atk: "BOSS Attack!", log_miss: "No action this round...",
        log_deck_reshuffle: "♻️ Deck empty. Reshuffling discard...", log_no_more_cards: "⚠️ No more cards available!",
        log_mp_gain: "🔵 Mana Recharged:",
        instr_roll: "Start: Click 'Roll Dice'", instr_boss: "BOSS is rolling...",
        instr_invalid: "Invalid Attack!", instr_select_p1: "Initiative: You Select First",
        instr_select_p2: "React: Opponent Selected (Clash?)", instr_resolve: "Resolving Battle...",
        rolls_left: "Rolls: ",
        
        ready_roll: "Ready", remaining_rolls: "Rolls:", victory: "VICTORY", defeat: "DEFEAT",
        you_win: "🏆 You defeated the BOSS!", you_lose: "💀 You were defeated...", reserve_text: "Reserve: ",
        
        cards: { 
            "OnePair": "One Pair", "TwoPairs": "Two Pairs", "ThreeKind": "3-of-a-Kind", "MiniStraight": "Small Str.", "BigStraight": "Big Str.", "FullHouse": "Full House", "FourKind": "4-of-a-Kind",
            "VampireFangs": "Vampire Fangs", "ThornsArmor": "Thorns Armor", "BerserkerPact": "Berserker Pact",
            "SupplyDrop": "Supply Drop", "CursedChest": "Cursed Chest", "GrowingBeast": "Growing Beast",
            "RottingApple": "Rotting Apple", "Magnet": "Magnet", "ShieldGen": "Shield Generator",
            "Fusion": "Fusion", "Bomber": "Bomber", "Underdog": "Underdog", "TrueNeutral": "True Neutral",
            "Elemental": "Elemental", "Roulette": "Russian Roulette", "DoubleEdge": "Double Edge",
            "Mimic": "Mimic", "CounterStrike": "Counter Strike", "MysteryBox": "Mystery Box",
            "GoblinBan6": "Ban Area (6)", "GoblinBuff1": "Lucky Strike (1)", "GoblinBuff2": "Lucky Strike (2)", "GoblinBuff3": "Lucky Strike (3)",
            "GoblinRank1": "Chaos I", "GoblinRank2": "Chaos II", "GoblinRank3": "Chaos III", "GoblinRank4": "Chaos IV", "GoblinRank5": "Chaos V", "GoblinRank6": "Chaos VI",
            "GoblinEven": "Even Resonance", "GoblinOdd": "Odd Resonance", "GoblinTarget": "Destiny Dice"
        },

        effects: {
            lifesteal_tag: "🩸 Lifesteal {val}%", lifesteal_desc: "Convert {val}% of dmg to HP",
            thorns_tag: "🛡️ Thorns {val}", thorns_desc: "Deal {val} dmg to Boss on defeat",
            pay_hp_tag: "🩸 Cost {cost}HP ➡ +{dmg}DMG", pay_hp_desc: "Pay {cost} HP to gain {dmg} DMG",
            reserve_tag: "📦 Win: +1 Reserve", reserve_desc: "Gain +1 Reserve Slot on victory",
            curse_tag: "☠️ Curse {val}", curse_desc: "Take {val} DMG at turn end",
            gamble_coin_tag: "🪙 50% x2 / 50% Heal Boss", gamble_coin_desc: "50% Double Dmg / 50% Heal Boss",
            growth_tag: "📈 {sign}{val} Power/Turn", growth_desc: "Grows at turn end",
            chain_tag: "🔗 Chain Right x{val}", chain_desc: "Victory buffs right card x{val}",
            parity_tag: "☯️ Odd/Even x{val}", parity_desc: "If all dice are Odd or Even, Dmg x{val}",
            crit_tag: "🎰 {chance} Crit x{val}", crit_desc: "{chance} chance to deal {val}x Damage",
            overpower_tag: "⚔️ Tie = Win", overpower_desc: "Win ties instead of draw",
            hidden_tag: "❓ Hidden", hidden_desc: "Damage hidden on entry",
            explode_tag: "💣 Bomb Neighbors", explode_desc: "Destroy neighbor cards on win",
            steal_tag: "🧲 Steal Power", steal_desc: "Steals power from neighbors on entry",
            guard_tag: "🛡️ Guard Neighbors", guard_desc: "Neighbors cannot be selected",
            evolve_tag: "🧬 Evolve", evolve_desc: "Evolve on Tie",
            invert_tag: "⤵️ Low Wins", invert_desc: "Smallest sum wins",
            ban_tag: "🚫 Ban {val}", ban_desc: "Dice {val} cannot be used",
            roll_tag: "🎯 Target", roll_desc: "Target specific dice",
            rank_tag: "🔢 Chaos Rank", rank_desc: "Alters rank order",
            modify_tag: "⚡ Boost", modify_desc: "Bonus damage on condition",
        },

        boss_easy: "Goblin Rogue", boss_normal: "Orc Warrior", boss_hard: "Red Dragon"
    }
};

function t(key) { return TEXTS[currentLang][key] || key; }
function cName(key) { return TEXTS[currentLang].cards[key] || key; }

// Helper for effect text replacement
function tEff(key, replacements = {}) {
    let str = TEXTS[currentLang].effects[key] || key;
    for (const [k, v] of Object.entries(replacements)) {
        str = str.replace(`{${k}}`, v);
    }
    return str;
}

const BOSS_PROFILES = {
    'easy': { hp: 1500, nameKey: 'boss_easy', icon: '👺', aiTraits: { randomness: 0.3, greedy: 0.2, efficiency: 0.5 } },
    'normal': { hp: 2000, nameKey: 'boss_normal', icon: '👹', aiTraits: { randomness: 0.1, greedy: 0.8, efficiency: 0.7 } },
    'hard': { hp: 3000, nameKey: 'boss_hard', icon: '🐉', aiTraits: { randomness: 0.0, greedy: 0.6, efficiency: 1.2 } }
};

const CARD_CONFIG = {
    "OnePair":      { dmg: 50 },
    "TwoPairs":     { dmg: 75 },
    "ThreeKind":    { dmg: 100 },
    "MiniStraight": { dmg: 150 },
    "BigStraight":  { dmg: 200 },
    "FullHouse":    { dmg: 250 },
    "FourKind":     { dmg: 325 }
};

const SPECIAL_CARDS_DATA = [
    { id: "ShieldGen", effects: [{ trigger: "passive", type: "guard_passive" }] },
    { id: "Roulette", effects: [{ trigger: "on_resolve_success", type: "gamble_crit", chance: 0.166, multiplier: 2 }] },
    { id: "Mimic", effects: [{ trigger: "on_clash_tie", type: "evolve_on_tie" }] },
    { id: "Fusion", effects: [{ trigger: "on_resolve_success", type: "chain_buff", value: 1.5 }] },
    { id: "VampireFangs", effects: [{ trigger: "on_resolve_success", type: "lifesteal", value: 0.5 }] },
    { id: "ThornsArmor", effects: [{ trigger: "on_resolve_fail", type: "thorns", value: 50 }] },
    { id: "BerserkerPact", effects: [{ trigger: "on_modify_damage", type: "pay_hp", cost: 100, bonusDmg: 100 }] },
    { id: "SupplyDrop", effects: [{ trigger: "on_resolve_success", type: "reward_reserve", duration: 2 }] },
    { id: "CursedChest", effects: [{ trigger: "on_turn_end", type: "curse_turn_end", value: 50 }] },
    { id: "Underdog", effects: [{ trigger: "on_calculate_clash", type: "invert_win" }] },
    { id: "TrueNeutral", effects: [{ trigger: "on_filter_dice", type: "ban_dice", values: [1, 6] }] },
    { id: "CounterStrike", effects: [{ trigger: "on_clash_tie", type: "overpower_on_tie", value: 1.5 }] },
    { id: "Elemental", effects: [{ trigger: "on_modify_damage", type: "bonus_score_parity", value: 1.2 }] },
    { id: "Bomber", effects: [{ trigger: "on_resolve_success", type: "explode_neighbors" }] },
    { id: "Magnet", effects: [{ trigger: "on_enter_board", type: "steal_power_on_enter", percentage: 0.2 }] },
    { id: "GrowingBeast", effects: [{ trigger: "on_turn_end", type: "growth_turn_end", value: 50 }] },
    { id: "RottingApple", effects: [{ trigger: "on_turn_end", type: "growth_turn_end", value: -50 }] },
    { id: "DoubleEdge", effects: [{ trigger: "on_resolve_success", type: "gamble_coin", healAmount: 200 }] },
    { id: "MysteryBox", effects: [{ trigger: "on_enter_board", type: "hidden_val" }, {trigger: "on_calculate_clash", type: "reveal_val"}] },
    { id: "GoblinBan6", effects: [{ trigger: "on_filter_dice", type: "ban_dice", values: [6] }] },
    { id: "GoblinBuff1", effects: [{ trigger: "on_modify_damage", type: "modify_damage", condition: {type: 'has_dice', value: 1}, op: 'multiply', value: 1.2 }] },
    { id: "GoblinBuff2", effects: [{ trigger: "on_modify_damage", type: "modify_damage", condition: {type: 'has_dice', value: 2}, op: 'multiply', value: 1.2 }] },
    { id: "GoblinBuff3", effects: [{ trigger: "on_modify_damage", type: "modify_damage", condition: {type: 'has_dice', value: 3}, op: 'multiply', value: 1.2 }] },
    { id: "GoblinRank1", effects: [{ trigger: "on_calculate_clash", type: "custom_rank", order: [6,5,4,3,2,1] }] },
    { id: "GoblinRank2", effects: [{ trigger: "on_calculate_clash", type: "custom_rank", order: [5,4,3,2,1,6] }] },
    { id: "GoblinRank3", effects: [{ trigger: "on_calculate_clash", type: "custom_rank", order: [4,3,2,1,6,5] }] },
    { id: "GoblinRank4", effects: [{ trigger: "on_calculate_clash", type: "custom_rank", order: [3,2,1,6,5,4] }] },
    { id: "GoblinRank5", effects: [{ trigger: "on_calculate_clash", type: "custom_rank", order: [2,1,6,5,4,3] }] },
    { id: "GoblinRank6", effects: [{ trigger: "on_calculate_clash", type: "custom_rank", order: [1,6,5,4,3,2] }] },
    { id: "GoblinEven", effects: [{ trigger: "on_modify_damage", type: "modify_damage", condition: {type: 'parity', value: 'even'}, op: 'multiply', value: 1.2 }] },
    { id: "GoblinOdd", effects: [{ trigger: "on_modify_damage", type: "modify_damage", condition: {type: 'parity', value: 'odd'}, op: 'multiply', value: 1.2 }] },
    { id: "GoblinTarget", effects: [{ trigger: "on_enter_board", type: "roll_on_enter", key: "targetVal" }, { trigger: "on_calculate_clash", type: "dynamic_rank_from_state", key: "targetVal" }] }
];

// ============================================================================
// HAND CARDS (SKILLS) CONFIG
// ============================================================================
const HAND_CARDS_DATABASE = [
    // --- 既有卡片 (Existing) ---
    {
        id: "minor_restoration",
        name: "Minor Restoration",
        cost: 2,
        desc: "Heal 30 HP immediately.",
        effects: [
            { type: "heal_player", value: 30, trigger: "on_play" }
        ]
    },
    {
        id: "vampiric_touch",
        name: "Vampiric Touch",
        cost: 4,
        desc: "Deal 40 Dmg to Boss, Heal 40 HP.",
        effects: [
            { type: "lifesteal_dmg", value: 40, trigger: "on_play" }
        ]
    },
    {
        id: "self_imposed_weakness",
        name: "Self-Imposed Weakness",
        cost: 1,
        desc: "Target Dice -1 Value.",
        effects: [
            { type: "mod_dice_val", value: -1, targetType: "dice", trigger: "on_play" }
        ]
    },
    {
        id: "fortunes_favor",
        name: "Fortune's Favor",
        cost: 2,
        desc: "Target Dice +1 Value.",
        effects: [
            { type: "mod_dice_val", value: 1, targetType: "dice", trigger: "on_play" }
        ]
    },

    // --- 今天新增的測試卡片 (New Testing Cards - Previous) ---
    {
        id: "guardians_protection",
        name: "Guardian's Protection",
        cost: 3, 
        desc: "Gain +1 Shield (Block next DMG)",
        effects: [
            { type: "add_shield", value: 1, trigger: "on_play" }
        ]
    },
    {
        id: "vital_essence",
        name: "Vital Essence",
        cost: 3, 
        desc: "Reveal: Heal 10 HP for each [1] dice.",
        effects: [
            { type: "buff_vital_essence", trigger: "on_play" }
        ]
    },
    {
        id: "efficient_casting",
        name: "Efficient Casting",
        cost: 4, 
        desc: "Reduce cost of a hand card by 2.",
        effects: [
            { type: "mod_hand_cost", value: -2, targetType: "hand_card", trigger: "on_play" }
        ]
    },
    {
        id: "mana_optimization",
        name: "Mana Optimization",
        cost: 3, 
        desc: "Reduce cost of a hand card by 1.",
        effects: [
            { type: "mod_hand_cost", value: -1, targetType: "hand_card", trigger: "on_play" }
        ]
    },

    // --- 本日重點測試卡片 (Testing Focus: The 5 Cards) ---
    {
        id: "weighted_fate",
        name: "Weighted Fate",
        cost: 4,
        desc: "Opponent next rerolls -1.",
        effects: [
            { type: "mod_enemy_reroll", value: -1, trigger: "on_play" }
        ]
    },
    {
        id: "echo_dice",
        name: "Echo Dice",
        cost: 4,
        desc: "Use saved dice without consuming it once.",
        effects: [
            { type: "apply_echo_buff", trigger: "on_play", targetType: "storage" }
        ]
    },
    {
        id: "second_chance",
        name: "Second Chance",
        cost: 3,
        desc: "+1 Reroll next turn.",
        effects: [
            { type: "add_next_turn_reroll", value: 1, trigger: "on_play" }
        ]
    },
    {
        id: "lucky_boost",
        name: "Lucky Boost",
        cost: 5,
        desc: "Add 1 extra dice to next roll.",
        effects: [
            { type: "add_temp_dice", count: 1, trigger: "on_play" }
        ]
    },
    {
        id: "disarm", // Originally "Need Name 1"
        name: "Disarm",
        cost: 4,
        desc: "Reduce Boss attack by 10%.",
        effects: [
            { type: "debuff_enemy_atk", value: 0.1, trigger: "on_play" }
        ]
    }
];