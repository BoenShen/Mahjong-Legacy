
// Supabase 客户端初始化
// 请将以下占位符替换为您自己的 Supabase 项目 URL 和匿名 Key
const SUPABASE_URL = 'https://ttgpvkeycjnaqndbxqok.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Wxq2a_JiqXhfT9KDdrt5yA_AEf03go6';

// 简单的 Supabase 客户端封装
class AuthManager {
    constructor() {
        this.client = null;
        this.user = null;
        this.stats = null;
        this.init();
    }

    init() {
        if (typeof supabase !== 'undefined') {
            try {
                this.client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                
                // 监听登录状态变化
                this.client.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN') {
                        this.user = session.user;
                        this.handleLoginSuccess();
                    } else if (event === 'SIGNED_OUT') {
                        this.user = null;
                        this.stats = null;
                        this.handleLogoutSuccess();
                    }
                });

                // 检查初始会话
                this.checkSession();
            } catch (e) {
                console.error("Supabase 初始化失败:", e);
            }
        } else {
            console.warn("未检测到 Supabase 库，请确保已引入 CDN。");
        }
    }

    async checkSession() {
        if (!this.client) return;
        const { data: { session } } = await this.client.auth.getSession();
        if (session) {
            this.user = session.user;
            this.handleLoginSuccess();
        } else {
            this.updateUI(false);
        }
    }

    // 辅助：昵称转邮箱
    _getEmail(nickname) {
        return `${nickname}@mahjong.legacy`;
    }

    // 注册 (使用昵称 + 密码)
    async signUp(nickname, password) {
        if (!this.client) return { error: { message: "Supabase 未初始化" } };
        
        const email = this._getEmail(nickname);
        const { data, error } = await this.client.auth.signUp({ 
            email, 
            password,
            options: {
                data: { nickname: nickname } // 将昵称存在 metadata 中作为备份
            }
        });

        if (!error && data.user) {
            // 注册成功后，立即初始化 user_stats
            await this._initUserStats(data.user.id, nickname);
        }

        return { data, error };
    }

    // 登录 (使用昵称 + 密码)
    async signIn(nickname, password) {
        if (!this.client) return { error: { message: "Supabase 未初始化" } };
        const email = this._getEmail(nickname);
        return await this.client.auth.signInWithPassword({ email, password });
    }

    // 注销
    async signOut() {
        if (!this.client) return;
        return await this.client.auth.signOut();
    }

    // 修改昵称
    async changeNickname(newNickname) {
        if (!this.client || !this.user || !this.stats) return { error: { message: "未登录" } };

        // 1. 检查时间限制 (7天 = 7 * 24 * 60 * 60 * 1000 毫秒)
        const lastChange = this.stats.last_nickname_change_at ? new Date(this.stats.last_nickname_change_at) : null;
        if (lastChange) {
            const now = new Date();
            const diffTime = now - lastChange; // 毫秒差
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            
            if (diffTime < sevenDaysMs) {
                const waitDays = Math.ceil((sevenDaysMs - diffTime) / (1000 * 60 * 60 * 24));
                return { error: { message: `昵称每7天可修改一次，还需等待约 ${waitDays} 天` } };
            }
        }

        // 2. 更新 Auth 邮箱 (作为登录凭证)
        const newEmail = this._getEmail(newNickname);
        const { error: authError } = await this.client.auth.updateUser({ email: newEmail, data: { nickname: newNickname } });
        
        if (authError) {
            return { error: authError };
        }

        // 3. 更新 user_stats 中的昵称和修改时间
        const { error: dbError } = await this.client
            .from('user_stats')
            .update({ 
                nickname: newNickname,
                last_nickname_change_at: new Date().toISOString()
            })
            .eq('user_id', this.user.id);

        if (dbError) {
            return { error: dbError };
        }

        // 更新本地数据
        this.stats.nickname = newNickname;
        this.stats.last_nickname_change_at = new Date().toISOString();
        this.updateUI(true); // 刷新 UI 显示

        return { success: true };
    }

    // 修改密码
    async changePassword(newPassword) {
        if (!this.client || !this.user) return { error: { message: "未登录" } };
        
        const { error } = await this.client.auth.updateUser({ password: newPassword });
        return { error };
    }

    // 内部方法：初始化用户统计数据
    async _initUserStats(userId, nickname) {
        const initialStats = {
            user_id: userId,
            nickname: nickname, // 存储昵称
            play_count: 0,
            clear_count: 0,
            high_score: 0,
            total_days: 1,
            last_login_at: new Date().toISOString(),
            last_nickname_change_at: null // 初始为空，或者设为注册时间
        };

        const { data, error } = await this.client
            .from('user_stats')
            .insert([initialStats])
            .select();
        
        if (error) {
            console.error("初始化统计数据失败:", error);
            return { error };
        }
        return { data };
    }

    // 获取用户统计数据
    async fetchUserStats() {
        if (!this.client || !this.user) return;

        try {
            let { data, error } = await this.client
                .from('user_stats')
                .select('*')
                .eq('user_id', this.user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                console.log("未找到统计数据，尝试自动修复...");
                // 修复：如果数据不存在，立即创建
                // 尝试从 metadata 获取昵称，如果没有则用 default
                const nickname = this.user.user_metadata?.nickname || '雀友' + this.user.id.slice(0, 4);
                const initRes = await this._initUserStats(this.user.id, nickname);
                
                if (initRes.data) {
                    this.stats = initRes.data[0];
                } else {
                    // 如果初始化失败，可能是并发问题，再次尝试获取
                     const retry = await this.client
                        .from('user_stats')
                        .select('*')
                        .eq('user_id', this.user.id)
                        .single();
                    if (retry.data) this.stats = retry.data;
                }
            } else if (data) {
                this.stats = data;
                // 检查每日登录
                this.checkDailyLogin();
            }
            
            this.updateStatsUI();
        } catch (error) {
            console.error("获取统计数据失败:", error);
        }
    }

    // 检查每日登录
    async checkDailyLogin() {
        if (!this.stats) return;

        const now = new Date();
        const lastLogin = this.stats.last_login_at ? new Date(this.stats.last_login_at) : new Date(0);
        
        const isSameDay = now.getFullYear() === lastLogin.getFullYear() &&
                          now.getMonth() === lastLogin.getMonth() &&
                          now.getDate() === lastLogin.getDate();

        if (!isSameDay) {
            console.log("新的一天！发放每日奖励...");
            
            const updates = {
                total_days: (this.stats.total_days || 0) + 1,
                last_login_at: now.toISOString()
            };

            const { data, error } = await this.client
                .from('user_stats')
                .update(updates)
                .eq('user_id', this.user.id)
                .select();

            if (data) {
                this.stats = data[0];
                this.dailyRewardAvailable = true;
                this.updateStatsUI();
                window.dispatchEvent(new CustomEvent('dailyRewardAvailable'));
            }
        }
    }

    // 获取排行榜
    async fetchLeaderboard() {
        if (!this.client) return [];
        
        // 现在可以获取 nickname 了
        const { data, error } = await this.client
            .from('user_stats')
            .select('user_id, nickname, high_score, play_count') 
            .order('high_score', { ascending: false })
            .limit(10);

        if (error) {
            console.error("获取排行榜失败:", error);
            return [];
        }
        return data;
    }

    // 更新游戏数据
    async updateGameStats(isWin, score, duration) {
        if (!this.client || !this.user) return;

        if (!duration || duration < 5000) {
            console.warn("游戏时间过短或无效，不予记录。");
            return;
        }

        if (score > 1000000) {
            console.warn("分数异常过高，不予记录。");
            return;
        }

        // 确保先有数据
        if (!this.stats) {
            await this.fetchUserStats();
        }
        
        if (!this.stats) return; // 仍然没有数据，放弃

        const updates = {
            play_count: this.stats.play_count + 1,
            clear_count: isWin ? this.stats.clear_count + 1 : this.stats.clear_count,
            high_score: Math.max(this.stats.high_score, score)
        };

        const { data, error } = await this.client
            .from('user_stats')
            .update(updates)
            .eq('user_id', this.user.id)
            .select();

        if (error) {
            console.error("更新数据失败:", error);
        } else if (data) {
            this.stats = data[0];
            this.updateStatsUI();
            console.log("游戏数据已同步云端");
        }
    }

    handleLoginSuccess() {
        this.updateUI(true);
        this.fetchUserStats();
    }

    handleLogoutSuccess() {
        this.updateUI(false);
    }

    updateUI(isLoggedIn) {
        const authContainer = document.getElementById('auth-container');
        const profileContainer = document.getElementById('profile-container');
        const userEmailSpan = document.getElementById('user-email');
        const userNicknameSpan = document.getElementById('user-nickname-display'); // 新增显示昵称

        if (isLoggedIn) {
            if (authContainer) authContainer.style.display = 'none';
            if (profileContainer) profileContainer.style.display = 'block';
            
            // 优先显示昵称，如果没有则显示 metadata 里的，再没有显示默认
            let displayName = "雀友";
            if (this.stats && this.stats.nickname) {
                displayName = this.stats.nickname;
            } else if (this.user && this.user.user_metadata && this.user.user_metadata.nickname) {
                displayName = this.user.user_metadata.nickname;
            }
            
            if (userNicknameSpan) userNicknameSpan.textContent = displayName;
            // 也可以保留 userEmailSpan 显示 "账号ID" 或隐藏
            if (userEmailSpan) userEmailSpan.style.display = 'none'; 

        } else {
            if (authContainer) authContainer.style.display = 'block';
            if (profileContainer) profileContainer.style.display = 'none';
        }
    }

    updateStatsUI() {
        if (!this.stats) return;
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('stat-play-count', this.stats.play_count);
        setVal('stat-clear-count', this.stats.clear_count);
        setVal('stat-high-score', this.stats.high_score);
        setVal('stat-total-days', this.stats.total_days);
        
        // 更新昵称显示
        if (this.stats.nickname) {
            const userNicknameSpan = document.getElementById('user-nickname-display');
            if (userNicknameSpan) userNicknameSpan.textContent = this.stats.nickname;
        }
    }
}

// 导出实例供全局使用
const authManager = new AuthManager();
