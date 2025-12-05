// ============================================================================
// 1. CORE & UTILS (game-core.js)
// ============================================================================
window.bus = window.bus || new class EventBus {
    constructor() { this.listeners = {}; }
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    emit(event, data) {
        if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data));
    }
}();
const bus = window.bus;

// Global Helpers
window.wait = (ms) => new Promise(r => setTimeout(r, ms));
window.roll = () => Math.floor(Math.random() * 6) + 1;

// Define selection function globally
window.selectDifficulty = (diff) => {
    // Note: currentState will be defined in game-states.js, but this function is called later by UI
    if(window.currentState && window.currentState.handleInput) {
        window.currentState.handleInput('start', {difficulty: diff});
    }
};

// ============================================================================
// 2. GAME MODEL
// ============================================================================
class GameModel {
    constructor() {
        this.pMaxHP = PLAYER_MAX_HP;
        this.eMaxHP = 2000;
        this.currentDifficulty = 'normal';
        this.pHP = this.pMaxHP;
        this.eHP = this.eMaxHP;
        
        // --- MP System ---
        this.pMP = PLAYER_START_MP;
        this.pMaxMP = PLAYER_MAX_MP;

        // --- Hand Card System ---
        this.handDeck = [];      
        this.pHand = [];         
        this.handDiscard = [];   
        this.maxHandSize = MAX_HAND_SIZE;
        this.handRefillTarget = HAND_REFILL_TARGET;
        
        // --- New Player States ---
        this.pShield = 0;        
        this.tempDiceMod = 0;    
        this.eRerollMod = 0;
        
        // Buffs/Debuffs (Reset each round)
        this.nextTurnRerollBonus = 0;
        this.vitalEssenceActive = false;
        this.eAtkDebuff = 0;
        
        // --- Animation Flags ---
        this.justMaterializedCount = 0;

        this.deck = [];
        this.discardPile = [];
        
        // UX Update: Board is fixed size 3, utilizing null for empty slots
        this.board = [null, null, null]; 
        
        this.roundCount = 0;
        this.initiative = null;
        this.reserveDiceMax = DEFAULT_RESERVE;
        this.reserveDice = DEFAULT_RESERVE;
        this.paused = false;
        this.buffs = [];

        this.pDice = [0,0,0,0,0,0];
        this.pHeld = Array(6).fill(false);
        this.pRerolls = REROLL_COUNT;
        this.pStorage = [null, null]; // Elements: { val: 6, isReady: true, isEcho: false }
        this.pSelectedObjs = [];
        this.pUsedIndices = [];

        this.eDice = [0,0,0,0,0,0];
        this.eHeld = Array(6).fill(false);
        this.eRerolls = REROLL_COUNT;
        this.aiSelections = [];
    }

    init(difficultyKey) {
        if (difficultyKey) this.currentDifficulty = difficultyKey;
        const profile = BOSS_PROFILES[this.currentDifficulty] || BOSS_PROFILES['normal'];
        
        this.eMaxHP = profile.hp;
        this.pMaxHP = PLAYER_MAX_HP;
        this.pHP = this.pMaxHP;
        this.eHP = this.eMaxHP;
        
        // Reset MP
        this.pMP = PLAYER_START_MP;
        this.pMaxMP = PLAYER_MAX_MP;
        
        // Reset Hand Cards & States
        this.pShield = 0;
        this.tempDiceMod = 0;
        this.eRerollMod = 0;
        this.nextTurnRerollBonus = 0;
        this.vitalEssenceActive = false;
        this.eAtkDebuff = 0;
        this.justMaterializedCount = 0;
        
        this.handDeck = [];
        this.pHand = [];
        this.handDiscard = [];
        
        this.roundCount = 0;
        this.pStorage = [null, null];
        this.discardPile = [];
        this.reserveDiceMax = DEFAULT_RESERVE;
        this.reserveDice = DEFAULT_RESERVE;
        
        // UX Update: Reset board to empty slots
        this.board = [null, null, null]; 
        
        this.pSelectedObjs = [];
        this.pUsedIndices = [];
        this.aiSelections = [];
        this.pDice = [0,0,0,0,0,0];
        this.pHeld = Array(6).fill(false);
        this.eDice = [0,0,0,0,0,0];
        this.eHeld = Array(6).fill(false);
        this.buffs = [];
        this.paused = false;

        bus.emit('clearLog');
        this.buildDeck();
        this.buildHandDeck(); 
        
        this.initiative = Math.random() < 0.5 ? 'player' : 'enemy';
        
        bus.emit('log', {msg: `Game Started! Target: ${t(profile.nameKey)}`, cls: 't-sys'});
        bus.emit('stateUpdated');
    }

