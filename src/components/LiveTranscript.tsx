interface Props {
  transcript: string;
  interimText: string;
  isListening: boolean;
}

export default function LiveTranscript({ transcript, interimText, isListening }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold text-gray-800">Live Transcript</h2>
      <div className="min-h-32 bg-white border border-gray-200 rounded-lg p-4 text-gray-800 leading-relaxed">
        {!transcript && !interimText && (
          <span className="text-gray-400">
            {isListening ? 'Listening — start speaking...' : 'Press Start to begin.'}
          </span>
        )}
        <span>{transcript}</span>
        <span className="text-gray-400">{interimText}</span>
      </div>
    </div>
  );
}
