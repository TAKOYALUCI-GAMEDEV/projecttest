// ============================================================================
// 4. STATE MACHINE (game-states.js)
// ============================================================================
window.currentState = null;

class GameState {
    constructor(game) { this.game = game; }
    enter() {}
    handleInput(action, data) {}
}

class MenuState extends GameState {
    enter() { bus.emit('switchScene', 'menu'); }
    handleInput(action, data) {
        if (action === 'start') {
            this.game.init(data.difficulty);
            bus.emit('switchScene', 'game');
            bus.emit('changeState', new RoundSetupState(this.game));
        }
    }
}

class RoundSetupState extends GameState {
    async enter() {
        if (this.game.roundCount > 0) {
            const totalHandDice = this.game.pDice.length;
            const usedHandDice = this.game.pUsedIndices.filter(item => item.type === 'hand').length;
            const mpGain = Math.max(0, totalHandDice - usedHandDice);
            
            if (mpGain > 0) {
                const oldMP = this.game.pMP;
                const targetMP = Math.min(this.game.pMaxMP, oldMP + mpGain);
                const actualGain = targetMP - oldMP;
                
                if (actualGain > 0) {
                    bus.emit('log', {msg: `${t('log_mp_gain')} +${actualGain}`, cls: 't-sys'});
                    
                    for (let i = oldMP; i < targetMP; i++) {
                        this.game.pMP++; 
                        bus.emit('updateUI'); 
                        bus.emit('animateManaPop', { index: i }); 
                        await wait(300); 
                    }
                    await wait(500); 
                }
            }
        }
        
        // Hand Card Refill
        if (this.game.roundCount === 0) {
            this.game.drawHandCards(4);
        } else {
             this.game.drawHandCards(this.game.handRefillTarget);
        }

        this.game.roundCount++;
        this.game.pSelectedObjs = [];
        this.game.pUsedIndices = [];
        this.game.aiSelections = [];
        this.game.initiative = this.game.initiative === 'player' ? 'enemy' : 'player';
        
        this.game.pStorage.forEach(s => { if(s) s.isReady = true; });
        this.game.tickBuffs();
        
        // Reset Round Specific Buffs
        this.game.eRerollMod = 0;
        this.game.vitalEssenceActive = false;
        this.game.eAtkDebuff = 0;
        
        // --- DICE LOGIC: Check Lucky Boost ---
        const bonusDice = this.game.tempDiceMod;
        if(bonusDice > 0) {
            this.game.justMaterializedCount = bonusDice; 
            setTimeout(() => {
                this.game.justMaterializedCount = 0; 
                bus.emit('updateUI'); 
            }, 1200);
        }
        
        // Apply Reroll Bonus from previous turn
        this.game.pRerolls = REROLL_COUNT + this.game.nextTurnRerollBonus;
        if(this.game.nextTurnRerollBonus > 0) {
            bus.emit('animateBonusTransfer'); 
        }
        this.game.nextTurnRerollBonus = 0;
        
        this.game.tempDiceMod = 0; // Consumed dice mod
        
        // Trigger turn end effects on existing cards
        this.game.board.forEach(card => {
             if(card) EffectProcessor.process('on_turn_end', card, { card: card, gameModel: this.game });
        });

        // Fill empty slots (nulls)
        this.game.drawBoard();
        
        bus.emit('log', {msg: `--- Round ${this.game.roundCount} ---`, cls: 't-sys'});
        bus.emit('updateUI');
        bus.emit('changeState', new PlayerRollState(this.game, true, bonusDice));
    }
}

class TargetingState extends GameState {
    constructor(game, originalState, card) {
        super(game);
        this.originalState = originalState;
        this.card = card;
        this.targetType = card.effects[0].targetType; 
    }
    
    enter() {
        let typeText = "UNKNOWN";
        if(this.targetType === 'dice') typeText = "DICE";
        else if(this.targetType === 'hand_card') typeText = "HAND CARD";
        else if(this.targetType === 'storage') typeText = "SAVED DICE"; 
        
        bus.emit('instruction', `SELECT TARGET: ${typeText}`);
        bus.emit('updateUI'); 
    }
    
