
/**
 * 麻将数据定义
 */
const SUITS = {
    WAN: 'wan',   // 万
    TIAO: 'tiao', // 条 (索)
    BING: 'bing', // 饼 (筒)
    ZI: 'zi'      // 字牌
};

const HONOR_TILES = {
    1: '东', 2: '南', 3: '西', 4: '北',
    5: '中', 6: '发', 7: '白'
};

let idCounter = 0;

// 关卡配置
const LEVEL_CONFIG = [
    { id: 1, name: "初入雀坛", target: 150, desc: "简单牌型即可过关" },
    { id: 2, name: "街坊切磋", target: 450, desc: "-" },
    { id: 3, name: "高手过招", target: 1200, desc: "-" },
    { id: 4, name: "雀王较量", target: 3500, desc: "-" },
    { id: 5, name: "雀圣试炼", target: 5000, desc: "-" },
    { id: 6, name: "雀神降世", target: 10000, desc: "BOSS" }
];

// 番种配置
const YAKU_CONFIG = {
    NoYaku: { name: "无役", chips: 20, mult: 2, desc: "未满足任何特定番型" },
    Tenpai: { name: "听牌", chips: 30, mult: 3, desc: "差一张牌胡牌 (本游戏简化为未胡牌但有面子)" }, // 逻辑待定
    Pinfu: { name: "平胡", chips: 40, mult: 4, desc: "由顺子组成的胡牌，无字牌" },
    Iipeiko: { name: "一杯口", chips: 50, mult: 5, desc: "同花色两个相同的顺子" },
    Tanyao: { name: "断幺九", chips: 50, mult: 5, desc: "无幺九牌和字牌" },
    Toitoi: { name: "碰碰胡", chips: 60, mult: 6, desc: "由刻子或杠子组成的胡牌" },
    SevenPairs: { name: "七小对", chips: 70, mult: 7, desc: "七个对子" },
    Honitsu: { name: "混一色", chips: 90, mult: 9, desc: "由一种花色和字牌组成" }, // 用户表里没有混一色，但有清一色。保留混一色作为中间档？用户表没提，暂且保留或调整
    Chinitsu: { name: "清一色", chips: 100, mult: 10, desc: "由一种花色组成" },
    Kokushi: { name: "国士无双", chips: 130, mult: 13, desc: "十三幺 (19万筒条+7字牌)" }
};

// Buff 定义
const BUFF_DEFINITIONS = [
    { id: 1, name: "锦上添花", desc: "任何胡牌牌型，筹码固定加50", type: "score", effect: (ctx) => { if(ctx.yaku.length > 0 && !ctx.yaku.includes("无役")) ctx.chips += 50; } },
    { id: 2, name: "断金之利", desc: "若牌型包含“断幺九”，总倍率乘1.5", type: "score", effect: (ctx) => { if(ctx.yaku.includes("断幺九")) ctx.mult *= 1.5; } },
    { id: 3, name: "气贯长虹", desc: "每一张“条子”牌额外提供加10筹码", type: "score", effect: (ctx) => { ctx.hand.forEach(t => { if(t.suit === SUITS.TIAO) ctx.chips += 10; }); } },
    { id: 4, name: "万象更新", desc: "每一张“万字”牌额外提供加10筹码", type: "score", effect: (ctx) => { ctx.hand.forEach(t => { if(t.suit === SUITS.WAN) ctx.chips += 10; }); } },
    { id: 5, name: "圆圆满满", desc: "每一张“筒子”牌额外提供加10筹码", type: "score", effect: (ctx) => { ctx.hand.forEach(t => { if(t.suit === SUITS.BING) ctx.chips += 10; }); } },
    { id: 6, name: "步步高升", desc: "牌组中每包含一个“顺子”，加2倍率", type: "score", effect: (ctx) => { ctx.mult += (ctx.sequences || 0) * 2; } },
    { id: 7, name: "大显身手", desc: "牌组中每包含一个“刻子”，加3倍率", type: "score", effect: (ctx) => { ctx.mult += (ctx.triplets || 0) * 3; } },
    { id: 8, name: "七星报喜", desc: "若牌型为“七对子”，总倍率乘3", type: "score", effect: (ctx) => { if(ctx.yaku.includes("七小对")) ctx.mult *= 3; } },
    { id: 9, name: "清风徐来", desc: "每一张“风牌（东、南、西、北）”额外提供加30筹码", type: "score", effect: (ctx) => { 
        ctx.hand.forEach(t => { if(t.suit === SUITS.ZI && t.value <= 4) ctx.chips += 30; });
    }},
    { id: 10, name: "龙吟凤鸣", desc: "所有的“箭牌（中发白）”每张提供乘1.2的独立倍率", type: "score", effect: (ctx) => { 
        ctx.hand.forEach(t => { if(t.suit === SUITS.ZI && t.value >= 5) ctx.mult = Math.floor(ctx.mult * 1.2); });
    }},
    { id: 11, name: "顺水推舟", desc: "本局中每执行一次“弃牌”，该局后续所有出牌加5筹码", type: "score", effect: (ctx) => { ctx.chips += (ctx.game.discardsUsedThisRound || 0) * 5; } },
    { id: 12, name: "否极泰来", desc: "仅剩最后一次出牌机会时，该手牌倍率乘3", type: "score", effect: (ctx) => { if(ctx.game.handsCount === 1) ctx.mult *= 3; } },
    { id: 13, name: "点石成金", desc: "所有的“幺九牌”（1 和 9）额外提供加25筹码", type: "score", effect: (ctx) => { 
        ctx.hand.forEach(t => { if(t.isTerminal()) ctx.chips += 25; });
    }},
    { id: 14, name: "偷天换日", desc: "弃牌时，有 20% 概率不消耗弃牌次数", type: "discard", effect: (ctx) => { 
        if(Math.random() < 0.2) { ctx.consume = false; ctx.game.showMessage("偷天换日生效！不消耗弃牌次数"); }
    }},
    { id: 15, name: "如虎添翼", desc: "每一关的第一手出牌，基础倍率固定加10倍率", type: "score", effect: (ctx) => { if(ctx.game.handsPlayedThisRound === 0) ctx.mult += 10; } },
    { id: 16, name: "多多益善", desc: "每一关的初始换牌次数加5次", type: "roundStart", effect: (ctx) => { ctx.game.discardsCount += 5; } },
    { id: 17, name: "以和为贵", desc: "牌型为无役或听牌时加200筹码", type: "score", effect: (ctx) => { if(ctx.yaku.includes("无役") || ctx.yaku.includes("听牌")) ctx.chips += 200; } },
    { id: 18, name: "金蝉脱壳", desc: "允许玩家在关卡中手动刷新一次手牌（每关限一次）", type: "active", effect: (ctx) => { /* 逻辑在 Game 类中处理 */ } },
    { id: 19, name: "四海升平", desc: "若手牌同时包含万、条、饼三种花色，倍率乘2", type: "score", effect: (ctx) => { 
        const suits = new Set(ctx.hand.map(t => t.suit));
        if(suits.has(SUITS.WAN) && suits.has(SUITS.TIAO) && suits.has(SUITS.BING)) ctx.mult *= 2;
    }},
    { id: 20, name: "截胡之势", desc: "每一局的第一手出牌，筹码加100", type: "score", effect: (ctx) => { if(ctx.game.handsPlayedThisRound === 0) ctx.chips += 100; } }
];

