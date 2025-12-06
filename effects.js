// ============================================================================
// EFFECT SYSTEM
// ============================================================================

const EffectLibrary = {
    // --- 基礎數值修改 (Board Cards) ---
    'modify_damage': (context, params) => {
        let conditionMet = true;
        if (params.condition) {
            if (params.condition.type === 'has_dice') {
                if (!context.dice.includes(params.condition.value)) conditionMet = false;
            }
            if (params.condition.type === 'parity') {
                const mainVal = context.dice[0]; 
                const isEven = mainVal % 2 === 0;
                if (params.condition.value === 'even' && !isEven) conditionMet = false;
                if (params.condition.value === 'odd' && isEven) conditionMet = false;
            }
        }
        if (conditionMet) {
            if (params.op === 'multiply') {
                context.finalDmg = Math.floor(context.finalDmg * params.value);
                context.buffApplied = true;
            }
        }
    },
    
    // --- 規則扭曲類 ---
    'ban_dice': (context, params) => {
        if (context.validValues) {
            params.values.forEach(v => {
                context.validValues = context.validValues.filter(val => val !== v);
            });
        }
    },
    'invert_win': (context, params) => {
        context.invertScore = true;
    },
    'custom_rank': (context, params) => {
        let score = 0;
        context.dice.forEach(d => {
            const idx = params.order.indexOf(d);
            if (idx !== -1) score += (10 - idx) * 10; 
        });
        score += context.dice.length;
        context.customScore = score;
    },
    'bonus_score_parity': (context, params) => {
        const dice = context.dice || [];
        if (dice.length === 0) return;
        const allEven = dice.every(d => d % 2 === 0);
        const allOdd = dice.every(d => d % 2 !== 0);
        
        if (allEven || allOdd) {
            context.finalDmg = Math.floor(context.finalDmg * params.value);
            context.buffApplied = true;
            context.extraLog = `(Resonance! x${params.value})`;
        }
    },

    // --- 資源與博弈類 ---
    'lifesteal': (context, params) => {
        if (context.gameModel && context.finalDmg > 0) {
            const heal = Math.floor(context.finalDmg * params.value);
            // [MODIFIED] Check winner to determine who gets healed
            if (context.winner === 'player') {
                context.gameModel.pHP = Math.min(context.gameModel.pMaxHP, context.gameModel.pHP + heal);
            } else if (context.winner === 'enemy') {
                context.gameModel.eHP = Math.min(context.gameModel.eMaxHP, context.gameModel.eHP + heal);
            }
            context.extraLog = `(Lifesteal +${heal})`;
        }
    },
    'thorns': (context, params) => {
        if (context.gameModel) {
            context.gameModel.eHP -= params.value;
            context.extraLog = `(Thorns! Boss -${params.value})`;
        }
    },
    'pay_hp': (context, params) => {
        if (context.gameModel) {
            if (context.gameModel.pHP > params.cost) {
                context.gameModel.pHP -= params.cost;
                context.finalDmg += params.bonusDmg;
                context.extraLog = `(Berserk! -${params.cost} HP, +${params.bonusDmg} DMG)`;
            } else {
                context.extraLog = `(HP too low for Berserk)`;
            }
        }
    },
    'reward_reserve': (context, params) => {
        if (context.gameModel) {
            context.gameModel.addBuff({
                type: 'max_reserve',
                value: 1,
                duration: params.duration
            });
            context.extraLog = `(Supply Drop! +1 Slot for ${params.duration} turns)`;
        }
    },
    'gamble_crit': (context, params) => {
        if (Math.random() < params.chance) {
            context.finalDmg = Math.floor(context.finalDmg * params.multiplier);
            context.extraLog = `(CRIT! x${params.multiplier})`;
            context.buffApplied = true;
        }
    },
    'gamble_coin': (context, params) => {
        if (Math.random() < 0.5) {
            context.finalDmg *= 2;
            context.extraLog = `(Winner! x2 Damage)`;
        } else {
            context.finalDmg = 0;
            context.gameModel.eHP = Math.min(context.gameModel.eMaxHP, context.gameModel.eHP + params.healAmount);
            context.extraLog = `(Oops! Boss Healed +${params.healAmount})`;
        }
    },
    'evolve_on_tie': (context, params) => {
        context.finalDmg = 500; 
        context.extraLog = `(Mimic Evolved!)`;
    },
    'overpower_on_tie': (context, params) => {
        context.forceWin = true;
        context.finalDmg = Math.floor(context.finalDmg * params.value);
        context.extraLog = `(Counter Strike!)`;
    },
    'roll_on_enter': (context, params) => {
        if (!context.card.state) context.card.state = {};
        const val = Math.floor(Math.random() * 6) + 1; // Simple roll
        context.card.state[params.key] = val;
    },
    'dynamic_rank_from_state': (context, params) => {
        const targetVal = context.cardObj.state ? context.cardObj.state[params.key] : 6;
        let rankMap = {};
        let curr = targetVal;
        
        for (let score = 60; score >= 10; score -= 10) {
            rankMap[curr] = score;
            curr--;
            if (curr < 1) curr = 6; 
        }

        let totalScore = 0;
        context.dice.forEach(d => {
            totalScore += (rankMap[d] || 0);
        });
        
        context.customScore = totalScore;
    },
    'hidden_val': (context, params) => {
        context.card.isHidden = true;
    },
    'reveal_val': (context, params) => {
        if(context.cardObj.isHidden) {
            context.cardObj.isHidden = false;
            context.customScore = Math.floor(Math.random() * 100) + 50; // Random surprise
        }
    },

    // --- 成長與環境 ---
    'growth_turn_end': (context, params) => {
        if (!context.card.tempDmgMod) context.card.tempDmgMod = 0;
        context.card.tempDmgMod += params.value;
        context.card.dmg = Math.max(0, context.card.baseDmg + context.card.tempDmgMod);
    },
    'curse_turn_end': (context, params) => {
        if (context.gameModel) {
            context.gameModel.pHP -= params.value;
            if (typeof bus !== 'undefined') bus.emit('log', {msg: `⚠️ Curse! You took ${params.value} DMG.`, cls: 't-sys'});
        }
    },
    'steal_power_on_enter': (context, params) => {
        const idx = context.cardIndex;
        const board = context.board;
        let stolenTotal = 0;
        
        [idx-1, idx+1].forEach(nIdx => {
            if (nIdx >= 0 && nIdx < board.length) {
                const neighbor = board[nIdx];
                if (!neighbor) return; // UX Fix: Skip null slots
                const stealAmt = Math.floor(neighbor.dmg * params.percentage);
                neighbor.dmg -= stealAmt;
                stolenTotal += stealAmt;
            }
        });
        context.card.dmg += stolenTotal;
        context.card.baseDmg = context.card.dmg;
    },
    'guard_passive': (context, params) => { },
    
    // [MODIFIED] Chain Buff now directly modifies the neighbor card's dmg
    'chain_buff': (context, params) => {
        const targetIdx = context.cardIndex + 1;
        if (targetIdx < context.board.length) {
            const target = context.board[targetIdx];
            if (target) { 
                // Directly multiply current damage and base damage to persist effect
                target.dmg = Math.floor(target.dmg * params.value);
                target.baseDmg = Math.floor(target.baseDmg * params.value);
                
                context.extraLog = `(Chain! Right Card x${params.value})`;
            }
        }
    },
    
    'explode_neighbors': (context, params) => {
        const idx = context.cardIndex;
        [idx-1, idx+1].forEach(nIdx => {
            if (nIdx >= 0 && nIdx < context.board.length) {
                const nCard = context.board[nIdx];
                if (nCard && !context.cardsToRemove.includes(nCard.uid)) {
                    context.cardsToRemove.push(nCard.uid);
                    if (typeof bus !== 'undefined') bus.emit('log', {msg: `💣 ${cName(nCard.comboType || nCard.id)} was destroyed by Bomb!`, cls: 't-sys'});
                }
            }
        });
    },

    // ============================================================================
    // HAND CARD EFFECTS (ASYNC & VISUALS)
    // ============================================================================
    
    // Weighted Fate (FIXED for persistent future turns)
    'mod_enemy_reroll': async (context, params) => {
        if(context.gameModel) {
            // 判斷當前狀態是否為「選牌階段」(代表敵人已經擲完骰子了)
            const isFuture = (window.currentState && window.currentState.constructor.name === 'SelectionState');
            
            const sign = params.value > 0 ? '+' : '';
            const color = params.value < 0 ? 'dmg' : 'heal'; 
            bus.emit('visual_effect', {type: 'float_text', target: 'enemy', text: `${sign}${params.value} Reroll`, color: color});

            if (isFuture) {
                // 敵人已行動，加到下回合緩衝區
                context.gameModel.nextTurnEnemyRerollMod += params.value;
                bus.emit('log', {msg: `🎯 Weighted Fate! Enemy NEXT turn rerolls ${sign}${params.value}`, cls: 't-sys'});
            } else {
                // 敵人尚未行動，直接修改當前
                context.gameModel.eRerollMod += params.value;
                bus.emit('log', {msg: `🎯 Weighted Fate! Enemy rerolls ${sign}${params.value}`, cls: 't-sys'});
            }
            bus.emit('updateUI');
        }
    },

    // Guardian's Protection
    'add_shield': async (context, params) => {
        if(context.gameModel) {
            context.gameModel.pShield += params.value;
            bus.emit('log', {msg: `🛡️ Shield Up! Total: ${context.gameModel.pShield}`, cls: 't-sys'});
            bus.emit('updateUI');
        }
    },

    // Echo Dice (NEW LOGIC: Apply Buff instead of Copy)
    'apply_echo_buff': async (context, params) => {
        if (context.gameModel && context.targetIndex !== undefined) {
            const item = context.gameModel.pStorage[context.targetIndex];
            if (item) {
                // 1. Visuals
                bus.emit('visual_effect', {type: 'dice_cast_start', index: context.targetIndex, loc: 'storage'});
                await wait(800);
                
                // 2. Logic
                item.isEcho = true;
                bus.emit('log', {msg: `🔊 Echo applied to Saved Dice [${item.val}]`, cls: 't-sys'});
                
                // 3. Update UI
                bus.emit('updateUI');
                bus.emit('visual_effect', {type: 'dice_pop', index: context.targetIndex, loc: 'storage'});
            }
        }
    },

    // Minor Restoration
    'heal_player': async (context, params) => {
        if(context.gameModel) {
            const oldHP = context.gameModel.pHP;
            context.gameModel.pHP = Math.min(context.gameModel.pMaxHP, context.gameModel.pHP + params.value);
            const healed = context.gameModel.pHP - oldHP;
            bus.emit('visual_effect', {type: 'float_text', target: 'player', text: `+${healed}`, color: 'heal'});
            bus.emit('log', {msg: `💚 Healed +${healed} HP`, cls: 't-sys'});
        }
    },

    // Vital Essence
    'buff_vital_essence': async (context, params) => {
        if(context.gameModel) {
            // [MODIFIED] 累加
            context.gameModel.vitalEssenceActive += 1;
            bus.emit('log', {msg: `✨ Vital Essence Active! (Stack x${context.gameModel.vitalEssenceActive})`, cls: 't-sys'});
            bus.emit('updateUI');
        }
    },

    // Efficient Casting / Mana Optimization
    'mod_hand_cost': async (context, params) => {
        if (context.targetCard) {
            bus.emit('visual_effect', {type: 'card_cast_start', uid: context.targetCard.uid});
            await wait(800); 

            context.targetCard.currentCost = Math.max(0, context.targetCard.currentCost + params.value);
            bus.emit('log', {msg: `📉 Cost Reduced! [${context.targetCard.name}] is now ${context.targetCard.currentCost} MP.`, cls: 't-sys'});
            
            bus.emit('updateUI');
            bus.emit('visual_effect', {type: 'card_flash', uid: context.targetCard.uid});
        }
    },

    // Vampiric Touch
    'lifesteal_dmg': async (context, params) => {
        if(context.gameModel) {
            context.gameModel.eHP -= params.value;
            bus.emit('visual_effect', {type: 'float_text', target: 'enemy', text: `-${params.value}`, color: 'dmg'});
            bus.emit('updateUI'); 
            
            await wait(600);

            const oldHP = context.gameModel.pHP;
            context.gameModel.pHP = Math.min(context.gameModel.pMaxHP, context.gameModel.pHP + params.value);
            const healed = context.gameModel.pHP - oldHP;
            
            bus.emit('visual_effect', {type: 'float_text', target: 'player', text: `+${healed}`, color: 'heal'});
            bus.emit('log', {msg: `🩸 Vampiric Touch! Stole ${params.value} HP.`, cls: 't-sys'});
        }
    },

    // Self-Imposed Weakness / Fortune's Favor
    'mod_dice_val': async (context, params) => {
        if (context.gameModel && context.targetIndex !== undefined && context.targetType) {
            bus.emit('visual_effect', {type: 'dice_cast_start', index: context.targetIndex, loc: context.targetType});
            await wait(800);

            let val = 0;
            if (context.targetType === 'hand') {
                val = context.gameModel.pDice[context.targetIndex];
                let newVal = Math.max(1, Math.min(6, val + params.value));
                context.gameModel.pDice[context.targetIndex] = newVal;
                bus.emit('log', {msg: `🎲 Dice Modified: ${val} ➔ ${newVal}`, cls: 't-sys'});
            } else if (context.targetType === 'storage') {
                if (context.gameModel.pStorage[context.targetIndex]) {
                    val = context.gameModel.pStorage[context.targetIndex].val;
                    let newVal = Math.max(1, Math.min(6, val + params.value));
                    context.gameModel.pStorage[context.targetIndex].val = newVal;
                    bus.emit('log', {msg: `🎲 Stored Dice Modified: ${val} ➔ ${newVal}`, cls: 't-sys'});
                }
            }
            
            bus.emit('updateUI'); 
            bus.emit('visual_effect', {type: 'dice_pop', index: context.targetIndex, loc: context.targetType});
        }
    },

    // Second Chance
    'add_next_turn_reroll': async (context, params) => {
        if(context.gameModel) {
            context.gameModel.nextTurnRerollBonus += params.value;
            bus.emit('visual_effect', {type: 'float_text', target: 'player', text: `+${params.value} Reroll Next`, color: 'heal'});
            bus.emit('log', {msg: `🔄 Second Chance! +${params.value} Reroll next turn.`, cls: 't-sys'});
        }
    },

    // Lucky Boost
    'add_temp_dice': async (context, params) => {
        if(context.gameModel) {
            context.gameModel.tempDiceMod += params.count;
            bus.emit('visual_effect', {type: 'float_text', target: 'player', text: `+${params.count} Dice Next`, color: 'heal'});
            bus.emit('log', {msg: `🍀 Lucky Boost! +${params.count} Dice next roll.`, cls: 't-sys'});
        }
    },

    // Disarm (FIXED: Stacking Logic)
    'debuff_enemy_atk': async (context, params) => {
        if(context.gameModel) {
            context.gameModel.eAtkDebuff += params.value; 
            bus.emit('visual_effect', {type: 'float_text', target: 'enemy', text: `Disarm!`, color: 'dmg'});
            
            const totalPct = Math.round(context.gameModel.eAtkDebuff * 100);
            bus.emit('log', {msg: `⚔️ Disarm! Boss damage reduced by additional ${params.value * 100}% (Total ${totalPct}%).`, cls: 't-sys'});
            bus.emit('updateUI'); 
        }
    }
};

