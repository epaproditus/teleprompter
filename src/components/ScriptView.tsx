import type { ScriptSection } from '../types';

interface Props {
  sections: ScriptSection[];
  selectedSectionId?: string | null;
  onSelectSection?: (id: string) => void;
}

export default function ScriptView({ sections, selectedSectionId, onSelectSection }: Props) {
  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Script</p>
        {sections.length > 1 && onSelectSection && (
          <span className="text-xs text-gray-400">tap to select</span>
        )}
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto">
        {sections.map((section, i) => {
          const isSelected = section.id === selectedSectionId;
          const isActive = section.isActive || isSelected;
          return (
            <div
              key={section.id}
              onClick={() => onSelectSection && onSelectSection(section.id)}
              className={`rounded-xl border px-5 py-4 transition-all duration-500 ${
                isActive
                  ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-300'
                  : section.isCovered
                    ? 'bg-gray-50 border-gray-100 opacity-40'
                    : 'bg-white border-gray-200 cursor-pointer hover:border-blue-200 hover:bg-blue-50/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-mono font-semibold ${
                  isActive ? 'text-blue-600' : section.isCovered ? 'text-gray-400' : 'text-gray-400'
                }`}>
                  {i + 1}
                </span>
                <p className={`text-sm font-semibold ${
                  isActive ? 'text-blue-600' : section.isCovered ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {section.isCovered ? '✓ ' : isActive ? '▶ ' : ''}{section.title}
                </p>
                {section.language === 'es' && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">ES</span>
                )}
              </div>
              <p className={`text-base leading-relaxed ${
                isActive ? 'text-gray-800' : 'text-gray-500'
              }`}>
                {section.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
