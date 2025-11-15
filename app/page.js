"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Copy, Check, Code2, Menu, X, Smile, MoreVertical, Phone, Video, ChevronDown, ChevronUp } from "lucide-react";

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
    <div className="h-screen flex bg-[#111b21]">
      {/* Left Sidebar - Chat List */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative z-30 w-full sm:w-96 h-full bg-[#111b21] transition-transform duration-300 flex flex-col border-r border-[#2a3942]`}
      >
        {/* Sidebar Header */}
        <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between">
          <h1 className="text-white text-xl font-medium">Chats</h1>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-[#aebac1]" />
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          <div className="bg-[#202c33] px-4 py-3 hover:bg-[#2a3942] cursor-pointer border-b border-[#111b21]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0">
                CS
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[#e9edef] font-medium text-base">CodeShare Workspace</h3>
                  <span className="text-[#667781] text-xs">{messages.length > 0 ? formatTime(messages[messages.length - 1].ts) : ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[#667781] text-sm truncate">
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
          className="lg:hidden absolute top-4 right-4 p-2 rounded-full bg-[#202c33]"
        >
          <X className="w-5 h-5 text-[#aebac1]" />
        </button>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <header className="bg-[#202c33] px-4 py-2.5 flex items-center justify-between border-b border-[#2a3942]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-[#2a3942] rounded-full"
            >
              <Menu className="w-5 h-5 text-[#aebac1]" />
            </button>
            
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
              CS
            </div>
            <div>
              <h2 className="text-[#e9edef] font-medium">CodeShare Workspace</h2>
              <p className="text-[#667781] text-xs">{messages.length} messages</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
              <Video className="w-5 h-5 text-[#aebac1]" />
            </button>
            <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
              <Phone className="w-5 h-5 text-[#aebac1]" />
            </button>
            <button className="p-2 hover:bg-[#2a3942] rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-[#aebac1]" />
            </button>
          </div>
        </header>

        {/* Messages Area - WhatsApp Pattern Background */}
        <div 
          className="flex-1 overflow-y-auto px-4 sm:px-16 py-4"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: '#0b141a'
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#667781]">
              <div className="w-20 h-20 border-4 border-[#667781] rounded-full flex items-center justify-center mb-4">
                <Code2 className="w-10 h-10" />
              </div>
              <p className="text-lg mb-1">CodeShare Workspace</p>
              <p className="text-sm">Start sharing code and messages</p>
            </div>
          ) : (
            groupedMessages.map((item, idx) => {
              if (item.type === 'date') {
                return (
                  <div key={`date-${idx}`} className="flex justify-center my-3">
                    <div className="bg-[#202c33] text-[#e9edef] text-xs px-3 py-1.5 rounded-md shadow-sm">
                      {getDateLabel(item.timestamp)}
                    </div>
                  </div>
                );
              }

              const msg = item.data;
              const isCodeMsg = isCode(msg.text);
              const isYou = msg.user.toLowerCase() === 'you';
              
              return (
                <div key={msg.id} className={`flex mb-2 ${isYou ? 'justify-end' : 'justify-start'}`}>
                  <div className={`group max-w-[85%] sm:max-w-[65%] ${isYou ? 'bg-[#005c4b]' : 'bg-[#202c33]'} rounded-lg shadow-sm`}>
                    {/* Message Header - only show for received messages */}
                    {!isYou && (
                      <div className="px-3 pt-2 pb-1">
                        <span className="text-[#06cf9c] text-sm font-medium">{msg.user}</span>
                      </div>
                    )}
                    
                    {/* Message Content */}
                    {isCodeMsg ? (
                      <div className="px-3 pb-2">
                        <div className="bg-[#0b141a] rounded-md overflow-hidden border border-[#2a3942] mb-1">
                          <div className="flex items-center justify-between px-2 py-1.5 bg-[#111b21] border-b border-[#2a3942]">
                            <div className="flex items-center gap-1.5">
                              <Code2 className="w-3.5 h-3.5 text-[#00a884]" />
                              <span className="text-[#aebac1] text-xs font-mono">Code Snippet</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {msg.text.split('\n').length > 5 && (
                                <button
                                  onClick={() => toggleCodeExpansion(msg.id)}
                                  className="p-1 hover:bg-[#2a3942] rounded transition-colors flex items-center gap-1"
                                >
                                  {expandedMessages[msg.id] ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5 text-[#aebac1]" />
                                      <span className="text-[#aebac1] text-xs">Collapse</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5 text-[#aebac1]" />
                                      <span className="text-[#aebac1] text-xs">Expand</span>
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => copyToClipboard(msg.text, msg.id)}
                                className="p-1 hover:bg-[#2a3942] rounded transition-colors"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-[#00a884]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-[#aebac1]" />
                                )}
                              </button>
                            </div>
                          </div>
                          <pre className={`p-3 text-xs overflow-x-auto transition-all ${
                            msg.text.split('\n').length > 5 && !expandedMessages[msg.id] 
                              ? 'max-h-32 overflow-hidden relative' 
                              : ''
                          }`}>
                            <code className="font-mono text-[#e9edef]">{msg.text}</code>
                            {msg.text.split('\n').length > 5 && !expandedMessages[msg.id] && (
                              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0b141a] to-transparent"></div>
                            )}
                          </pre>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[#667781] text-xs">{formatTime(msg.ts)}</span>
                          {isYou && <Check className="w-4 h-4 text-[#53bdeb]" />}
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 pb-2">
                        <p className="text-[#e9edef] text-sm leading-relaxed whitespace-pre-wrap break-words mb-1">
                          {msg.text}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[#667781] text-xs">{formatTime(msg.ts)}</span>
                          {isYou && <Check className="w-4 h-4 text-[#53bdeb]" />}
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

        {/* Message Input - WhatsApp Style */}
        <div className="bg-[#202c33] px-4 py-3 border-t border-[#2a3942]">
          <div className="flex items-end gap-2 relative">
            <div className="relative">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 hover:bg-[#2a3942] rounded-full transition-colors mb-1"
              >
                <Smile className="w-6 h-6 text-[#aebac1]" />
              </button>
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#202c33] rounded-lg shadow-xl border border-[#2a3942] p-2 w-64 z-50">
                  <div className="grid grid-cols-8 gap-1">
                    {emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => insertEmoji(emoji)}
                        className="text-2xl hover:bg-[#2a3942] rounded p-1 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 bg-[#2a3942] rounded-lg overflow-hidden">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  const paste = e.clipboardData.getData('text');
                  setText(text + paste);
                }}
                placeholder="Type a message"
                className="w-full px-3 py-2.5 bg-transparent text-[#e9edef] placeholder-[#667781] resize-none focus:outline-none text-sm"
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
              className="p-2.5 bg-[#00a884] hover:bg-[#06cf9c] disabled:bg-[#2a3942] rounded-full transition-colors mb-1 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}