    buildHandDeck() {
        this.handDeck = [];
        let availableTypes = [...HAND_CARDS_DATABASE];
        this.shuffle(availableTypes);
        const selectedTypes = availableTypes.slice(0, 6);
        selectedTypes.forEach(proto => {
            for(let i=0; i<2; i++) { 
                this.handDeck.push({
                    ...proto,
                    uid: `hc-${proto.id}-${Math.random().toString(36).substr(2, 9)}`,
                    currentCost: proto.cost 
                });
            }
        });
        this.shuffle(this.handDeck);
        bus.emit('log', {msg: `Hand Deck Built: Random 6 types x 2 (${this.handDeck.length} cards).`, cls: 't-sys'});
    }

    drawHandCards(targetCount) {
        let drawnCount = 0;
        while (this.pHand.length < targetCount && this.pHand.length < this.maxHandSize) {
            if (this.handDeck.length === 0) {
                if (this.handDiscard.length > 0) {
                    this.reshuffleHandDeck();
                } else {
                    bus.emit('log', {msg: "No more cards in hand deck!", cls: 't-sys'});
                    break;
                }
            }
            const card = this.handDeck.pop();
            this.pHand.push(card);
            drawnCount++;
        }
        if (drawnCount > 0) {
            bus.emit('log', {msg: `Drawn ${drawnCount} hand cards.`, cls: 't-sys'});
        }
    }

    reshuffleHandDeck() {
        bus.emit('log', {msg: "Reshuffling Hand Discard...", cls: 't-sys'});
        this.handDiscard.forEach(c => {
            c.currentCost = HAND_CARDS_DATABASE.find(proto => proto.id === c.id).cost;
        });
        this.handDeck = [...this.handDiscard];
        this.shuffle(this.handDeck);
        this.handDiscard = [];
    }

