import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { User, Lock, ExternalLink, Plus, Trash, Edit, Save, X, Activity, LogOut, ShieldCheck, FileText, AlertCircle, List, ChevronRight, Loader2 } from 'lucide-react';

// --- Types & Constants ---

interface Member {
  username: string;
  pass: string;
  startDate: string;
  endDate: string;
}

interface UserState {
  isLoggedIn: boolean;
  username: string;
  isAdmin: boolean;
}

const ADMIN_USER = 'pmlaogao';
const ADMIN_PASS = '011348';

// Initial Markdown Templates
const INITIAL_MEMBERS_MD = `| 用户名 | 密码 | 开始时间 | 结束时间 |
|---|---|---|---|
| pmlaogao | 011348 | 2026-01-01 00:00:00 | 2999-01-01 00:00:00 |`;

const INITIAL_LOGS_MD = `| IP | 位置 | 时间 | 次数 |
|---|---|---|---|`;

// --- Data Manager ---

class DataManager {
  static getMembersMD(): string {
    return localStorage.getItem('pmlaogao_members_md') || INITIAL_MEMBERS_MD;
  }

  static saveMembersMD(content: string) {
    localStorage.setItem('pmlaogao_members_md', content);
  }

  static getLogsMD(): string {
    return localStorage.getItem('pmlaogao_logs_md') || INITIAL_LOGS_MD;
  }

  static saveLogsMD(content: string) {
    localStorage.setItem('pmlaogao_logs_md', content);
  }

  static parseMembers(md: string): Member[] {
    const lines = md.trim().split('\n').slice(2);
    return lines.map(line => {
      const parts = line.split('|').map(s => s.trim()).filter(s => s !== '');
      if (parts.length < 4) return null;
      return {
        username: parts[0],
        pass: parts[1],
        startDate: parts[2],
        endDate: parts[3]
      };
    }).filter(Boolean) as Member[];
  }

  static generateMembersMD(members: Member[]): string {
    let md = `| 用户名 | 密码 | 开始时间 | 结束时间 |\n|---|---|---|---|\n`;
    members.forEach(m => {
      md += `| ${m.username} | ${m.pass} | ${m.startDate} | ${m.endDate} |\n`;
    });
    return md;
  }

  static appendLog(ip: string, location: string, count: number) {
    let currentMD = this.getLogsMD();
    const time = new Date().toLocaleString('zh-CN');
    const newRow = `| ${ip} | ${location} | ${time} | ${count} |`;
    currentMD = currentMD.trim() + '\n' + newRow;
    this.saveLogsMD(currentMD);
  }

