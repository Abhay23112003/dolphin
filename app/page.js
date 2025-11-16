"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Copy, Check, Code2, Menu, X, Smile, ChevronDown, ChevronUp, Moon, Sun } from "lucide-react";

export default function Home() {
  // --- PASSPHRASE GATE (UNCHANGED) ---
  const SECRET = "codestory";
  const SESSION_KEY = "workspace_authed_v1_session";

  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ok = sessionStorage.getItem(SESSION_KEY);
    if (ok === "1") {
      setAuthed(true);
      setAuthChecked(true);
      return;
    }

    let pass = prompt("What's in your mind?");
    if (pass === SECRET) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setAuthed(false);
    }

    setAuthChecked(true);
  }, []);

  // Dark Mode State
  const [isDark, setIsDark] = useState(false);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Original State (UNCHANGED)
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  // Load existing messages (UNCHANGED)
  useEffect(() => {
    if (!authed) return;
    
    async function load() {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setMessages(data || []);
    }
    load();
  }, [authed]);

  // Realtime updates from Pusher (UNCHANGED)
  useEffect(() => {
    if (!authed) return;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key) {
      console.warn("Missing NEXT_PUBLIC_PUSHER_KEY");
      return;
    }

    const Pusher = window.Pusher || require("pusher-js");
    const pusher = new Pusher(key, { cluster });

    const channel = pusher.subscribe("workspace-channel");
    
    channel.bind("new-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    channel.bind("large-message-posted", async () => {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setMessages(data || []);
    });

    return () => {
      pusher.unsubscribe("workspace-channel");
    };
  }, [authed]);

  // Send message (UNCHANGED)
  async function sendMessage() {
    if (!text.trim()) return;

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: "you", text }),
    });

    setText("");
  }

  // Copy to clipboard (UNCHANGED)
  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Detect if message is code (UNCHANGED)
  function isCode(text) {
    const codeIndicators = ['{', '}', '()', '=>', 'function', 'const', 'let', 'var', 'import', 'export', '</', '/>'];
    return codeIndicators.some(indicator => text.includes(indicator));
  }

  // Toggle code expansion
  function toggleCodeExpansion(msgId) {
    setExpandedMessages(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  }

  // Common emojis for quick access
  const emojis = ['😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤔', '👍', '👏', '🙌', '🔥', '✨', '💯', '❤️', '🎉', '👀', '💪', '🚀', '✅', '⚡', '💡', '🎯', '🏆'];

  function insertEmoji(emoji) {
    setText(text + emoji);
    setShowEmojiPicker(false);
  }

  // Auto-scroll (UNCHANGED)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Retry auth (UNCHANGED)
  function retryAuth() {
    let pass = prompt("What's in your mind?");
    if (pass === SECRET) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setAuthed(false);
    }
  }

  // Format timestamp - WhatsApp style
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  // Get date label
  function getDateLabel(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // Group messages by date
  function groupMessagesByDate(messages) {
    const groups = [];
    let currentDate = null;
    
    messages.forEach((msg) => {
      const msgDate = new Date(msg.ts).toDateString();
      
      if (msgDate !== currentDate) {
        groups.push({ type: 'date', date: msgDate, timestamp: msg.ts });
        currentDate = msgDate;
      }
      
      groups.push({ type: 'message', data: msg });
    });
    
    return groups;
  }

  const groupedMessages = groupMessagesByDate(messages);

  // Theme colors
  const theme = {
    dark: {
      bg: 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900',
      sidebar: 'bg-slate-900/95 backdrop-blur-xl',
      sidebarBorder: 'border-purple-500/20',
      header: 'bg-slate-800/90 backdrop-blur-xl',
      headerBorder: 'border-purple-500/20',
      chatBg: 'bg-slate-950',
      messageBubbleYou: 'bg-gradient-to-br from-purple-600/90 to-pink-600/90',
      messageBubbleOther: 'bg-slate-800/90 backdrop-blur-sm',
      inputBg: 'bg-slate-800/80',
      inputField: 'bg-slate-700/50',
      text: 'text-slate-100',
      textMuted: 'text-slate-400',
      accent: 'text-purple-400',
      button: 'bg-purple-600 hover:bg-purple-500',
      glow: 'shadow-lg shadow-purple-500/20',
      dateLabel: 'bg-slate-800/80 text-slate-300',
      codeBlock: 'bg-slate-900/80 border-purple-500/30',
      emojiPicker: 'bg-slate-800/95 border-purple-500/30'
    },
    light: {
      bg: 'bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50',
      sidebar: 'bg-white/95 backdrop-blur-xl',
      sidebarBorder: 'border-purple-200',
      header: 'bg-white/90 backdrop-blur-xl',
      headerBorder: 'border-purple-200',
      chatBg: 'bg-gradient-to-br from-pink-50/50 via-purple-50/50 to-blue-50/50',
      messageBubbleYou: 'bg-gradient-to-br from-purple-400 to-pink-400',
      messageBubbleOther: 'bg-white/90 backdrop-blur-sm',
      inputBg: 'bg-white/80',
      inputField: 'bg-purple-50/50',
      text: 'text-slate-800',
      textMuted: 'text-slate-500',
      accent: 'text-purple-600',
      button: 'bg-purple-500 hover:bg-purple-600',
      glow: 'shadow-lg shadow-purple-300/40',
      dateLabel: 'bg-white/80 text-slate-600',
      codeBlock: 'bg-slate-50 border-purple-300',
      emojiPicker: 'bg-white/95 border-purple-200'
    }
  };

  const t = isDark ? theme.dark : theme.light;

  // Auth gate UI (UNCHANGED LOGIC)
  if (!authChecked || !authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        {authChecked && !authed && (
          <div className="text-center px-6">
            <div className="text-8xl mb-6 animate-bounce">🤔</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              Oops! Let's try that again! 
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              What's really on your mind? 💭
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Share your thoughts with the right passphrase! ✨
            </p>
            <button
              onClick={retryAuth}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Share What's In Your Mind 🚀
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`h-screen flex ${t.bg} transition-all duration-500`}>
      {/* Left Sidebar - Chat List */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative z-30 w-full sm:w-96 h-full ${t.sidebar} transition-all duration-300 flex flex-col border-r ${t.sidebarBorder}`}
        style={{ boxShadow: isDark ? '0 0 30px rgba(168, 85, 247, 0.15)' : '0 0 30px rgba(168, 85, 247, 0.1)' }}
      >
        {/* Sidebar Header */}
        <div className={`${t.header} px-4 py-4 flex items-center justify-between border-b ${t.headerBorder}`}>
          <h1 className={`${t.text} text-xl font-semibold tracking-wide`}>Chats</h1>
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`p-2 ${t.inputField} rounded-full transition-all duration-300 hover:scale-110`}
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-purple-600" />}
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          <div className={`${t.inputField} mx-2 my-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${t.glow}`}>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 border-purple-400/50 shadow-lg shadow-purple-500/30">
                <img 
                  src="https://i.imgur.com/your-uploaded-image.jpg" 
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg" style={{ display: 'none' }}>
                  CS
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`${t.text} font-semibold text-base tracking-wide`}>Hoyean Jung</h3>
                  <span className={`${t.textMuted} text-xs`}>{messages.length > 0 ? formatTime(messages[messages.length - 1].ts) : ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`${t.textMuted} text-sm truncate`}>
                    {messages.length > 0 ? (
                      <span>{messages[messages.length - 1].user}: {messages[messages.length - 1].text.substring(0, 30)}{messages[messages.length - 1].text.length > 30 ? '...' : ''}</span>
                    ) : (
                      'No messages yet'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className={`lg:hidden absolute top-4 right-4 p-2 rounded-full ${t.inputField}`}
        >
          <X className={`w-5 h-5 ${t.textMuted}`} />
        </button>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <header className={`${t.header} px-4 py-3 flex items-center justify-between border-b ${t.headerBorder}`}
          style={{ boxShadow: isDark ? '0 4px 20px rgba(168, 85, 247, 0.15)' : '0 4px 20px rgba(168, 85, 247, 0.1)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`lg:hidden p-2 ${t.inputField} rounded-full transition-all duration-300 hover:scale-110`}
            >
              <Menu className={`w-5 h-5 ${t.textMuted}`} />
            </button>
            
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 border-purple-400/50 shadow-lg shadow-purple-500/30">
              <img 
                src="https://i.imgur.com/your-uploaded-image.jpg" 
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold" style={{ display: 'none' }}>
                CS
              </div>
            </div>
            <div>
              <h2 className={`${t.text} font-semibold tracking-wide`}>Hoyean Jung</h2>
              <p className={`${t.textMuted} text-xs`}>{messages.length} messages</p>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div 
          className={`flex-1 overflow-y-auto px-4 sm:px-16 py-6 ${t.chatBg} transition-all duration-500`}
          style={{
            backgroundImage: isDark 
              ? `radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.03) 0%, transparent 50%)`
              : `radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.05) 0%, transparent 50%)`
          }}
        >
          {messages.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${t.textMuted}`}>
              <div className={`w-24 h-24 ${t.inputField} rounded-full flex items-center justify-center mb-4 ${t.glow}`}>
                <Code2 className="w-12 h-12" />
              </div>
              <p className={`text-lg mb-1 ${t.text} font-semibold`}>Hoyean Jung</p>
              <p className={`text-sm ${t.textMuted}`}>Start sharing your thoughts!!!</p>
            </div>
          ) : (
            groupedMessages.map((item, idx) => {
              if (item.type === 'date') {
                return (
                  <div key={`date-${idx}`} className="flex justify-center my-4">
                    <div className={`${t.dateLabel} text-xs px-4 py-2 rounded-full ${t.glow} backdrop-blur-sm font-medium`}>
                      {getDateLabel(item.timestamp)}
                    </div>
                  </div>
                );
              }

              const msg = item.data;
              const isCodeMsg = isCode(msg.text);
              const isYou = msg.user.toLowerCase() === 'you';
              
              return (
                <div key={msg.id} className={`flex mb-3 ${isYou ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-in]`}>
                  <div className={`group max-w-[85%] sm:max-w-[65%] ${isYou ? t.messageBubbleYou : t.messageBubbleOther} rounded-2xl ${t.glow} transition-all duration-300 hover:scale-[1.02]`}>
                    {/* Message Header - only show for received messages */}
                    {!isYou && (
                      <div className="px-4 pt-3 pb-1">
                        <span className={`${isDark ? 'text-purple-400' : 'text-purple-600'} text-sm font-semibold`}>{msg.user}</span>
                      </div>
                    )}
                    
                    {/* Message Content */}
                    {isCodeMsg ? (
                      <div className="px-4 pb-3">
                        <div className={`${t.codeBlock} rounded-xl overflow-hidden border mb-2`}>
                          <div className={`flex items-center justify-between px-3 py-2 ${t.inputField} border-b ${t.headerBorder}`}>
                            <div className="flex items-center gap-2">
                              <Code2 className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                              <span className={`${t.textMuted} text-xs font-mono font-semibold`}>Code Snippet</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {msg.text.split('\n').length > 5 && (
                                <button
                                  onClick={() => toggleCodeExpansion(msg.id)}
                                  className={`p-1.5 ${t.inputField} rounded-lg transition-all duration-300 hover:scale-110 flex items-center gap-1`}
                                >
                                  {expandedMessages[msg.id] ? (
                                    <>
                                      <ChevronUp className={`w-4 h-4 ${t.textMuted}`} />
                                      <span className={`${t.textMuted} text-xs`}>Collapse</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className={`w-4 h-4 ${t.textMuted}`} />
                                      <span className={`${t.textMuted} text-xs`}>Expand</span>
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => copyToClipboard(msg.text, msg.id)}
                                className={`p-1.5 ${t.inputField} rounded-lg transition-all duration-300 hover:scale-110`}
                              >
                                {copiedId === msg.id ? (
                                  <Check className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                                ) : (
                                  <Copy className={`w-4 h-4 ${t.textMuted}`} />
                                )}
                              </button>
                            </div>
                          </div>
                          <pre className={`p-4 text-xs overflow-x-auto transition-all ${
                            msg.text.split('\n').length > 5 && !expandedMessages[msg.id] 
                              ? 'max-h-32 overflow-hidden relative' 
                              : ''
                          }`}>
                            <code className={`font-mono ${t.text}`}>{msg.text}</code>
                            {msg.text.split('\n').length > 5 && !expandedMessages[msg.id] && (
                              <div className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t ${isDark ? 'from-slate-900/80' : 'from-slate-50'} to-transparent`}></div>
                            )}
                          </pre>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <span className={`${isYou ? 'text-purple-200' : t.textMuted} text-xs`}>{formatTime(msg.ts)}</span>
                          {isYou && <Check className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-3">
                        <p className={`${isYou ? 'text-white' : t.text} text-sm leading-relaxed whitespace-pre-wrap break-words mb-2 pt-2`}>
                          {msg.text}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          <span className={`${isYou ? 'text-purple-200' : t.textMuted} text-xs`}>{formatTime(msg.ts)}</span>
                          {isYou && <Check className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className={`${t.inputBg} px-4 py-4 border-t ${t.headerBorder} backdrop-blur-xl`}>
          <div className="flex items-end gap-3 relative">
            <div className="relative">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2.5 ${t.inputField} rounded-full transition-all duration-300 hover:scale-110 mb-1`}
              >
                <Smile className={`w-6 h-6 ${t.textMuted}`} />
              </button>
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className={`absolute bottom-full left-0 mb-2 ${t.emojiPicker} rounded-2xl shadow-2xl border p-3 w-72 z-50 backdrop-blur-xl`}>
                  <div className="grid grid-cols-8 gap-2">
                    {emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => insertEmoji(emoji)}
                        className={`text-2xl ${t.inputField} rounded-lg p-2 transition-all duration-300 hover:scale-125`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`flex-1 ${t.inputField} rounded-2xl overflow-hidden backdrop-blur-sm ${t.glow}`}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  const paste = e.clipboardData.getData('text');
                  setText(text + paste);
                }}
                placeholder="Type a message"
                className={`w-full px-4 py-3 bg-transparent ${t.text} placeholder-opacity-50 ${t.textMuted.replace('text-', 'placeholder-')} resize-none focus:outline-none text-sm`}
                rows="1"
                style={{ maxHeight: '120px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={!text.trim()}
              className={`p-3 ${t.button} disabled:opacity-40 rounded-full transition-all duration-300 mb-1 disabled:cursor-not-allowed hover:scale-110 ${t.glow}`}
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-20 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        * {
          transition-property: background-color, border-color, color, fill, stroke;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 300ms;
        }
      `}</style>
    </div>
  );
}