class MahjongTile {
    constructor(suit, value, id) {
        this.suit = suit;
        this.value = value;
        this.id = id;
    }

    getDisplay() {
        if (this.suit === SUITS.ZI) {
            const honorMap = {
                1: '🀀', 2: '🀁', 3: '🀂', 4: '🀃',
                5: '🀄', 6: '🀅', 7: '🀆'
            };
            return honorMap[this.value];
        }
        
        const offsetMap = {
            [SUITS.WAN]: 0x1F007,
            [SUITS.TIAO]: 0x1F010,
            [SUITS.BING]: 0x1F019
        };
        
        const codePoint = offsetMap[this.suit] + (this.value - 1);
        return String.fromCodePoint(codePoint);
    }

    isTerminal() {
        return this.value === 1 || this.value === 9;
    }
}

class Game {
    constructor() {
        this.deck = [];
        this.hand = [];
        this.discardPile = []; // 弃牌堆
        this.selectedIndices = new Set();
        this.newTileIds = new Set();
        
        // 游戏状态
        this.currentRoundIndex = 0;
        this.roundScore = 0;
        this.handsCount = 3;
        this.discardsCount = 3;
        this.playerBuffs = [];
        
        // 统计
        this.handsPlayedThisRound = 0;
        this.discardsUsedThisRound = 0;

        // UI 绑定
        this.bindEvents();
    }