    handleInput(action, data) {
        if (action === 'cancelTarget') {
            bus.emit('log', {msg: "Cancelled casting.", cls: 't-hint'});
            bus.emit('changeState', this.originalState);
        } else if (action === 'selectTarget') {
            if (this.targetType === 'dice' && (data.type === 'hand' || data.type === 'storage')) {
                this.execute(data);
            } else if (this.targetType === 'hand_card' && data.card) {
                if (data.card.uid === this.card.uid) return; 
                this.execute(data);
            } else if (this.targetType === 'storage' && data.type === 'storage') { 
                this.execute(data);
            }
        }
    }
    
    async execute(targetData) {
        if (this.game.payMana(this.card.currentCost)) {
            bus.emit('log', {msg: `✨ Cast [${this.card.name}]`, cls: 't-sys'});
            
            await EffectProcessor.process('on_play', this.card, { 
                gameModel: this.game, 
                targetIndex: targetData.index,
                targetType: targetData.type,
                targetCard: targetData.card
            });

            const cardEl = document.querySelector(`.hand-card[data-uid="${this.card.uid}"]`);
            if (cardEl) {
                cardEl.classList.add('discarding');
                await wait(700); 
            }
            
            this.game.pHand = this.game.pHand.filter(c => c.uid !== this.card.uid);
            this.game.handDiscard.push(this.card);
            bus.emit('updateUI');
            bus.emit('changeState', this.originalState);
        }
    }
}

class PlayerRollState extends GameState {
    constructor(game, isFirst, bonusDice = 0) { 
        super(game); 
        this.isFirst = isFirst; 
        this.bonusDice = bonusDice;
    }
    enter() {
        bus.emit('instruction', t('instr_roll'));
        if(this.isFirst) {
            const diceCount = 6 + this.bonusDice;
            this.game.pDice = Array(diceCount).fill(0);
            this.game.pHeld = Array(diceCount).fill(false);
            
            if (this.bonusDice > 0) {
                bus.emit('log', {msg: `Lucky Boost! +${this.bonusDice} Dice`, cls: 't-sys'});
            } 
            
            if (this.game.roundCount === 1 && this.game.pRerolls === 0) this.game.pRerolls = REROLL_COUNT; 
            
            this.game.eDice = [0,0,0,0,0,0];
            bus.emit('updateUI');
        }
    }
    handleInput(action, data) {
        if (action === 'roll') {
            if (this.isFirst) {
                this.game.pDice = this.game.pDice.map(() => roll());
                bus.emit('log', {msg: t('log_roll_hand')});
                bus.emit('changeState', new PlayerRollState(this.game, false));
            } else {
                if (this.game.pRerolls > 0) {
                    this.game.pDice = this.game.pDice.map((d,i) => this.game.pHeld[i] ? d : roll());
                    this.game.pRerolls--;
                    bus.emit('log', {msg: `${t('log_reroll')} (${t('remaining_rolls')} ${this.game.pRerolls})`});
                    bus.emit('updateUI');
                }
            }
        } else if (action === 'toggleHold') {
            if (!this.isFirst) {
                this.game.pHeld[data.idx] = !this.game.pHeld[data.idx];
                bus.emit('updateUI');
            }
        } else if (action === 'storeDie') {
            if (!this.isFirst && this.game.reserveDice > 0 && this.game.pStorage[data.slotIdx] === null) {
                const val = this.game.pDice[data.diceIdx];
                this.game.pStorage[data.slotIdx] = { val: val, isReady: false };
                this.game.pDice.splice(data.diceIdx, 1);
                this.game.pHeld.splice(data.diceIdx, 1);
                this.game.reserveDice--;
                bus.emit('log', {msg: `${t('log_store')} [${val}]`, cls: 't-sys'});
                bus.emit('updateUI');
            }
        } else if (action === 'unstoreDie') {
            const item = this.game.pStorage[data.slotIdx];
            if (item && !item.isReady) {
                this.game.pDice.push(item.val);
                this.game.pHeld.push(false);
                this.game.pStorage[data.slotIdx] = null;
                this.game.reserveDice++;
                bus.emit('log', {msg: `${t('log_retrieve')} [${item.val}]`, cls: 't-sys'});
                bus.emit('updateUI');
            }
        } else if (action === 'playCard') {
            const card = data.card;
            if (!this.game.canAfford(card.currentCost)) {
                bus.emit('log', {msg: "Not enough MP!", cls: 't-hint'});
                return;
            }
            
            // --- SMART CASTING FOR ECHO DICE ---
            if (card.effects && card.effects[0].targetType === 'storage') {
                // Filter: Slot exists AND does not have Echo yet
                const validSlots = this.game.pStorage.map((s, idx) => (s && !s.isEcho) ? idx : -1).filter(idx => idx !== -1);
                
                // Also check if there are ANY dice (even if echoed) to give correct feedback
                const anyDice = this.game.pStorage.filter(s => s).length;
                
                if (anyDice === 0) {
                    bus.emit('log', {msg: "⚠️ No saved dice to echo!", cls: 't-hint'});
                    return;
                }
                
                if (validSlots.length === 0) {
                     bus.emit('log', {msg: "⚠️ All saved dice already have Echo!", cls: 't-hint'});
                     return;
                }
                
                if (validSlots.length === 1) {
                    // Auto-cast if only 1 valid target
                    this.executeInstantCard(card, { index: validSlots[0] }); 
                    return;
                } else {
                    // Manual select if 2+
                    bus.emit('changeState', new TargetingState(this.game, this, card));
                    return;
                }
            }

            if (card.effects && card.effects[0].targetType) {
                bus.emit('changeState', new TargetingState(this.game, this, card));
            } else {
                this.executeInstantCard(card);
            }
        } else if (action === 'done') {
            this.game.pHeld.fill(false);
            bus.emit('changeState', new EnemyRollState(this.game));
        }
    }

