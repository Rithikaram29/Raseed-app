import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  onVoiceToggle: () => void;
  onSpeechToggle: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  isListening,
  isSpeaking,
  onVoiceToggle,
  onSpeechToggle,
}) => {
  return (
    <div className="flex space-x-2">
      {/* Voice Input Button */}
      <button
        onClick={onVoiceToggle}
        className={`p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl ${
          isListening
            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Speech Output Button */}
      <button
        onClick={onSpeechToggle}
        className={`p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl ${
          isSpeaking
            ? 'bg-orange-500 text-white hover:bg-orange-600 animate-pulse'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
        title={isSpeaking ? 'Stop speaking' : 'Voice is ready'}
      >
        {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default VoiceControls;
