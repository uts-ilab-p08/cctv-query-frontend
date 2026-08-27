"use client";

import { Chip } from "@/components/ui/Chip";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { annotationModels } from "@/data/models";

interface ModelPickerProps {
  value: string;
  onChange: (model: string) => void;
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  return (
    <fieldset className="mb-[18px] border-0 p-0">
      <FieldLabel as="div">
        <legend>Annotation model</legend>
      </FieldLabel>
      <div className="flex flex-wrap gap-2">
        {annotationModels.map((model) => (
          <Chip
            key={model}
            active={value === model}
            onClick={() => onChange(model)}
            className="px-3.5 py-2"
          >
            {model}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}
