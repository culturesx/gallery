
/* ------------------------------------------------------------
   Tonal chip colors per album — dipetakan dari field "color"
   pada JSON. Ganti/perluas peta ini bila menambah warna baru.
   ------------------------------------------------------------ */
const TONES = {
    green: "#C6EFA9",
    blue: "#D3E2FF",
    amber: "#FFDDAF",
    pink: "#FFD8E4",
    primary: "#EADDFF",
    teal: "#9FE8DA"
};

let galleryData = null;
let currentAlbumId = null;

/* Loader: baca JSON embedded di halaman.
   Untuk pakai file eksternal, ganti isi fungsi ini menjadi:
     const res = await fetch('./albums.json');
     galleryData = await res.json();
*/
async function loadGalleryData() {
    // const raw = document.getElementById('gallery-data').textContent;
    const res = await fetch('./assets/js/gallery.json');
    galleryData = await res.json();
    // galleryData = JSON.parse(raw);
}

function findAlbum(id) {
    return galleryData.albums.find(a => a.id === id);
}

function renderCrumbs() {
    const el = document.getElementById('crumbs');
    if (!currentAlbumId) {
        el.innerHTML = `<span class="current">Semua album</span>`;
        return;
    }
    const album = findAlbum(currentAlbumId);
    el.innerHTML = `
      <button onclick="showAlbums()">Album</button>
      <span class="msi" style="font-size:16px;color:var(--md-outline-var)">chevron_right</span>
      <span class="current">${album.name}</span>`;
}

function renderAlbums() {
    currentAlbumId = null;
    document.getElementById('page-title').textContent = 'Galeri KKN-TK 12 UNIGORO';
    renderCrumbs();
    const root = document.getElementById('view-root');

    if (!galleryData.albums.length) {
        root.innerHTML = `<div class="empty">Belum ada album. Tekan tombol + untuk membuat album pertama.</div>`;
        return;
    }

    root.innerHTML = `
      <div class="section-label">${galleryData.albums.length} album</div>
      <div class="album-grid">
        ${galleryData.albums.map(albumCard).join('')}
      </div>`;
}

function albumCard(album) {
    const tone = TONES[album.color] || TONES.primary;
    const preview = album.photos.slice(0, 3);
    const thumbs = preview.map(p => `<img src="${p.preview}" alt="" loading="lazy">`).join('');
    return `
      <button class="album-card" onclick="openAlbum('${album.id}')">
        <div class="folder" style="background:${tone}">
          <div class="stack">${thumbs || ''}</div>
        </div>
        <div class="album-meta">
          <div class="name">${album.name}</div>
          <div class="count">${album.photos.length} foto</div>
        </div>
      </button>`;
}

function openAlbum(id) {
    currentAlbumId = id;
    const album = findAlbum(id);
    document.getElementById('page-title').textContent = album.name;
    renderCrumbs();
    const root = document.getElementById('view-root');

    root.innerHTML = `
      <button class="back-btn" onclick="showAlbums()">
        <span class="msi">arrow_back</span> Semua album
      </button>
      <div class="section-label">${album.photos.length} foto</div>
      <div class="photo-grid" id="photo-grid"></div>`;

    layoutPhotoGrid(album.photos, album.name);
}

function layoutPhotoGrid(photos, albumName) {
    const grid = document.getElementById('photo-grid');
    grid.innerHTML = photos.map((p, i) => `
      <div class="photo-card" data-span="1" onclick="openLightbox(${i})">
        <img src="${p.preview}" alt="${escAttr(p.title)}" loading="lazy" onload="fitCard(this)">
        <div class="cap">${p.title}</div>
      </div>`).join('');
    lightboxPhotos = photos;
    lightboxAlbumName = albumName;
}

/* Menyesuaikan tinggi kartu pada grid auto-rows agar mengikuti rasio gambar (efek masonry ala Material) */
function fitCard(img) {
    const card = img.closest('.photo-card');
    const rowH = 10, gap = 12;
    const ratio = img.naturalHeight / img.naturalWidth;
    const colWidth = card.clientWidth;
    const span = Math.ceil((colWidth * ratio + gap) / (rowH + gap));
    card.style.gridRowEnd = `span ${span}`;
}

