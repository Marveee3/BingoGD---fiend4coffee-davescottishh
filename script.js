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

            saveBtn.onclick = async () => {
                if (isSaving) return;
                isSaving = true;

                try {
                    fitAllFontSizes();

                    const topImg = document.querySelector('.top-banner');
                    const bottomImg = document.querySelector('.bottom-banner');
                    const grid = document.getElementById('smartGrid');

                    if (!topImg || !bottomImg || !grid) {
                        throw new Error('Элементы не найдены');
                    }

                    // --- загружаем изображения ЖЁСТКО ---
                    async function loadImage(src) {
                        return new Promise((resolve, reject) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.src = src + '?t=' + Date.now();

                            img.onload = () => resolve(img);
                            img.onerror = reject;
                        });
                    }

                    const topLoaded = await loadImage(topImg.src);
                    const bottomLoaded = await loadImage(bottomImg.src);

                    // --- создаём canvas для сетки ---
                    const GRID_SIZE = 5;
                    const EXPORT_SIZE = 1000;
                    const CELL_SIZE = EXPORT_SIZE / GRID_SIZE;

                    const gridCanvas = document.createElement('canvas');
                    gridCanvas.width = EXPORT_SIZE;
                    gridCanvas.height = EXPORT_SIZE;
                    const ctx = gridCanvas.getContext('2d');

                    // фон
                    ctx.fillStyle = '#fff6ef';
                    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

                    // клетки
                    const cells = document.querySelectorAll('.cell-editable');

                    cells.forEach((cell, i) => {
                        const row = Math.floor(i / GRID_SIZE);
                        const col = i % GRID_SIZE;

                        const x = col * CELL_SIZE;
                        const y = row * CELL_SIZE;

                        // фон клетки
                        ctx.fillStyle = '#fff6ef';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                        // текст
                        const text = cell.innerText.trim();
                        if (text) {
                            ctx.fillStyle = '#000';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';

                            let fontSize = 40;

                            // автоуменьшение
                            do {
                                ctx.font = `${fontSize}px Arial`;
                                const metrics = ctx.measureText(text);
                                if (metrics.width < CELL_SIZE - 10) break;
                                fontSize -= 2;
                            } while (fontSize > 10);

                            ctx.fillText(
                                text,
                                x + CELL_SIZE / 2,
                                y + CELL_SIZE / 2
                            );
                        }

                        // граница
                        ctx.strokeStyle = '#000';
                        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                    });

                    // --- итоговый canvas ---
                    const finalCanvas = document.createElement('canvas');
                    const width = 1000;
                    const PADDING = 25;

                    const topHeight = (topLoaded.height / topLoaded.width) * width;
                    const bottomHeight = (bottomLoaded.height / bottomLoaded.width) * width;


                    finalCanvas.width = width + PADDING * 2;
                    finalCanvas.height = topHeight + EXPORT_SIZE + bottomHeight;

                    const fctx = finalCanvas.getContext('2d');

                    // фон
                    fctx.fillStyle = '#fff6ef';
                    fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

                    // рисуем
                    fctx.drawImage(topLoaded, PADDING, 0, width, topHeight);
                    fctx.drawImage(gridCanvas, PADDING, topHeight);
                    fctx.drawImage(bottomLoaded, PADDING, topHeight + EXPORT_SIZE, width, bottomHeight);
                    // --- сохраняем ---
                    const dataUrl = finalCanvas.toDataURL('image/png');

                    const link = document.createElement('a');
                    link.href = dataUrl;
                    link.download = 'bingo.png';
                    link.click();

                } catch (e) {
                    console.error(e);
                    alert('Ошибка сохранения');
                }

                isSaving = false;
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