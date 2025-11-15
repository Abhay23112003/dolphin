"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Copy, Check, Code2, FileText, Clock, Lock } from "lucide-react";

export default function Home() {
  // --- PASSPHRASE GATE ---
  const SECRET = "codestory";
  const SESSION_KEY = "workspace_authed_v1_session";

  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // This runs exactly once on mount
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
      // User clicked cancel or entered wrong password
      setAuthed(false);
    }

    setAuthChecked(true);
  }, []);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  // load existing messages
  useEffect(() => {
    if (!authed) return;
    
    async function load() {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setMessages(data || []);
    }
    load();
  }, [authed]);

  // realtime updates from Pusher
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
    
    // Handle normal messages
    channel.bind("new-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Handle large messages - refresh from API to get full content
    channel.bind("large-message-posted", async () => {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setMessages(data || []);
    });

    return () => {
      pusher.unsubscribe("workspace-channel");
    };
  }, [authed]);

  // send message to API
  async function sendMessage() {
    if (!text.trim()) return;

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: "you", text }),
    });

    setText("");
  }

  // copy to clipboard
  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // detect if message is code
  function isCode(text) {
    const codeIndicators = ['{', '}', '()', '=>', 'function', 'const', 'let', 'var', 'import', 'export', '</', '/>'];
    return codeIndicators.some(indicator => text.includes(indicator));
  }

  // auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Retry authentication
  function retryAuth() {
    let pass = prompt("What's in your mind?");
    if (pass === SECRET) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setAuthed(false);
    }
  }

  // Show white screen while checking auth or if not authenticated
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CodeShare</h1>
              <p className="text-sm text-slate-400">Real-time code & text collaboration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Messages Container */}
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Messages Area */}
          <div
            id="messages"
            className="h-[calc(100vh-280px)] min-h-[400px] overflow-y-auto p-6 space-y-4 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <FileText className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">No messages yet</p>
                <p className="text-sm">Share your first code snippet or text</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="group bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                        {msg.user?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="text-slate-300 font-medium">{msg.user}</span>
                      <span className="text-slate-600">•</span>
                      <div className="flex items-center gap-1 text-slate-500 text-sm">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.ts).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(msg.text, msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-slate-700/50 rounded-lg"
                      title="Copy to clipboard"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  <div className={`${isCode(msg.text) ? 'bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 font-mono text-sm overflow-x-auto' : 'text-slate-200'}`}>
                    <pre className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </pre>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-700/50 bg-slate-900/50 p-6">
            <div className="flex gap-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message, paste code, or share text..."
                className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                rows="3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim()}
                className="self-end px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:shadow-none"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs mt-2">
                Press Ctrl+Enter or Cmd+Enter to send
              </p>
              <p className="text-slate-500 text-xs mt-2">
                {text.length.toLocaleString()} characters
                {text.length > 5000 && <span className="text-yellow-400 ml-2">⚡ Large message</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.7);
        }
      `}</style>
    </div>
  );
}