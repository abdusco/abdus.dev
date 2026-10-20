let mediaId = 0;

customElements.define('image-gallery', class extends HTMLElement {
    connectedCallback() {
        if (this.dataset.ready || typeof HTMLDialogElement === 'undefined') return;
        this.dataset.ready = 'true';

        for (const media of this.querySelectorAll('.image-gallery__track > :is(img, video)')) {
            const isVideo = media.tagName === 'VIDEO';
            const label = media.getAttribute('alt') || media.getAttribute('aria-label') || (isVideo ? 'video' : 'image');
            const lightbox = document.createElement('dialog');
            lightbox.id = `gallery-lightbox-${++mediaId}`;
            lightbox.className = 'image-gallery__lightbox';
            lightbox.setAttribute('closedby', 'any');
            lightbox.setAttribute('aria-label', `${label} preview`);

            // Older browsers need a fallback for native backdrop dismissal.
            if (!('closedBy' in lightbox)) {
                lightbox.addEventListener('click', event => {
                    if (event.target !== lightbox) return;
                    const rect = lightbox.getBoundingClientRect();
                    if (event.clientX < rect.left || event.clientX > rect.right ||
                        event.clientY < rect.top || event.clientY > rect.bottom) {
                        lightbox.close();
                    }
                });
            }

            const preview = media.cloneNode(true);
            preview.removeAttribute('id');
            preview.removeAttribute('width');
            preview.removeAttribute('height');
            if (isVideo) {
                preview.controls = true;
                preview.playsInline = true;
                preview.autoplay = false;
                preview.preload = 'metadata';
                lightbox.addEventListener('close', () => preview.pause());

                media.pause();
                media.controls = false;
                media.autoplay = false;
                media.removeAttribute('onclick');
                media.preload = 'metadata';
                media.tabIndex = -1;
            } else {
                preview.loading = 'eager';
            }

            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'image-gallery__close';
            close.setAttribute('aria-label', 'Close media preview');
            close.setAttribute('autofocus', '');
            close.addEventListener('click', () => lightbox.close());
            lightbox.append(preview, close);

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'image-gallery__trigger';
            trigger.setAttribute('aria-label', `${isVideo ? 'Play' : 'Enlarge'} ${label}`);
            trigger.setAttribute('aria-haspopup', 'dialog');
            trigger.setAttribute('aria-controls', lightbox.id);
            trigger.addEventListener('click', () => {
                lightbox.showModal();
                if (isVideo) preview.play().catch(() => {});
            });
            media.replaceWith(trigger);
            trigger.append(media);
            this.append(lightbox);
        }
    }
});

document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const active = document.querySelector('.image-gallery__lightbox[open]');
    if (!active) return;
    // Leave arrow keys available for the video's native playback controls.
    if (event.target instanceof HTMLVideoElement) return;

    event.preventDefault();
    const gallery = active.closest('image-gallery');
    const lightboxes = [...gallery.querySelectorAll('.image-gallery__lightbox')];
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = (lightboxes.indexOf(active) + direction + lightboxes.length) % lightboxes.length;
    const trigger = gallery.querySelectorAll('.image-gallery__trigger')[next];
    active.close();
    trigger.focus({ preventScroll: true });
    trigger.click();
});
