
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
// Fix: Added Link to the imports
import { 
  Plus, X, Activity, LogOut, ShieldCheck, FileText, AlertCircle, List, 
  ChevronRight, Loader2, MessageCircle, Globe, Box, Settings, Download,
  Cloud, CloudUpload, History, Database, Link
} from 'lucide-react';
import QRCode from 'react-qr-code';

// --- Types & Constants ---

type LinkType = 'tools' | 'internal' | 'external';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  type: LinkType;
  iconName: string;
}

interface UserState {
  isLoggedIn: boolean;
  username: string;
  isAdmin: boolean;
}

const ADMIN_USER = 'pmlaogao';
const ADMIN_PASS = '011348';
const KILL_PASS = 'Kill';

const INITIAL_LINKS_MD = `| 标题 | 链接 | 描述 | 类型 | 图标 |
|---|---|---|---|---|
| 个人简历分析 | https://analysisresume.netlify.app/ | 上传简历产出分析报告，基于 AI 深度解析您的职业优势，优化求职竞争力。 | tools | FileText |
| 知识点提炼工具 | https://knowledgeanalysis.netlify.app/ | 高效阅读助手，上传文档即可智能提炼核心知识点与方法论架构。 | tools | Activity |
| 开发者中心 | https://developer.google.com | 探索最新的 AI 技术与 API，构建下一代智能应用。 | external | Globe |`;

const INITIAL_LOGS_MD = `| 用户 | IP | 位置 | 时间 | 状态 |
|---|---|---|---|---|`;

// --- Data Manager (Persistence Layer) ---

class DataManager {
  private static STORAGE_KEY_LINKS = 'pmlaogao_v2_links_md';
  private static STORAGE_KEY_LOGS = 'pmlaogao_v2_logs_md';

  // Fix: Added missing getLinksMD method to handle data retrieval for the editor
  static getLinksMD(): string {
    return localStorage.getItem(this.STORAGE_KEY_LINKS) || INITIAL_LINKS_MD;
  }

