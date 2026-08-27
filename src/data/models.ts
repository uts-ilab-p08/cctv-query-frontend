/** Captioning/detection models the annotation pipeline can dispatch to. */
export const annotationModels = [
  "Marlin-2B",
  "BLIP",
  "Flamingo",
  "VideoBERT",
  "SAM3",
  "VideoLights",
] as const;

export const defaultAnnotationModel = "BLIP";

export const remoteEndpointPlaceholder = "https://inference.internal/annotate";
