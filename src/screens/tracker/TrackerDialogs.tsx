"use client";

import { useEffect, useRef, useState } from "react";
import type { TrackerCopy } from "./tracker-copy";
import { interpolate, trackerImageUrl, type TrackerFarmView } from "./tracker-model";
import { MilestoneIcon } from "./TrackerParts";

type Props = {
  copy: TrackerCopy;
  farm: TrackerFarmView | null;
  opener: HTMLElement | null;
  onClose: () => void;
};

/** Uses native modal dialogs: keyboard focus, backdrop and focus restoration. */
export function TrackerDialogs({ copy, farm, onClose, opener }: Props) {
  const detailRef = useRef<HTMLDialogElement>(null);
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const photoOpener = useRef<HTMLButtonElement | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  const usableImages = farm?.images.filter((image) => !failedImages.includes(image.id)) ?? [];
  const selected = photoIndex === null ? null : usableImages[photoIndex] ?? null;

  useEffect(() => {
    setFailedImages([]);
    setPhotoIndex(null);
  }, [farm?.id]);

  useEffect(() => {
    const dialog = detailRef.current;
    if (!dialog) return;
    if (farm && !dialog.open) dialog.showModal();
    if (!farm && dialog.open) dialog.close();
  }, [farm]);

  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  function closeDetails() {
    setPhotoIndex(null);
    if (detailRef.current?.open) detailRef.current.close();
    onClose();
    requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus();
    });
  }

  function closePhoto() {
    setPhotoIndex(null);
    if (lightboxRef.current?.open) lightboxRef.current.close();
    requestAnimationFrame(() => {
      if (photoOpener.current?.isConnected) photoOpener.current.focus();
    });
  }

  function movePhoto(step: number) {
    setPhotoIndex((index) =>
      index === null || usableImages.length < 2
        ? index
        : (index + step + usableImages.length) % usableImages.length,
    );
  }

  function failImage(id: string) {
    setFailedImages((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  function showPhoto(index: number, button: HTMLButtonElement) {
    photoOpener.current = button;
    setPhotoIndex(index);
  }

  return (
    <>
      <dialog
        className="farmer-dialog"
        ref={detailRef}
        aria-labelledby="tracker-farmer-dialog-name"
        onCancel={(event) => {
          event.preventDefault();
          closeDetails();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDetails();
        }}
      >
        {farm && (
          <>
            <button
              className="farmer-dialog__close"
              type="button"
              aria-label={copy.closeFarmerDetails}
              onClick={closeDetails}
            >
              ×
            </button>
            <div className="farmer-dialog__body">
              <div className="farmer-dialog__media">
                <div className="farmer-dialog__fallback">
                  <MilestoneIcon type={farm.milestone.icon} size={farm.isLeader ? 72 : 78} />
                </div>
                {usableImages[0] && (
                  <button
                    type="button"
                    aria-label={copy.viewPhoto}
                    className="farmer-dialog__main-photo"
                    onClick={(event) => showPhoto(0, event.currentTarget)}
                  >
                    <img
                      src={trackerImageUrl(usableImages[0], "primary")}
                      alt={usableImages[0].alt}
                      onError={() => failImage(usableImages[0].id)}
                    />
                  </button>
                )}
              </div>

              <div className="farmer-dialog__content">
                <div className="farmer-dialog__profile">
                  <p className="farmer-dialog__eyebrow">{copy.farmerProfile}</p>
                  <h2 id="tracker-farmer-dialog-name" className="farmer-dialog__name">
                    {farm.name}
                  </h2>
                  <p className="farmer-dialog__address">📍 {farm.location}</p>
                </div>

                <div className="farmer-dialog__about">
                  <p className="farmer-dialog__about-label">{copy.aboutFarmer}</p>
                  <div className="farmer-dialog__about-scroll">
                    <p className="farmer-dialog__description">{farm.description}</p>
                  </div>
                </div>

                {usableImages.length > 0 && (
                  <section className="farmer-gallery" aria-label={copy.farmPhotos}>
                    <div className="farmer-gallery__head">
                      <strong>{copy.farmPhotos}</strong>
                      <span>
                        {interpolate(
                          usableImages.length === 1 ? copy.photoCountOne : copy.photoCount,
                          { count: usableImages.length },
                        )}
                      </span>
                    </div>
                    <div className="farmer-gallery__rail">
                      {usableImages.map((image, index) => (
                        <button
                          type="button"
                          key={image.id}
                          className="farmer-gallery__thumb"
                          aria-label={interpolate(copy.photoLabel, {
                            index: index + 1,
                            count: usableImages.length,
                          })}
                          onClick={(event) => showPhoto(index, event.currentTarget)}
                        >
                          <img
                            src={trackerImageUrl(image, "thumbnail")}
                            alt=""
                            loading="lazy"
                            onError={() => failImage(image.id)}
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </dialog>

      <dialog
        className="image-lightbox"
        ref={lightboxRef}
        aria-label={copy.photoViewer}
        onCancel={(event) => {
          event.preventDefault();
          closePhoto();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePhoto();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            movePhoto(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            movePhoto(1);
          }
        }}
      >
        {selected && (
          <div className="image-lightbox__stage">
            <img
              src={trackerImageUrl(selected, "lightbox")}
              alt={selected.alt}
              onError={() => {
                failImage(selected.id);
                closePhoto();
              }}
            />
            <button
              type="button"
              className="image-lightbox__close"
              aria-label={copy.closeImageViewer}
              onClick={closePhoto}
            >
              ×
            </button>
            {usableImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="image-lightbox__nav image-lightbox__nav--prev"
                  aria-label={copy.previousImage}
                  onClick={() => movePhoto(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="image-lightbox__nav image-lightbox__nav--next"
                  aria-label={copy.nextImage}
                  onClick={() => movePhoto(1)}
                >
                  ›
                </button>
              </>
            )}
            <div className="image-lightbox__meta">
              {farm?.name} · {(photoIndex ?? 0) + 1} / {usableImages.length}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
