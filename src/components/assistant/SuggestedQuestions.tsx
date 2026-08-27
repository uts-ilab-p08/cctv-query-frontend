"use client";

interface SuggestedQuestionsProps {
  questions: string[];
  onAsk: (question: string) => void;
}

export function SuggestedQuestions({ questions, onAsk }: SuggestedQuestionsProps) {
  return (
    <>
      <p className="text-ink-subtle mb-1 text-xs">Suggested questions</p>
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onAsk(question)}
          className="border-indigo/20 text-ink-soft hover:border-indigo/40 cursor-pointer rounded-sm border bg-white/60 px-3 py-2.5 text-left font-sans text-[13px] transition-colors duration-150 hover:bg-white/80"
        >
          {question}
        </button>
      ))}
    </>
  );
}
