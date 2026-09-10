import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FaqItem } from '../../config/constants';

interface FaqAccordionProps {
  items: FaqItem[];
  defaultOpenIndex?: number;
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items, defaultOpenIndex = 0 }) => {
  const [openIndexes, setOpenIndexes] = useState<number[]>([defaultOpenIndex]);

  const toggleItem = (index: number) => {
    if (openIndexes.includes(index)) {
      setOpenIndexes(openIndexes.filter((i) => i !== index));
    } else {
      setOpenIndexes([...openIndexes, index]);
    }
  };

  return (
    <div className="divide-y divide-neutral-200 border-y border-neutral-200 text-left">
      {items.map((item, index) => {
        const isOpen = openIndexes.includes(index);
        return (
          <div key={index} className="py-4">
            <button
              onClick={() => toggleItem(index)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-neutral-900 hover:text-neutral-700 transition-colors gap-4"
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-neutral-900' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div className="mt-3 text-xs text-neutral-600 leading-relaxed pr-4 animate-in fade-in">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