  // Simulated Async Persistence
  static async syncToCloud(content: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem(this.STORAGE_KEY_LINKS, content);
        resolve(true);
      }, 1200);
    });
  }

  static async fetchLatest(): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = localStorage.getItem(this.STORAGE_KEY_LINKS);
        resolve(data || INITIAL_LINKS_MD);
      }, 600);
    });
  }

  static parseLinks(md: string): LinkItem[] {
    try {
      const lines = md.trim().split('\n').filter(l => l.includes('|')).slice(2);
      return lines.map((line, index) => {
        const parts = line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
        if (parts.length < 5) return null;
        return {
          id: `link-${index}-${Date.now()}`,
          title: parts[0],
          url: parts[1],
          description: parts[2],
          type: parts[3] as LinkType,
          iconName: parts[4]
        };
      }).filter(Boolean) as LinkItem[];
    } catch (e) {
      console.error("Link parsing failed", e);
      return [];
    }
  }

  static getLogsMD(): string {
    return localStorage.getItem(this.STORAGE_KEY_LOGS) || INITIAL_LOGS_MD;
  }

  static saveLogsMD(content: string) {
    localStorage.setItem(this.STORAGE_KEY_LOGS, content);
  }

  static appendLog(username: string, ip: string) {
    let currentMD = this.getLogsMD();
    const time = new Date().toLocaleString('zh-CN');
    const newRow = `| ${username} | ${ip} | 中国 | ${time} | 访问成功 |`;
    currentMD = currentMD.trim() + '\n' + newRow;
    this.saveLogsMD(currentMD);
  }

  static getGuestCount(ip: string): number {
    const today = new Date().toISOString().split('T')[0];
    const key = `usage_${today}_${ip}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  }

  static trackGuest(ip: string): number {
    const today = new Date().toISOString().split('T')[0];
    const key = `usage_${today}_${ip}`;
    const newVal = this.getGuestCount(ip) + 1;
    localStorage.setItem(key, newVal.toString());
    return newVal;
  }
}

// --- Icons Library ---
const IconComponent = ({ name, className, size = 24 }: { name: string, className?: string, size?: number }) => {
  // Fix: Link is now available in scope through imports
  const icons: Record<string, any> = { FileText, Activity, Globe, Box, Link, Settings, ShieldCheck, MessageCircle };
  const LucideIcon = icons[name] || Globe;
  return <LucideIcon className={className} size={size} />;
};

// --- Components ---

const Logo: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div onClick={onClick} className="flex items-center gap-3 cursor-pointer select-none active:scale-95 transition-all group">
      {!imgError ? (
        <img 
          src="logo.png" 
          alt="Logo" 
          className="h-10 sm:h-12 w-auto object-contain drop-shadow-md group-hover:brightness-110" 
          onError={() => setImgError(true)} 
        />
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-2 ring-white">P</div>
          <span className="font-black text-xl tracking-tighter text-stone-800">产品老高</span>
        </div>
      )}
    </div>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col border border-stone-200 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-6 border-b border-stone-100 glass sticky top-0 z-10">
          <h3 className="text-xl font-bold text-stone-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors p-2 rounded-full hover:bg-stone-50"><X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto bg-stone-50/50 flex-grow">{children}</div>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [user, setUser] = useState<UserState>({ isLoggedIn: false, username: 'Guest', isAdmin: false });
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing'>('synced');
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<'editor' | 'logs'>('editor');
  const [rawMD, setRawMD] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showKillModal, setShowKillModal] = useState(false);
  const [killPass, setKillPass] = useState('');
  const [ip, setIp] = useState('Local');

  useEffect(() => {
    const init = async () => {
      setSyncStatus('syncing');
      const data = await DataManager.fetchLatest();
      setLinks(DataManager.parseLinks(data));
      setRawMD(data);
      setSyncStatus('synced');
      
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const json = await res.json();
        setIp(json.ip);
      } catch (e) { /* Fallback to Local */ }
    };
    init();
  }, []);

  const handleSave = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const ok = await DataManager.syncToCloud(rawMD);
      if (ok) {
        setLinks(DataManager.parseLinks(rawMD));
        setSyncStatus('synced');
        alert('配置同步成功！');
      }
    } catch (e) {
      alert('同步失败，请稍后重试');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLinkClick = (url: string) => {
    if (!user.isLoggedIn) {
      const count = DataManager.trackGuest(ip);
      DataManager.appendLog('Guest', ip);
      if (count > 5) {
        alert('今日免费次数已达上限，请登录。');
        setShowLogin(true);
        return;
      }
    } else {
      DataManager.appendLog(user.username, ip);
    }
    window.open(url, '_blank');
  };

  const categorized = useMemo(() => {
    const res: Record<LinkType, LinkItem[]> = { tools: [], internal: [], external: [] };
    links.forEach(l => {
      if (res[l.type]) res[l.type].push(l);
    });
    return res;
  }, [links]);

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <nav className="fixed w-full z-40 top-0 glass border-b border-stone-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 sm:h-20 flex justify-between items-center">
          <Logo onClick={() => {
            const next = logoClicks + 1;
            if (next >= 5) { setShowKillModal(true); setLogoClicks(0); }
            else { setLogoClicks(next); setTimeout(() => setLogoClicks(0), 2000); }
          }} />
          
          <div className="flex items-center gap-4">
            <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${syncStatus === 'synced' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
              <Cloud size={12} className={syncStatus === 'syncing' ? 'animate-pulse' : ''} />
              {syncStatus === 'synced' ? '已连接云端' : '存在待同步更改'}
            </div>
            
            {user.isLoggedIn ? (
              <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-full pl-4 border border-stone-200 shadow-sm">
                <span className="font-bold text-sm text-stone-700">{user.username}</span>
                {user.isAdmin && (
                  <button onClick={() => { setRawMD(DataManager.getLinksMD()); setShowAdmin(true); }} className="p-2 hover:bg-white rounded-full text-stone-500 shadow-sm transition-all">
                    <Settings size={18} />
                  </button>
                )}
                <button onClick={() => setUser({isLoggedIn: false, username: 'Guest', isAdmin: false})} className="p-2 hover:bg-white rounded-full text-stone-500 shadow-sm transition-all">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)} className="px-6 py-2.5 bg-stone-900 text-white text-sm font-bold rounded-full hover:bg-stone-800 transition-all shadow-xl active:scale-95">
                登录账户
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-32 sm:pt-44 pb-16 px-6 max-w-4xl mx-auto text-center">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-[0.2em] animate-bounce">
          2025 AI Product Portal
        </div>
        <h1 className="text-5xl sm:text-7xl font-black text-stone-900 mb-8 tracking-tighter leading-[0.9] sm:leading-[0.85]">
          重塑 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-600 to-rose-500">AI 时代</span> 的产品竞争力
        </h1>
        <p className="text-stone-500 text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          这里汇聚了产品老高精选的深度 AI 工具、实战案例与思考模型，助你在变革中领先一步。
        </p>
      </header>

      {/* Content Sections */}
      <main className="max-w-7xl mx-auto px-6 w-full space-y-24">
        {(Object.entries(categorized) as [LinkType, LinkItem[]][]).map(([type, list]) => list.length > 0 && (
          <section key={type}>
            <div className="flex items-center gap-4 mb-10">
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${type === 'tools' ? 'bg-amber-100 text-amber-600' : type === 'internal' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {type === 'tools' ? <Settings size={22} /> : type === 'internal' ? <Box size={22} /> : <Globe size={22} />}
               </div>
               <div>
                  <h2 className="text-2xl font-black text-stone-800 tracking-tight">
                    {type === 'tools' ? '核心工具库' : type === 'internal' ? '内部实验资源' : '全球精选外链'}
                  </h2>
                  <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">{type} Resources</p>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {list.map(l => (
                <div key={l.id} onClick={() => handleLinkClick(l.url)} className="group bg-white rounded-3xl p-8 border border-stone-100 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="mb-6 w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300 transform group-hover:rotate-6 shadow-sm">
                      <IconComponent name={l.iconName} size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-stone-800 mb-3 group-hover:text-amber-600 transition-colors">{l.title}</h3>
                    <p className="text-stone-500 text-sm leading-relaxed mb-6 line-clamp-3">{l.description}</p>
                  </div>
                  <div className="flex items-center text-xs font-black uppercase tracking-widest text-stone-400 group-hover:text-stone-900 transition-colors">
                    Explore Now <ChevronRight size={14} className="ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {links.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-stone-100">
             <Loader2 className="animate-spin text-stone-300 mb-6" size={48} />
             <p className="text-stone-400 font-bold tracking-widest uppercase text-sm">正在同步最新资源库...</p>
          </div>
        )}
      </main>

      {/* Admin Quick Login Modal */}
      <Modal isOpen={showKillModal} onClose={() => setShowKillModal(false)} title="身份快速验证">
        <form onSubmit={(e) => { e.preventDefault(); if(killPass === KILL_PASS) { setShowKillModal(false); setShowAdmin(true); setKillPass(''); } else alert('指令无效'); }} className="space-y-6">
          <p className="text-sm text-stone-400">连续点击 Logo 已触发管理员直通入口，请输入访问密钥。</p>
          <input type="password" placeholder="Admin Command" className="w-full p-5 bg-stone-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/20 transition-all font-mono" value={killPass} onChange={e=>setKillPass(e.target.value)} autoFocus />
          <button type="submit" className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black hover:bg-stone-800 shadow-xl transition-all">执行指令</button>
        </form>
      </Modal>

      {/* Admin Workspace */}
      <Modal isOpen={showAdmin} onClose={() => setShowAdmin(false)} title="PM-CMS 管理后台">
        <div className="flex bg-stone-100 p-1.5 rounded-2xl mb-8">
          <button onClick={() => setAdminTab('editor')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${adminTab === 'editor' ? 'bg-white shadow-md text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}>
            <Database size={14} /> 数据编辑
          </button>
          <button onClick={() => setAdminTab('logs')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${adminTab === 'logs' ? 'bg-white shadow-md text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}>
            <History size={14} /> 访问透视
          </button>
        </div>

        {adminTab === 'editor' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Links Source (Markdown)</span>
              <button onClick={() => { const b=new Blob([rawMD],{type:'text/markdown'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='backup.md'; a.click(); }} className="text-[10px] font-bold text-amber-600 hover:underline">下载本地备份</button>
            </div>
            <textarea 
              className="w-full h-96 p-6 bg-stone-900 text-emerald-400 font-mono text-[11px] rounded-3xl outline-none border-4 border-stone-800 focus:border-amber-500/30 transition-all shadow-inner leading-relaxed"
              value={rawMD}
              onChange={(e) => { setRawMD(e.target.value); setSyncStatus('pending'); }}
              spellCheck={false}
            />
            <button 
              onClick={handleSave}
              disabled={isSyncing}
              className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black hover:opacity-90 shadow-2xl shadow-orange-500/30 flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isSyncing ? <Loader2 size={22} className="animate-spin" /> : <CloudUpload size={22} />}
              部署更改并同步持久化
            </button>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="bg-stone-900 text-stone-400 p-6 rounded-3xl font-mono text-[10px] overflow-auto h-96 shadow-inner border border-stone-800 whitespace-pre">
               {DataManager.getLogsMD()}
             </div>
             <button onClick={() => { if(confirm('重置统计数据？')) { DataManager.saveLogsMD(INITIAL_LOGS_MD); setShowAdmin(false); } }} className="w-full py-4 text-rose-500 text-xs font-bold hover:bg-rose-50 rounded-2xl transition-all">重置统计库</button>
          </div>
        )}
      </Modal>

      {/* Login Modal */}
      <Modal isOpen={showLogin} onClose={() => setShowLogin(false)} title="验证您的身份">
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); const t=e.target as any; if(t.u.value===ADMIN_USER && t.p.value===ADMIN_PASS) { setUser({isLoggedIn:true, username:'管理员', isAdmin:true}); setShowLogin(false); } else alert('用户名或密码错误'); }}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">账号 Identifier</label>
            <input name="u" className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 transition-all" placeholder="Enter Username" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">密码 Access Token</label>
            <input name="p" type="password" className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 transition-all" placeholder="Enter Password" />
          </div>
          <button type="submit" className="w-full py-5 bg-stone-900 text-white rounded-2xl font-black hover:bg-stone-800 shadow-xl transition-all active:scale-[0.98]">立即登录</button>
          
          <div className="flex items-center gap-4 py-4">
             <div className="flex-grow border-t border-stone-100"></div>
             <span className="text-stone-300 text-[10px] uppercase font-black tracking-[0.2em]">扫码快捷验证</span>
             <div className="flex-grow border-t border-stone-100"></div>
          </div>
          
          <div className="bg-white p-4 border border-stone-100 rounded-3xl shadow-lg flex justify-center w-52 mx-auto hover:shadow-2xl transition-all duration-500 group">
            <QRCode size={180} value="https://u.wechat.com/kBr-Pj6a0k4XqE-y" className="group-hover:scale-105 transition-transform" />
          </div>
          <p className="text-center text-stone-400 text-[10px] font-bold mt-4 uppercase tracking-widest">关注“产品老高”获取动态授权码</p>
        </form>
      </Modal>

      <footer className="mt-auto py-16 text-center border-t border-stone-100 bg-white">
        <div className="flex justify-center gap-6 mb-6">
           {['WeChat', 'Zhihu', 'Twitter', 'BiliBili'].map(s => <span key={s} className="text-stone-300 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-stone-900 transition-colors">{s}</span>)}
        </div>
        <p className="font-black tracking-[0.3em] mb-3 uppercase text-stone-800 text-sm">© {new Date().getFullYear()} 产品老高 - PM LAOGAO</p>
        <p className="text-stone-400 text-[10px] font-medium uppercase tracking-widest">致力于构建人工智能时代的顶级产品社区</p>
      </footer>
    </div>
  );
};

// --- Entry Point ---
const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
