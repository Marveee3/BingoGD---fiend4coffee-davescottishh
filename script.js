(function () {
    const GRID_SIZE = 5;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    let MIN_FONT_SIZE = 6;
    let MAX_FONT_SIZE = 40;
    let WRAP_THRESHOLD = 15;

    const container = document.getElementById('smartGrid');
    const saveBtn = document.getElementById('saveBtn');
    const iosSaveBtn = document.getElementById('iosSaveBtn');
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

    // --- Загрузка баннеров и конвертация в Base64 для iOS ---
    const bannerDataUrls = {
        top: null,
        bottom: null
    };

    async function imageToBase64(img) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL('image/png');
        } catch (e) {
            console.error('Base64 conversion failed', e);
            return null;
        }
    }

    async function updateLoadingProgress() {
        if (!progressBar) return;
        const progress = (loadedImages / totalImagesToLoad) * 100;
        progressBar.style.width = progress + '%';
        
        if (loadedImages >= totalImagesToLoad && totalImagesToLoad > 0) {
            // Конвертируем баннеры в Base64 сразу после загрузки
            const topImg = document.querySelector('.top-banner');
            const bottomImg = document.querySelector('.bottom-banner');
            if (topImg) bannerDataUrls.top = await imageToBase64(topImg);
            if (bottomImg) bannerDataUrls.bottom = await imageToBase64(bottomImg);

            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.classList.add('fade-out');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }
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
            const onFinish = () => {
                loadedImages++;
                updateLoadingProgress();
            };
            if (img.complete && img.naturalWidth > 0) {
                onFinish();
            } else {
                img.addEventListener('load', onFinish, { once: true });
                img.addEventListener('error', onFinish, { once: true });
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

    // --- Подбор шрифта для экспорта (максимальное заполнение клетки) ---
    function fitFontSizeForExport(el) {
        const text = el.innerText.trim();
        if (!text) {
            el.style.fontSize = '1rem';
            return;
        }
        const parent = el.parentElement;
        if (!parent) return;
        const limit = MAX_FONT_SIZE;

        el.style.whiteSpace = 'pre-wrap';
        el.style.wordBreak = 'break-word';
        el.style.overflowWrap = 'break-word';

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

    // --- Генерация картинки (упрощённая и надёжная) ---
    async function generateImageDataUrl() {
        if (document.activeElement?.blur) document.activeElement.blur();
        fitAllFontSizes();

        const EXPORT_WIDTH = 1250;
        const SIDE_PADDING = 25;
        const pixelRatio = Math.min(window.devicePixelRatio || 2, 2.5);

        const cloneContainer = document.createElement('div');
        Object.assign(cloneContainer.style, {
            position: 'absolute',
            top: '-99999px',
            left: '-99999px',
            width: EXPORT_WIDTH + 'px',
            boxSizing: 'border-box',
            padding: `0 ${SIDE_PADDING}px`,
            backgroundColor: '#fff6ef',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: 'Arial, sans-serif'
        });

        // Используем Base64 баннеры, если они готовы, иначе берем оригиналы
        const topClone = document.querySelector('.top-banner-wrapper').cloneNode(true);
        if (bannerDataUrls.top) {
            topClone.querySelector('img').src = bannerDataUrls.top;
        }
        cloneContainer.appendChild(topClone);

        const gridClone = document.getElementById('smartGrid').cloneNode(true);
        const GRID_SIDE = EXPORT_WIDTH - 2 * SIDE_PADDING;
        gridClone.style.width  = GRID_SIDE + 'px';
        gridClone.style.height = GRID_SIDE + 'px';
        gridClone.style.aspectRatio = 'auto';
        cloneContainer.appendChild(gridClone);

        const bottomClone = document.querySelector('.bottom-banner-wrapper').cloneNode(true);
        if (bannerDataUrls.bottom) {
            bottomClone.querySelector('img').src = bannerDataUrls.bottom;
        }
        cloneContainer.appendChild(bottomClone);

        document.body.appendChild(cloneContainer);

        // Даём браузеру отрисовать клон
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => setTimeout(r, 150));

        const originalMax = MAX_FONT_SIZE;
        MAX_FONT_SIZE = 2000;
        cloneContainer.querySelectorAll('.cell-editable').forEach(el => {
            el.style.lineHeight = '1.1';
            fitFontSizeForExport(el);
        });
        await new Promise(r => setTimeout(r, 100));

        const DomToImageLib = window.domtoimage;
        const dataUrl = await DomToImageLib.toPng(cloneContainer, {
            quality: 1,
            pixelRatio: pixelRatio,
            backgroundColor: '#fff6ef',
            cacheBust: true,
            filter: (node) => node.tagName !== 'A'
        });

        cloneContainer.remove();
        MAX_FONT_SIZE = originalMax;
        return dataUrl;
    }

    // --- Обработчик кнопки «Сохранить как фото» ---
    if (saveBtn) {
        saveBtn.onclick = async function () {
            if (isSaving) return;
            isSaving = true;

            const originalHTML = saveBtn.innerHTML;
            saveBtn.innerHTML = 'Создание...';
            saveBtn.disabled = true;

            let saveModal = null;
            try {
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

                const dataUrl = await generateImageDataUrl();

                const isIOS = isIOSDevice();
                if (isIOS && navigator.share) {
                    try {
                        const blob = await fetch(dataUrl).then(r => r.blob());
                        const file = new File([blob], `bingo_${Date.now()}.png`, { type: 'image/png' });
                        await navigator.share({ files: [file] });
                        return;
                    } catch (e) {
                        console.log('Share не сработал, используем download');
                    }
                }

                const link = document.createElement('a');
                link.download = `bingo_${Date.now()}.png`;
                link.href = dataUrl;
                link.click();

                if (isIOS) {
                    const hintModal = document.getElementById('galleryHintModal');
                    if (hintModal) hintModal.style.display = 'flex';
                }
            } catch (error) {
                console.error('Save error:', error);
                alert('Ошибка сохранения: ' + error.message);
            } finally {
                if (saveModal) saveModal.remove();
                saveBtn.innerHTML = originalHTML;
                saveBtn.disabled = false;
                isSaving = false;
            }
        };
    }

    // --- iOS‑кнопка «Скриншот для iPhone» ---
    if (iosSaveBtn) {
        iosSaveBtn.onclick = async function () {
            if (isSaving) return;
            isSaving = true;

            const originalHTML = iosSaveBtn.innerHTML;
            iosSaveBtn.innerHTML = 'Создание...';
            iosSaveBtn.disabled = true;

            let saveModal = null;
            try {
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

                const dataUrl = await generateImageDataUrl();

                const screenshotModal = document.getElementById('iosScreenshotModal');
                const screenshotContainer = document.getElementById('screenshotContainer');

                const finalImg = new Image();
                finalImg.src = dataUrl;
                finalImg.style.maxWidth = '100%';
                finalImg.style.height = 'auto';
                finalImg.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

                screenshotContainer.innerHTML = '';
                screenshotContainer.appendChild(finalImg);
                screenshotModal.style.display = 'flex';
            } catch (error) {
                console.error('Screenshot error:', error);
                alert('Ошибка: ' + error.message);
            } finally {
                if (saveModal) saveModal.remove();
                iosSaveBtn.innerHTML = originalHTML;
                iosSaveBtn.disabled = false;
                isSaving = false;
            }
        };
    }

    const closeScreenshotModal = document.getElementById('closeScreenshotModal');
    if (closeScreenshotModal) {
        closeScreenshotModal.onclick = () => {
            document.getElementById('iosScreenshotModal').style.display = 'none';
        };
    }

    // --- Надёжное определение iOS (включая iPadOS 13+) ---
    function isIOSDevice() {
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
        return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    }

    // Показать правильную кнопку
    if (isIOSDevice()) {
        iosSaveBtn.style.display = 'block';
        saveBtn.style.display = 'none';
    } else {
        iosSaveBtn.style.display = 'none';
        saveBtn.style.display = 'block';
    }

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