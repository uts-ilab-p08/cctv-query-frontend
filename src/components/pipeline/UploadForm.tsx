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
      className="glass rounded-card border-hairline bg-panel shadow-glass relative mb-8 overflow-hidden border p-6"
    >
      <span aria-hidden className="bg-brand-grad absolute inset-x-0 top-0 h-[3px]" />

      <h2 className="mb-4 text-[15px] font-semibold">Submit footage for annotation</h2>

      <div className="rounded-card border-hairline-strong bg-panel-soft mb-5 border-2 border-dashed p-[26px] text-center">
        <p className="text-ink-2 mb-1 text-sm">Drop a video file here, or browse</p>
        <p className="text-ink-3 text-xs">
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
        className="bg-action shadow-action rounded-pill h-12 w-full cursor-pointer font-sans text-sm font-semibold"
      >
        Start Annotation
      </button>
    </form>
  );
}