    async executeInstantCard(card, extraParams = {}) {
        if (this.game.payMana(card.currentCost)) {
            bus.emit('log', {msg: `✨ Cast [${card.name}]`, cls: 't-sys'});
            await EffectProcessor.process('on_play', card, { 
                gameModel: this.game,
                targetIndex: extraParams.index 
            });
            
            const cardEl = document.querySelector(`.hand-card[data-uid="${card.uid}"]`);
            if (cardEl) {
                cardEl.classList.add('discarding');
                await wait(700); 
            }

            this.game.pHand = this.game.pHand.filter(c => c.uid !== card.uid);
            this.game.handDiscard.push(card);
            bus.emit('updateUI');
        }
    }
}

class EnemyRollState extends GameState {
    async enter() {
        bus.emit('instruction', t('instr_boss'));
        bus.emit('updateUI');
        
        bus.emit('log', {msg: t('log_boss_roll'), cls: 't-hint'});
        this.game.eDice = Array(6).fill(0).map(roll);
        
        let totalRerolls = REROLL_COUNT + this.game.eRerollMod;
        if (totalRerolls < 0) totalRerolls = 0;
        this.game.eRerolls = totalRerolls;
        
        if (this.game.eRerollMod !== 0) {
            bus.emit('log', {msg: `Boss Rerolls Modified: ${this.game.eRerollMod}`, cls: 't-sys'});
        }

        this.game.eHeld = Array(6).fill(false);
        bus.emit('updateUI');
        await wait(600);

        const profile = BOSS_PROFILES[this.game.currentDifficulty] || BOSS_PROFILES['normal'];
        const traits = profile.aiTraits;

        while (this.game.eRerolls > 0) {
            try {
                const decision = Logic.aiEvaluate(this.game.eDice, this.game.board, traits);
                this.game.eHeld = decision.mask;
            } catch (err) {
                console.error("AI Error:", err);
                this.game.eHeld = Array(6).fill(false);
            }
            
            bus.emit('updateUI');
            if (this.game.eHeld.every(x=>x)) break;
            await wait(600);
            this.game.eDice = this.game.eDice.map((d,i) => this.game.eHeld[i] ? d : roll());
            this.game.eRerolls--;
            bus.emit('updateUI');
        }

        bus.emit('log', {msg: t('log_boss_lock'), cls: 't-sys'});
        await wait(500);
        bus.emit('changeState', new SelectionState(this.game));
    }
}

