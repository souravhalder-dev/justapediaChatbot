import React, { useState, useRef, useEffect } from 'react';
import { getArticleSummary, searchArticles } from '../services/api';
import { 
  Send, 
  Menu, 
  Plus, 
  MessageSquare, 
  User, 
  Bot, 
  Copy, 
  ExternalLink,
  X,
  Search,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { 
      text: "Hello! I'm the Justapedia AI. Ask me about anything.", 
      sender: 'bot',
      id: 'init' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user', id: Date.now().toString() }]);
    setInput('');
    setLoading(true);
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      let summaryData = await getArticleSummary(userMessage);
      
      if (summaryData) {
        setMessages(prev => [
          ...prev,
          { 
            summary: summaryData.summary, 
            url: summaryData.url, 
            sender: 'bot', 
            canCopy: true,
            id: Date.now().toString() + 'bot'
          }
        ]);
      } else {
        const suggestions = await searchArticles(userMessage);
        if (suggestions.length > 0) {
          const suggestionText = "I couldn't find an exact match. Did you mean:\n" + 
            suggestions.map(s => `- ${s.title}`).join('\n');
          setMessages(prev => [...prev, { text: suggestionText, sender: 'bot', id: Date.now().toString() + 'bot' }]);
        } else {
          setMessages(prev => [...prev, { text: "Sorry, I couldn't find any articles matching that title.", sender: 'bot', id: Date.now().toString() + 'bot' }]);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setMessages(prev => [...prev, { text: "Sorry, I encountered an error while searching.", sender: 'bot', id: Date.now().toString() + 'bot' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content) => {
    let textToCopy = '';
    if (Array.isArray(content)) {
      textToCopy = content.join('\n\n');
    } else {
      textToCopy = content;
    }
    navigator.clipboard.writeText(textToCopy);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    setInput(textarea.value);
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${darkMode ? 'bg-[#343541] text-gray-100' : 'bg-white text-gray-800'}`}>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600/75 z-20 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-[260px] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${darkMode ? 'bg-[#202123]' : 'bg-[#f9f9f9] border-r border-gray-200'}
      `}>
        <div className="p-3 flex-1 overflow-y-auto">
          <button 
            onClick={() => {
              setMessages([{ text: "Hello! I'm the Justapedia AI. Ask me about anything.", sender: 'bot', id: 'init' }]);
              setSidebarOpen(false);
            }}
            className={`
              flex items-center gap-3 w-full px-3 py-3 rounded-md border transition-colors text-sm mb-4
              ${darkMode 
                ? 'border-white/20 hover:bg-gray-700/50 text-white' 
                : 'border-black/10 hover:bg-gray-200 text-gray-800'}
            `}
          >
            <Plus size={16} />
            New chat
          </button>

          <div className="flex flex-col gap-2">
            <div className={`text-xs font-medium px-3 py-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Today</div>
            <button className={`
              flex items-center gap-3 px-3 py-3 text-sm rounded-md overflow-hidden
              ${darkMode 
                ? 'text-gray-100 bg-gray-700/50' 
                : 'text-gray-800 bg-gray-200'}
            `}>
              <MessageSquare size={16} className="shrink-0" />
              <span className="truncate">Justapedia AI Chat</span>
            </button>
          </div>
        </div>

        {/* User Profile / Settings Area */}
        <div className={`p-3 border-t ${darkMode ? 'border-white/20' : 'border-black/10'}`}>
          <button 
            onClick={toggleTheme}
            className={`
              flex items-center gap-3 w-full px-3 py-3 rounded-md transition-colors text-sm mb-2
              ${darkMode ? 'hover:bg-gray-700/50 text-white' : 'hover:bg-gray-200 text-gray-800'}
            `}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span className="font-medium">{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          
          <button className={`
            flex items-center gap-3 w-full px-3 py-3 rounded-md transition-colors text-sm
            ${darkMode ? 'hover:bg-gray-700/50 text-white' : 'hover:bg-gray-200 text-gray-800'}
          `}>
            <User size={16} />
            <span className="font-medium">User</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className={`
          sticky top-0 z-10 flex items-center p-2 border-b md:hidden
          ${darkMode 
            ? 'bg-[#343541] border-white/10 text-gray-300' 
            : 'bg-white border-black/10 text-gray-800'}
        `}>
          <button 
            onClick={() => setSidebarOpen(true)}
            className={`
              p-2 -ml-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset
              ${darkMode ? 'hover:bg-gray-700 focus:ring-white' : 'hover:bg-gray-200 focus:ring-gray-800'}
            `}
          >
            <Menu size={24} />
          </button>
          <div className="flex-1 text-center font-medium">Justapedia AI</div>
          <button 
            onClick={() => {
              setMessages([{ text: "Hello! I'm the Justapedia AI. Ask me about anything.", sender: 'bot', id: 'init' }]);
            }}
            className="p-2"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {messages.length === 0 ? (
            <div className={`h-full flex flex-col items-center justify-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              <div className={`p-4 rounded-full mb-6 ${darkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                <Sparkles size={40} />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Justapedia AI</h2>
            </div>
          ) : (
            <div className="flex flex-col pb-32">
              {messages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`
                    w-full border-b group
                    ${darkMode 
                      ? 'border-black/10 dark:border-gray-900/50 text-gray-100' 
                      : 'border-black/5 text-gray-800'}
                    ${msg.sender === 'bot' 
                      ? (darkMode ? 'bg-[#444654]' : 'bg-[#f7f7f8]') 
                      : (darkMode ? 'bg-[#343541]' : 'bg-white')}
                  `}
                >
                  <div className="max-w-3xl mx-auto flex gap-4 p-4 md:p-6 text-base m-auto">
                    <div className="flex-shrink-0 flex flex-col relative items-end">
                      <div className={`
                        w-8 h-8 rounded-sm flex items-center justify-center
                        ${msg.sender === 'bot' ? 'bg-green-500' : 'bg-[#5436DA]'}
                      `}>
                        {msg.sender === 'bot' ? <Bot size={20} className="text-white" /> : <User size={20} className="text-white" />}
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden break-words">
                      {msg.sender === 'bot' && <div className="font-semibold mb-1 opacity-90">Justapedia AI</div>}
                      {msg.summary ? (
                        <div className="prose prose-invert max-w-none">
                          <p className={`whitespace-pre-wrap leading-7 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{msg.summary}</p>
                          {msg.url && (
                            <a 
                              href={msg.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-400 hover:underline mt-4 text-sm"
                            >
                              <ExternalLink size={14} />
                              Read full article
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className={`prose prose-invert max-w-none whitespace-pre-wrap leading-7 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                    
                    {/* Message Actions */}
                    {msg.sender === 'bot' && (
                      <div className="flex self-start pl-2 visible md:invisible md:group-hover:visible transition-opacity">
                         <button 
                            onClick={() => handleCopy(msg.summary || msg.text)}
                            className={`
                              p-1 rounded-md transition-colors
                              ${darkMode 
                                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}
                            `}
                            title="Copy text"
                          >
                            <Copy size={16} />
                          </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className={`
                  w-full border-b p-4 md:p-6
                  ${darkMode 
                    ? 'bg-[#444654] border-black/10 dark:border-gray-900/50' 
                    : 'bg-[#f7f7f8] border-black/5'}
                `}>
                   <div className="max-w-3xl mx-auto flex gap-4">
                      <div className="w-8 h-8 bg-green-500 rounded-sm flex items-center justify-center">
                        <Bot size={20} className="text-white" />
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-12" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`
          absolute bottom-0 left-0 w-full pt-10 pb-6 px-4
          bg-gradient-to-t 
          ${darkMode 
            ? 'from-[#343541] via-[#343541] to-transparent' 
            : 'from-white via-white to-transparent'}
        `}>
          <div className="max-w-3xl mx-auto">
            <div className={`
              relative flex items-center w-full p-3 rounded-xl border shadow-xs overflow-hidden
              ${darkMode 
                ? 'bg-[#40414F] border-gray-900/50 focus-within:border-gray-500/50' 
                : 'bg-white border-gray-200 shadow-md focus-within:border-gray-300'}
            `}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={adjustTextareaHeight}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                rows={1}
                className={`
                  flex-1 max-h-[200px] bg-transparent border-0 focus:ring-0 resize-none py-2 pr-10 leading-6
                  ${darkMode 
                    ? 'text-white placeholder-gray-400' 
                    : 'text-gray-800 placeholder-gray-500'}
                `}
                style={{ overflowY: 'hidden' }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`
                  absolute right-3 bottom-3 p-2 rounded-md transition-colors
                  ${input.trim() 
                    ? 'bg-[#19c37d] text-white hover:bg-[#1a885d]' 
                    : (darkMode ? 'bg-transparent text-gray-400' : 'bg-transparent text-gray-300') + ' cursor-not-allowed'}
                `}
              >
                <Send size={16} />
              </button>
            </div>
            <div className="text-center text-xs text-gray-500 mt-2">
              Free Research Preview. Justapedia AI may produce inaccurate information about people, places, or facts. Developed by Sourav. Contact: <a href="mailto:skhsouravhalder@gmail.com" className="underline hover:text-gray-300 transition-colors">skhsouravhalder@gmail.com</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
