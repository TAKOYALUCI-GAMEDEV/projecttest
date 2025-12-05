// ============================================================================
// 5. UI MANAGER (game-ui.js)
// ============================================================================
const UIManager = {
    init() {
        // Helper to safely bind events
        const bindClick = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.onclick = handler;
        };

        bindClick('btn-lang', () => { currentLang = currentLang==='zh'?'en':'zh'; bus.emit('updateUI'); });
        bindClick('deck-info', () => this.showDeck());
        bindClick('btn-close-deck', () => { model.paused = false; document.getElementById('deck-modal').style.display='none'; });
        
        bindClick('btn-log-toggle', () => { document.getElementById('log-modal').style.display = 'flex'; });
        bindClick('btn-close-log', () => { document.getElementById('log-modal').style.display = 'none'; });

        bindClick('btn-restart', () => {
            document.getElementById('overlay').style.display = 'none';
            model.init(); 
            bus.emit('changeState', new RoundSetupState(model));
        });

        bindClick('btn-back-menu', () => { bus.emit('changeState', new MenuState(model)); });
        
        bindClick('btn-reroll', () => { if(currentState) currentState.handleInput('roll'); });
        
        bindClick('btn-action', () => {
            if (currentState instanceof PlayerRollState) {
                currentState.handleInput('done');
            } else if (currentState instanceof SelectionState) {
                if (currentState.noMove) currentState.handleInput('skip');
                else currentState.handleInput('confirm');
            } else if (currentState instanceof TargetingState) {
                currentState.handleInput('cancelTarget');
            }
        });

        bindClick('btn-next', () => {
            document.getElementById('overlay').style.display = 'none';
            bus.emit('changeState', new RoundSetupState(model));
        });

        bus.on('log', (data) => this.log(data.msg, data.cls));
        bus.on('clearLog', () => {
            const el = document.getElementById('log');
            if(el) el.innerHTML = '';
        });
        bus.on('instruction', (msg) => {
            const el = document.getElementById('instruction-text');
            if(el) el.innerText = msg;
        });
        bus.on('stateUpdated', () => this.render());
        bus.on('updateUI', () => this.render());
        bus.on('switchScene', (scene) => this.switchScene(scene));
        bus.on('changeState', (newState) => {
            window.currentState = newState;
            window.currentState.enter();
            this.render();
        });
        
        bus.on('animateManaPop', (data) => this.animateManaPop(data.index));
        bus.on('visual_effect', (data) => this.triggerVisualEffect(data));
        
        bus.on('animateBonusTransfer', () => {
            const el = document.querySelector('.next-turn-label');
            if(el) el.classList.add('dissolve');
        });
    },

    triggerVisualEffect(data) {
        const pStats = document.querySelector('.player-stats-col');
        const eStats = document.querySelector('.boss-stats-col');

        if (data.type === 'float_text') {
            const targetEl = data.target === 'player' ? pStats : eStats;
            if (targetEl) {
                const el = document.createElement('div');
                el.className = `floating-text ${data.color}`;
                el.innerText = data.text;
                targetEl.appendChild(el);
                setTimeout(() => el.remove(), 1500); 
            }
        }
        else if (data.type === 'dice_pop' || data.type === 'dice_cast_start') {
            let container = null;
            if (data.loc === 'hand') container = document.getElementById('p-dice');
            else if (data.loc === 'storage') container = document.getElementById(`storage-${data.index}`); 
            
            if (container) {
                let dieEl = null;
                if (data.loc === 'hand') dieEl = container.children[data.index];
                else dieEl = container.querySelector('.dice');
                
                if (dieEl) {
                    dieEl.classList.remove('target-valid'); 
                    
                    if (data.type === 'dice_cast_start') {
                        dieEl.classList.add('dice-casting');
                    } else if (data.type === 'dice_pop') {
                        dieEl.classList.remove('dice-casting'); 
                        dieEl.classList.remove('dice-flash');
                        void dieEl.offsetWidth; 
                        dieEl.classList.add('dice-flash');
                    }
                }
            }
        }
        else if (data.type === 'card_cast_start' || data.type === 'card_flash') {
            const cardEl = document.querySelector(`.hand-card[data-uid="${data.uid}"]`);
            if (cardEl) {
                cardEl.classList.remove('target-valid');
                if (data.type === 'card_cast_start') {
                    cardEl.classList.add('dice-casting');
                } else if (data.type === 'card_flash') {
                    cardEl.classList.remove('dice-casting');
                    cardEl.classList.remove('dice-flash');
                    void cardEl.offsetWidth;
                    cardEl.classList.add('dice-flash');
                }
            }
        }
    },

    switchScene(sceneName) {
        const menu = document.getElementById('scene-menu');
        const game = document.getElementById('scene-game');
        if (sceneName === 'menu') {
            menu.classList.remove('hidden');
            game.classList.add('hidden');
        } else {
            menu.classList.add('hidden');
            game.classList.remove('hidden');
        }
    },

    render() {
        // [MODIFIED] Update text first to handle menu language toggle
        this.updateText();
        
        if (currentState instanceof MenuState) return;
        
        this.renderHP();
        this.renderBoard(); 
        this.renderPlayer();
        this.renderEnemy();
        this.renderButtons();
    },

    updateText() {
        document.querySelectorAll('[data-key]').forEach(el => el.innerText = t(el.getAttribute('data-key')));
        
        const drawPile = document.getElementById('hand-draw-pile');
        const discPile = document.getElementById('hand-discard-pile');
        if(drawPile) drawPile.innerText = `Deck: ${model.handDeck.length}`;
        if(discPile) discPile.innerText = `Disc: ${model.handDiscard.length}`;
        
        const deckInfo = document.getElementById('deck-info');
        if(deckInfo) deckInfo.innerText = `BoardDeck: ${model.deck.length}`;

        const pInit = document.getElementById('p-init');
        const eInit = document.getElementById('e-init');
        if(pInit && eInit) {
            if (model.initiative === 'player') { pInit.style.display='inline-block'; eInit.style.display='none'; }
            else { pInit.style.display='none'; eInit.style.display='inline-block'; }
        }

        const resContainer = document.getElementById('storage-container');
        if(resContainer) resContainer.classList.toggle('disabled', model.reserveDice <= 0);

        const profile = BOSS_PROFILES[model.currentDifficulty];
        const eName = document.getElementById('e-name');
        if(eName) eName.innerText = t(profile.nameKey); 
        
        const pMpVal = document.getElementById('p-mp-val');
        const pMpMax = document.getElementById('p-mp-max');
        if(pMpVal) pMpVal.innerText = model.pMP;
        if(pMpMax) pMpMax.innerText = model.pMaxMP;
        
        this.renderManaCrystals();
    },

    renderManaCrystals() {
        const container = document.getElementById('mana-crystals');
        if(!container) return;
        container.innerHTML = '';
        for (let i = 0; i < model.pMaxMP; i++) {
            const crystal = document.createElement('div');
            const isFilled = i < model.pMP;
            crystal.className = `mana-crystal ${isFilled ? 'filled' : ''}`;
            crystal.dataset.idx = i;
            container.appendChild(crystal);
        }
    },

    animateManaPop(index) {
        const crystals = document.querySelectorAll('.mana-crystal');
        const target = crystals[index];
        if (target) {
            target.classList.remove('pop-anim');
            void target.offsetWidth; 
            target.classList.add('pop-anim');
        }
    },

    renderHP() {
        const hpBarP = document.getElementById('hp-bar-p');
        const hpTextP = document.getElementById('hp-text-p');
        if(hpBarP) hpBarP.style.width = Math.max(0, (model.pHP/model.pMaxHP)*100)+"%";
        if(hpTextP) hpTextP.innerText = `${Math.max(0, model.pHP)} / ${model.pMaxHP}`;

        const hpBarE = document.getElementById('hp-bar-e');
        const hpTextE = document.getElementById('hp-text-e');
        if(hpBarE) hpBarE.style.width = Math.max(0, (model.eHP/model.eMaxHP)*100)+"%";
        if(hpTextE) hpTextE.innerText = `${Math.max(0, model.eHP)} / ${model.eMaxHP}`;

        const pBuffContainer = document.getElementById('p-buffs');
        if (pBuffContainer) {
            let buffHTML = '';
            if (model.pShield > 0) buffHTML += `<span class="buff-tag shield">🛡️ ${model.pShield}</span>`;
            if (model.vitalEssenceActive) buffHTML += `<span class="buff-tag heal">✨ Vital</span>`;
            pBuffContainer.innerHTML = buffHTML;
        }

        const eBuffContainer = document.getElementById('e-buffs');
        if (eBuffContainer) {
            let eBuffHTML = '';
            if (model.eAtkDebuff > 0) {
                const pct = Math.round(model.eAtkDebuff * 100);
                eBuffHTML += `<span class="buff-tag debuff">⚔️ -${pct}%</span>`;
            }
            eBuffContainer.innerHTML = eBuffHTML;
        }
    },

    renderPlayer() {
        const div = document.getElementById('p-dice'); 
        if(!div) return;
        div.innerHTML='';
        
        const isRolling = currentState instanceof PlayerRollState;
        const isSelecting = currentState instanceof SelectionState;
        const isTargeting = currentState instanceof TargetingState;
        const targetType = isTargeting ? currentState.targetType : null;

        let isEchoCast = (isTargeting && currentState.card.effects[0].type === 'apply_echo_buff');

        model.pDice.forEach((d,i)=>{
            const el = document.createElement('div');
            let cls = 'dice';
            if (isRolling && model.pHeld[i]) cls += ' held';
            if (isSelecting && model.pUsedIndices.some(u => u.type === 'hand' && u.idx === i)) cls += ' consumed linked';
            
            const isBonusDie = (model.justMaterializedCount > 0 && i >= model.pDice.length - model.justMaterializedCount);
            if (isBonusDie) cls += ' materialize';

            if (isTargeting && targetType === 'dice') {
                cls += ' target-valid';
                el.onclick = () => currentState.handleInput('selectTarget', { type: 'hand', index: i });
            }

            if (d===0) { el.className='dice'; el.innerText="?"; }
            else {
                el.className=cls; el.innerText=d;
                if (!isTargeting && isRolling && !currentState.isFirst) {
                    el.draggable = true;
                    el.ondragstart = (e) => { if(!model.paused) { e.dataTransfer.setData("index", i); e.dataTransfer.setData("type", 'hand'); } };
                    el.onclick = () => currentState.handleInput('toggleHold', {idx: i});
                }
            }
            div.appendChild(el);
        });

        if (model.tempDiceMod > 0) {
            for (let k = 0; k < model.tempDiceMod; k++) {
                const gEl = document.createElement('div');
                gEl.className = 'dice ghost';
                gEl.innerText = '+1';
                div.appendChild(gEl);
            }
        }

        [0,1].forEach(idx => {
            const slot = document.getElementById(`storage-${idx}`);
            if(!slot) return;
            slot.innerHTML = '';
            const item = model.pStorage[idx];
            if (item) {
                const dEl = document.createElement('div');
                let cls = 'dice';
                if (item.isEcho) cls += ' echo'; 
                
                if (!item.isReady) cls += ' cooldown';
                if (isSelecting && model.pUsedIndices.some(u => u.type === 'storage' && u.idx === idx)) cls += ' consumed linked';
                
                if (isTargeting && (targetType === 'storage' || targetType === 'dice')) {
                    if (isEchoCast && item.isEcho) {
                        cls += ' disabled'; 
                    } else {
                        cls += ' target-valid';
                        dEl.onclick = () => currentState.handleInput('selectTarget', { type: 'storage', index: idx });
                    }
                }

                dEl.className = cls; dEl.innerText = item.val;
                
                if (!isTargeting && isRolling && !item.isReady) {
                    dEl.draggable = true;
                    dEl.style.cursor = 'grab';
                    dEl.ondragstart = (e) => { if(!model.paused) { e.dataTransfer.setData("index", idx); e.dataTransfer.setData("type", 'storage'); } };
                }
                slot.appendChild(dEl);
            }
            if (!isTargeting) {
                slot.ondragover = (e) => { 
                    e.preventDefault(); 
                    if(model.paused || model.reserveDice <= 0) return; 
                    slot.classList.add('drag-over'); 
                };
                slot.ondragleave = () => slot.classList.remove('drag-over');
                slot.ondrop = (e) => { 
                    e.preventDefault(); 
                    slot.classList.remove('drag-over'); 
                    if(model.paused) return; 
                    const type = e.dataTransfer.getData("type"); 
                    const diceIdx = parseInt(e.dataTransfer.getData("index")); 
                    if (type === 'hand') currentState.handleInput('storeDie', {diceIdx: diceIdx, slotIdx: idx}); 
                };
            }
        });

        const pDiceArea = document.getElementById('p-dice');
        if (!isTargeting && pDiceArea) {
            pDiceArea.ondragover = (e) => { 
                e.preventDefault(); 
                if(model.paused || !isRolling || currentState.isFirst) return; 
                pDiceArea.classList.add('drag-over'); 
            };
            pDiceArea.ondragleave = () => pDiceArea.classList.remove('drag-over');
            pDiceArea.ondrop = (e) => { 
                e.preventDefault(); 
                pDiceArea.classList.remove('drag-over'); 
                if(model.paused) return; 
                const type = e.dataTransfer.getData("type"); 
                const sIdx = parseInt(e.dataTransfer.getData("index")); 
                if (type === 'storage') currentState.handleInput('unstoreDie', {slotIdx: sIdx}); 
            };
        }

        this.renderHand();
    },

    renderHand() {
        const container = document.getElementById('hand-container');
        if(!container) return;
        container.innerHTML = '';
        
        const canPlay = (currentState instanceof PlayerRollState) || (currentState instanceof SelectionState);
        const isTargeting = currentState instanceof TargetingState;
        const targetType = isTargeting ? currentState.targetType : null;

        model.pHand.forEach(card => {
            const el = document.createElement('div');
            const affordable = model.pMP >= card.currentCost;
            
            let cls = 'hand-card';
            let isDisabled = false;

            if (card.effects && card.effects[0].targetType === 'dice') {
                if (currentState instanceof PlayerRollState && currentState.isFirst) {
                    isDisabled = true;
                }
            }

            if (isTargeting) {
                if (targetType === 'hand_card') {
                    cls += ' target-valid';
                } else {
                    isDisabled = true;
                }
            } else {
                if (!canPlay || !affordable || isDisabled) {
                    cls += ' disabled';
                    isDisabled = true;
                }
            }

            el.className = cls;
            el.dataset.uid = card.uid;
            
            if (!isDisabled) {
                if (isTargeting && targetType === 'hand_card') {
                    el.onclick = () => currentState.handleInput('selectTarget', { card: card });
                } else if (!isTargeting) {
                    el.onclick = () => currentState.handleInput('playCard', { card: card });
                }
            }

            el.innerHTML = `
                <div class="card-cost">${card.currentCost}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-desc">${card.desc}</div>
            `;
            
            container.appendChild(el);
        });
    },

    renderEnemy() {
        const div = document.getElementById('e-dice'); 
        if(div) {
            div.innerHTML='';
            model.eDice.forEach((d,i)=>{
                const el = document.createElement('div');
                if(d===0) { el.className='dice'; el.innerText="?"; }
                else { el.className=`dice ${model.eHeld[i]?'held':''}`; el.innerText=d; }
                div.appendChild(el);
            });
        }
        
        const statusEl = document.getElementById('e-status');
        if (statusEl) {
            // [MODIFIED] Simplified text logic and positioning updates
            if (currentState instanceof EnemyRollState) {
                statusEl.innerText = `REROLL: ${model.eRerolls}`;
                statusEl.style.color = '#f1c40f'; // Highlight
            } else {
                const base = REROLL_COUNT;
                const mod = model.eRerollMod;
                const total = Math.max(0, base + mod);
                statusEl.innerText = `REROLL: ${total}`;
                statusEl.style.color = '#fff';
            }
        }
    },

    renderBoard() {
        const boardEl = document.getElementById('bounty-board');
        if(!boardEl) return;
        const isSelecting = currentState instanceof SelectionState;
        let pool = [];
        if (isSelecting) pool = currentState.getAllDice();

        for (let i = 0; i < 3; i++) {
            const obj = model.board[i];
            let existingEl = boardEl.children[i];

            if (!obj) {
                if (!existingEl || !existingEl.classList.contains('bounty-card-placeholder')) {
                    const ph = document.createElement('div');
                    ph.className = 'bounty-card-placeholder';
                    if (existingEl) existingEl.replaceWith(ph);
                    else boardEl.appendChild(ph);
                }
                continue;
            }

            let cardEl = existingEl;
            const isMatch = existingEl && existingEl.dataset.uid === obj.uid;

            if (!isMatch) {
                cardEl = document.createElement('div');
                cardEl.className = 'bounty-card';
                if (obj.isNew) cardEl.classList.add('entering'); 
                cardEl.dataset.uid = obj.uid;
                
                cardEl.innerHTML = `
                    <div class="card-inner">
                        <div class="bounty-dmg">${obj.dmg}</div>
                        <div class="bounty-name"></div>
                        <div class="card-content" style="margin-top:5px; width:100%; display:flex; flex-direction:column; align-items:center;"></div>
                    </div>
                    <div class="combo-counter"></div>
                `;

                if (existingEl) existingEl.replaceWith(cardEl);
                else boardEl.appendChild(cardEl);
            }

            const isEntering = cardEl.classList.contains('entering');
            cardEl.className = 'bounty-card'; 
            if (isEntering) cardEl.classList.add('entering');
            if (obj.specialId) cardEl.classList.add('is-special');

            const mainTitle = cName(obj.comboType);
            cardEl.querySelector('.bounty-dmg').innerText = obj.dmg;
            cardEl.querySelector('.bounty-name').innerText = mainTitle;
            
            let tags = EffectProcessor.getVisualTags(obj);
            let condHTML = tags.map(tag => `
                <div class="condition-tag ${tag.type}" tabindex="0">
                    ${tag.text}
                    <span class="tooltip-text">${tag.desc}</span>
                </div>
            `).join('');
            
            if (tags.length > 2) cardEl.style.minHeight = "220px";
            cardEl.querySelector('.card-content').innerHTML = condHTML;

            // [MODIFIED] Bind click for Tooltip auto-hide logic
            const tagEls = cardEl.querySelectorAll('.condition-tag');
            tagEls.forEach(tag => {
                tag.onclick = (e) => {
                    e.stopPropagation();
                    // Close others
                    document.querySelectorAll('.condition-tag.active').forEach(t => {
                        if(t !== tag) t.classList.remove('active');
                    });
                    
                    tag.classList.toggle('active');
                    
                    if (tag.classList.contains('active')) {
                        if (tag.hideTimer) clearTimeout(tag.hideTimer);
                        tag.hideTimer = setTimeout(() => {
                            tag.classList.remove('active');
                            tag.hideTimer = null;
                        }, 2000);
                    }
                };
            });

            const pSel = model.pSelectedObjs.find(item => item.obj.uid === obj.uid);
            const eSel = model.aiSelections.find(item => item.obj.uid === obj.uid);

            if (pSel) {
                cardEl.classList.add('selected-p');
                const counter = cardEl.querySelector('.combo-counter');
                let tempUsed = model.pUsedIndices.filter(used => !pSel.indices.some(rel => rel.type === used.type && rel.idx === used.idx));
                const combos = Logic.getCombos(pool, tempUsed, obj.comboType || obj.id, obj);
                if (combos.length > 1) {
                    counter.innerText = `${pSel.variationIdx + 1}/${combos.length}`;
                    counter.style.display = 'block';
                } else {
                    counter.style.display = 'none';
                }
            } else {
                cardEl.querySelector('.combo-counter').style.display = 'none';
            }

            if (eSel) cardEl.classList.add('selected-e');
            if (pSel && eSel) cardEl.classList.add('clash');

            if (isSelecting) {
                if (currentState.subPhase === 'locked') {
                    cardEl.classList.add('dimmed');
                    cardEl.onclick = null;
                } else {
                    let canSelect = false;
                    if (!pSel) {
                        const combos = Logic.getCombos(pool, model.pUsedIndices, obj.comboType || obj.id, obj);
                        if (combos.length > 0) canSelect = true;
                    }
                    if (pSel || canSelect) {
                        if (canSelect) cardEl.classList.add('selectable');
                        cardEl.onclick = (e) => {
                            if (!e.target.closest('.condition-tag')) {
                                currentState.handleInput('selectCard', {obj});
                            }
                        };
                    } else {
                        cardEl.classList.add('dimmed');
                        cardEl.onclick = null;
                    }
                }
            } else {
                cardEl.onclick = null;
            }
        }
    },

    renderButtons() {
        const rerollBtn = document.getElementById('btn-reroll');
        const actionBtn = document.getElementById('btn-action');

        // Reset defaults
        rerollBtn.disabled = true;
        rerollBtn.style.display = 'flex'; 
        
        actionBtn.disabled = true;
        actionBtn.innerHTML = `LOCK HAND<br><span class="btn-sub">WAITING</span>`;
        actionBtn.className = "btn-action big-btn";
        actionBtn.style.display = 'flex';

        if (currentState instanceof PlayerRollState) {
            rerollBtn.disabled = (!currentState.isFirst && model.pRerolls <= 0);
            const rerollText = currentState.isFirst ? t('roll_btn') : `${t('reroll_btn')}`;
            const rerollSub = currentState.isFirst ? 'START' : `x${model.pRerolls}`;
            rerollBtn.innerHTML = `${rerollText}<br><span class="btn-sub">${rerollSub}</span>`;
            
            actionBtn.disabled = currentState.isFirst; 
            actionBtn.innerHTML = `${t('lock_btn')}<br><span class="btn-sub">CONFIRM</span>`;
            actionBtn.className = "btn-action big-btn confirm"; 

        } else if (currentState instanceof SelectionState) {
            rerollBtn.disabled = true; 
            rerollBtn.innerHTML = `REROLL<br><span class="btn-sub">--</span>`;
            
            actionBtn.disabled = false;
            
            if (currentState.noMove) {
                actionBtn.innerHTML = `${t('skip_btn')}<br><span class="btn-sub">NO MOVES</span>`;
                actionBtn.className = "btn-action big-btn danger";
            } else {
                actionBtn.className = "btn-action big-btn confirm";
                if (model.initiative === 'enemy') actionBtn.innerHTML = `${t('confirm_fight_btn')}<br><span class="btn-sub">CLASH</span>`;
                else actionBtn.innerHTML = `${t('end_turn_btn')}<br><span class="btn-sub">PASS TURN</span>`;
            }
            
            if (currentState.subPhase === 'locked') actionBtn.disabled = true;

        } else if (currentState instanceof TargetingState) {
            rerollBtn.disabled = true;
            
            actionBtn.disabled = false;
            actionBtn.innerHTML = `CANCEL<br><span class="btn-sub">BACK</span>`;
            actionBtn.className = "btn-action big-btn danger";
        }
    },

    log(msg, cls='') {
        const el = document.getElementById('log');
        if(el) {
            el.innerHTML += `<div class="log-entry ${cls}">${msg}</div>`;
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        }
    },

    showDeck() {
        model.paused = true;
        const groups = {};
        model.deck.forEach(c => {
            const key = c.comboType || c.id; 
            if (!groups[key]) {
                groups[key] = {
                    name: cName(key),
                    dmg: c.dmg,
                    count: 0,
                    sortOrder: c.dmg
                };
            }
            groups[key].count++;
        });
        const sortedGroups = Object.values(groups).sort((a, b) => {
            if (a.dmg !== b.dmg) return a.dmg - b.dmg;
            return a.name.length - b.name.length; 
        });
        const tbody = document.getElementById('deck-stats-content');
        tbody.innerHTML = '';
        sortedGroups.forEach(info => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${info.name}</td><td class="dmg-text">${info.dmg}</td><td><span class="count-badge">${info.count}</span></td>`;
            tbody.appendChild(row);
        });
        document.getElementById('deck-modal').style.display = 'flex';
    }
};

// ============================================================================
// 6. BOOTSTRAP
// ============================================================================
UIManager.init();
bus.emit('changeState', new MenuState(model));