class SelectionState extends GameState {
    constructor(game) { super(game); this.subPhase = 'init'; }
    enter() {
        let pool = this.getAllDice();
        // Updated check to handle null slots
        let hasValid = this.game.board.some(obj => obj && Logic.getCombos(pool, [], obj.comboType || obj.id, obj).length > 0);
        
        if (!hasValid) {
            bus.emit('log', {msg: t('log_no_card'), cls: 't-hint'});
            bus.emit('instruction', t('log_invalid'));
            this.noMove = true;
        } else {
            bus.emit('log', {msg: t('log_select_tip'), cls: 't-hint'});
            this.noMove = false;
        }

        if (this.game.initiative === 'enemy') {
            bus.emit('log', {msg: t('log_boss_first'), cls: 't-sys'});
            bus.emit('instruction', t('instr_select_p2'));
            this.runAISelection();
            this.subPhase = 'player_turn';
        } else {
            bus.emit('log', {msg: t('log_player_first'), cls: 't-sys'});
            bus.emit('instruction', t('instr_select_p1'));
            this.subPhase = 'player_turn';
        }
        bus.emit('updateUI');
    }

    handleInput(action, data) {
        if (action === 'selectCard') {
            this.toggleSelection(data.obj);
        } else if (action === 'playCard') {
            const card = data.card;
            if (!this.game.canAfford(card.currentCost)) {
                bus.emit('log', {msg: "Not enough MP!", cls: 't-hint'});
                return;
            }
            if (card.effects && card.effects[0].targetType) {
                bus.emit('changeState', new TargetingState(this.game, this, card));
            } else {
                this.executeInstantCard(card);
            }
        } else if (action === 'confirm') {
            if (this.game.initiative === 'player') {
                this.subPhase = 'locked';
                bus.emit('updateUI');
                this.handleAISecondTurn();
            } else {
                bus.emit('changeState', new ResolveState(this.game));
            }
        } else if (action === 'skip') {
             if (this.game.initiative === 'player') {
                this.subPhase = 'locked';
                bus.emit('updateUI');
                this.handleAISecondTurn();
             } else {
                bus.emit('changeState', new ResolveState(this.game));
             }
        }
    }

    async executeInstantCard(card) {
        if (this.game.payMana(card.currentCost)) {
            bus.emit('log', {msg: `✨ Cast [${card.name}]`, cls: 't-sys'});
            EffectProcessor.process('on_play', card, { gameModel: this.game });
            
            const cardEl = document.querySelector(`.hand-card[data-uid="${card.uid}"]`);
            if (cardEl) {
                cardEl.classList.add('discarding');
                await wait(700); 
            }
            
            this.game.pHand = this.game.pHand.filter(c => c.uid !== card.uid);
            this.game.handDiscard.push(card);
            bus.emit('updateUI');
        }
    }

    async handleAISecondTurn() {
        bus.emit('instruction', "BOSS Turn...");
        await wait(500);
        bus.emit('log', {msg: t('log_boss_reveal'), cls: 't-sys'});
        this.runAISelection();
        bus.emit('updateUI');
        await wait(1000);
        bus.emit('changeState', new ResolveState(this.game));
    }

    runAISelection() {
        this.game.aiSelections = [];
        let used = [];
        let pool = this.game.eDice.map((d, i) => ({ val: d, type: 'ai_hand', idx: i }));
        // Filter out nulls for sorting and selection
        let sorted = [...this.game.board].filter(c => c).sort((a,b) => b.dmg - a.dmg);
        for (let obj of sorted) {
            let combos = Logic.getCombos(pool, used, obj.comboType || obj.id, obj);
            if (combos.length > 0) {
                let chosen = combos[0];
                this.game.aiSelections.push({ obj: obj, values: chosen.map(i => i.val) });
                used.push(...chosen);
            }
        }
    }

    getAllDice() {
        let pool = [];
        this.game.pDice.forEach((d, i) => { pool.push({ val: d, type: 'hand', idx: i }); });
        this.game.pStorage.forEach((s, i) => {
            if (s && s.isReady) pool.push({ val: s.val, type: 'storage', idx: i });
        });
        return pool;
    }

