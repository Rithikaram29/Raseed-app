import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Mic, MicOff, Volume2, VolumeX, Trash2 } from 'lucide-react';
import MessageBubble from '@/components/ui/messageBubble';
import VoiceControls from '@/components/ui/voiceControl';
import { useSpeechRecognition } from '@/hooks/ai-assistant/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/ai-assistant/useSpeechSynthesis';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI assistant. You can type to me or click the microphone to speak. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const apiUrl = 'http://localhost:5001/api';
  const [chatEnd, setChatEnd] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const { isListening, startListening, stopListening, transcript, resetTranscript } =
    useSpeechRecognition();
  const { speak, isSpeaking, cancelSpeech } = useSpeechSynthesis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (transcript && !isListening) {
      setInputText(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  const safeFetch = useCallback(
    async (body: object) => {
      const attempt = async () => {
        const res = await fetch(`${apiUrl}/user-queries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      };
      try {
        return await attempt();
      } catch (e) {
        return await attempt();
      }
    },
    [apiUrl, chatId]
  );

  useEffect(() => {
    if (chatEnd) {
      (async () => {
        await safeFetch({ isChatEnd: true, chatId, userId });
        setChatEnd(false);
      })();
    }
  }, [chatEnd, safeFetch, chatId, userId]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('user-storage') as string);
    const savedUserId = saved?.state.user.email;
    console.log('c', savedUserId);
    if (saved) {
      try {
        setUserId(savedUserId);
      } catch (e) {
        console.error(e);
      }
    }
  }, [apiUrl, userId]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      setIsProcessing(true);
      const res = await safeFetch({ textContent: text.trim(), chatId, isChatEnd: false, userId });

      console.log('Response from server:', res, userId);
      if (res.chatId) setChatId(res.chatId);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: res.response || 'No response from assistant.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);

      if (res.response) speak(res.response);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          text: '⚠️ Error getting response.',
          isUser: false,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      setError('Failed to fetch from server.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const clearConversation = () => {
    setChatEnd(true);
    setMessages([
      {
        id: '1',
        text: 'Conversation cleared! How can I help you today?',
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    cancelSpeech();
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-900 dark:from-blue-700 dark:to-blue-900 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-full">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Voice Assistant</h1>
              <p className="text-blue-100 dark:text-blue-200 text-sm">Speak or type to chat</p>
            </div>
          </div>
          <button
            onClick={clearConversation}
            className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
            title="Clear conversation"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-3 max-w-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Status Indicator */}
      {(isListening || isSpeaking) && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/50 border-t border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-300">
            {isListening && (
              <>
                <Mic className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-medium">Listening...</span>
              </>
            )}
            {isSpeaking && (
              <>
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-medium">Speaking...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or use voice..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
              rows={1}
            />
          </div>

          <VoiceControls
            isListening={isListening}
            isSpeaking={isSpeaking}
            onVoiceToggle={handleVoiceInput}
            onSpeechToggle={cancelSpeech}
          />

          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-200 text-white rounded-2xl font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