    bindEvents() {
        // 首页
        document.getElementById('start-game-btn').onclick = () => this.startGame();
        
        // 游戏操作
        document.getElementById('exchange-btn').onclick = () => this.exchangeCards();
        document.getElementById('check-btn').onclick = () => this.playHand();
        document.getElementById('refresh-btn').onclick = () => this.refreshHand();
        document.getElementById('deck-view-btn').onclick = () => this.openDeckPreview();
        document.getElementById('close-deck-btn').onclick = () => this.closeDeckPreview();
        document.getElementById('view-yaku-btn').onclick = () => this.openYakuModal();
        document.getElementById('close-yaku-btn').onclick = () => this.closeYakuModal();
        
        // 牌的点击事件委托
        document.getElementById('hand-container').onclick = (e) => {
            const tileEl = e.target.closest('.tile');
            if (tileEl) {
                const idx = parseInt(tileEl.dataset.index);
                this.toggleSelection(idx);
            }
        };

        // 商店
        document.getElementById('skip-shop-btn').onclick = () => this.nextLevel();
        
        // 游戏结束
        document.getElementById('restart-btn').onclick = () => this.returnToStartScreen();

        // 认证相关事件绑定
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                const nickname = document.getElementById('nickname-input').value;
                const password = document.getElementById('password-input').value;
                const msg = document.getElementById('auth-msg');
                
                if (!nickname || !password) {
                    msg.textContent = "请输入昵称和密码";
                    return;
                }
                
                msg.textContent = "登录中...";
                const { error } = await authManager.signIn(nickname, password);
                if (error) {
                    console.error("Login error:", error);
                    if (error.message.includes("Email not confirmed")) {
                        msg.innerHTML = "登录失败：账号未验证。<br>请联系管理员或稍后重试。";
                        msg.style.color = "#e74c3c";
                    } else if (error.message.includes("Invalid login credentials")) {
                        msg.textContent = "登录失败：昵称或密码错误";
                    } else {
                        msg.textContent = "登录失败：" + error.message;
                    }
                } else {
                    msg.textContent = "";
                    // 成功后 authManager 会自动更新 UI
                }
            });
        }

        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', async () => {
                const nickname = document.getElementById('nickname-input').value;
                const password = document.getElementById('password-input').value;
                const msg = document.getElementById('auth-msg');
                
                if (!nickname || !password) {
                    msg.textContent = "请输入昵称和密码";
                    return;
                }
                
                msg.textContent = "注册中...";
                const { error } = await authManager.signUp(nickname, password);
                if (error) {
                    msg.textContent = error.message;
                } else {
                    msg.textContent = "注册成功！请登录。";
                }
            });
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await authManager.signOut();
            });
        }

        // 个人中心设置
        const changeNicknameBtn = document.getElementById('change-nickname-btn');
        if (changeNicknameBtn) {
            changeNicknameBtn.onclick = () => {
                document.getElementById('nickname-modal').style.display = 'flex';
            };
        }
        
        const confirmNicknameBtn = document.getElementById('confirm-nickname-btn');
        if (confirmNicknameBtn) {
            confirmNicknameBtn.onclick = async () => {
                const newNickname = document.getElementById('new-nickname-input').value;
                if(!newNickname) return;
                
                confirmNicknameBtn.textContent = "修改中...";
                const { error } = await authManager.changeNickname(newNickname);
                
                if(error) {
                    alert("修改失败: " + error.message);
                } else {
                    alert("修改成功！请使用新昵称重新登录。"); 
                    await authManager.signOut();
                    document.getElementById('nickname-modal').style.display = 'none';
                }
                confirmNicknameBtn.textContent = "确认";
            };
        }

        const cancelNicknameBtn = document.getElementById('cancel-nickname-btn');
        if (cancelNicknameBtn) {
            cancelNicknameBtn.onclick = () => {
                document.getElementById('nickname-modal').style.display = 'none';
            };
        }

        const changePasswordBtn = document.getElementById('change-password-btn');
        if (changePasswordBtn) {
            changePasswordBtn.onclick = () => {
                document.getElementById('password-modal').style.display = 'flex';
            };
        }

        const confirmPasswordBtn = document.getElementById('confirm-password-btn');
        if (confirmPasswordBtn) {
            confirmPasswordBtn.onclick = async () => {
                const newPassword = document.getElementById('new-password-input').value;
                if(!newPassword) return;

                confirmPasswordBtn.textContent = "修改中...";
                const { error } = await authManager.changePassword(newPassword);
                
                if(error) {
                    alert("修改失败: " + error.message);
                } else {
                    alert("密码修改成功！");
                    document.getElementById('password-modal').style.display = 'none';
                }
                confirmPasswordBtn.textContent = "确认";
            };
        }

        const cancelPasswordBtn = document.getElementById('cancel-password-btn');
        if (cancelPasswordBtn) {
            cancelPasswordBtn.onclick = () => {
                document.getElementById('password-modal').style.display = 'none';
            };
        }
    }

    openYakuModal() {
        const modal = document.getElementById('yaku-modal');
        const tbody = document.getElementById('yaku-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        Object.values(YAKU_CONFIG).forEach(yaku => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${yaku.name}</td>
                <td>${yaku.chips}</td>
                <td>${yaku.mult}</td>
                <td>${yaku.desc || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        
        modal.style.display = 'flex';
    }

    closeYakuModal() {
        const modal = document.getElementById('yaku-modal');
        if (modal) modal.style.display = 'none';
    }

    returnToStartScreen() {
        // 隐藏所有模态框
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        // 切换到首页
        this.switchScreen('start-screen');
    }

    startGame() {
        this.currentRoundIndex = 0;
        this.playerBuffs = [];
        this.switchScreen('game-screen');
        this.startLevel();
    }

    startLevel() {
        const config = LEVEL_CONFIG[this.currentRoundIndex];
        if (!config) {
            // 通关所有关卡
            this.showGameOver(true);
            return;
        }

        // 初始化关卡状态
        this.roundScore = 0;
        this.handsCount = 3; // 默认出牌次数
        this.discardsCount = 10; // 默认换牌次数
        this.handsPlayedThisRound = 0;
        this.discardsUsedThisRound = 0;
        this.refreshHandUsed = false;
        
        // 应用 RoundStart Buff
        this.triggerBuffs('roundStart', { game: this });

        // UI 更新
        document.getElementById('current-round').textContent = `${config.name} (Round ${config.id})`;
        document.getElementById('target-score').textContent = config.target;
        
        if (config.id === 5) {
            document.body.classList.add('boss-round');
        } else {
            document.body.classList.remove('boss-round');
        }

        this.initDeck();
        this.dealHand();
        this.newTileIds.clear(); // 新的回合开始，不显示高亮
        this.render();
    }

    initDeck() {
        this.deck = [];
        [SUITS.WAN, SUITS.TIAO, SUITS.BING].forEach(suit => {
            for (let v = 1; v <= 9; v++) {
                for (let k = 0; k < 4; k++) {
                    this.deck.push(new MahjongTile(suit, v, idCounter++));
                }
            }
        });
        for (let v = 1; v <= 7; v++) {
            for (let k = 0; k < 4; k++) {
                this.deck.push(new MahjongTile(SUITS.ZI, v, idCounter++));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealHand() {
        this.hand = this.deck.splice(0, 14);
        this.sortHand();
        this.selectedIndices.clear();
        this.updateScoreUI(0, 0, 0, []); 
        this.updateStatsUI();
    }

    sortHand() {
        const suitOrder = { [SUITS.WAN]: 1, [SUITS.TIAO]: 2, [SUITS.BING]: 3, [SUITS.ZI]: 4 };
        this.hand.sort((a, b) => {
            if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
            return a.value - b.value;
        });
    }

    toggleSelection(idx) {
        if (this.selectedIndices.has(idx)) {
            this.selectedIndices.delete(idx);
        } else {
            // 换牌限制：一次最多选3张
            if (this.selectedIndices.size >= 3) {
                this.showMessage("一次最多只能换3张牌！");
                return;
            }
            this.selectedIndices.add(idx);
        }
        this.render();
    }

    // 弃牌逻辑
    exchangeCards() {
        if (this.discardsCount <= 0) {
            this.showMessage("弃牌次数已用完！");
            return;
        }
        if (this.selectedIndices.size === 0) return;

        // Buff 检测：是否消耗弃牌次数
        let consumeDiscard = true;
        this.triggerBuffs('discard', { 
            game: this, 
            consume: consumeDiscard, 
            setConsume: (val) => { consumeDiscard = val; } 
        });

        if (consumeDiscard) {
            this.discardsCount--;
        }
        this.discardsUsedThisRound++;

        const indices = Array.from(this.selectedIndices).sort((a, b) => b - a);
        
        // 将弃掉的牌加入弃牌堆
        indices.forEach(idx => {
            this.discardPile.push(this.hand[idx]);
        });
        
        // 从手牌移除
        indices.forEach(idx => this.hand.splice(idx, 1));

        const drawCount = indices.length;
        
        // 检查牌堆是否足够，不足则洗入弃牌堆
        if (this.deck.length < drawCount) {
            if (this.discardPile.length > 0) {
                this.deck.push(...this.discardPile);
                this.discardPile = [];
                this.shuffle();
                this.showMessage("牌堆耗尽，弃牌堆已重洗！");
            } else {
                // 极端情况：牌堆和弃牌堆都不够
                this.initDeck(); // 强制重置牌堆作为兜底
                this.showMessage("牌堆重置！");
            }
        }
        
        const newTiles = this.deck.splice(0, drawCount);
        this.newTileIds.clear();
        newTiles.forEach(t => this.newTileIds.add(t.id));

        // 确保新抽到的牌在加入手牌前不会被旧逻辑影响
        // 注意：newTiles 中的对象是新创建的引用
        
        this.hand.push(...newTiles);
        this.sortHand();
        this.selectedIndices.clear();
        
        // 强制重新渲染，确保 DOM 完全更新
        const container = document.getElementById('hand-container');
        if (container) container.innerHTML = '';
        
        this.render();
        this.renderDeckPreview();
        this.updateStatsUI();
    }

    // 刷新手牌 (Buff 23)
    refreshHand() {
        if (this.refreshHandUsed) return;
        
        // 将手牌洗回牌堆
        this.deck.push(...this.hand);
        this.shuffle();
        
        // 重新发牌
        this.newTileIds.clear(); // 清除高亮
        this.hand = this.deck.splice(0, 14);
        this.sortHand();
        this.selectedIndices.clear();
        
        this.refreshHandUsed = true;
        this.render();
        this.renderDeckPreview();
        this.updateStatsUI();
        this.showMessage("手牌已刷新！");
    }

    // 出牌逻辑 (Play/Score)
    playHand() {
        if (this.isProcessing) return;
        if (this.handsCount <= 0) {
            this.showMessage("出牌次数已用完！");
            return;
        }

        this.isProcessing = true;
        this.handsCount--; // 立即扣除次数
        this.updateStatsUI();

        const result = this.calculateScore();
        
        // 动画效果
        this.animateScore(result.chips, result.mult, result.total, () => {
            this.roundScore += result.total;
            this.handsPlayedThisRound++;
            
            // 重置换牌次数
            this.discardsCount = 10;

            // 重新发牌 (模拟弃掉所有手牌并重抽)
            // 如果牌堆不足，重新洗牌
            if (this.deck.length < 14) {
                this.initDeck();
            }
            this.dealHand();
            this.newTileIds.clear(); // 出牌后重置高亮

            this.updateStatsUI();
            
            // 检查过关
            const target = LEVEL_CONFIG[this.currentRoundIndex].target;
            if (this.roundScore >= target) {
                setTimeout(() => this.openShop(), 1000);
            } else if (this.handsCount === 0) {
                setTimeout(() => this.showGameOver(false), 1000);
            }
            
            this.isProcessing = false;
        });
    }

    calculateScore() {
        let chips = 0;
        let mult = 0;
        let yakuList = [];
        
        // 基础牌型检测
        const yakuResult = this.detectYaku();
        yakuList = yakuResult.names;
        chips += yakuResult.chips;
        mult += yakuResult.mult;

        // 上下文对象
        const context = {
            game: this,
            hand: this.hand,
            yaku: yakuList,
            chips: chips,
            mult: mult,
            sequences: yakuResult.sequences,
            triplets: yakuResult.triplets
        };

        // 应用 Buff
        this.triggerBuffs('score', context);

        // 回写
        chips = context.chips;
        mult = context.mult;
        
        // 保证最小倍率
        if (mult < 1) mult = 1;

        return {
            chips: Math.floor(chips),
            mult: Math.floor(mult),
            total: Math.floor(chips * mult),
            yaku: yakuList
        };
    }

    detectYaku() {
        let chips = 0;
        let mult = 0; // 基础倍率为0，由番种提供
        let names = [];
        
        // 0. 判断是否胡牌 (标准胡牌 或 七对子 或 国士无双)
        const isSevenPairs = this.isSevenPairs(this.hand);
        const isStandardWin = this.canWinStandard(this.hand);
        const isKokushi = this.isKokushi(this.hand);
        
        // 如果未胡牌，检查是否听牌
        if (!isSevenPairs && !isStandardWin && !isKokushi) {
            if (this.isTenpai(this.hand)) {
                return {
                    chips: YAKU_CONFIG.Tenpai.chips,
                    mult: YAKU_CONFIG.Tenpai.mult,
                    names: ["听牌"],
                    sequences: 0,
                    triplets: 0
                };
            }

            return {
                chips: YAKU_CONFIG.NoYaku.chips,
                mult: YAKU_CONFIG.NoYaku.mult,
                names: ["无役"],
                sequences: 0,
                triplets: 0
            };
        }

        // 简单分解用于统计顺子刻子 (仅当标准胡牌时有效，七对子不需要分解)
        let analysis = { triplets: 0, sequences: 0, pairs: 0 };
        if (isStandardWin) {
            // 这里使用更准确的 decomposeWinHand 来获取面子信息，如果性能允许
            // 为了简单，我们先用旧的 decomposeHand，或者改进它
            analysis = this.decomposeHand(this.hand);
        }
        
        // 1. 断幺九
        if (this.isTanyao()) {
            chips += YAKU_CONFIG.Tanyao.chips;
            mult += YAKU_CONFIG.Tanyao.mult;
            names.push("断幺九");
        }
        // 2. 清一色
        if (this.isChinitsu()) {
            chips += YAKU_CONFIG.Chinitsu.chips;
            mult += YAKU_CONFIG.Chinitsu.mult;
            names.push("清一色");
        } else if (this.isHonitsu()) {
            chips += YAKU_CONFIG.Honitsu.chips;
            mult += YAKU_CONFIG.Honitsu.mult;
            names.push("混一色");
        }
        // 3. 七对子
        if (isSevenPairs) {
            chips += YAKU_CONFIG.SevenPairs.chips;
            mult += YAKU_CONFIG.SevenPairs.mult;
            names.push("七对子");
        }
        // 4. 对对胡 (必须是标准胡牌型)
        if (isStandardWin && this.isToitoi()) {
            chips += YAKU_CONFIG.Toitoi.chips;
            mult += YAKU_CONFIG.Toitoi.mult;
            names.push("对对胡");
        }
        // 5. 平胡 (必须是标准胡牌型)
        if (isStandardWin && this.isPinfu()) {
            chips += YAKU_CONFIG.Pinfu.chips;
            mult += YAKU_CONFIG.Pinfu.mult;
            names.push("平胡");
        }
        // 6. 国士无双
        if (isKokushi) {
            chips += YAKU_CONFIG.Kokushi.chips;
            mult += YAKU_CONFIG.Kokushi.mult;
            names.push("国士无双");
        }

        // 基础分修正：虽然胡了但没凑出上述番种 (例如单纯的屁胡)
        if (names.length === 0) {
            chips += 20;
            mult += 1;
            names.push("鸡胡");
        }

        return {
            chips,
            mult,
            names,
            sequences: analysis.sequences,
            triplets: analysis.triplets
        };
    }

    // 听牌判断：去掉任意一张牌后，剩下的 13 张牌能够通过“加一张任意牌”组成胡牌型
    isTenpai(hand) {
        if (hand.length !== 14) return false;

        // 尝试打出每一张牌
        for (let i = 0; i < hand.length; i++) {
            const remainingTiles = [...hand];
            remainingTiles.splice(i, 1); // 剩下 13 张

            // 遍历所有可能的 34 种牌
            // 万、条、饼 (1-9)
            const suits = [SUITS.WAN, SUITS.TIAO, SUITS.BING];
            for (const suit of suits) {
                for (let val = 1; val <= 9; val++) {
                    if (this.checkWinWithAddedTile(remainingTiles, suit, val)) return true;
                }
            }
            // 字牌 (1-7)
            for (let val = 1; val <= 7; val++) {
                if (this.checkWinWithAddedTile(remainingTiles, SUITS.ZI, val)) return true;
            }
        }
        return false;
    }

    checkWinWithAddedTile(tiles13, suit, val) {
        const newTile = new MahjongTile(suit, val, -1);
        const tiles14 = [...tiles13, newTile];
        
        // 检查各种胡牌型
        if (this.canWinStandard(tiles14)) return true;
        if (this.isSevenPairs(tiles14)) return true;
        if (this.isKokushi(tiles14)) return true;
        
        return false;
    }

    // 国士无双判定
    isKokushi(hand) {
        if (hand.length !== 14) return false;
        const terminals = new Set();
        let hasNonTerminal = false;
        
        hand.forEach(t => {
            if (t.isTerminal() || t.suit === SUITS.ZI) {
                terminals.add(`${t.suit}-${t.value}`);
            } else {
                hasNonTerminal = true;
            }
        });
        
        // 必须全是幺九牌，且有13种不同的
        return !hasNonTerminal && terminals.size === 13;
    }

    // 标准胡牌判定 (4面子 + 1雀头)
    // mode: 'any' (任意), 'sequence_only' (全顺子), 'triplet_only' (全刻子)
    canWinStandard(hand, mode = 'any') {
        if (hand.length % 3 !== 2) return false;
        
        // 按花色分组
        const suits = {};
        hand.forEach(t => {
            if (!suits[t.suit]) suits[t.suit] = [];
            suits[t.suit].push(t.value);
        });

        // 雀头只能在其中一个花色里
        // 尝试把每一对作为雀头
        
        const suitKeys = Object.keys(suits);
        
        // 先检查基本张数条件
        for (const s of suitKeys) {
            suits[s].sort((a, b) => a - b);
        }

        // 寻找雀头所在的花色
        let pairSuit = null;
        for (const s of suitKeys) {
            if (suits[s].length % 3 === 2) {
                if (pairSuit) return false; // 只能有一个花色余2
                pairSuit = s;
            } else if (suits[s].length % 3 !== 0) {
                return false; // 其他花色必须是3的倍数
            }
        }
        
        if (!pairSuit) return false;

        // 验证非雀头花色是否全由面子组成
        for (const s of suitKeys) {
            if (s !== pairSuit) {
                if (!this.checkMentsu(suits[s], mode)) return false;
            }
        }

        // 验证雀头花色
        // 尝试移除每一对，看剩下的是否组成面子
        const tiles = suits[pairSuit];
        const uniqueTiles = [...new Set(tiles)];
        
        for (const val of uniqueTiles) {
            if (this.count(tiles, val) >= 2) {
                // 移除一对
                const remaining = this.removeTiles(tiles, [val, val]);
                if (this.checkMentsu(remaining, mode)) return true;
            }
        }

        return false;
    }

    // 检查一组牌是否全由面子(顺子/刻子)组成
    checkMentsu(tiles, mode = 'any') {
        if (tiles.length === 0) return true;
        
        // 尝试移除第一个刻子
        const first = tiles[0];
        if (mode !== 'sequence_only' && this.count(tiles, first) >= 3) {
            const remaining = this.removeTiles(tiles, [first, first, first]);
            if (this.checkMentsu(remaining, mode)) return true;
        }
        
        // 尝试移除第一个顺子
        if (mode !== 'triplet_only' && this.includes(tiles, first + 1) && this.includes(tiles, first + 2)) {
            const remaining = this.removeTiles(tiles, [first, first + 1, first + 2]);
            if (this.checkMentsu(remaining, mode)) return true;
        }
        
        return false;
    }

    // 辅助工具：计数
    count(arr, val) {
        return arr.filter(x => x === val).length;
    }

    // 辅助工具：包含
    includes(arr, val) {
        return arr.includes(val);
    }

    // 辅助工具：移除牌 (不改变原数组，返回新数组)
    removeTiles(arr, toRemove) {
        const newArr = [...arr];
        for (const val of toRemove) {
            const idx = newArr.indexOf(val);
            if (idx !== -1) newArr.splice(idx, 1);
        }
        return newArr;
    }

    // 辅助判定函数
    isTanyao() {
        return this.hand.every(t => !t.isTerminal() && t.suit !== SUITS.ZI);
    }

    isChinitsu() {
        const firstSuit = this.hand[0].suit;
        return this.hand.every(t => t.suit === firstSuit) && firstSuit !== SUITS.ZI;
    }

    isHonitsu() {
        const suits = new Set(this.hand.map(t => t.suit));
        return suits.has(SUITS.ZI) && suits.size === 2; // 字牌 + 另一种花色
    }

    isSevenPairs(hand) {
        // 简单判断：排序后两两相同，且有7对
        // 注意：不考虑四张一样算两对的情况，这里简化处理
        const sortedHand = [...hand].sort((a, b) => {
            if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
            return a.value - b.value;
        });

        let pairs = 0;
        for (let i = 0; i < sortedHand.length - 1; i += 2) {
            if (sortedHand[i].value === sortedHand[i+1].value && sortedHand[i].suit === sortedHand[i+1].suit) {
                pairs++;
            }
        }
        return pairs === 7;
    }

    isToitoi() {
        // 对对胡：必须是标准胡牌型，且全由刻子组成 (雀头除外)
        // 使用 tripet_only 模式检查
        return this.canWinStandard(this.hand, 'triplet_only');
    }

    isPinfu() {
        // 平胡：必须是标准胡牌型，全由顺子组成，且雀头非字牌 (这里简化判定)
        // 使用 sequence_only 模式检查
        if (this.hand.some(t => t.suit === SUITS.ZI)) return false; // 平胡无字牌
        return this.canWinStandard(this.hand, 'sequence_only');
    }

    // 面子分解 (简化版，贪心算法，用于 Buff 统计)
    decomposeHand(hand) {
        // 深拷贝并排序
        let tiles = [...hand].sort((a, b) => {
            if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
            return a.value - b.value;
        });

        let triplets = 0;
        let sequences = 0;
        let pairs = 0;

        // 优先找刻子
        let i = 0;
        while (i < tiles.length - 2) {
            if (tiles[i].suit === tiles[i+1].suit && tiles[i].suit === tiles[i+2].suit &&
                tiles[i].value === tiles[i+1].value && tiles[i].value === tiles[i+2].value) {
                triplets++;
                tiles.splice(i, 3);
            } else {
                i++;
            }
        }
        
        // 找顺子 (对剩余的牌)
        // 使用频率表来查找顺子，避免数组索引问题
        const counts = {};
        tiles.forEach(t => {
            const key = `${t.suit}-${t.value}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        
        [SUITS.WAN, SUITS.TIAO, SUITS.BING].forEach(suit => {
            for (let v = 1; v <= 7; v++) {
                const k1 = `${suit}-${v}`;
                const k2 = `${suit}-${v+1}`;
                const k3 = `${suit}-${v+2}`;
                
                while (counts[k1] > 0 && counts[k2] > 0 && counts[k3] > 0) {
                    sequences++;
                    counts[k1]--;
                    counts[k2]--;
                    counts[k3]--;
                }
            }
        });
        
        return { triplets, sequences, pairs };
    }

    triggerBuffs(type, context) {
        this.playerBuffs.forEach(buff => {
            if (buff.type === type || (type === 'score' && buff.type === 'rule')) {
                buff.effect(context);
            }
        });
    }

    // 商店逻辑
    openShop() {
        const modal = document.getElementById('shop-modal');
        const container = document.getElementById('shop-cards');
        container.innerHTML = '';

        // 随机选 5 个未拥有的 Buff
        const availableBuffs = BUFF_DEFINITIONS.filter(b => !this.playerBuffs.find(pb => pb.id === b.id));
        const shopItems = this.getRandomItems(availableBuffs, 5);

        shopItems.forEach(buff => {
            const card = document.createElement('div');
            card.className = 'shop-card';
            card.innerHTML = `
                <h4>${buff.name}</h4>
                <p>${buff.desc}</p>
                <div class="cost">免费</div>
            `;
            card.onclick = () => {
                this.playerBuffs.push(buff);
                this.renderBuffs();
                this.nextLevel();
            };
            container.appendChild(card);
        });

        modal.style.display = 'block';
    }

    nextLevel() {
        document.getElementById('shop-modal').style.display = 'none';
        this.currentRoundIndex++;
        this.startLevel();
    }

    getRandomItems(arr, n) {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    }

    // 渲染相关
    render() {
        const container = document.getElementById('hand-container');
        container.innerHTML = '';
        
        this.hand.forEach((tile, index) => {
            const el = document.createElement('div');
            el.className = `tile suit-${tile.suit} ${this.selectedIndices.has(index) ? 'selected' : ''}`;
            
            if (this.newTileIds.has(tile.id)) {
                el.classList.add('highlight-new');
            }

            el.dataset.suit = tile.suit;
            el.dataset.index = index;
            
            const content = document.createElement('span');
            content.className = 'suit-char';
            content.textContent = tile.getDisplay();
            
            el.appendChild(content);
            container.appendChild(el);
        });

        this.updateStatsUI();
    }

    renderBuffs() {
        const container = document.getElementById('active-buffs');
        container.innerHTML = '';
        
        // 补齐 5 个空位
        for (let i = 0; i < 5; i++) {
            const buff = this.playerBuffs[i];
            const slot = document.createElement('div');
            slot.className = `buff-slot ${buff ? 'active' : 'empty'}`;
            slot.textContent = buff ? buff.name : '空';
            
            if (buff) {
                const tooltip = document.createElement('div');
                tooltip.className = 'buff-tooltip';
                tooltip.innerHTML = `<strong>${buff.name}</strong><br>${buff.desc}`;
                slot.appendChild(tooltip);
            }
            
            container.appendChild(slot);
        }
    }

    updateStatsUI() {
        document.getElementById('round-score').textContent = this.roundScore;
        document.getElementById('hands-count').textContent = this.handsCount;
        document.getElementById('discards-count').textContent = this.discardsCount;
        
        // 按钮状态
        document.getElementById('exchange-btn').disabled = this.discardsCount <= 0 || this.selectedIndices.size === 0;
        document.getElementById('check-btn').disabled = this.handsCount <= 0;
        
        // 刷新手牌按钮 (Buff 23)
        const hasRefreshBuff = this.playerBuffs.some(b => b.id === 23);
        const refreshBtn = document.getElementById('refresh-btn');
        if (hasRefreshBuff) {
            refreshBtn.style.display = 'inline-block';
            refreshBtn.disabled = this.refreshHandUsed;
            refreshBtn.textContent = this.refreshHandUsed ? '已刷新' : '刷新手牌';
            if (!this.refreshHandUsed) {
                // 简单的样式
                refreshBtn.style.backgroundColor = '#8e44ad'; 
            } else {
                refreshBtn.style.backgroundColor = '#95a5a6';
            }
        } else {
            refreshBtn.style.display = 'none';
        }

        // 更新按钮文本显示剩余次数
        document.getElementById('exchange-btn').textContent = `换牌 (${this.discardsCount})`;
        document.getElementById('check-btn').textContent = `出牌 (${this.handsCount})`;
    }

    updateScoreUI(chips, mult, total, yakuList) {
        document.getElementById('chips-value').textContent = chips;
        document.getElementById('mult-value').textContent = mult;
        document.getElementById('hand-score').textContent = total;
        
        const yakuContainer = document.getElementById('yaku-list');
        yakuContainer.innerHTML = '';
        yakuList.forEach(name => {
            const tag = document.createElement('span');
            tag.className = 'yaku-tag';
            tag.textContent = name;
            yakuContainer.appendChild(tag);
        });
    }

    animateScore(chips, mult, total, callback) {
        // 简单动画：直接更新，稍后优化数字滚动
        this.updateScoreUI(chips, mult, total, this.detectYaku().names);
        
        // 延迟回调
        setTimeout(callback, 500);
    }

    showMessage(msg) {
        // 简单弹窗或 Toast
        alert(msg);
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    showGameOver(isWin) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); display: flex; align-items: center;
            justify-content: center; z-index: 2000; backdrop-filter: blur(8px);
        `;

        const content = `
            <div class="modal-content" style="text-align: center; padding: 40px; background: #2c3e50; border-radius: 20px; border: 2px solid #e67e22;">
                <h2 style="font-size: 3rem; color: ${isWin ? '#2ecc71' : '#e74c3c'}; margin-bottom: 10px;">
                    ${isWin ? "🎉 恭喜通关！" : "💀 游戏结束"}
                </h2>
                <p style="font-size: 1.2rem; margin-bottom: 20px;">
                    ${isWin ? "你已成为真正的雀神遗珍传人！" : `止步于第 ${this.currentRoundIndex + 1} 关`}
                </p>
                <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                    <p style="margin: 0; color: #bdc3c7;">最终得分</p>
                    <p style="font-size: 2.5rem; font-weight: bold; color: #f1c40f; margin: 5px 0;">${this.roundScore}</p>
                </div>
                <button class="main-btn" onclick="location.reload()">返回主菜单</button>
            </div>
        `;
        
        modal.innerHTML = content;
        document.body.appendChild(modal);

        if (typeof authManager !== 'undefined') {
            const duration = Date.now() - (this.startTime || Date.now());
            authManager.updateGameStats(isWin, this.roundScore, duration);
        }
    }

    async showLeaderboard() {
        const modal = document.getElementById('leaderboard-modal');
        const list = document.getElementById('leaderboard-list');
        modal.style.display = 'flex';
        list.innerHTML = '<p style="text-align:center;">加载中...</p>';

        if (typeof authManager !== 'undefined') {
            const data = await authManager.fetchLeaderboard();
            if (data && data.length > 0) {
                list.innerHTML = '';
                data.forEach((item, index) => {
                    const div = document.createElement('div');
                    div.className = 'leaderboard-item';
                    
                    let rankIcon = index + 1;
                    if (index === 0) rankIcon = '🥇';
                    if (index === 1) rankIcon = '🥈';
                    if (index === 2) rankIcon = '🥉';

                    // 显示昵称，如果为空则显示ID前6位
                    const displayName = item.nickname || `玩家 ${item.user_id ? item.user_id.substring(0, 6) : '未知'}`;

                    div.innerHTML = `
                        <div class="leaderboard-rank">${rankIcon}</div>
                        <div class="leaderboard-name">${displayName}</div>
                        <div class="leaderboard-score">${item.high_score}</div>
                    `;
                    list.appendChild(div);
                });
            } else {
                list.innerHTML = '<p style="text-align:center;">暂无数据</p>';
            }
        } else {
            list.innerHTML = '<p style="text-align:center;">请先登录</p>';
        }
    }

    // 牌堆预览
    openDeckPreview() {
        document.getElementById('deck-modal').style.display = 'flex';
        this.renderDeckPreview();
    }

    closeDeckPreview() {
        document.getElementById('deck-modal').style.display = 'none';
    }

    renderDeckPreview() {
        const countEl = document.getElementById('deck-count');
        if (countEl) countEl.textContent = this.deck.length;

        const previewEl = document.getElementById('deck-preview');
        if (previewEl) {
            previewEl.innerHTML = '';
            
            const suitsConfig = [
                { id: SUITS.WAN, name: '万' },
                { id: SUITS.TIAO, name: '条' },
                { id: SUITS.BING, name: '饼' },
                { id: SUITS.ZI, name: '字' }
            ];

            suitsConfig.forEach(config => {
                const suitTiles = this.deck.filter(t => t.suit === config.id).sort((a, b) => a.value - b.value);
                
                if (suitTiles.length > 0) {
                    const row = document.createElement('div');
                    row.className = 'preview-row';
                    
                    const label = document.createElement('div');
                    label.className = 'preview-label';
                    label.textContent = config.name;
                    row.appendChild(label);

                    const tilesContainer = document.createElement('div');
                    tilesContainer.className = 'preview-tiles';

                    suitTiles.forEach(t => {
                        const span = document.createElement('div');
                        span.className = `mini-tile suit-${t.suit}`;
                        span.textContent = t.getDisplay();
                        tilesContainer.appendChild(span);
                    });

                    row.appendChild(tilesContainer);
                    previewEl.appendChild(row);
                }
            });
        }
    }
}

// 启动游戏
window.onload = () => {
    window.game = new Game();
};