    toggleSelection(obj) {
        const existingIdx = this.game.pSelectedObjs.findIndex(item => item.obj.uid === obj.uid);
        const pool = this.getAllDice();

        if (existingIdx !== -1) {
            const currentItem = this.game.pSelectedObjs[existingIdx];
            const releasedIndices = currentItem.indices;
            let tempUsed = this.game.pUsedIndices.filter(used => 
                !releasedIndices.some(rel => rel.type === used.type && rel.idx === used.idx)
            );
            const allCombos = Logic.getCombos(pool, tempUsed, obj.comboType || obj.id, obj);
            
            if (allCombos.length === 0) {
                this.game.pUsedIndices = tempUsed;
                this.game.pSelectedObjs.splice(existingIdx, 1);
            } else {
                const nextVarIdx = currentItem.variationIdx + 1;
                if (nextVarIdx < allCombos.length) {
                    const nextCombo = allCombos[nextVarIdx];
                    this.game.pUsedIndices = [...tempUsed, ...nextCombo];
                    this.game.pSelectedObjs[existingIdx] = { obj: obj, indices: nextCombo, variations: allCombos, variationIdx: nextVarIdx };
                    bus.emit('log', {msg: `${t('log_cycle')} [${cName(obj.comboType || obj.id)}]`, cls:'t-hint'});
                } else {
                    this.game.pUsedIndices = tempUsed;
                    this.game.pSelectedObjs.splice(existingIdx, 1);
                    bus.emit('log', {msg: `${t('log_cancel')} [${cName(obj.comboType || obj.id)}]`, cls:'t-hint'});
                }
            }
        } else {
            const combos = Logic.getCombos(pool, this.game.pUsedIndices, obj.comboType || obj.id, obj);
            if (combos.length > 0) {
                const first = combos[0];
                this.game.pUsedIndices.push(...first);
                this.game.pSelectedObjs.push({ obj: obj, indices: first, variations: combos, variationIdx: 0 });
                bus.emit('log', {msg: `${t('log_select')} [${cName(obj.comboType || obj.id)}]`, cls:'t-hint'});
            } else {
                bus.emit('log', {msg: t('log_no_dice_err'), cls:'t-hint'});
            }
        }
        bus.emit('updateUI');
    }
}

