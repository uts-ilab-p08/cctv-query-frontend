"use client";

import { ModelPicker } from "@/components/pipeline/ModelPicker";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { cameraNames } from "@/data/cameras";
import { remoteEndpointPlaceholder } from "@/data/models";
import { useAppStore } from "@/store/useAppStore";
import type { ExecutionTarget, UploadScope } from "@/types";

const scopeOptions = [
  { value: "full" as const, label: "Full recording" },
  { value: "clip" as const, label: "Trimmed clip" },
];

const targetOptions = [
  { value: "Local" as const, label: "Local model" },
  { value: "Remote" as const, label: "Remote endpoint" },
];

export function UploadForm() {
  const uploadCamera = useAppStore((state) => state.uploadCamera);
  const uploadScope = useAppStore((state) => state.uploadScope);
  const uploadModel = useAppStore((state) => state.uploadModel);
  const uploadTarget = useAppStore((state) => state.uploadTarget);
  const remoteEndpoint = useAppStore((state) => state.remoteEndpoint);

  const setUploadCamera = useAppStore((state) => state.setUploadCamera);
  const setUploadScope = useAppStore((state) => state.setUploadScope);
  const setUploadModel = useAppStore((state) => state.setUploadModel);
  const setUploadTarget = useAppStore((state) => state.setUploadTarget);
  const setRemoteEndpoint = useAppStore((state) => state.setRemoteEndpoint);
  const submitAnnotationJob = useAppStore((state) => state.submitAnnotationJob);

  const scopeLabel = uploadScope === "full" ? "uploading full recording" : "uploading trimmed clip";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submitAnnotationJob();
      }}
      className="relative mb-8 overflow-hidden rounded-xl border border-white/70 bg-white/70 p-6 shadow-[0_16px_40px_rgba(99,102,241,0.1)] backdrop-blur-[20px]"
    >
      <span aria-hidden className="bg-accent-bar absolute inset-x-0 top-0 h-[3px]" />

      <h2 className="mb-4 text-[15px] font-semibold">Submit footage for annotation</h2>

      <div className="border-border-dashed mb-5 rounded-xl border-2 border-dashed bg-[rgba(238,240,254,0.4)] p-[26px] text-center">
        <p className="text-ink-soft mb-1 text-sm">Drop a video file here, or browse</p>
        <p className="text-ink-subtle text-xs">
          MP4, MOV, AVI · full recording or a trimmed clip · {scopeLabel}
        </p>
      </div>

      <div className="mb-[18px] grid grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="upload-camera">Source camera</FieldLabel>
          <Select
            id="upload-camera"
            options={cameraNames}
            value={uploadCamera}
            onChange={(event) => setUploadCamera(event.target.value)}
          />
        </div>
        <div>
          <FieldLabel as="div">Scope</FieldLabel>
          <SegmentedControl<UploadScope>
            label="Footage scope"
            variant="buttons"
            options={scopeOptions}
            value={uploadScope}
            onChange={setUploadScope}
          />
        </div>
      </div>

      <ModelPicker value={uploadModel} onChange={setUploadModel} />

      <div className="mb-[22px] grid grid-cols-2 items-end gap-5">
        <div>
          <FieldLabel as="div">Execution target</FieldLabel>
          <SegmentedControl<ExecutionTarget>
            label="Execution target"
            variant="buttons"
            options={targetOptions}
            value={uploadTarget}
            onChange={setUploadTarget}
          />
        </div>
        {uploadTarget === "Remote" ? (
          <div>
            <FieldLabel htmlFor="remote-endpoint">Endpoint URL</FieldLabel>
            <Input
              id="remote-endpoint"
              mono
              type="url"
              value={remoteEndpoint}
              onChange={(event) => setRemoteEndpoint(event.target.value)}
              placeholder={remoteEndpointPlaceholder}
            />
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        className="bg-brand-gradient-strong h-12 w-full cursor-pointer rounded-md font-sans text-sm font-semibold text-white shadow-[0_12px_28px_rgba(67,56,202,0.3)] transition-shadow duration-150 hover:shadow-[0_16px_36px_rgba(67,56,202,0.4)]"
      >
        Start Annotation
      </button>
    </form>
  );
}