function escAttr(s) { return String(s).replace(/'/g, "&#39;"); }

function showAlbums() { renderAlbums(); }

/* ---------------- Lightbox: zoom, geser (swipe), unduh ---------------- */
let lightboxPhotos = [];
let lightboxAlbumName = '';
let lightboxIndex = 0;
let zoomScale = 1;
let panX = 0, panY = 0;
const ZOOM_MIN = 1, ZOOM_MAX = 3;

function openLightbox(index) {
    lightboxIndex = index;
    renderLightboxPhoto();
    document.getElementById('lightbox').classList.add('open');
}

function renderLightboxPhoto() {
    const p = lightboxPhotos[lightboxIndex];
    const img = document.getElementById('lightbox-img');
    const badge = document.getElementById('res-badge');
    const badgeText = document.getElementById('res-badge-text');

    /* Tampilkan preview (ringan) dulu agar terasa instan */
    img.src = p.preview;
    img.alt = p.title;
    badge.classList.remove('ready');
    badgeText.textContent = 'SD';

    /* Muat gambar asli (resolusi penuh) di belakang layar, lalu ganti begitu siap */
    const fullRes = new Image();
    fullRes.onload = () => {
        if (lightboxPhotos[lightboxIndex] !== p) return;
        img.src = p.original;
        badge.classList.add('ready');
        badgeText.textContent = 'HD';
    };
    fullRes.src = p.original;

    document.getElementById('lightbox-title').textContent = p.title;
    document.getElementById('lightbox-album').textContent = lightboxAlbumName;
    document.getElementById('lightbox-counter').textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
    // document.getElementById('lightbox-prev').disabled = lightboxIndex === 0;
    // document.getElementById('lightbox-next').disabled = lightboxIndex === lightboxPhotos.length - 1;
    resetZoom();
}

function navLightbox(dir) {
    const next = lightboxIndex + dir;
    if (next < 0 || next >= lightboxPhotos.length) return;
    lightboxIndex = next;
    renderLightboxPhoto();
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
}

function applyZoom() {
    const img = document.getElementById('lightbox-img');
    img.style.transform = zoomScale === 1
        ? 'scale(1)'
        : `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
    document.getElementById('zoom-level').textContent = Math.round(zoomScale * 100) + '%';
}
function zoomBy(delta) {
    zoomScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(zoomScale + delta).toFixed(2)));
    if (zoomScale === 1) { panX = 0; panY = 0; }
    applyZoom();
}
function resetZoom() {
    zoomScale = 1; panX = 0; panY = 0;
    applyZoom();
}

async function downloadCurrent() {
    const p = lightboxPhotos[lightboxIndex];
    const filename = (p.title || 'foto').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') + '.jpg';
    try {
        const res = await fetch(p.original, { mode: 'cors' });
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        const a = document.createElement('a');
        a.href = p.original; a.download = filename; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
    }
}

document.getElementById('lightbox').addEventListener('click', e => {
    if (e.target.id === 'lightbox') closeLightbox();
});
document.addEventListener('keydown', e => {
    if (!document.getElementById('lightbox').classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
    if (e.key === '+' || e.key === '=') zoomBy(0.25);
    if (e.key === '-') zoomBy(-0.25);
});

/* Geser (drag mouse ATAU swipe sentuh): navigasi horizontal saat normal,
   panning bebas (horizontal + vertikal) saat gambar di-zoom */
(function () {
    const viewer = document.getElementById('lightbox-viewer');
    const img = document.getElementById('lightbox-img');
    let startX = 0, startY = 0, dragging = false;

    viewer.addEventListener('pointerdown', e => {
        startX = e.clientX; startY = e.clientY; dragging = true;
        img.classList.add('dragging');
        viewer.setPointerCapture(e.pointerId);
    });

    viewer.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (zoomScale === 1) {
            img.style.transform = `translateX(${dx}px)`;
        } else {
            img.style.transform = `translate(${panX + dx}px, ${panY + dy}px) scale(${zoomScale})`;
        }
    });

    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        img.classList.remove('dragging');
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (zoomScale === 1) {
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
                navLightbox(dx < 0 ? 1 : -1);
            } else {
                applyZoom();
            }
        } else {
            panX += dx; panY += dy;
            applyZoom();
        }
    }
    viewer.addEventListener('pointerup', endDrag);
    viewer.addEventListener('pointercancel', endDrag);
    viewer.addEventListener('pointerleave', e => { if (dragging) endDrag(e); });

    viewer.addEventListener('wheel', e => {
        e.preventDefault();
        zoomBy(e.deltaY < 0 ? 0.25 : -0.25);
    }, { passive: false });

    img.addEventListener('dblclick', () => {
        zoomScale === 1 ? zoomBy(1) : resetZoom();
    });
})();

function createAlbumPrompt() {
    const name = prompt('Nama album baru:');
    if (!name) return;
    galleryData.albums.unshift({
        id: 'album-' + Date.now(),
        name, color: 'primary', photos: []
    });
    renderAlbums();
}

document.getElementById('search-input').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { currentAlbumId ? openAlbum(currentAlbumId) : renderAlbums(); return; }

    if (currentAlbumId) {
        const album = findAlbum(currentAlbumId);
        const filtered = album.photos.filter(p => p.title.toLowerCase().includes(q));
        layoutPhotoGrid(filtered, album.name);
    } else {
        const root = document.getElementById('view-root');
        const filtered = galleryData.albums.filter(a => a.name.toLowerCase().includes(q));
        root.innerHTML = filtered.length
            ? `<div class="section-label">${filtered.length} hasil</div><div class="album-grid">${filtered.map(albumCard).join('')}</div>`
            : `<div class="empty">Tidak ada album yang cocok dengan "${q}".</div>`;
    }
});

document.querySelectorAll('.rail-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.rail-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.view === 'albums') renderAlbums();
    });
});

async function init() {
    await loadGalleryData();
    renderAlbums();
}

init();