class ResolveState extends GameState {
    async enter() {
        bus.emit('instruction', t('instr_resolve'));
        
        let pDmg = 0, eDmg = 0;
        let summaryHTML = "";
        let storageToRemove = [];
        let cardsToRemove = [];

        // Iterate strictly 0 to 2
        for (let i = 0; i < 3; i++) {
            let obj = this.game.board[i];
            
            // UX Update: Skip empty slots in resolution
            if (!obj) continue;
            
            if (cardsToRemove.includes(obj.uid)) continue; 

            const pSel = this.game.pSelectedObjs.find(item => item.obj.uid === obj.uid);
            const eSel = this.game.aiSelections.find(item => item.obj.uid === obj.uid);
            
            let resText = "";
            let style = "";
            let aiDiceHTML = eSel ? `<span class="mini-die-container"><span class="mini-label">AI:</span>${eSel.values.map(v=>`<span class="mini-die">${v}</span>`).join('')}</span>` : "";

            let finalDmg = obj.dmg;
            let buffApplied = false;
            let extraLog = "";
            let forceWin = false;

            const executeDamageCalc = (dice) => {
                let context = { dice: dice, finalDmg: finalDmg, buffApplied: false, gameModel: this.game, forceWin: false };
                EffectProcessor.process('on_modify_damage', obj, context);
                finalDmg = context.finalDmg;
                buffApplied = context.buffApplied;
                if(context.forceWin) forceWin = true;
                if(context.extraLog) extraLog += context.extraLog;
            };

            const executeWinEffects = (winner, winningDice) => {
                let context = { 
                    board: this.game.board, 
                    cardIndex: i, 
                    bonusDmg: 0, 
                    cardsToRemove: cardsToRemove, 
                    extraLog: "", 
                    winningDice: winningDice,
                    gameModel: this.game
                };
                EffectProcessor.process('on_resolve_success', obj, context);
                finalDmg += context.bonusDmg;
                if (context.extraLog) extraLog += " " + context.extraLog;
            };
            
            const executeLoseEffects = () => {
                let context = { gameModel: this.game, extraLog: "" };
                EffectProcessor.process('on_resolve_fail', obj, context);
                if (context.extraLog) extraLog += " " + context.extraLog;
            };
            
            const executeTieEffects = () => {
                let context = { gameModel: this.game, extraLog: "", finalDmg: finalDmg, forceWin: false };
                EffectProcessor.process('on_clash_tie', obj, context);
                finalDmg = context.finalDmg;
                if (context.forceWin) forceWin = true;
                if (context.extraLog) extraLog += " " + context.extraLog;
            };

            let buffText = "";
            
            if (pSel && eSel) {
                const pScore = Logic.getTieBreaker(pSel.indices.map(i=>i.val), obj);
                const eScore = Logic.getTieBreaker(eSel.values, obj);
                
                if (pScore === eScore) {
                     executeTieEffects();
                     if (forceWin) {
                         let diceVals = pSel.indices.map(item=>item.val);
                         executeDamageCalc(diceVals);
                         executeWinEffects('player', diceVals);
                         if(buffApplied) buffText = "(Buff!)";
                         pDmg += finalDmg;
                         style = "color: var(--player-color); border-left: 4px solid var(--player-color);";
                         resText = `<b>[${cName(obj.comboType || obj.id)}] ${t('log_win')}</b> ${buffText} ${extraLog} ${aiDiceHTML}`;
                         pSel.indices.filter(idx => idx.type === 'storage').forEach(x => storageToRemove.push(x.idx));
                         cardsToRemove.push(obj.uid);
                         this.game.discardPile.push(obj);
                     } else {
                         style = "color: #777; border-left: 4px solid #777;";
                         resText = `<b>[${cName(obj.comboType || obj.id)}] ${t('log_tie')}</b> ${extraLog} ${aiDiceHTML}`;
                         pSel.indices.filter(i => i.type === 'storage').forEach(x => storageToRemove.push(x.idx));
                     }
                } else if (pScore > eScore) {
                    let diceVals = pSel.indices.map(item=>item.val);
                    executeDamageCalc(diceVals);
                    executeWinEffects('player', diceVals);
                    if(buffApplied) buffText = "(Buff!)";
                    pDmg += finalDmg;
                    style = "color: var(--player-color); border-left: 4px solid var(--player-color);";
                    resText = `<b>[${cName(obj.comboType || obj.id)}] ${t('log_win')}</b> ${buffText} ${extraLog} ${aiDiceHTML}`;
                    pSel.indices.filter(idx => idx.type === 'storage').forEach(x => storageToRemove.push(x.idx));
                    cardsToRemove.push(obj.uid);
                    this.game.discardPile.push(obj);
                } else {
                    let diceVals = eSel.values;
                    executeDamageCalc(diceVals);
                    executeWinEffects('enemy', diceVals);
                    executeLoseEffects();
                    if(buffApplied) buffText = "(Buff!)";
                    eDmg += finalDmg;
                    style = "color: var(--enemy-color); border-left: 4px solid var(--enemy-color);";
                    resText = `<b>[${cName(obj.comboType || obj.id)}] ${t('log_lose')}</b> ${buffText} ${extraLog} ${aiDiceHTML}`;
                    pSel.indices.filter(i => i.type === 'storage').forEach(x => storageToRemove.push(x.idx));
                    cardsToRemove.push(obj.uid);
                    this.game.discardPile.push(obj);
                }
            } else if (pSel) {
                let diceVals = pSel.indices.map(item=>item.val);
                executeDamageCalc(diceVals);
                executeWinEffects('player', diceVals);
                if(buffApplied) buffText = "(Buff!)";
                pDmg += finalDmg;
                style = "color: var(--player-color); border-left: 4px solid var(--player-color);";
                resText = `<b>${t('log_atk')} [${cName(obj.comboType || obj.id)}]</b> ${buffText} ${extraLog}`;
                pSel.indices.filter(i => i.type === 'storage').forEach(x => storageToRemove.push(x.idx));
                cardsToRemove.push(obj.uid);
                this.game.discardPile.push(obj);
            } else if (eSel) {
                let diceVals = eSel.values;
                executeDamageCalc(diceVals);
                executeWinEffects('enemy', diceVals);
                if(buffApplied) buffText = "(Buff!)";
                eDmg += finalDmg;
                style = "color: var(--enemy-color); border-left: 4px solid var(--enemy-color);";
                resText = `<b>${t('log_boss_atk')} [${cName(obj.comboType || obj.id)}]</b> ${buffText} ${extraLog} ${aiDiceHTML}`;
                cardsToRemove.push(obj.uid);
                this.game.discardPile.push(obj);
            }

            if (pSel || eSel) summaryHTML += `<div class="result-row" style="${style}">${resText}</div>`;
        }

        if (summaryHTML === "") summaryHTML = `<div class='result-row'>${t('log_miss')}</div>`;

        // UX Update: Instead of filtering (shifting array), set specific slots to null
        for(let i=0; i<3; i++) {
             if(this.game.board[i] && cardsToRemove.includes(this.game.board[i].uid)) {
                 this.game.board[i] = null;
             }
        }
        
        // --- CONSUME PROTECTION LOGIC ---
        const uniqueStorageIndices = [...new Set(storageToRemove)];
        
        uniqueStorageIndices.forEach(idx => {
            const item = this.game.pStorage[idx];
            if (item && item.isEcho) {
                item.isEcho = false; 
                bus.emit('log', {msg: `🔊 Echo Saved Dice [${item.val}]!`, cls: 't-sys'});
            } else {
                this.game.pStorage[idx] = null;
            }
        });
        
        // --- Damage Application ---
        if (this.game.vitalEssenceActive) {
            let onesCount = 0;
            this.game.pDice.forEach(d => { if(d===1) onesCount++; });
            this.game.pStorage.forEach(s => { if(s && s.val===1) onesCount++; });
            if (onesCount > 0) {
                const heal = onesCount * 10;
                this.game.pHP = Math.min(this.game.pMaxHP, this.game.pHP + heal);
                summaryHTML += `<div class="result-row" style="color:#2ecc71;">Vital Essence: +${heal} HP (${onesCount}x1s)</div>`;
            }
        }

        // Disarm Logic
        let disarmReduced = 0;
        if (this.game.eAtkDebuff > 0 && eDmg > 0) { 
            const originalDmg = eDmg;
            eDmg = Math.floor(eDmg * (1 - this.game.eAtkDebuff));
            disarmReduced = originalDmg - eDmg;
        }

        this.game.eHP -= pDmg;
        
        let shieldBlockText = "";
        
        if (eDmg > 0) {
            if (this.game.pShield > 0) {
                this.game.pShield--;
                eDmg = 0;
                shieldBlockText = `<span style="font-size:0.8em; color:#f1c40f;"> (🛡️ Blocked!)</span>`;
                bus.emit('log', {msg: "🛡️ Guardian's Protection Blocked Attack!", cls: 't-sys'});
            } else {
                this.game.pHP -= eDmg;
                document.body.classList.add('anim-shake');
                setTimeout(() => document.body.classList.remove('anim-shake'), 500);
            }
        }

        bus.emit('updateUI');
        await wait(500);
        if (this.game.pHP <= 0 || this.game.eHP <= 0) {
            this.game.pHP > 0 ? this.endGame(true) : this.endGame(false);
        } else {
            document.getElementById('btn-next').style.display = 'inline-block';
            document.getElementById('btn-restart').style.display = 'none';
            const sumDiv = document.getElementById('round-summary');
            
            if (disarmReduced > 0) {
                summaryHTML += `<div class="result-row" style="color:#e74c3c; border-left: 4px solid #e74c3c;">⚔️ Disarm Effect: Reduced ${disarmReduced} DMG</div>`;
            }

            sumDiv.innerHTML = summaryHTML + 
                `<div style="margin-top:15px; display:flex; justify-content:space-around; font-size:1.2em;">
                    <span style="color:var(--enemy-color)">BOSS: -${pDmg}</span>
                    <span style="color:var(--player-color)">YOU: -${eDmg}${shieldBlockText}</span>
                </div>`;
            document.getElementById('overlay').style.display = 'flex';
        }
    }

    endGame(win) {
        document.getElementById('round-title').innerText = win ? t('victory') : t('defeat');
        document.getElementById('round-summary').innerHTML = win ? `<h1>${t('you_win')}</h1>` : `<h1>${t('you_lose')}</h1>`;
        document.getElementById('btn-next').style.display = 'none';
        document.getElementById('btn-restart').style.display = 'inline-block';
        document.getElementById('overlay').style.display = 'flex';
    }
}