const EffectProcessor = {
    async process(triggerName, sourceObject, context) {
        if (!sourceObject.effects) return;
        for (const effect of sourceObject.effects) {
            const triggers = Array.isArray(effect.trigger) ? effect.trigger : [effect.trigger];
            if (triggers.includes(triggerName)) {
                const action = EffectLibrary[effect.type];
                if (action) await action(context, effect);
            }
        }
    },
    getVisualTags(sourceObject) {
        if (!sourceObject.effects) return [];
        let tags = [];
        const toPct = (val) => Math.round(val * 100);
        
        // Updated to use tEff() for localization
        sourceObject.effects.forEach(eff => {
            if (eff.type === 'lifesteal') tags.push({ type: 'buff', text: tEff('lifesteal_tag', {val: toPct(eff.value)}), desc: tEff('lifesteal_desc', {val: toPct(eff.value)}) });
            if (eff.type === 'thorns') tags.push({ type: 'ban', text: tEff('thorns_tag', {val: eff.value}), desc: tEff('thorns_desc', {val: eff.value}) });
            if (eff.type === 'pay_hp') tags.push({ type: 'ban', text: tEff('pay_hp_tag', {cost: eff.cost, dmg: eff.bonusDmg}), desc: tEff('pay_hp_desc', {cost: eff.cost, dmg: eff.bonusDmg}) });
            if (eff.type === 'reward_reserve') tags.push({ type: 'buff', text: tEff('reserve_tag'), desc: tEff('reserve_desc') });
            if (eff.type === 'curse_turn_end') tags.push({ type: 'ban', text: tEff('curse_tag', {val: eff.value}), desc: tEff('curse_desc', {val: eff.value}) });
            if (eff.type === 'gamble_coin') tags.push({ type: 'ban', text: tEff('gamble_coin_tag'), desc: tEff('gamble_coin_desc') });
            if (eff.type === 'growth_turn_end') tags.push({ type: eff.value>0?'buff':'ban', text: tEff('growth_tag', {sign: eff.value>0?'+':'', val: eff.value}), desc: tEff('growth_desc') });
            if (eff.type === 'chain_buff') tags.push({ type: 'buff', text: tEff('chain_tag', {val: eff.value}), desc: tEff('chain_desc', {val: eff.value}) });
            if (eff.type === 'bonus_score_parity') tags.push({ type: 'buff', text: tEff('parity_tag', {val: eff.value}), desc: tEff('parity_desc', {val: eff.value}) });
            
            // [MODIFIED] Always display as percentage (e.g. 17%, 50%)
            if (eff.type === 'gamble_crit') {
                let chanceDisp = Math.round(eff.chance * 100) + "%";
                tags.push({ type: 'buff', text: tEff('crit_tag', {chance: chanceDisp, val: eff.multiplier}), desc: tEff('crit_desc', {chance: chanceDisp, val: eff.multiplier}) });
            }
            
            if (eff.type === 'overpower_on_tie') tags.push({ type: 'buff', text: tEff('overpower_tag'), desc: tEff('overpower_desc') });
            if (eff.type === 'hidden_val') tags.push({ type: 'buff', text: tEff('hidden_tag'), desc: tEff('hidden_desc') });
            if (eff.type === 'explode_neighbors') tags.push({ type: 'ban', text: tEff('explode_tag'), desc: tEff('explode_desc') });
            if (eff.type === 'steal_power_on_enter') tags.push({ type: 'ban', text: tEff('steal_tag'), desc: tEff('steal_desc') });
            if (eff.type === 'guard_passive') tags.push({ type: 'buff', text: tEff('guard_tag'), desc: tEff('guard_desc') });
            if (eff.type === 'evolve_on_tie') tags.push({ type: 'buff', text: tEff('evolve_tag'), desc: tEff('evolve_desc') });
            if (eff.type === 'invert_win') tags.push({ type: 'ban', text: tEff('invert_tag'), desc: tEff('invert_desc') });
            if (eff.type === 'ban_dice') tags.push({ type: 'ban', text: tEff('ban_tag', {val: `[${eff.values.join(',')}]`}), desc: tEff('ban_desc', {val: eff.values.join(',')}) });
            
            // [MODIFIED] Added logic to read state for roll_on_enter
            if (eff.type === 'roll_on_enter') {
                const val = (sourceObject.state && sourceObject.state[eff.key]) ? sourceObject.state[eff.key] : '?';
                tags.push({ type: 'buff', text: tEff('roll_tag', {val: val}), desc: tEff('roll_desc', {val: val}) });
            }
            
            // [MODIFIED] Logic for custom_rank: format the order array
            if (eff.type === 'custom_rank') {
                const val = eff.order ? eff.order.join(' > ') : '?';
                tags.push({ type: 'ban', text: tEff('rank_tag'), desc: tEff('rank_desc', {val: val}) });
            }
            
            if (eff.type === 'modify_damage') tags.push({ type: 'buff', text: tEff('modify_tag'), desc: tEff('modify_desc') });
        });
        return tags;
    }
};