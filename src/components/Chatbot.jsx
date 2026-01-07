import React, { useState, useRef, useEffect } from 'react';
import { getArticleSummary, searchArticles } from '../services/api';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { text: "Hello! I'm the Justapedia Chatbot. Enter an article title to get a high-quality summary.", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setInput('');
    setLoading(true);

    try {
      // First try to get summary directly
      let summaryData = await getArticleSummary(userMessage);
      
      if (summaryData) {
        setMessages(prev => [
          ...prev,
          { summary: summaryData.summary, url: summaryData.url, sender: 'bot', canCopy: true }
        ]);
      } else {
        // If no direct summary, search for suggestions
        const suggestions = await searchArticles(userMessage);
        if (suggestions.length > 0) {
          const suggestionText = "I couldn't find an exact match. Did you mean:\n" + 
            suggestions.map(s => `- ${s.title}`).join('\n');
          setMessages(prev => [...prev, { text: suggestionText, sender: 'bot' }]);
        } else {
          setMessages(prev => [...prev, { text: "Sorry, I couldn't find any articles matching that title.", sender: 'bot' }]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { text: "Sorry, I encountered an error while searching.", sender: 'bot' }]);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md mx-auto bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
      <div className="bg-blue-600 p-4 text-white font-bold text-lg">
        Justapedia Chatbot
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-lg ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.summary ? (
                <div>
                  <p className="font-semibold mb-2 border-b pb-1">Summary:</p>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.summary}
                  </div>
                  {msg.url && (
                    <a
                      href={msg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Read more on Justapedia →
                    </a>
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              )}
            </div>
            {msg.canCopy && (
              <button
                onClick={() => handleCopy(msg.summary || msg.text)}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium focus:outline-none"
              >
                Copy Summary
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <span className="animate-pulse">Generating summary...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type an article title..."
            className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
