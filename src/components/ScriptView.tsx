import type { ScriptSection } from '../types';

interface Props {
  sections: ScriptSection[];
}

export default function ScriptView({ sections }: Props) {
  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">Script</p>
      <div className="flex flex-col gap-3 overflow-y-auto">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`rounded-xl border px-5 py-4 transition-all duration-500 ${
              section.isActive
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : section.isCovered
                  ? 'bg-gray-50 border-gray-100 opacity-40'
                  : 'bg-white border-gray-200'
            }`}
          >
            <p className={`text-sm font-semibold mb-2 ${
              section.isActive ? 'text-blue-600' : section.isCovered ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {section.isCovered ? '✓ ' : section.isActive ? '▶ ' : ''}{section.title}
            </p>
            <p className={`text-base leading-relaxed ${
              section.isActive ? 'text-gray-800' : 'text-gray-500'
            }`}>
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
