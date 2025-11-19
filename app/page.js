"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Copy, Check, Code2, Menu, X, Smile, ChevronDown, ChevronUp, Moon, Sun, Paperclip, Download, Image as ImageIcon, File, X as XIcon } from "lucide-react";

// inside your component file (or import them from a helper)
import { supabase } from '../lib/supabaseClient.js'; // adjust path

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
const BUCKET = 'chat-files';

// XHR uploader with progress callback
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Collapsible text configuration
const MAX_LINES_BEFORE_COLLAPSE = 6;
const LINE_HEIGHT = 24;
const MAX_HEIGHT_COLLAPSED = MAX_LINES_BEFORE_COLLAPSE * LINE_HEIGHT;

// helper: ensure message.file.url exists (returns a message copy)
async function ensureFileUrlForMessage(msg) {
  if (!msg?.file) return msg;
  if (msg.file.url) return msg;

  try {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(msg.file.key);
    const publicUrl = data?.publicUrl || null;
    return {
      ...msg,
      file: {
        ...msg.file,
        url: publicUrl
      }
    };
  } catch (err) {
    const fallback = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(msg.file.key)}`;
    return { ...msg, file: { ...msg.file, url: fallback } };
  }
}

async function enrichMessagesWithFileUrls(msgs) {
  const out = [];
  for (const m of msgs) {
    out.push(await ensureFileUrlForMessage(m));
  }
  return out;
}

async function uploadFileToSupabase(file, onProgress = () => { }) {
  if (!file) return null;
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File too large (max 100 MB).');
  }

  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
  const uploadPath = encodeURIComponent(uniqueName);
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${uploadPath}`;

  const uploadPromise = new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('apikey', SUPABASE_ANON);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress({ percent, loaded: e.loaded, total: e.total });
      }
    };

    xhr.onload = async () => {
      const text = xhr.responseText;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const { data: publicData } = await supabase
            .storage
            .from(BUCKET)
            .getPublicUrl(uniqueName);

          resolve({
            key: uniqueName,
            name: file.name,
            size: file.size,
            type: file.type,
            url: publicData?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${uploadPath}`
          });
        } catch (err) {
          resolve({
            key: uniqueName,
            name: file.name,
            size: file.size,
            type: file.type,
            url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${uploadPath}`
          });
        }
      } else {
        let serverMsg = text;
        try { serverMsg = JSON.parse(text); } catch (e) { }
        reject(new Error(`Upload failed (${xhr.status}): ${typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.onabort = () => reject(new Error('Upload aborted'));

    xhr.send(file);
  });

  return uploadPromise;
}

async function getDownloadUrl(key) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data?.publicUrl || null;
}

function isImageFile(filename) {
  if (!filename) return false;
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(filename);
}

function getFileExtension(filename) {
  if (!filename) return 'FILE';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
}

function truncateFilename(filename, maxLength = 25) {
  if (!filename || filename.length <= maxLength) return filename;
  const ext = filename.split('.').pop();
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - ext.length - 4) + '...';
  return truncatedName + '.' + ext;
}

export default function Home() {
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('../lib/supabaseClient').catch(err => {
          console.error('DEBUG: dynamic import failed:', err && err.message ? err.message : err);
          return null;
        });

        if (!mounted) return;

        if (!mod || !mod.supabase) {
          console.warn('DEBUG: lib/supabaseClient did not export supabase or module is null. module=', mod);
          console.log('DEBUG: NEXT_PUBLIC_SUPABASE_URL (prefix):', (process.env.NEXT_PUBLIC_SUPABASE_URL || '').slice(0, 20));
          console.log('DEBUG: NEXT_PUBLIC_SUPABASE_ANON_KEY (prefix):', (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').slice(0, 8));
          window.supabase = null;
          return;
        }

        window.supabase = mod.supabase;
        console.log('DEBUG: supabase client loaded and exposed to window. Keys:', Object.keys(mod.supabase));
        console.log('DEBUG: typeof supabase.storage =', typeof mod.supabase.storage);
        console.log('DEBUG: supabase.storage.from exists?', typeof mod.supabase.storage?.from === 'function');

      } catch (err) {
        console.error('DEBUG: unexpected error when importing supabaseClient:', err);
        window.supabase = null;
      }
    })();

    return () => { mounted = false; try { delete window.supabase } catch (e) { } };
  }, []);

  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [expandedTexts, setExpandedTexts] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    if (isImageFile(selectedFile.name)) {
      const previewUrl = URL.createObjectURL(selectedFile);
      setFilePreviewUrl(previewUrl);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const removeFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFile(null);
    setFilePreviewUrl(null);
    setUploadProgress(0);
    setUploadedBytes(0);
  };

  useEffect(() => {
    if (!authed) return;

    async function load() {
      const res = await fetch("/api/messages");
      const data = await res.json();
      if (!data) {
        setMessages([]);
        return;
      }
      const enriched = await enrichMessagesWithFileUrls(data);
      setMessages(enriched);
    }
    load();
  }, [authed]);

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

    channel.bind("new-message", async (msg) => {
      const enriched = await ensureFileUrlForMessage(msg);
      setMessages((prev) => [...prev, enriched]);
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

  async function sendMessage() {
    if (!text.trim() && !file) return;

    let fileMeta = null;
    if (file) {
      try {
        setUploading(true);
        setUploadProgress(0);
        setUploadedBytes(0);

        fileMeta = await uploadFileToSupabase(file, ({ percent, loaded, total }) => {
          setUploadProgress(percent);
          setUploadedBytes(loaded);
        });
      } catch (err) {
        alert('Upload failed: ' + (err.message || err.error || err));
        setUploading(false);
        setUploadProgress(0);
        setUploadedBytes(0);
        return;
      } finally {
        setUploading(false);
      }
    }

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'you', text, file: fileMeta }),
    });

    setText('');
    removeFile();
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function isCode(text) {
    const codeIndicators = ['{', '}', '()', '=>', 'function', 'const', 'let', 'var', 'import', 'export', '</', '/>'];
    return codeIndicators.some(indicator => text.includes(indicator));
  }

  function toggleCodeExpansion(msgId) {
    setExpandedMessages(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  }

  function toggleTextExpansion(msgId) {
    setExpandedTexts(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  }

  function shouldCollapseText(text) {
    if (!text) return false;
    const lines = text.split('\n').length;
    return lines > MAX_LINES_BEFORE_COLLAPSE;
  }

  const emojis = ['😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤔', '👍', '👏', '🙌', '🔥', '✨', '💯', '❤️', '🎉', '👀', '💪', '🚀', '✅', '⚡', '💡', '🎯', '🏆'];

  function insertEmoji(emoji) {
    setText(text + emoji);
    setShowEmojiPicker(false);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function retryAuth() {
    let pass = prompt("What's in your mind?");
    if (pass === SECRET) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setAuthed(false);
    }
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function getDateLabel(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

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

  if (!authChecked || !authed) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: isDark ? 'var(--color-charcoal-700)' : 'var(--color-cream-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {authChecked && !authed && (
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>🤔</div>
            <h2 style={{ 
              fontSize: '30px', 
              fontWeight: '600', 
              color: isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)',
              marginBottom: '12px'
            }}>
              Oops! Let's try that again!
            </h2>
            <p style={{ 
              fontSize: '16px', 
              color: isDark ? 'var(--color-gray-300)' : 'var(--color-slate-500)',
              marginBottom: '8px'
            }}>
              What's really on your mind? 💭
            </p>
            <p style={{ 
              fontSize: '14px', 
              color: isDark ? 'var(--color-gray-300)' : 'var(--color-slate-500)',
              marginBottom: '32px'
            }}>
              Share your thoughts with the right passphrase! ✨
            </p>
            <button
              onClick={retryAuth}
              style={{
                padding: '12px 32px',
                background: 'var(--color-primary)',
                color: 'var(--color-btn-primary-text)',
                borderRadius: 'var(--radius-full)',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--color-primary-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--color-primary)'}
            >
              Share What's In Your Mind 🚀
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex',
      background: isDark ? 'var(--color-charcoal-700)' : 'var(--color-cream-50)',
      fontFamily: 'var(--font-family-base)',
      color: isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)'
    }}>
      {/* Left Sidebar */}
      <aside
        style={{
          position: sidebarOpen ? 'fixed' : 'relative',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          width: '384px',
          height: '100%',
          background: isDark ? 'var(--color-charcoal-800)' : 'var(--color-cream-100)',
          borderRight: `1px solid ${isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)'}`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s',
          zIndex: 30
        }}
        className="sidebar-responsive"
      >
        {/* Sidebar Header */}
        <div style={{
          background: isDark ? 'rgba(38, 40, 40, 0.9)' : 'rgba(255, 255, 253, 0.9)',
          backdropFilter: 'blur(12px)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)'}`
        }}>
          <h1 style={{ 
            fontSize: 'var(--font-size-xl)', 
            fontWeight: 'var(--font-weight-semibold)',
            margin: 0
          }}>
            Chats
          </h1>
          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              padding: '8px',
              background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s'
            }}
          >
            {isDark ? <Sun size={20} color="var(--color-teal-300)" /> : <Moon size={20} color="var(--color-teal-500)" />}
          </button>
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{
            background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
            margin: '12px 8px',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: `2px solid ${isDark ? 'var(--color-teal-300)' : 'var(--color-teal-500)'}`,
                flexShrink: 0
              }}>
                <img
                  src="\leo-jimenez-02-hoyeon-jung-p3.jpg"
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(135deg, ${isDark ? 'var(--color-teal-300)' : 'var(--color-teal-500)'}, var(--color-primary))`,
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDark ? 'var(--color-slate-900)' : 'var(--color-cream-50)',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  CS
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <h3 style={{ 
                    fontSize: 'var(--font-size-base)', 
                    fontWeight: 'var(--font-weight-semibold)',
                    margin: 0
                  }}>
                    Hoyean Jung
                  </h3>
                  <span style={{ 
                    fontSize: 'var(--font-size-xs)',
                    color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'
                  }}>
                    {messages.length > 0 ? formatTime(messages[messages.length - 1].ts) : ''}
                  </span>
                </div>
                <p style={{ 
                  fontSize: 'var(--font-size-sm)',
                  color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
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

        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '8px',
            background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            cursor: 'pointer',
            display: 'none'
          }}
          className="sidebar-close-btn"
        >
          <X size={20} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
        </button>
      </aside>

      {/* Main Chat Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Chat Header */}
        <header style={{
          background: isDark ? 'rgba(38, 40, 40, 0.9)' : 'rgba(255, 255, 253, 0.9)',
          backdropFilter: 'blur(12px)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                padding: '8px',
                background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                cursor: 'pointer',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s'
              }}
              className="menu-btn-mobile"
            >
              <Menu size={20} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
            </button>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: `2px solid ${isDark ? 'var(--color-teal-300)' : 'var(--color-teal-500)'}`,
              flexShrink: 0
            }}>
              <img
                src="\leo-jimenez-02-hoyeon-jung-p3.jpg"
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, ${isDark ? 'var(--color-teal-300)' : 'var(--color-teal-500)'}, var(--color-primary))`,
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? 'var(--color-slate-900)' : 'var(--color-cream-50)',
                fontWeight: 'bold'
              }}>
                CS
              </div>
            </div>
            <div>
              <h2 style={{ 
                fontSize: 'var(--font-size-base)', 
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0
              }}>
                Hoyean Jung
              </h2>
              <p style={{ 
                fontSize: 'var(--font-size-xs)',
                color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)',
                margin: 0
              }}>
                {messages.length} messages
              </p>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 64px',
            background: isDark ? 'var(--color-background)' : 'var(--color-cream-50)'
          }}
        >
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'
            }}>
              <div style={{
                width: '96px',
                height: '96px',
                background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Code2 size={48} />
              </div>
              <p style={{ 
                fontSize: 'var(--font-size-lg)', 
                marginBottom: '4px',
                fontWeight: 'var(--font-weight-semibold)',
                color: isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)'
              }}>
                Hoyean Jung
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)' }}>
                Start sharing your thoughts!!!
              </p>
            </div>
          ) : (
            groupedMessages.map((item, idx) => {
              if (item.type === 'date') {
                return (
                  <div key={`date-${idx}`} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                    <div style={{
                      background: isDark ? 'rgba(38, 40, 40, 0.8)' : 'rgba(255, 255, 253, 0.8)',
                      color: isDark ? 'var(--color-gray-300)' : 'var(--color-slate-600)',
                      fontSize: 'var(--font-size-xs)',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 'var(--font-weight-medium)'
                    }}>
                      {getDateLabel(item.timestamp)}
                    </div>
                  </div>
                );
              }

              const msg = item.data;
              const isCodeMsg = isCode(msg.text);
              const isYou = msg.user.toLowerCase() === 'you';
              const hasLongText = shouldCollapseText(msg.text);
              const isTextCollapsed = !expandedTexts[msg.id];

              return (
                <div key={msg.id} style={{
                  display: 'flex',
                  marginBottom: '12px',
                  justifyContent: isYou ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    maxWidth: '65%',
                    background: isYou 
                      ? (isDark ? 'var(--color-teal-300)' : 'var(--color-teal-500)')
                      : (isDark ? 'rgba(38, 40, 40, 0.9)' : 'rgba(255, 255, 253, 0.9)'),
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.3s'
                  }}>
                    {!isYou && (
                      <div style={{ padding: '12px 16px 4px' }}>
                        <span style={{
                          color: isDark ? 'var(--color-teal-300)' : 'var(--color-teal-600)',
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-semibold)'
                        }}>
                          {msg.user}
                        </span>
                      </div>
                    )}

                    {isCodeMsg ? (
                      <div style={{ padding: '0 16px 12px' }}>
                        <div style={{
                          background: isDark ? 'rgba(31, 33, 33, 0.8)' : 'var(--color-gray-200)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: `1px solid ${isDark ? 'rgba(50, 184, 198, 0.3)' : 'rgba(33, 128, 141, 0.3)'}`
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                            borderBottom: `1px solid ${isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)'}`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Code2 size={16} color={isDark ? 'var(--color-teal-300)' : 'var(--color-teal-600)'} />
                              <span style={{
                                fontSize: 'var(--font-size-xs)',
                                fontFamily: 'var(--font-family-mono)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'
                              }}>
                                Code Snippet
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {msg.text.split('\n').length > 5 && (
                                <button
                                  onClick={() => toggleCodeExpansion(msg.id)}
                                  style={{
                                    padding: '6px',
                                    background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.3s'
                                  }}
                                >
                                  {expandedMessages[msg.id] ? (
                                    <>
                                      <ChevronUp size={16} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
                                      <span style={{ fontSize: 'var(--font-size-xs)', color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)' }}>Collapse</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={16} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
                                      <span style={{ fontSize: 'var(--font-size-xs)', color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)' }}>Show all</span>
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => copyToClipboard(msg.text, msg.id)}
                                style={{
                                  padding: '6px',
                                  background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s'
                                }}
                              >
                                {copiedId === msg.id ? (
                                  <Check size={16} color={isDark ? 'var(--color-teal-300)' : 'var(--color-teal-600)'} />
                                ) : (
                                  <Copy size={16} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
                                )}
                              </button>
                            </div>
                          </div>
                          <pre style={{
                            padding: '16px',
                            fontSize: 'var(--font-size-xs)',
                            overflowX: 'auto',
                            maxHeight: msg.text.split('\n').length > 5 && !expandedMessages[msg.id] ? '128px' : 'none',
                            overflow: msg.text.split('\n').length > 5 && !expandedMessages[msg.id] ? 'hidden' : 'visible',
                            position: 'relative',
                            margin: 0
                          }}>
                            <code style={{
                              fontFamily: 'var(--font-family-mono)',
                              color: isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)'
                            }}>
                              {msg.text}
                            </code>
                          </pre>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '8px' }}>
                          <span style={{
                            fontSize: 'var(--font-size-xs)',
                            color: isYou ? (isDark ? 'rgba(19, 52, 59, 0.7)' : 'rgba(252, 252, 249, 0.9)') : (isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)')
                          }}>
                            {formatTime(msg.ts)}
                          </span>
                          {isYou && <Check size={16} color={isDark ? 'var(--color-slate-900)' : 'var(--color-cream-50)'} />}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '0 16px 12px' }}>
                        <div style={{ position: 'relative' }}>
                          <p style={{
                            color: isYou ? (isDark ? 'var(--color-slate-900)' : 'var(--color-cream-50)') : (isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)'),
                            fontSize: 'var(--font-size-sm)',
                            lineHeight: 'var(--line-height-normal)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            paddingTop: '8px',
                            maxHeight: hasLongText && isTextCollapsed ? `${MAX_HEIGHT_COLLAPSED}px` : 'none',
                            overflow: hasLongText && isTextCollapsed ? 'hidden' : 'visible',
                            margin: 0
                          }}>
                            {msg.text}
                          </p>
                        </div>

                        {hasLongText && (
                          <button
                            onClick={() => toggleTextExpansion(msg.id)}
                            style={{
                              marginTop: '8px',
                              fontSize: 'var(--font-size-xs)',
                              color: isYou ? (isDark ? 'rgba(19, 52, 59, 0.7)' : 'rgba(252, 252, 249, 0.9)') : (isDark ? 'var(--color-teal-300)' : 'var(--color-teal-600)'),
                              fontWeight: 'var(--font-weight-medium)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            {isTextCollapsed ? (
                              <>
                                <span>Show all</span>
                                <ChevronDown size={12} />
                              </>
                            ) : (
                              <>
                                <span>Collapse</span>
                                <ChevronUp size={12} />
                              </>
                            )}
                          </button>
                        )}

                        {msg.file && (
                          <div style={{
                            marginTop: '12px',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            background: isDark ? 'rgba(38, 40, 40, 0.5)' : 'rgba(168, 85, 247, 0.08)',
                            border: `1px solid ${isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)'}`
                          }}>
                            {isImageFile(msg.file.name) ? (
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={msg.file.url}
                                  alt={msg.file.name}
                                  style={{
                                    width: '100%',
                                    maxHeight: '320px',
                                    objectFit: 'cover',
                                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                                  }}
                                  loading="lazy"
                                />
                                <a
                                  href={msg.file.url}
                                  download={msg.file.name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    padding: '10px',
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    backdropFilter: 'blur(4px)',
                                    borderRadius: 'var(--radius-full)',
                                    display: 'flex',
                                    transition: 'all 0.3s',
                                    textDecoration: 'none'
                                  }}
                                  title="Download image"
                                >
                                  <Download size={20} color="white" />
                                </a>
                                <div style={{
                                  padding: '8px 12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                    <ImageIcon size={16} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
                                    <span style={{
                                      fontSize: 'var(--font-size-xs)',
                                      color: isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }} title={msg.file.name}>
                                      {truncateFilename(msg.file.name, 30)}
                                    </span>
                                  </div>
                                  <span style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)',
                                    marginLeft: '8px'
                                  }}>
                                    {(msg.file.size / (1024 * 1024)).toFixed(2)} MB
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: isYou ? 'rgba(255, 255, 255, 0.2)' : (isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)'),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <div style={{ textAlign: 'center' }}>
                                    <File size={16} color={isYou ? 'white' : (isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)')} />
                                    <span style={{
                                      fontSize: '7px',
                                      fontWeight: 'bold',
                                      color: isYou ? 'white' : (isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)')
                                    }}>
                                      {getFileExtension(msg.file.name)}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 'var(--font-weight-medium)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: isYou ? 'white' : (isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)')
                                  }} title={msg.file.name}>
                                    {truncateFilename(msg.file.name, 25)}
                                  </div>
                                  <div style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: isYou ? 'rgba(252, 252, 249, 0.8)' : (isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)')
                                  }}>
                                    {(msg.file.size / (1024 * 1024)).toFixed(2)} MB
                                  </div>
                                </div>

                                <a
                                  href={msg.file.url}
                                  download={msg.file.name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    padding: '8px',
                                    background: isYou ? 'rgba(255, 255, 255, 0.2)' : (isDark ? 'rgba(98, 108, 113, 0.8)' : 'var(--color-secondary)'),
                                    borderRadius: 'var(--radius-full)',
                                    display: 'flex',
                                    transition: 'all 0.3s',
                                    flexShrink: 0,
                                    textDecoration: 'none'
                                  }}
                                  title="Download file"
                                >
                                  <Download size={16} color={isYou ? 'white' : (isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)')} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px',
                          marginTop: '8px'
                        }}>
                          <span style={{
                            fontSize: 'var(--font-size-xs)',
                            color: isYou ? (isDark ? 'rgba(19, 52, 59, 0.7)' : 'rgba(252, 252, 249, 0.9)') : (isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)')
                          }}>
                            {formatTime(msg.ts)}
                          </span>
                          {isYou && <Check size={16} color={isDark ? 'var(--color-slate-900)' : 'var(--color-cream-50)'} />}
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
        <div style={{
          background: isDark ? 'rgba(38, 40, 40, 0.8)' : 'rgba(255, 255, 253, 0.8)',
          padding: '16px',
          borderTop: `1px solid ${isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)'}`,
          backdropFilter: 'blur(12px)'
        }}>
          {file && (
            <div style={{
              marginBottom: '12px',
              background: isDark ? 'rgba(38, 40, 40, 0.5)' : 'rgba(168, 85, 247, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              border: `1px solid ${isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)'}`,
              maxWidth: '384px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {filePreviewUrl ? (
                  <div style={{
                    position: 'relative',
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: `1px solid ${isDark ? 'rgba(50, 184, 198, 0.3)' : 'rgba(33, 128, 141, 0.3)'}`
                  }}>
                    <img
                      src={filePreviewUrl}
                      alt={file.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-sm)',
                    background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <File size={20} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
                      <span style={{
                        fontSize: '8px',
                        fontWeight: 'bold',
                        color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'
                      }}>
                        {getFileExtension(file.name)}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)',
                    marginBottom: '2px'
                  }} title={file.name}>
                    {truncateFilename(file.name, 20)}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'
                  }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                    {uploading && ` • ${uploadProgress}%`}
                  </div>

                  {uploading && (
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                      marginTop: '4px'
                    }}>
                      <div
                        style={{
                          height: '100%',
                          background: `linear-gradient(90deg, ${isDark ? 'var(--color-teal-300)' : 'var(--color-teal-500)'}, var(--color-primary))`,
                          width: `${uploadProgress}%`,
                          transition: 'width 0.3s'
                        }}
                      />
                    </div>
                  )}
                </div>

                {!uploading && (
                  <button
                    onClick={removeFile}
                    style={{
                      padding: '4px',
                      background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                      borderRadius: 'var(--radius-full)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      transition: 'all 0.3s',
                      flexShrink: 0
                    }}
                  >
                    <XIcon size={14} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
                  </button>
                )}

                {uploading && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ position: 'relative', width: '32px', height: '32px' }}>
                      <svg style={{ width: '32px', height: '32px', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: isDark ? 'rgba(167, 169, 169, 0.2)' : 'rgba(94, 82, 64, 0.2)' }} />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="2"
                          strokeDasharray={`${uploadProgress * 100.5 / 100}, 100.5`}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={isDark ? 'var(--color-teal-300)' : 'var(--color-teal-500)'} />
                            <stop offset="100%" stopColor="var(--color-primary)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)'
                      }}>
                        {uploadProgress}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  padding: '10px',
                  background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  transition: 'all 0.3s',
                  marginBottom: '4px'
                }}
              >
                <Smile size={24} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
              </button>

              {showEmojiPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '8px',
                  background: isDark ? 'rgba(38, 40, 40, 0.95)' : 'rgba(255, 255, 253, 0.95)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  border: `1px solid ${isDark ? 'rgba(50, 184, 198, 0.3)' : 'rgba(33, 128, 141, 0.3)'}`,
                  padding: '12px',
                  width: '288px',
                  zIndex: 50,
                  backdropFilter: 'blur(12px)'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '8px'
                  }}>
                    {emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => insertEmoji(emoji)}
                        style={{
                          fontSize: '24px',
                          background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative', marginBottom: '4px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <Paperclip size={24} color={isDark ? 'rgba(167, 169, 169, 0.7)' : 'var(--color-slate-500)'} />
              </label>
            </div>

            <div style={{
              flex: 1,
              background: isDark ? 'rgba(119, 124, 124, 0.15)' : 'rgba(94, 82, 64, 0.12)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              backdropFilter: 'blur(4px)'
            }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  const paste = e.clipboardData.getData('text');
                  setText(text + paste);
                }}
                placeholder="Type a message"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  color: isDark ? 'var(--color-gray-200)' : 'var(--color-slate-900)',
                  border: 'none',
                  resize: 'none',
                  outline: 'none',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family-base)',
                  maxHeight: '120px'
                }}
                rows="1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={uploading}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={(!text.trim() && !file) || uploading}
              style={{
                padding: '12px',
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                cursor: uploading || (!text.trim() && !file) ? 'not-allowed' : 'pointer',
                display: 'flex',
                transition: 'all 0.3s',
                marginBottom: '4px',
                opacity: uploading || (!text.trim() && !file) ? 0.4 : 1
              }}
              onMouseEnter={(e) => {
                if (!uploading && (text.trim() || file)) {
                  e.target.style.background = 'var(--color-primary-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--color-primary)';
              }}
            >
              {uploading ? (
                <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" fill="none" strokeDasharray="60">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 12 12"
                      to="360 12 12"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
              ) : (
                <Send size={20} color="var(--color-btn-primary-text)" />
              )}
            </button>
          </div>
        </div>
      </main>

      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 20,
            transition: 'opacity 0.3s'
          }}
          onClick={() => setSidebarOpen(false)}
          className="sidebar-overlay"
        />
      )}

      <style jsx global>{`
        @import url('https://r2cdn.perplexity.ai/fonts/FKGroteskNeue.woff2');

        :root {
          /* Perplexity Color Tokens - Light Mode */
          --color-white: rgba(255, 255, 255, 1);
          --color-black: rgba(0, 0, 0, 1);
          --color-cream-50: rgba(252, 252, 249, 1);
          --color-cream-100: rgba(255, 255, 253, 1);
          --color-gray-200: rgba(245, 245, 245, 1);
          --color-gray-300: rgba(167, 169, 169, 1);
          --color-gray-400: rgba(119, 124, 124, 1);
          --color-slate-500: rgba(98, 108, 113, 1);
          --color-brown-600: rgba(94, 82, 64, 1);
          --color-charcoal-700: rgba(31, 33, 33, 1);
          --color-charcoal-800: rgba(38, 40, 40, 1);
          --color-slate-900: rgba(19, 52, 59, 1);
          --color-teal-300: rgba(50, 184, 198, 1);
          --color-teal-400: rgba(45, 166, 178, 1);
          --color-teal-500: rgba(33, 128, 141, 1);
          --color-teal-600: rgba(29, 116, 128, 1);
          --color-teal-700: rgba(26, 104, 115, 1);
          --color-teal-800: rgba(41, 150, 161, 1);
          --color-red-400: rgba(255, 84, 89, 1);
          --color-red-500: rgba(192, 21, 47, 1);
          --color-orange-400: rgba(230, 129, 97, 1);
          --color-orange-500: rgba(168, 75, 47, 1);

          /* Semantic tokens */
          --color-background: var(--color-cream-50);
          --color-surface: var(--color-cream-100);
          --color-text: var(--color-slate-900);
          --color-text-secondary: var(--color-slate-500);
          --color-primary: var(--color-teal-500);
          --color-primary-hover: var(--color-teal-600);
          --color-primary-active: var(--color-teal-700);
          --color-secondary: rgba(94, 82, 64, 0.12);
          --color-secondary-hover: rgba(94, 82, 64, 0.2);
          --color-secondary-active: rgba(94, 82, 64, 0.25);
          --color-border: rgba(94, 82, 64, 0.2);
          --color-btn-primary-text: var(--color-cream-50);
          --color-card-border: rgba(94, 82, 64, 0.12);
          --color-error: var(--color-red-500);
          --color-success: var(--color-teal-500);
          --color-warning: var(--color-orange-500);
          --color-info: var(--color-slate-500);

          /* Typography */
          --font-family-base: 'FKGroteskNeue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --font-family-mono: 'Berkeley Mono', ui-monospace, monospace;
          --font-size-xs: 11px;
          --font-size-sm: 12px;
          --font-size-base: 14px;
          --font-size-md: 14px;
          --font-size-lg: 16px;
          --font-size-xl: 18px;
          --font-size-2xl: 20px;
          --font-size-3xl: 24px;
          --font-size-4xl: 30px;
          --font-weight-normal: 400;
          --font-weight-medium: 500;
          --font-weight-semibold: 550;
          --font-weight-bold: 600;
          --line-height-tight: 1.2;
          --line-height-normal: 1.5;

          /* Spacing */
          --space-4: 4px;
          --space-6: 6px;
          --space-8: 8px;
          --space-10: 10px;
          --space-12: 12px;
          --space-16: 16px;
          --space-20: 20px;
          --space-24: 24px;
          --space-32: 32px;

          /* Border Radius */
          --radius-sm: 6px;
          --radius-base: 8px;
          --radius-md: 10px;
          --radius-lg: 12px;
          --radius-full: 9999px;

          /* Shadows */
          --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.02);
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --color-background: var(--color-charcoal-700);
            --color-surface: var(--color-charcoal-800);
            --color-text: var(--color-gray-200);
            --color-text-secondary: rgba(167, 169, 169, 0.7);
            --color-primary: var(--color-teal-300);
            --color-primary-hover: var(--color-teal-400);
            --color-primary-active: var(--color-teal-800);
            --color-secondary: rgba(119, 124, 124, 0.15);
            --color-secondary-hover: rgba(119, 124, 124, 0.25);
            --color-secondary-active: rgba(119, 124, 124, 0.3);
            --color-border: rgba(119, 124, 124, 0.3);
            --color-error: var(--color-red-400);
            --color-success: var(--color-teal-300);
            --color-warning: var(--color-orange-400);
            --color-info: var(--color-gray-300);
            --color-btn-primary-text: var(--color-slate-900);
            --color-card-border: rgba(119, 124, 124, 0.2);
          }
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
          font-family: var(--font-family-base);
          -webkit-font-smoothing: antialiased;
        }

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

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @media (max-width: 1024px) {
          .sidebar-responsive {
            position: fixed !important;
            transform: translateX(-100%) !important;
          }
          .sidebar-responsive[style*="translateX(0)"] {
            transform: translateX(0) !important;
          }
          .sidebar-close-btn {
            display: block !important;
          }
          .menu-btn-mobile {
            display: flex !important;
          }
        }

        @media (min-width: 1025px) {
          .sidebar-responsive {
            position: relative !important;
            transform: translateX(0) !important;
          }
          .sidebar-overlay {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}