import { motion } from "framer-motion";

interface OptionProps {
    id: string;
    content: string;
    isSelected: boolean;
    isDisabled: boolean;
    onSelect: (id: string) => void;
    index: number;
}

export function Option({ id, content, isSelected, isDisabled, onSelect, index }: OptionProps) {
    return (
        <div
            onClick={() => !isDisabled && onSelect(id)}
            className={`
        relative w-full p-4 mb-3 border rounded transition-all duration-200 cursor-pointer
        ${isSelected
                    ? "border-[#818cf8] bg-[#1A1A1A]"
                    : "border-[#333] bg-[#1e1e1e] hover:bg-[#252525]"
                }
        ${isDisabled ? "opacity-60 cursor-not-allowed hover:bg-[#1e1e1e]" : ""}
      `}
        >
            <div className="flex items-start gap-3">
                {/* Option Key (A, B, C...) */}
                <span className={`
          text-sm font-mono mt-0.5
          ${isSelected ? "text-[#818cf8]" : "text-[#666]"}
        `}>
                    {String.fromCharCode(65 + index)}.
                </span>

                {/* Content */}
                <span className="text-[#E0E0E0] text-base leading-relaxed">
                    {content}
                </span>
            </div>

            {/* Selected Indicator (Minimal line) */}
            {isSelected && (
                <motion.div
                    layoutId="selection-indicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[#818cf8] rounded-l"
                />
            )}
        </div>
    );
}
