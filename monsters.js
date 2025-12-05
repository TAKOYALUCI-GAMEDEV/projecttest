// ============================================================================
// MONSTER DECK COMPOSITIONS
// ============================================================================

const MONSTER_DECKS = {
    // ---------------------------------------------------------
    // GOBLIN ROGUE (Easy) - Rule Bender
    // ---------------------------------------------------------
    'easy': [
        // One Pair (8)
        { id: "OnePair", specialId: "Fusion", count: 1 },
        { id: "OnePair", specialId: "GrowingBeast", count: 1 },
        { id: "OnePair", count: 6 },
        // Two Pairs (6)
        { id: "TwoPairs", specialId: "GoblinBan6", count: 3 }, 
        { id: "TwoPairs", specialId: "GoblinBuff1", count: 1 },
        { id: "TwoPairs", specialId: "GoblinBuff2", count: 1 },
        { id: "TwoPairs", specialId: "GoblinBuff3", count: 1 },
        // Three of a Kind (6)
        { id: "ThreeKind", specialId: "GoblinRank1", count: 1 },
        { id: "ThreeKind", specialId: "GoblinRank2", count: 1 },
        { id: "ThreeKind", specialId: "GoblinRank3", count: 1 },
        { id: "ThreeKind", specialId: "GoblinRank4", count: 1 },
        { id: "ThreeKind", specialId: "GoblinRank5", count: 1 },
        { id: "ThreeKind", specialId: "GoblinRank6", count: 1 },
        // Mini Straight (5)
        { id: "MiniStraight", specialId: "Mimic", count: 1 },
        { id: "MiniStraight", count: 4 },
        // Big Straight (4)
        { id: "BigStraight", specialId: "DoubleEdge", count: 1 },
        { id: "BigStraight", count: 3 },
        // Full House (3)
        { id: "FullHouse", specialId: "GoblinEven", count: 1 },
        { id: "FullHouse", specialId: "GoblinOdd", count: 1 },
        { id: "FullHouse", count: 1 },
        // Four of a Kind (3)
        { id: "FourKind", specialId: "GoblinTarget", count: 3 }
    ],

    // ---------------------------------------------------------
    // ORC WARRIOR (Normal) - Combatant
    // ---------------------------------------------------------
    'normal': [
        // One Pair (8)
        { id: "OnePair", specialId: "Fusion", count: 1 },
        { id: "OnePair", specialId: "Underdog", count: 1 },
        { id: "OnePair", specialId: "GrowingBeast", count: 1 },
        { id: "OnePair", count: 5 },
        
        // Two Pairs (6)
        { id: "TwoPairs", specialId: "ThornsArmor", count: 2 }, // Updated: No MysteryBox
        { id: "TwoPairs", count: 4 },
        
        // Three of a Kind (6)
        { id: "ThreeKind", specialId: "Underdog", count: 1 },
        { id: "ThreeKind", specialId: "VampireFangs", count: 1 },
        { id: "ThreeKind", count: 4 },
        
        // Mini Straight (5)
        { id: "MiniStraight", specialId: "Mimic", count: 2 },
        { id: "MiniStraight", count: 3 },
        
        // Big Straight (4)
        { id: "BigStraight", specialId: "DoubleEdge", count: 1 },
        { id: "BigStraight", count: 3 },
        
        // Full House (3)
        { id: "FullHouse", specialId: "Roulette", count: 1 },
        { id: "FullHouse", count: 2 },
        
        // Four of a Kind (3)
        { id: "FourKind", specialId: "BerserkerPact", count: 1 },
        { id: "FourKind", count: 2 }
    ],

    // ---------------------------------------------------------
    // RED DRAGON (Hard) - Controller
    // ---------------------------------------------------------
    'hard': [
        // One Pair (8)
        { id: "OnePair", specialId: "Mimic", count: 1 },
        { id: "OnePair", specialId: "GrowingBeast", count: 2 },
        { id: "OnePair", count: 5 },
        
        // Two Pairs (6)
        { id: "TwoPairs", specialId: "CounterStrike", count: 1 },
        { id: "TwoPairs", specialId: "Mimic", count: 1 },
        { id: "TwoPairs", count: 4 },
        
        // Three of a Kind (6)
        { id: "ThreeKind", specialId: "ShieldGen", count: 2 },
        { id: "ThreeKind", specialId: "TrueNeutral", count: 1 },
        { id: "ThreeKind", count: 3 },
        
        // Mini Straight (5)
        { id: "MiniStraight", specialId: "Fusion", count: 2 },
        { id: "MiniStraight", count: 3 },
        
        // Big Straight (4)
        { id: "BigStraight", specialId: "DoubleEdge", count: 1 },
        { id: "BigStraight", specialId: "RottingApple", count: 1 },
        { id: "BigStraight", count: 2 },
        
        // Full House (3)
        { id: "FullHouse", specialId: "Roulette", count: 2 },
        { id: "FullHouse", count: 1 },
        
        // Four of a Kind (3)
        { id: "FourKind", specialId: "Bomber", count: 1 },
        { id: "FourKind", count: 2 }
    ]
};