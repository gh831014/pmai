import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { User, Lock, ExternalLink, Calendar, MapPin, List, Plus, Trash, Edit, Save, X, Activity, LogOut, ShieldCheck, FileText, AlertCircle } from 'lucide-react';

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

// --- Data Manager (Simulating MD File I/O) ---

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

  // Parse MD table to Objects
  static parseMembers(md: string): Member[] {
    const lines = md.trim().split('\n').slice(2); // Skip header and separator
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

  // Generate MD table from Objects
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
    // Simple append to table
    const newRow = `| ${ip} | ${location} | ${time} | ${count} |`;
    // Ensure we don't have trailing newlines messing up formatting
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col transform transition-all scale-100">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
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
        <h3 className="font-bold text-lg text-gray-700">会员名单 (Members.md)</h3>
        <button onClick={handleAdd} className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition-colors">
          <Plus size={16} /> 添加会员
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-3">用户名</th>
              <th className="px-4 py-3">密码</th>
              <th className="px-4 py-3">有效期开始</th>
              <th className="px-4 py-3">有效期结束</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, idx) => (
              <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                {isEditing === idx ? (
                  <>
                    <td className="px-2 py-2"><input className="border rounded px-1 w-full" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} /></td>
                    <td className="px-2 py-2"><input className="border rounded px-1 w-full" value={editForm.pass} onChange={e => setEditForm({...editForm, pass: e.target.value})} /></td>
                    <td className="px-2 py-2"><input type="datetime-local" className="border rounded px-1 w-full" value={editForm.startDate.replace(' ', 'T')} onChange={e => setEditForm({...editForm, startDate: e.target.value.replace('T', ' ')})} /></td>
                    <td className="px-2 py-2"><input type="datetime-local" className="border rounded px-1 w-full" value={editForm.endDate.replace(' ', 'T')} onChange={e => setEditForm({...editForm, endDate: e.target.value.replace('T', ' ')})} /></td>
                    <td className="px-2 py-2 text-right">
                       <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-900 mr-2"><Save size={18} /></button>
                       <button onClick={() => setIsEditing(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.username}</td>
                    <td className="px-4 py-3">{m.pass}</td>
                    <td className="px-4 py-3">{m.startDate}</td>
                    <td className="px-4 py-3">{m.endDate}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(idx)} className="text-blue-600 hover:text-blue-900 mr-3"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(idx)} className="text-red-600 hover:text-red-900"><Trash size={18} /></button>
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
       <h3 className="font-bold text-lg text-gray-700 mb-4">登录/访问日志 (Logs.md)</h3>
       <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto h-64 whitespace-pre">
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
    // 1. If Member/Admin: Check Validity (already checked on login mostly, but good to be safe)
    if (user.isLoggedIn) {
      // Members valid: Pass through
      window.open(url, '_blank');
      return;
    }

    // 2. If Guest
    if (!clientInfo.ip) {
       // Wait for IP? Or proceed with fallback.
       alert("正在获取网络信息，请稍后再试");
       return;
    }

    const currentCount = DataManager.incrementGuestUsage(clientInfo.ip);
    
    // Log Activity
    DataManager.appendLog(clientInfo.ip, clientInfo.location, currentCount);

    if (currentCount > 5) {
      setBlockModal(true);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-md z-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Logo Placeholder */}
              <div className="bg-blue-600 text-white p-2 rounded-full">
                <ShieldCheck size={24} />
              </div>
              <span className="font-bold text-xl text-gray-800 tracking-tight">产品老高</span>
            </div>
            
            <div className="flex items-center gap-4">
              {user.isLoggedIn ? (
                 <div className="flex items-center gap-3">
                   <div className="text-gray-700 flex items-center gap-2">
                     <User size={18} />
                     <span className="font-medium">{user.username}</span>
                   </div>
                   {user.isAdmin && (
                     <button 
                       onClick={() => setShowAdmin(true)}
                       className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 flex items-center gap-2"
                     >
                       <List size={16} /> 管理会员
                     </button>
                   )}
                   <button 
                     onClick={handleLogout}
                     className="text-gray-500 hover:text-red-500 transition-colors"
                     title="退出登录"
                   >
                     <LogOut size={20} />
                   </button>
                 </div>
              ) : (
                <button 
                  onClick={() => setShowLogin(true)}
                  className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-700 shadow-md transition-all hover:shadow-lg flex items-center gap-2"
                >
                  <User size={16} /> 登录
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow bg-slate-50 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-0">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              欢迎光临产品老高
              <span className="text-blue-600">AI</span>
              学习网站
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              请选择下列内容浏览，开启您的 AI 产品学习之旅
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div 
              onClick={() => handleLinkClick('https://analysisresume.netlify.app/')}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100 group"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <FileText className="text-blue-600 group-hover:text-white transition-colors duration-300" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">个人简历分析</h3>
              <p className="text-gray-500 mb-4 line-clamp-2">上传简历产出分析报告，基于 AI 深度解析您的职业优势。</p>
              <div className="flex items-center text-blue-500 font-medium text-sm">
                立即体验 <ExternalLink size={14} className="ml-1" />
              </div>
            </div>

            {/* Card 2 */}
            <div 
              onClick={() => handleLinkClick('https://knowledgeanalysis.netlify.app/')}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100 group"
            >
               <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors duration-300">
                <Activity className="text-purple-600 group-hover:text-white transition-colors duration-300" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-purple-600 transition-colors">知识点提炼工具</h3>
              <p className="text-gray-500 mb-4 line-clamp-2">上传文件，智能提炼文章核心知识点与方法论。</p>
              <div className="flex items-center text-purple-500 font-medium text-sm">
                立即体验 <ExternalLink size={14} className="ml-1" />
              </div>
            </div>

            {/* Card 3 (Coming Soon) */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 relative overflow-hidden opacity-80 cursor-not-allowed">
              <div className="absolute top-4 right-4 bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                即将上线
              </div>
              <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center mb-6">
                <Lock className="text-gray-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-400 mb-3">产品AI 学习方法</h3>
              <p className="text-gray-400 mb-4">敬请期待更多精彩内容...</p>
            </div>
          </div>
        </div>
      </main>

      {/* Login Modal */}
      <Modal isOpen={showLogin} onClose={() => setShowLogin(false)} title="用户登录">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入用户名"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input 
                type="password" 
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入密码"
                value={loginForm.pass}
                onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
              />
            </div>
          </div>
          
          {loginError && (
            <div className="text-red-500 text-sm flex items-center gap-1">
              <AlertCircle size={14} /> {loginError}
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              登录
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Dashboard Modal */}
      <Modal isOpen={showAdmin} onClose={() => setShowAdmin(false)} title="管理员控制台">
         <div className="space-y-8">
            <MemberManagement />
            <div className="border-t pt-6">
              <LogViewer />
            </div>
         </div>
      </Modal>

      {/* Block Alert Modal */}
      <Modal isOpen={blockModal} onClose={() => setBlockModal(false)} title="温馨提示">
        <div className="text-center py-6">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <AlertCircle size={32} className="text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">游客访问次数已达上限</h3>
          <p className="text-gray-500 mb-6">
            游客限制每天访问 5 次。<br/>请联系老高充值会员，解锁无限访问权限。<br/>
            <span className="font-bold text-gray-800 text-lg mt-2 block">9.9元 / 月</span>
          </p>
          <button 
            onClick={() => setBlockModal(false)}
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            知道了
          </button>
        </div>
      </Modal>

    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);