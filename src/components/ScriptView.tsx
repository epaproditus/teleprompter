import type { ScriptSection } from '../types';

interface Props {
  sections: ScriptSection[];
}

export default function ScriptView({ sections }: Props) {
  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Script</p>
      <div className="flex flex-col gap-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`rounded-xl border px-4 py-3 transition-all duration-500 ${
              section.isActive
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : section.isCovered
                  ? 'bg-gray-50 border-gray-100 opacity-40'
                  : 'bg-white border-gray-200'
            }`}
          >
            <p className={`text-xs font-semibold mb-1 ${
              section.isActive ? 'text-blue-600' : section.isCovered ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {section.isCovered ? '✓ ' : section.isActive ? '▶ ' : ''}{section.title}
            </p>
            <p className={`text-sm leading-relaxed ${
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
