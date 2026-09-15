"use client";

interface SuggestedQuestionsProps {
  questions: string[];
  onAsk: (question: string) => void;
}

/** SPEC §6 — the empty state: four left-aligned buttons. */
export function SuggestedQuestions({ questions, onAsk }: SuggestedQuestionsProps) {
  return (
    <>
      <p className="text-ink-3 mb-1 text-xs">Suggested questions</p>
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onAsk(question)}
          className="rounded-chip glass-card-flat text-ink-2 hover:border-hairline-strong hover:text-ink cursor-pointer px-3 py-2.5 text-left font-sans text-[13px] transition-colors duration-150"
        >
          {question}
        </button>
      ))}
    </>
  );
}