  static getGuestUsage(ip: string): number {
    const today = new Date().toISOString().split('T')[0];
    const key = `pmlaogao_guest_usage_${today}_${ip}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  }

  static incrementGuestUsage(ip: string): number {
    const today = new Date().toISOString().split('T')[0];
    const key = `pmlaogao_guest_usage_${today}_${ip}`;
    const current = this.getGuestUsage(ip);
    const newVal = current + 1;
    localStorage.setItem(key, newVal.toString());
    return newVal;
  }
}

// --- Helper Functions ---
const getIP = async (): Promise<string> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (e) {
        return 'Unknown IP';
    }
};

const getLocation = (): Promise<string> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve("Unknown Location");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve(`${position.coords.latitude.toFixed(2)},${position.coords.longitude.toFixed(2)}`);
            },
            () => {
                resolve("Location Denied");
            }
        );
    });
};


// --- Components ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col transform transition-all scale-100 border border-white/50 ring-1 ring-black/5">
        <div className="flex justify-between items-center p-6 border-b border-stone-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <h3 className="text-xl font-bold text-stone-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-full hover:bg-stone-100">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-stone-50/50">
          {children}
        </div>
      </div>
    </div>
  );
};

const MemberManagement = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Member>({ username: '', pass: '', startDate: '', endDate: '' });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = () => {
    const md = DataManager.getMembersMD();
    setMembers(DataManager.parseMembers(md));
  };

  const handleSaveMD = (newMembers: Member[]) => {
    const md = DataManager.generateMembersMD(newMembers);
    DataManager.saveMembersMD(md);
    setMembers(newMembers);
  };

  const handleDelete = (index: number) => {
    if (confirm('确定删除该会员吗？')) {
      const newMembers = members.filter((_, i) => i !== index);
      handleSaveMD(newMembers);
    }
  };

  const handleEdit = (index: number) => {
    setIsEditing(index);
    setEditForm(members[index]);
  };

  const handleSaveEdit = () => {
    if (isEditing !== null) {
      const newMembers = [...members];
      newMembers[isEditing] = editForm;
      handleSaveMD(newMembers);
      setIsEditing(null);
    }
  };

  const handleAdd = () => {
    const newMember: Member = {
      username: 'user' + Math.floor(Math.random() * 1000),
      pass: '123456',
      startDate: new Date().toISOString().slice(0, 10) + ' 00:00:00',
      endDate: '2026-01-01 00:00:00'
    };
    handleSaveMD([...members, newMember]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-stone-700">会员名单 (Members.md)</h3>
        <button onClick={handleAdd} className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm">
          <Plus size={16} /> 添加会员
        </button>
      </div>

      <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm text-left text-stone-600">
          <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b border-stone-100">
            <tr>
              <th className="px-4 py-3 font-semibold">用户名</th>
              <th className="px-4 py-3 font-semibold">密码</th>
              <th className="px-4 py-3 font-semibold">开始时间</th>
              <th className="px-4 py-3 font-semibold">结束时间</th>
              <th className="px-4 py-3 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, idx) => (
              <tr key={idx} className="bg-white border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                {isEditing === idx ? (
                  <>
                    <td className="px-2 py-2"><input className="border border-stone-200 rounded px-2 py-1 w-full text-xs focus:ring-2 focus:ring-amber-500 outline-none" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} /></td>
                    <td className="px-2 py-2"><input className="border border-stone-200 rounded px-2 py-1 w-full text-xs focus:ring-2 focus:ring-amber-500 outline-none" value={editForm.pass} onChange={e => setEditForm({...editForm, pass: e.target.value})} /></td>
                    <td className="px-2 py-2"><input type="datetime-local" className="border border-stone-200 rounded px-2 py-1 w-full text-xs focus:ring-2 focus:ring-amber-500 outline-none" value={editForm.startDate.replace(' ', 'T')} onChange={e => setEditForm({...editForm, startDate: e.target.value.replace('T', ' ')})} /></td>
                    <td className="px-2 py-2"><input type="datetime-local" className="border border-stone-200 rounded px-2 py-1 w-full text-xs focus:ring-2 focus:ring-amber-500 outline-none" value={editForm.endDate.replace(' ', 'T')} onChange={e => setEditForm({...editForm, endDate: e.target.value.replace('T', ' ')})} /></td>
                    <td className="px-2 py-2 text-right">
                       <button onClick={handleSaveEdit} className="text-emerald-600 hover:text-emerald-800 p-1"><Save size={16} /></button>
                       <button onClick={() => setIsEditing(null)} className="text-stone-400 hover:text-stone-600 p-1"><X size={16} /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-stone-900">{m.username}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.pass}</td>
                    <td className="px-4 py-3 text-xs">{m.startDate}</td>
                    <td className="px-4 py-3 text-xs">{m.endDate}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(idx)} className="text-amber-600 hover:text-amber-800 mr-2 p-1"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(idx)} className="text-rose-500 hover:text-rose-700 p-1"><Trash size={16} /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LogViewer = () => {
  const [logs, setLogs] = useState<string>("");

  useEffect(() => {
    setLogs(DataManager.getLogsMD());
  }, []);

  return (
    <div className="mt-8">
       <h3 className="font-bold text-stone-700 mb-3">系统日志 (Logs.md)</h3>
       <div className="bg-stone-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-auto h-48 whitespace-pre shadow-inner">
         {logs}
       </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [user, setUser] = useState<UserState>({ isLoggedIn: false, username: 'Guest', isAdmin: false });
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', pass: '' });
  const [loginError, setLoginError] = useState('');
  
  const [showAdmin, setShowAdmin] = useState(false);
  const [blockModal, setBlockModal] = useState(false);
  
  // Client Info
  const [clientInfo, setClientInfo] = useState({ ip: '', location: '' });

  useEffect(() => {
    // Initial load info
    const init = async () => {
      const ip = await getIP();
      const loc = await getLocation();
      setClientInfo({ ip, location: loc });
    };
    init();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Check Admin
    if (loginForm.username === ADMIN_USER && loginForm.pass === ADMIN_PASS) {
      setUser({ isLoggedIn: true, username: 'pmlaogao', isAdmin: true });
      setShowLogin(false);
      return;
    }

    // Check Members
    const members = DataManager.parseMembers(DataManager.getMembersMD());
    const member = members.find(m => m.username === loginForm.username && m.pass === loginForm.pass);

    if (member) {
       // Check Date Validity
       const now = new Date();
       const start = new Date(member.startDate);
       const end = new Date(member.endDate);
       
       if (now >= start && now <= end) {
         setUser({ isLoggedIn: true, username: member.username, isAdmin: false });
         setShowLogin(false);
       } else {
         setLoginError('账号不在有效期内');
       }
    } else {
      setLoginError('用户名或密码错误');
    }
  };

  const handleLogout = () => {
    setUser({ isLoggedIn: false, username: 'Guest', isAdmin: false });
    setShowAdmin(false);
  };

  const handleLinkClick = async (url: string) => {
    if (user.isLoggedIn) {
      window.open(url, '_blank');
      return;
    }

    if (!clientInfo.ip) {
       alert("正在获取网络信息，请稍后再试");
       return;
    }

    const currentCount = DataManager.incrementGuestUsage(clientInfo.ip);
    DataManager.appendLog(clientInfo.ip, clientInfo.location, currentCount);

    if (currentCount > 5) {
      setBlockModal(true);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* Navigation */}
      <nav className="fixed w-full z-40 top-0 transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-stone-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              {/* Logo Area */}
              <div className="relative group cursor-pointer overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow">
                {/* Fallback visual if image fails or before load, though img tag is primary */}
                <img 
                  src="./logo.png" 
                  alt="产品老高 PM LAOGAO" 
                  className="h-10 sm:h-12 w-auto object-contain"
                  onError={(e) => {
                    // Fallback to text representation if logo.png is missing
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden h-10 px-3 bg-amber-400 flex items-center justify-center text-white font-bold text-lg rounded leading-none">
                  产品老高
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user.isLoggedIn ? (
                 <div className="flex items-center gap-2 sm:gap-4 bg-stone-100/50 p-1.5 rounded-full pl-4 border border-stone-200">
                   <div className="text-stone-700 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="font-semibold text-sm">{user.username}</span>
                   </div>
                   {user.isAdmin && (
                     <button 
                       onClick={() => setShowAdmin(true)}
                       className="text-stone-500 hover:text-amber-600 transition-colors p-1.5 rounded-full hover:bg-white"
                       title="管理后台"
                     >
                       <List size={18} />
                     </button>
                   )}
                   <button 
                     onClick={handleLogout}
                     className="bg-white text-stone-500 hover:text-rose-500 hover:bg-stone-50 transition-all p-1.5 rounded-full shadow-sm border border-stone-100"
                     title="退出登录"
                   >
                     <LogOut size={16} />
                   </button>
                 </div>
              ) : (
                <button 
                  onClick={() => setShowLogin(true)}
                  className="group relative inline-flex items-center justify-center px-6 py-2 text-sm font-semibold text-white transition-all duration-200 bg-stone-900 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 hover:bg-stone-800 shadow-lg hover:shadow-stone-900/30"
                >
                  <span className="mr-2">登录</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow relative pt-24 pb-12 overflow-hidden">
        {/* Decorative Background Elements (Updated to Brand Colors) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-5%] right-[-5%] w-[500px] h-[500px] bg-amber-200/40 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob"></div>
          <div className="absolute top-[10%] left-[-10%] w-[400px] h-[400px] bg-orange-200/40 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-yellow-100/50 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-0">
          <div className="text-center mb-20 mt-8 sm:mt-12">
            <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold tracking-wide uppercase shadow-sm">
              专业 · 实战 · 深度
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-stone-900 mb-6 tracking-tight leading-tight">
              赋能您的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">AI 产品</span> 学习之路
            </h1>
            <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed">
              汇聚实战工具与深度方法论，帮助产品经理在人工智能时代构建核心竞争力。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <div 
              onClick={() => handleLinkClick('https://analysisresume.netlify.app/')}
              className="group relative bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-stone-100 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-colors duration-300 shadow-sm group-hover:shadow-amber-500/30">
                <FileText className="text-amber-600 group-hover:text-white transition-colors duration-300" size={26} />
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-3 group-hover:text-amber-600 transition-colors">个人简历分析</h3>
              <p className="text-stone-500 mb-6 leading-relaxed text-sm">上传简历产出分析报告，基于 AI 深度解析您的职业优势，优化求职竞争力。</p>
              <div className="flex items-center text-amber-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                立即体验 <ChevronRight size={16} className="ml-1" />
              </div>
            </div>

            {/* Card 2 */}
            <div 
              onClick={() => handleLinkClick('https://knowledgeanalysis.netlify.app/')}
              className="group relative bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-stone-100 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors duration-300 shadow-sm group-hover:shadow-orange-500/30">
                <Activity className="text-orange-600 group-hover:text-white transition-colors duration-300" size={26} />
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-3 group-hover:text-orange-600 transition-colors">知识点提炼工具</h3>
              <p className="text-stone-500 mb-6 leading-relaxed text-sm">高效阅读助手，上传文档即可智能提炼核心知识点与方法论架构。</p>
              <div className="flex items-center text-orange-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                立即体验 <ChevronRight size={16} className="ml-1" />
              </div>
            </div>

            {/* Card 3 (Coming Soon) */}
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200 relative overflow-hidden flex flex-col justify-between select-none">
              <div>
                <div className="w-14 h-14 bg-stone-200 rounded-2xl flex items-center justify-center mb-6">
                  <Lock className="text-stone-400" size={26} />
                </div>
                <h3 className="text-xl font-bold text-stone-400 mb-3">产品AI 学习方法</h3>
                <p className="text-stone-400 mb-4 text-sm">体系化课程正在打磨中，敬请期待...</p>
              </div>
              <div className="mt-4">
                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-200 text-stone-500">
                   Coming Soon
                 </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-8 relative z-10">
         <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-stone-400 text-sm">© {new Date().getFullYear()} 产品老高 PM LAOGAO. All rights reserved.</p>
         </div>
      </footer>

      {/* Login Modal */}
      <Modal isOpen={showLogin} onClose={() => setShowLogin(false)} title="用户登录">
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">账号</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-stone-400 group-focus-within:text-amber-500 transition-colors" />
              </div>
              <input 
                type="text" 
                className="block w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white transition-all outline-none"
                placeholder="请输入用户名"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">密码</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-stone-400 group-focus-within:text-amber-500 transition-colors" />
              </div>
              <input 
                type="password" 
                className="block w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white transition-all outline-none"
                placeholder="请输入密码"
                value={loginForm.pass}
                onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
              />
            </div>
          </div>
          
          {loginError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-pulse">
              <AlertCircle size={16} /> {loginError}
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-gradient-to-r from-stone-800 to-stone-900 hover:from-stone-700 hover:to-stone-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 transition-all transform active:scale-[0.98]"
            >
              立即登录
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Dashboard Modal */}
      <Modal isOpen={showAdmin} onClose={() => setShowAdmin(false)} title="管理员控制台">
         <div className="space-y-8">
            <MemberManagement />
            <div className="border-t border-stone-200 pt-6">
              <LogViewer />
            </div>
         </div>
      </Modal>

      {/* Block Alert Modal */}
      <Modal isOpen={blockModal} onClose={() => setBlockModal(false)} title="温馨提示">
        <div className="text-center py-6">
          <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
             <AlertCircle size={32} className="text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 mb-3">游客访问次数已达上限</h3>
          <p className="text-stone-500 mb-8 leading-relaxed">
            游客限制每天访问 5 次。<br/>
            为了提供更优质稳定的服务，请联系老高充值会员。<br/>
            <span className="font-bold text-amber-600 text-2xl mt-4 block">¥ 9.9 <span className="text-sm text-stone-400 font-normal">/ 月</span></span>
          </p>
          <button 
            onClick={() => setBlockModal(false)}
            className="w-full py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-bold shadow-lg shadow-stone-900/20"
          >
            我知道了
          </button>
        </div>
      </Modal>

    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);