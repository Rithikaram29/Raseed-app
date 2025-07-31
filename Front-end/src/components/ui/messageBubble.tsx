import React from 'react';
import { User, Bot } from 'lucide-react';
import { Message } from '@/pages/chatAssistant';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`flex items-end space-x-2 max-w-xs md:max-w-md lg:max-w-lg ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            message.isUser
              ? 'bg-gradient-to-r from-blue-300 to-blue-500 text-white'
              : 'bg-gradient-to-r from-gray-500 to-gray-100 text-slate-100'
          }`}
        >
          {message.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Content */}
        <div className="flex flex-col">
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm ${
              message.isUser
                ? 'bg-gradient-to-r from-blue-600 to-blue-950 text-white rounded-br-md'
                : 'bg-white border border-gray-200 text-gray-500 rounded-bl-md'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
          </div>

          {/* Timestamp */}
          <div
            className={`px-2 py-1 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
              message.isUser ? 'text-right' : 'text-left'
            }`}
          >
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
