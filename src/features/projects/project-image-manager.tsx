"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  initialProjectImageActionState,
  type ProjectImageActionState,
} from "./project-action-state";
import {
  removeProjectImageAction,
  reorderProjectImagesAction,
  uploadProjectImageAction,
} from "./project-actions";
import type { ProjectImage } from "./project-data";
import {
  MAX_PROJECT_IMAGES,
} from "./project-image-input";

export type ResolvedProjectImage = Omit<ProjectImage, "storage_path"> & {
  publicUrl: string | null;
};

function ActionMessage({ state }: { state: ProjectImageActionState }) {
  return state.message || state.cleanupWarning ? (
    <div
      aria-live="polite"
      className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
        state.status === "error"
          ? "border-[#c99b8c] bg-[#fbf0ea] text-[#6f3027]"
          : "border-[#c9b89f] bg-[#f3ebdf] text-[#594536]"
      }`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message ? <p>{state.message}</p> : null}
      {state.cleanupWarning ? <p className="mt-1">{state.cleanupWarning}</p> : null}
    </div>
  ) : null;
}

function PendingStatus({ children, pending }: { children: string; pending: boolean }) {
  return pending ? (
    <p aria-live="polite" className="sr-only" role="status">
      {children}
    </p>
  ) : null;
}

function reorderedIds(
  images: readonly ResolvedProjectImage[],
  index: number,
  direction: -1 | 1,
) {
  const target = index + direction;
  const ids = images.map((image) => image.id);
  if (target < 0 || target >= ids.length) {
    return ids;
  }
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  return ids;
}

function ImageControls({
  image,
  images,
  index,
  projectId,
}: {
  image: ResolvedProjectImage;
  images: readonly ResolvedProjectImage[];
  index: number;
  projectId: string;
}) {
  const removeAction = removeProjectImageAction.bind(null, projectId, image.id);
  const reorderAction = reorderProjectImagesAction.bind(null, projectId);
  const [removeState, removeFormAction, removePending] = useActionState(
    removeAction,
    initialProjectImageActionState,
  );
  const [orderState, orderFormAction, orderPending] = useActionState(
    reorderAction,
    initialProjectImageActionState,
  );

  const orderForm = (direction: -1 | 1, label: string, disabled: boolean) => (
    <form action={orderFormAction} aria-label={label}>
      {reorderedIds(images, index, direction).map((id) => (
        <input key={id} name="imageIds" type="hidden" value={id} />
      ))}
      <button
        aria-label={label}
        className="inline-flex min-h-9 items-center rounded-lg border border-[#d8c3a8] px-3 text-xs font-semibold text-[#6d513d] hover:bg-[#f3ece2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled || orderPending}
        type="submit"
      >
        {direction === -1 ? "Move left" : "Move right"}
      </button>
    </form>
  );

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {orderForm(-1, `Move ${image.alt_text} left`, index === 0)}
        {orderForm(1, `Move ${image.alt_text} right`, index === images.length - 1)}
        <form action={removeFormAction} aria-label={`Remove ${image.alt_text}`}>
          <button
            aria-label={`Remove ${image.alt_text}`}
            className="inline-flex min-h-9 items-center rounded-lg border border-[#c99b8c] px-3 text-xs font-semibold text-[#7a3e32] hover:bg-[#fbf0ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={removePending}
            type="submit"
          >
            Remove
          </button>
        </form>
      </div>
      <PendingStatus pending={removePending}>Removing project image.</PendingStatus>
      <PendingStatus pending={orderPending}>Reordering project images.</PendingStatus>
      <ActionMessage state={removeState} />
      <ActionMessage state={orderState} />
    </>
  );
}

export function ProjectImageManager({
  images,
  projectId,
}: {
  images: ResolvedProjectImage[];
  projectId: string;
}) {
  const uploadAction = uploadProjectImageAction.bind(null, projectId);
  const [uploadState, uploadFormAction, uploadPending] = useActionState(
    uploadAction,
    initialProjectImageActionState,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const full = images.length >= MAX_PROJECT_IMAGES;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function selectPreview(file: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const objectUrl = file ? URL.createObjectURL(file) : null;
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
  }

  return (
    <section aria-labelledby="project-images-title">
      <h2
        className="text-2xl font-semibold tracking-[-0.035em] text-[#3b2f27]"
        id="project-images-title"
      >
        Project images
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#75685d]">
        Images are optional for publishing. Add up to five when visuals help explain your work.
      </p>
      <p className="mt-2 text-xs font-semibold text-[#8a6a52]">
        {images.length} of 5 image slots used
      </p>

      <form
        action={uploadFormAction}
        className="mt-6 rounded-2xl border border-[#ded3c7] bg-[#f9f5ee] p-5"
      >
        <PendingStatus pending={uploadPending}>Uploading project image.</PendingStatus>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div>
            <label className="text-sm font-semibold text-[#3b2f27]" htmlFor="image">
              Choose project image
            </label>
            <input
              accept="image/jpeg,image/png,image/webp"
              aria-describedby={
                uploadState.fieldErrors.image
                  ? "image-help image-error"
                  : "image-help"
              }
              aria-invalid={Boolean(uploadState.fieldErrors.image)}
              className="mt-2 block w-full rounded-xl border border-[#ded3c7] bg-[#fcfaf5] p-2.5 text-sm text-[#75685d] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e9ded0] file:px-3 file:py-2 file:font-semibold file:text-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:opacity-50"
              disabled={full}
              id="image"
              name="image"
              onChange={(event) => selectPreview(event.target.files?.[0] ?? null)}
              required
              type="file"
            />
            <p className="mt-2 text-xs leading-5 text-[#75685d]" id="image-help">
              Upload one JPEG, PNG, or WebP file at a time, up to 10 MB.
            </p>
            {uploadState.fieldErrors.image ? (
              <p className="mt-2 text-sm text-[#8a3f32]" id="image-error">
                {uploadState.fieldErrors.image[0]}
              </p>
            ) : null}
            <label className="mt-4 block text-sm font-semibold text-[#3b2f27]" htmlFor="altText">
              Image description
            </label>
            <input
              aria-describedby={
                uploadState.fieldErrors.altText
                  ? "altText-help altText-error"
                  : "altText-help"
              }
              aria-invalid={Boolean(uploadState.fieldErrors.altText)}
              className="mt-2 w-full rounded-xl border border-[#ded3c7] bg-[#fcfaf5] px-4 py-3 text-sm text-[#3b2f27] outline-none focus:border-[#8a6a52] focus:shadow-[0_0_0_3px_rgba(138,106,82,0.12)]"
              disabled={full}
              id="altText"
              maxLength={200}
              name="altText"
              required
            />
            <p className="mt-2 text-xs leading-5 text-[#75685d]" id="altText-help">
              Required. Describe what the image communicates in 200 characters or fewer.
            </p>
            {uploadState.fieldErrors.altText ? (
              <p className="mt-2 text-sm text-[#8a3f32]" id="altText-error">
                {uploadState.fieldErrors.altText[0]}
              </p>
            ) : null}
          </div>

          <div className="aspect-[16/9] overflow-hidden rounded-xl border border-dashed border-[#d8c3a8] bg-[#e9ded0]">
            {previewUrl ? (
              <Image
                alt="Selected project image preview"
                className="h-full w-full object-cover"
                height={540}
                src={previewUrl}
                unoptimized
                width={960}
              />
            ) : (
              <div className="grid h-full place-items-center px-4 text-center text-xs leading-5 text-[#75685d]">
                Selected image preview
              </div>
            )}
          </div>
        </div>
        <button
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8a6a52] px-4 text-sm font-semibold text-[#fcfaf5] hover:bg-[#3b2f27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a52] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={full || uploadPending}
          type="submit"
        >
          {uploadPending ? "Uploading image…" : "Upload image"}
        </button>
        <ActionMessage state={uploadState} />
      </form>

      {images.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#d8c3a8] bg-[#f9f5ee] px-6 py-10 text-center">
          <p className="font-semibold text-[#3b2f27]">No project images</p>
          <p className="mt-2 text-sm text-[#75685d]">Your project can still be published with the DevHub fallback cover.</p>
        </div>
      ) : (
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <li
              className="min-w-0 rounded-2xl border border-[#ded3c7] bg-[#fcfaf5] p-4"
              key={image.id}
            >
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-[#e9ded0]">
                {image.publicUrl ? (
                  <Image
                    alt={image.alt_text}
                    className="h-full w-full object-cover"
                    height={image.height}
                    sizes="(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw"
                    src={image.publicUrl}
                    width={image.width}
                  />
                ) : (
                  <div
                    aria-label={image.alt_text}
                    className="grid h-full place-items-center px-4 text-center text-sm text-[#75685d]"
                    role="img"
                  >
                    Image unavailable
                  </div>
                )}
                {index === 0 ? (
                  <span className="absolute left-3 top-3 rounded-full bg-[#3b2f27] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#fcfaf5]">
                    Cover
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-medium text-[#3b2f27]">{image.alt_text}</p>
              <ImageControls image={image} images={images} index={index} projectId={projectId} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
