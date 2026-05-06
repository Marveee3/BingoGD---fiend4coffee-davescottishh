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

    // --- Локальное сохранение текста в localStorage ---
    const STORAGE_KEY = 'bingoGridData_v1';
    let saveTimeout;

    function saveTexts() {
        const editables = document.querySelectorAll('.cell-editable');
        const data = Array.from(editables).map(el => el.innerText.trim());
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* хранилище переполнено или недоступно */ }
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
        } catch (e) { /* битые данные – игнорируем */ }
    }

    function debouncedSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveTexts, 500);
    }

    // --- Загрузка баннеров (локальных) ---
    function updateLoadingProgress() {
        if (!progressBar) return;
        const progress = (loadedImages / totalImagesToLoad) * 100;
        progressBar.style.width = progress + '%';
        
        if (loadedImages >= totalImagesToLoad && totalImagesToLoad > 0) {
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.classList.add('fade-out');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }
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
                    if (musicEnabled && bgMusic) {
                        bgMusic.play().catch(e => console.log("Play error:", e));
                    }
                    document.removeEventListener('click', tryPlayOnInteraction);
                    document.removeEventListener('touchstart', tryPlayOnInteraction);
                };
                document.addEventListener('click', tryPlayOnInteraction);
                document.addEventListener('touchstart', tryPlayOnInteraction);
            });
        }
    }
    
    function enableMusic() {
        if (!bgMusic) return;
        musicEnabled = true;
        musicToggleBtn.classList.remove('muted');
        if (musicReady) playMusic();
    }
    
    function disableMusic() {
        if (!bgMusic) return;
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
                    this.play().catch(e => console.log("Replay error:", e));
                }
            });
            musicToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMusic();
            });
        }
    }
    setTimeout(initMusic, 500);

    // --- Подбор шрифта для экрана (с WRAP_THRESHOLD) ---
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

    // --- Подбор шрифта для экспорта (без ограничения WRAP_THRESHOLD) ---
    function fitFontSizeForExport(el) {
        const text = el.innerText.trim();
        if (!text) {
            el.style.fontSize = '1rem';
            return;
        }
        const parent = el.parentElement;
        if (!parent) return;
        const limit = MAX_FONT_SIZE;

        el.style.whiteSpace = 'nowrap';
        el.style.wordBreak = 'normal';
        el.style.overflowWrap = 'normal';

        let low = MIN_FONT_SIZE;
        let high = limit;
        let best = MIN_FONT_SIZE;

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

        el.style.fontSize = best + 'px';
        if (el.scrollWidth <= parent.clientWidth + 1 && el.scrollHeight <= parent.clientHeight + 1) {
            return;
        }

        el.style.whiteSpace = 'pre-wrap';
        el.style.wordBreak = 'break-word';
        el.style.overflowWrap = 'break-word';

        low = MIN_FONT_SIZE;
        high = limit;
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
        const newWidth = Math.min(viewportWidth * 0.8, availableSquare);
        const finalWidth = Math.max(newWidth, 240);
        captureArea.style.width = finalWidth + 'px';
        fitAllFontSizes();
    }

    // --- Надёжное преобразование изображения в Canvas с ожиданием декодирования (iOS fix) ---
    async function imgToCanvasAsync(img) {
        // Убеждаемся, что изображение полностью загружено и декодировано
        if (!img.complete || img.naturalWidth === 0) {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                if (img.complete && img.naturalWidth > 0) resolve();
            });
        }
        
        // Используем decode() когда доступно (современные браузеры)
        if (img.decode) {
            try {
                await img.decode();
            } catch (err) {
                console.warn('decode failed, continuing anyway', err);
            }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Проверка, что canvas не пустой (доп. защита для iOS)
        try {
            const pixel = ctx.getImageData(Math.floor(canvas.width/2), Math.floor(canvas.height/2), 1, 1).data;
            const isEmpty = pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0 && pixel[3] === 0;
            if (isEmpty && canvas.width > 0 && canvas.height > 0) {
                console.warn('Canvas appears empty, retrying draw...');
                ctx.drawImage(img, 0, 0);
            }
        } catch(e) { /* не критично */ }
        
        return canvas;
    }
    // --- FORCE LOAD IMAGE (обход кэша + decode) ---
    async function forceLoadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            // cache bust (важно для iOS)
            img.src = src + '?t=' + Date.now();

            img.onload = async () => {
                if (img.decode) {
                    try {
                        await img.decode();
                    } catch (e) {}
                }
                resolve(img);
            };

            img.onerror = reject;
        });
    }

    // --- CANVAS DRAW С RETRY ---
    async function imgToCanvasAsync(img, retries = 2) {
        if (img.decode) {
            try {
                await img.decode();
            } catch {}
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        try {
            const pixel = ctx.getImageData(
                Math.floor(canvas.width / 2),
                Math.floor(canvas.height / 2),
                1,
                1
            ).data;

            const empty = pixel[3] === 0;

            if (empty && retries > 0) {
                console.warn('Retry drawing image...');
                await new Promise(r => setTimeout(r, 100));
                return imgToCanvasAsync(img, retries - 1);
            }
        } catch {}

        return canvas;
    }

    // --- Сохранение с надёжным преобразованием баннеров в canvas (исправлено для iOS) ---
    if (saveBtn) {
        const DomToImageLib = window.domtoimage;
        if (!DomToImageLib) {
            console.warn('Библиотека dom-to-image-more не загружена.');
            saveBtn.disabled = true;
            saveBtn.title = 'Библиотека не загружена';
        } else {
            saveBtn.disabled = false;
            saveBtn.title = '';

            function showIOSGalleryHint() {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                if (isIOS) {
                    const hintModal = document.getElementById('galleryHintModal');
                    if (hintModal) {
                        hintModal.style.display = 'flex';
                        hintModal.querySelector('.gallery-hint-close').onclick = () => {
                            hintModal.style.display = 'none';
                        };
                    }
                }
            }

            async function saveToGalleryOrDownload(dataUrl) {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

                if (isIOS && navigator.share && navigator.canShare) {
                    try {
                        const blob = await (await fetch(dataUrl)).blob();
                        const file = new File([blob], 'bingo.png', { type: 'image/png' });
                        const shareData = { files: [file] };
                        if (navigator.canShare(shareData)) {
                            await navigator.share(shareData);
                            return;
                        }
                    } catch (err) {
                        if (err.name !== 'AbortError') console.warn('Share error:', err);
                    }
                }

                const link = document.createElement('a');
                link.download = `bingo_${Date.now()}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                if (isIOS) {
                    showIOSGalleryHint();
                }
            }

            saveBtn.onclick = async function () {
                if (isSaving) return;
                isSaving = true;

                if (document.activeElement && document.activeElement.blur) {
                    document.activeElement.blur();
                }

                fitAllFontSizes();

                let saveModal = document.getElementById('saveModal');
                if (!saveModal) {
                    saveModal = document.createElement('div');
                    saveModal.id = 'saveModal';
                    saveModal.innerHTML = `
                        <div class="save-modal-content">
                            <div class="save-spinner"></div>
                            <p>Создаём изображение…</p>
                        </div>
                    `;
                    document.body.appendChild(saveModal);
                }

                saveModal.style.display = 'flex';

                const originalHTML = saveBtn.innerHTML;
                saveBtn.innerHTML = 'Создание...';
                saveBtn.disabled = true;

                let cloneContainer = null;
                const originalMaxFontSize = MAX_FONT_SIZE;

                try {
                    const topWrapper = document.querySelector('.top-banner-wrapper');
                    const grid = document.getElementById('smartGrid');
                    const bottomWrapper = document.querySelector('.bottom-banner-wrapper');

                    if (!topWrapper || !grid || !bottomWrapper) {
                        throw new Error('Элементы не найдены');
                    }

                    const topImg = topWrapper.querySelector('.banner');
                    const bottomImg = bottomWrapper.querySelector('.banner');

                    if (!topImg || !bottomImg) {
                        throw new Error('Баннеры не найдены');
                    }

                    console.log('Force loading banners...');

                    // 🔥 ПРИНУДИТЕЛЬНАЯ ЗАГРУЗКА
                    const topLoaded = await forceLoadImage(topImg.src);
                    const bottomLoaded = await forceLoadImage(bottomImg.src);

                    const topCanvas = await imgToCanvasAsync(topLoaded);
                    const bottomCanvas = await imgToCanvasAsync(bottomLoaded);

                    const EXPORT_WIDTH = 1250;
                    const SIDE_PADDING = 25;
                    const pixelRatio = Math.min(window.devicePixelRatio || 2, 2);

                    cloneContainer = document.createElement('div');
                    cloneContainer.style.position = 'absolute';
                    cloneContainer.style.top = '-9999px';
                    cloneContainer.style.left = '-9999px';
                    cloneContainer.style.width = EXPORT_WIDTH + 'px';
                    cloneContainer.style.padding = `0 ${SIDE_PADDING}px`;
                    cloneContainer.style.backgroundColor = '#fff6ef';
                    cloneContainer.style.display = 'flex';
                    cloneContainer.style.flexDirection = 'column';
                    cloneContainer.style.alignItems = 'center';

                    // --- TOP ---
                    const topClone = topWrapper.cloneNode(true);
                    const topCloneImg = topClone.querySelector('.banner');
                    topCloneImg.replaceWith(topCanvas);

                    topCanvas.style.width = '100%';
                    topCanvas.style.display = 'block';

                    cloneContainer.appendChild(topClone);

                    // --- GRID ---
                    const gridClone = grid.cloneNode(true);
                    gridClone.style.width = '100%';
                    gridClone.style.aspectRatio = '1 / 1';

                    cloneContainer.appendChild(gridClone);

                    // --- BOTTOM ---
                    const bottomClone = bottomWrapper.cloneNode(true);
                    const bottomCloneImg = bottomClone.querySelector('.banner');
                    bottomCloneImg.replaceWith(bottomCanvas);

                    bottomCanvas.style.width = '100%';
                    bottomCanvas.style.display = 'block';

                    cloneContainer.appendChild(bottomClone);

                    document.body.appendChild(cloneContainer);

                    // 🔥 ВАЖНО ДЛЯ iOS
                    await new Promise(r => requestAnimationFrame(r));
                    await new Promise(r => setTimeout(r, 150));

                    // --- ФОНТЫ ---
                    MAX_FONT_SIZE = 2000;

                    const cloneEditables = cloneContainer.querySelectorAll('.cell-editable');
                    cloneEditables.forEach(el => {
                        el.style.lineHeight = '1.1';
                        fitFontSizeForExport(el);
                    });

                    await new Promise(r => setTimeout(r, 50));

                    const dataUrl = await domtoimage.toPng(cloneContainer, {
                        quality: 1,
                        pixelRatio: pixelRatio,
                        backgroundColor: '#fff6ef',
                        cacheBust: true // 🔥 критично
                    });

                    await saveToGalleryOrDownload(dataUrl);

                } catch (error) {
                    console.error(error);
                    alert('Ошибка: ' + error.message);
                } finally {
                    MAX_FONT_SIZE = originalMaxFontSize;

                    if (cloneContainer) {
                        document.body.removeChild(cloneContainer);
                    }

                    saveModal.style.display = 'none';
                    saveBtn.innerHTML = originalHTML;
                    saveBtn.disabled = false;
                    isSaving = false;
                }
            };
        }
    }

    // --- Кнопка «Сбросить текст» ---
    function addResetButton() {
        const topRow = document.querySelector('.buttons-top-row');
        if (!topRow) return;
        if (document.getElementById('resetTextBtn')) return;

        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetTextBtn';
        resetBtn.className = 'dnt-button';
        resetBtn.textContent = 'Сбросить текст';
        resetBtn.addEventListener('click', () => {
            if (confirm('Вы точно хотите удалить весь текст?')) {
                localStorage.removeItem(STORAGE_KEY);
                const editables = document.querySelectorAll('.cell-editable');
                editables.forEach(el => { el.innerText = ''; });
                fitAllFontSizes();
            }
        });

        const musicBtn = document.getElementById('musicToggleBtn');
        if (musicBtn) {
            topRow.insertBefore(resetBtn, musicBtn);
        } else {
            topRow.appendChild(resetBtn);
        }
    }

    window.addEventListener('load', () => {
        fitAllFontSizes();
        adjustLayout();
        addResetButton();
    });

    window.addEventListener('resize', adjustLayout);

    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
            if (!isSaving) fitAllFontSizes();
        });
        ro.observe(container);
    }
})();