    buildDeck() {
        let newDeck = [];
        let uid = 0;
        const deckDef = (typeof MONSTER_DECKS !== 'undefined' && MONSTER_DECKS[this.currentDifficulty]) 
                        ? MONSTER_DECKS[this.currentDifficulty] 
                        : MONSTER_DECKS['normal'];

        if (!deckDef) {
            console.error("Critical Error: MONSTER_DECKS not found!");
            return;
        }

        deckDef.forEach(entry => {
            const baseConf = CARD_CONFIG[entry.id];
            if (!baseConf) return; 
            
            let effects = [];
            if (entry.specialId && typeof SPECIAL_CARDS_DATA !== 'undefined') {
                const specialDef = SPECIAL_CARDS_DATA.find(s => s.id === entry.specialId);
                if (specialDef) effects = specialDef.effects;
            }

            for(let i=0; i<entry.count; i++) {
                newDeck.push({ 
                    uid: `${entry.id}-${uid++}`, 
                    comboType: entry.id,      
                    specialId: entry.specialId || null, 
                    dmg: baseConf.dmg, 
                    baseDmg: baseConf.dmg,
                    effects: effects 
                });
            }
        });

        this.shuffle(newDeck);
        this.deck = newDeck;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    drawBoard() {
        // UX Update: Fill specific null slots to keep positions fixed
        for (let i = 0; i < 3; i++) {
            if (this.board[i] === null) {
                if (this.deck.length === 0) {
                    if (this.discardPile.length > 0) {
                        bus.emit('log', {msg: t('log_deck_reshuffle'), cls: 't-sys'});
                        this.deck = [...this.discardPile];
                        this.shuffle(this.deck);
                        this.discardPile = [];
                    } else {
                        break; // No cards left at all
                    }
                }
                const newCard = this.deck.pop();
                newCard.tempDmgMod = 0; 
                newCard.isNew = true; // Mark for animation
                
                EffectProcessor.process('on_enter_board', newCard, { card: newCard, board: this.board, cardIndex: i });
                this.board[i] = newCard;
            } else {
                // Ensure old cards don't animate again
                this.board[i].isNew = false; 
            }
        }
        bus.emit('stateUpdated');
    }
    
    addBuff(buff) {
        this.buffs.push(buff);
        this.recalcStats();
    }
    
    tickBuffs() {
        this.buffs.forEach(b => b.duration--);
        this.buffs = this.buffs.filter(b => b.duration > 0);
        this.recalcStats();
    }
    
    recalcStats() {
        let rMax = DEFAULT_RESERVE;
        this.buffs.forEach(b => {
            if (b.type === 'max_reserve') rMax += b.value;
        });
        this.reserveDiceMax = rMax;
        if (this.reserveDice > this.reserveDiceMax) this.reserveDice = this.reserveDiceMax;
        bus.emit('updateUI');
    }

    canAfford(cost) {
        return this.pMP >= cost;
    }

    payMana(cost) {
        if (this.canAfford(cost)) {
            this.pMP -= cost;
            bus.emit('updateUI');
            return true;
        }
        return false;
    }
}
// Expose model globally
window.model = new GameModel();

// ============================================================================
// 3. LOGIC & ALGORITHMS
// ============================================================================
window.Logic = {
    getCombos(dicePool, usedIndices, objId, cardObj) {
        if (!cardObj) return []; // Safety check for null slots

        const logicId = cardObj.comboType || objId; 
        
        let available = dicePool.filter(item => !usedIndices.some(used => used.type === item.type && used.idx === item.idx));
        const values = available.map(i => i.val);
        const counts = {}; values.forEach(x => counts[x] = (counts[x]||0)+1);
        const grabFirstN = (val, n) => available.filter(item => item.val === val).slice(0, n);
        
        let uniqueVals = Object.keys(counts).map(Number).sort((a,b)=>b-a);
        let context = { validValues: uniqueVals, dice: values };
        
        if (typeof EffectProcessor !== 'undefined') {
            EffectProcessor.process('on_filter_dice', cardObj, context);
        }
        
        let validVals = context.validValues || [];
        let combinations = [];

        switch(logicId) {
            case "OnePair": validVals.forEach(v => { if (counts[v] >= 2) combinations.push(grabFirstN(v, 2)); }); break;
            case "TwoPairs": 
                const pairs = validVals.filter(v => counts[v] >= 2);
                if (pairs.length >= 2) {
                    for(let i=0; i<pairs.length; i++) for(let j=i+1; j<pairs.length; j++) combinations.push([...grabFirstN(pairs[i], 2), ...grabFirstN(pairs[j], 2)]);
                }
                break;
            case "ThreeKind": validVals.forEach(v => { if (counts[v] >= 3) combinations.push(grabFirstN(v, 3)); }); break;
            case "FourKind": validVals.forEach(v => { if (counts[v] >= 4) combinations.push(grabFirstN(v, 4)); }); break;
            case "FullHouse": 
                const trips = validVals.filter(v => counts[v] >= 3);
                const allPairs = validVals.filter(v => counts[v] >= 2);
                trips.forEach(tVal => { allPairs.forEach(pVal => { if (tVal !== pVal) combinations.push([...grabFirstN(tVal, 3), ...grabFirstN(pVal, 2)]); }); });
                break;
            case "MiniStraight":
                {
                    const u = [...new Set(values)].sort((a,b)=>a-b);
                    let best = [], curr = [u[0]];
                    for(let i=0; i<u.length-1; i++){ if(u[i+1]===u[i]+1) curr.push(u[i+1]); else { if(curr.length>best.length) best=curr; curr=[u[i+1]]; } }
                    if(curr.length>best.length) best=curr;
                    if (best.length >= 4) { 
                        for (let i=0; i<=best.length-4; i++) {
                            const subSeq = best.slice(i, i+4);
                            if (subSeq.every(v => validVals.includes(v))) combinations.push(subSeq.map(v => grabFirstN(v, 1)[0]));
                        } 
                    }
                }
                break;
            case "BigStraight": 
                {
                    const u = [...new Set(values)].sort((a,b)=>a-b);
                    let best = [], curr = [u[0]];
                    for(let i=0; i<u.length-1; i++){ if(u[i+1]===u[i]+1) curr.push(u[i+1]); else { if(curr.length>best.length) best=curr; curr=[u[i+1]]; } }
                    if(curr.length>best.length) best=curr;
                    if (best.length >= 5) { 
                        for (let i=0; i<=best.length-5; i++) {
                            const subSeq = best.slice(i, i+5);
                            if (subSeq.every(v => validVals.includes(v))) combinations.push(subSeq.map(v => grabFirstN(v, 1)[0]));
                        } 
                    }
                }
                break;
        }
        return combinations;
    },

    getTieBreaker(dice, cardObj) {
        let baseScore = 0;
        if (dice.length > 0 && typeof dice[0] === 'object') baseScore = dice.reduce((a,b)=>a+b.val, 0);
        else baseScore = dice.reduce((a,b)=>a+b, 0);

        let context = { dice: dice.map(d => typeof d==='object'?d.val:d), customScore: null, cardObj: cardObj, invertScore: false };
        if (cardObj) EffectProcessor.process('on_calculate_clash', cardObj, context);

        if (context.invertScore) return -baseScore;
        if (context.customScore !== null) return context.customScore;
        return baseScore;
    },

    aiEvaluate(dice, board, traits) {
        let bestScore = -1;
        let bestMask = Array(6).fill(false);

        board.forEach(card => {
            if (!card) return; // Skip empty slots

            const comboType = card.comboType || card.id;
            const analysis = this.analyzeCardPotential(dice, card, comboType);
            let score = this.calculateCardScore(card, analysis, traits);
            if (score > bestScore) {
                bestScore = score;
                bestMask = analysis.mask;
            }
        });
        
        if (Math.random() < traits.randomness) {
            const randIdx = Math.floor(Math.random() * 6);
            bestMask[randIdx] = !bestMask[randIdx];
        }
        return { mask: bestMask };
    },

    calculateCardScore(card, analysis, traits) {
        let score = card.dmg * traits.greedy;
        score += (analysis.keptCount * 30 * traits.efficiency);
        let missing = 6 - analysis.keptCount;
        score -= (missing * 10);
        return score;
    },

    analyzeCardPotential(dice, card, comboType) {
        const counts = {};
        dice.forEach(x => counts[x] = (counts[x]||0) + 1);
        let mask = Array(6).fill(false);
        let keptCount = 0;
        
        let context = { validValues: Object.keys(counts).map(Number) };
        EffectProcessor.process('on_filter_dice', card, context);
        const validVals = context.validValues || [];
        
        const keepVal = (val) => { dice.forEach((d, i) => { if (d === val && !mask[i]) { mask[i] = true; keptCount++; } }); };

        switch(comboType) {
            case "OnePair": 
                let maxC=0, bestV=0;
                validVals.forEach(v => { if(counts[v] >= 2 || (counts[v]>maxC)) { maxC=counts[v]; bestV=v; }});
                if(bestV) keepVal(bestV);
                break;
            case "TwoPairs":
                let pairs = validVals.filter(v => counts[v] >= 2);
                if (pairs.length >= 2) pairs.forEach(p => keepVal(p));
                else if (pairs.length === 1) {
                    keepVal(pairs[0]);
                    let secondBest=0, sMax=0;
                    validVals.forEach(v => { if (v !== pairs[0] && counts[v] > sMax) { sMax=counts[v]; secondBest=v; } });
                    if(secondBest) keepVal(secondBest);
                } else {
                    let best=0, m=0;
                    validVals.forEach(v => { if (counts[v] > m) { m=counts[v]; best=v; } });
                    if(best) keepVal(best);
                }
                break;
            case "ThreeKind":
                let max3=0, best3=0;
                validVals.forEach(v => { if(counts[v] >= 3 || (counts[v]>max3)) { max3=counts[v]; best3=v; }});
                if(best3) keepVal(best3);
                break;
            case "FourKind":
                let max4=0, best4=0;
                validVals.forEach(v => { if(counts[v] >= 4 || (counts[v]>max4)) { max4=counts[v]; best4=v; }});
                if(best4) keepVal(best4);
                break;
            case "FullHouse":
                let trips = validVals.filter(v => counts[v] >= 3);
                let allP = validVals.filter(v => counts[v] >= 2);
                if(trips.length > 0) keepVal(trips[0]);
                if(allP.length > 1) keepVal(allP[1]); 
                break;
            case "MiniStraight": 
                let targets = [[1,2,3,4], [2,3,4,5], [3,4,5,6]];
                let bestTarget = []; let maxOverlap = -1;
                targets.forEach(set => {
                    if (set.some(x => !validVals.includes(x))) return;
                    let overlap = set.filter(needed => dice.includes(needed)).length;
                    if (overlap > maxOverlap) { maxOverlap = overlap; bestTarget = set; }
                });
                if (bestTarget.length > 0) {
                    let used = new Set();
                    dice.forEach((d, i) => { if (bestTarget.includes(d) && !used.has(d)) { mask[i] = true; keptCount++; used.add(d); } });
                }
                break;
            case "BigStraight": 
                {
                    const u = [...new Set(values)].sort((a,b)=>a-b);
                    let best = [], curr = [u[0]];
                    for(let i=0; i<u.length-1; i++){ if(u[i+1]===u[i]+1) curr.push(u[i+1]); else { if(curr.length>best.length) best=curr; curr=[u[i+1]]; } }
                    if(curr.length>best.length) best=curr;
                    if (best.length >= 5) {
                         let used = new Set();
                         dice.forEach((d,i) => { if(best.includes(d) && !used.has(d)) { mask[i]=true; keptCount++; used.add(d); } });
                    }
                }
                break;
        }
        return { mask, keptCount };
    }
};