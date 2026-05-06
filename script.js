(function () {
    const GRID_SIZE = 5;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    let MIN_FONT_SIZE = 6;
    let MAX_FONT_SIZE = 40;
    let WRAP_THRESHOLD = 15;

    const container = document.getElementById('smartGrid');
    const saveBtn = document.getElementById('saveBtn');
    const captureArea = document.getElementById('captureArea');
    const loadingScreen = document.getElementById('loadingScreen');
    
    const bgMusic = document.getElementById('bgMusic');
    const musicToggleBtn = document.getElementById('musicToggleBtn');

    if (!container) return;

    let loadedImages = 0;
    let totalImagesToLoad = 0;
    const progressBar = document.querySelector('.loading-progress-bar');
    let isSaving = false;

    // --- Локальное сохранение текста ---
    const STORAGE_KEY = 'bingoGridData_v1';
    let saveTimeout;

    function saveTexts() {
        const editables = document.querySelectorAll('.cell-editable');
        const data = Array.from(editables).map(el => el.innerText.trim());
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function loadTexts() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        try {
            const data = JSON.parse(stored);
            const editables = document.querySelectorAll('.cell-editable');
            if (data.length === editables.length) {
                editables.forEach((el, i) => {
                    el.innerText = data[i] || '';
                });
            }
        } catch (e) {}
    }

    function debouncedSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveTexts, 500);
    }

    // --- Загрузка баннеров ---
    function updateLoadingProgress() {
        if (!progressBar) return;
        const progress = (loadedImages / totalImagesToLoad) * 100;
        progressBar.style.width = progress + '%';
        
        if (loadedImages >= totalImagesToLoad && totalImagesToLoad > 0) {
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
                captureArea.style.opacity = '1';
                captureArea.style.visibility = 'visible';
                captureArea.classList.add('fade-in');
                adjustLayout();
            }, 300);
        }
    }
    
    function countImagesToLoad() {
        const images = document.querySelectorAll('.banner');
        totalImagesToLoad = images.length;
        if (totalImagesToLoad === 0) updateLoadingProgress();
    }
    
    function setupImageLoading() {
        const images = document.querySelectorAll('.banner');
        images.forEach(img => {
            if (img.complete) {
                loadedImages++;
                updateLoadingProgress();
            } else {
                img.addEventListener('load', () => {
                    loadedImages++;
                    updateLoadingProgress();
                });
                img.addEventListener('error', () => {
                    loadedImages++;
                    updateLoadingProgress();
                });
            }
        });
    }
    
    countImagesToLoad();
    setupImageLoading();

    // --- Музыка ---
    let musicEnabled = true;
    let musicInitialized = false;
    let musicReady = false;
    
    function playMusic() {
        if (!bgMusic || !musicEnabled) return;
        bgMusic.volume = 0.3;
        const playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                const tryPlayOnInteraction = function() {
                    if (musicEnabled && bgMusic) bgMusic.play().catch(() => {});
                    document.removeEventListener('click', tryPlayOnInteraction);
                    document.removeEventListener('touchstart', tryPlayOnInteraction);
                };
                document.addEventListener('click', tryPlayOnInteraction);
                document.addEventListener('touchstart', tryPlayOnInteraction);
            });
        }
    }
    
    function enableMusic() {
        musicEnabled = true;
        musicToggleBtn.classList.remove('muted');
        if (musicReady) playMusic();
    }
    
    function disableMusic() {
        musicEnabled = false;
        musicToggleBtn.classList.add('muted');
        bgMusic.pause();
    }
    
    function toggleMusic() {
        musicEnabled ? disableMusic() : enableMusic();
    }
    
    function initMusic() {
        if (musicInitialized) return;
        musicInitialized = true;
        if (bgMusic && musicToggleBtn) {
            musicEnabled = true;
            musicToggleBtn.classList.remove('muted');
            if (bgMusic.readyState >= 2) {
                musicReady = true;
                setTimeout(() => playMusic(), 100);
            } else {
                bgMusic.addEventListener('canplaythrough', () => {
                    musicReady = true;
                    if (musicEnabled) playMusic();
                }, { once: true });
            }
            bgMusic.addEventListener('ended', function() {
                if (musicEnabled) {
                    this.currentTime = 0;
                    this.play().catch(() => {});
                }
            });
            musicToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMusic();
            });
        }
    }
    setTimeout(initMusic, 500);

    // --- Работа с шрифтами ---
    function fitFontSize(el) {
        const text = el.innerText.trim();
        if (!text) {
            el.style.fontSize = '1rem';
            return;
        }
        const parent = el.parentElement;
        if (!parent) return;

        let low = MIN_FONT_SIZE, high = MAX_FONT_SIZE, best = MIN_FONT_SIZE;
        el.style.whiteSpace = 'nowrap';
        el.style.wordBreak = 'normal';
        el.style.overflowWrap = 'normal';

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = mid + 'px';
            if (el.scrollHeight <= parent.clientHeight + 1 && el.scrollWidth <= parent.clientWidth + 1) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        if (best >= WRAP_THRESHOLD) {
            el.style.fontSize = best + 'px';
            return;
        }

        el.style.whiteSpace = 'pre-wrap';
        el.style.wordBreak = 'break-word';
        el.style.overflowWrap = 'break-word';
        el.style.fontSize = WRAP_THRESHOLD + 'px';

        if (el.scrollHeight <= parent.clientHeight + 1) return;

        low = MIN_FONT_SIZE;
        high = WRAP_THRESHOLD;
        best = MIN_FONT_SIZE;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = mid + 'px';
            if (el.scrollHeight <= parent.clientHeight + 1) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        el.style.fontSize = best + 'px';
    }

    function fitFontSizeForExport(el) {
        // Используется только в старом методе (оставлено для совместимости)
        const text = el.innerText.trim();
        if (!text) return;
        const parent = el.parentElement;
        if (!parent) return;

        el.style.whiteSpace = 'pre-wrap';
        el.style.wordBreak = 'break-word';
        el.style.overflowWrap = 'break-word';

        let low = MIN_FONT_SIZE;
        let high = 2000;
        let best = MIN_FONT_SIZE;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = mid + 'px';
            if (el.scrollHeight <= parent.clientHeight + 1) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        el.style.fontSize = best + 'px';
    }

    function fitAllFontSizes() {
        document.querySelectorAll('.cell-editable').forEach(fitFontSize);
    }

    // --- Создание сетки ---
    container.innerHTML = '';
    for (let i = 1; i <= TOTAL_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        const editable = document.createElement('div');
        editable.className = 'cell-editable';
        editable.contentEditable = 'true';
        editable.setAttribute('role', 'textbox');
        editable.setAttribute('placeholder', '...');
        editable.addEventListener('input', () => {
            fitFontSize(editable);
            debouncedSave();
        });
        editable.addEventListener('paste', function (e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
            fitFontSize(editable);
            debouncedSave();
        });
        cell.appendChild(editable);
        container.appendChild(cell);
    }

    loadTexts();

    function adjustLayout() {
        const topBanner = document.querySelector('.top-banner');
        const bottomBanner = document.getElementById('bottomBanner');
        const buttonRow = document.querySelector('.button-row');
        if (!topBanner || !bottomBanner || !buttonRow || !captureArea) return;

        const topHeight = topBanner.offsetHeight;
        const bottomHeight = bottomBanner.offsetHeight;
        const buttonHeight = buttonRow.offsetHeight;
        const totalNonGrid = topHeight + bottomHeight + buttonHeight;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const availableSquare = viewportHeight - totalNonGrid;
        const newWidth = Math.min(viewportWidth * 0.9, availableSquare);
        const finalWidth = Math.max(newWidth, 240);
        captureArea.style.width = finalWidth + 'px';
        fitAllFontSizes();
    }

    // === НОВАЯ СИСТЕМА СОХРАНЕНИЯ ЧЕРЕЗ CANVAS ===
    if (saveBtn) {
        saveBtn.disabled = false;

        function showIOSGalleryHint() {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && 'ontouchend' in document);
            if (isIOS) {
                const hintModal = document.getElementById('galleryHintModal');
                if (hintModal) hintModal.style.display = 'flex';
            }
        }

        async function loadImage(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                const cacheBust = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
                img.src = cacheBust;

                img.onload = () => {
                    if (img.decode) img.decode().catch(() => {});
                    resolve(img);
                };
                img.onerror = () => reject(new Error(`Не удалось загрузить изображение`));
            });
        }

        saveBtn.onclick = async function () {
            if (isSaving) return;
            isSaving = true;
            const originalHTML = saveBtn.innerHTML;
            saveBtn.innerHTML = 'Создание...';
            saveBtn.disabled = true;

            let saveModal = null;

            try {
                if (document.activeElement?.blur) document.activeElement.blur();
                fitAllFontSizes();

                saveModal = document.createElement('div');
                saveModal.id = 'saveModal';
                saveModal.innerHTML = `
                    <div class="save-modal-content">
                        <div class="save-spinner"></div>
                        <p>Создаём изображение...</p>
                    </div>
                `;
                document.body.appendChild(saveModal);
                saveModal.style.display = 'flex';

                const topImgEl = document.querySelector('.top-banner');
                const bottomImgEl = document.querySelector('.bottom-banner');

                const [topImg, bottomImg] = await Promise.all([
                    loadImage(topImgEl.src),
                    loadImage(bottomImgEl.src)
                ]);

                // Параметры холста
                const EXPORT_WIDTH = 1250;
                const PADDING = 30;
                const GRID_SIZE_PX = EXPORT_WIDTH - PADDING * 2;
                const BANNER_HEIGHT = Math.round(EXPORT_WIDTH * 0.22);

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { alpha: true });

                canvas.width = EXPORT_WIDTH;
                canvas.height = BANNER_HEIGHT * 2 + GRID_SIZE_PX + PADDING * 3;

                // Фон
                ctx.fillStyle = '#fff6ef';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Top Banner
                const topRatio = topImg.width / topImg.height;
                const topDrawWidth = Math.round(BANNER_HEIGHT * topRatio);
                const topX = (EXPORT_WIDTH - topDrawWidth) / 2;
                ctx.drawImage(topImg, topX, PADDING, topDrawWidth, BANNER_HEIGHT);

                // Grid
                const cellSize = GRID_SIZE_PX / 5;
                const gridX = PADDING;
                const gridY = PADDING + BANNER_HEIGHT + 25;

                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 6;
                ctx.fillStyle = '#fff6ef';

                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        const x = gridX + col * cellSize;
                        const y = gridY + row * cellSize;
                        ctx.fillRect(x, y, cellSize, cellSize);
                        ctx.strokeRect(x, y, cellSize, cellSize);
                    }
                }

                // Текст
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const editables = document.querySelectorAll('.cell-editable');
                editables.forEach((el, index) => {
                    let text = el.innerText.trim();
                    if (!text) return;

                    const row = Math.floor(index / 5);
                    const col = index % 5;
                    const x = gridX + col * cellSize + cellSize / 2;
                    const y = gridY + row * cellSize + cellSize / 2;

                    let fontSize = Math.floor(cellSize * 0.24);
                    ctx.font = `bold ${fontSize}px Arial`;

                    let metrics = ctx.measureText(text);
                    while (metrics.width > cellSize * 0.9 && fontSize > 16) {
                        fontSize -= 3;
                        ctx.font = `bold ${fontSize}px Arial`;
                        metrics = ctx.measureText(text);
                    }

                    const lines = text.split('\n');
                    const lineHeight = fontSize * 1.1;
                    const totalHeight = lines.length * lineHeight;
                    let startY = y - totalHeight / 2 + lineHeight / 2;

                    lines.forEach(line => {
                        ctx.fillText(line.trim(), x, startY);
                        startY += lineHeight;
                    });
                });

                // Bottom Banner
                const bottomY = canvas.height - BANNER_HEIGHT - PADDING;
                const bottomRatio = bottomImg.width / bottomImg.height;
                const bottomDrawWidth = Math.round(BANNER_HEIGHT * bottomRatio);
                const bottomX = (EXPORT_WIDTH - bottomDrawWidth) / 2;
                ctx.drawImage(bottomImg, bottomX, bottomY, bottomDrawWidth, BANNER_HEIGHT);

                // Сохранение
                const dataUrl = canvas.toDataURL('image/png', 1.0);

                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && 'ontouchend' in document);

                if (isIOS && navigator.share) {
                    try {
                        const blob = await fetch(dataUrl).then(r => r.blob());
                        const file = new File([blob], `bingo_${Date.now()}.png`, { type: 'image/png' });
                        await navigator.share({ files: [file] });
                        return;
                    } catch (e) {}
                }

                const link = document.createElement('a');
                link.download = `bingo_${Date.now()}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                if (isIOS) showIOSGalleryHint();

            } catch (error) {
                console.error(error);
                alert('Ошибка сохранения: ' + error.message);
            } finally {
                saveBtn.innerHTML = originalHTML;
                saveBtn.disabled = false;
                isSaving = false;
                if (saveModal) saveModal.remove();
            }
        };
    }

    // --- Кнопка сброса ---
    function addResetButton() {
        const topRow = document.querySelector('.buttons-top-row');
        if (!topRow || document.getElementById('resetTextBtn')) return;

        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetTextBtn';
        resetBtn.className = 'dnt-button';
        resetBtn.textContent = 'Сбросить текст';
        resetBtn.addEventListener('click', () => {
            if (confirm('Вы точно хотите удалить весь текст?')) {
                localStorage.removeItem(STORAGE_KEY);
                document.querySelectorAll('.cell-editable').forEach(el => el.innerText = '');
                fitAllFontSizes();
            }
        });

        const musicBtn = document.getElementById('musicToggleBtn');
        if (musicBtn) topRow.insertBefore(resetBtn, musicBtn);
        else topRow.appendChild(resetBtn);
    }

    window.addEventListener('load', () => {
        fitAllFontSizes();
        adjustLayout();
        addResetButton();
    });

    window.addEventListener('resize', adjustLayout);

    if (window.ResizeObserver) {
        new ResizeObserver(() => {
            if (!isSaving) fitAllFontSizes();
        }).observe(container);
    }
})();