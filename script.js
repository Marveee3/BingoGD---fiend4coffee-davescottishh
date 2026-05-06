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

    // === НОВЫЙ МЕТОД ДЛЯ iOS SAFARI ===
    async function saveAsScreenshotIOS() {
        const originalOpacity = captureArea.style.opacity;
        const originalVisibility = captureArea.style.visibility;

        try {
            document.querySelectorAll('.github-link, #saveModal').forEach(el => {
                if (el) el.style.display = 'none';
            });

            captureArea.style.opacity = '1';
            captureArea.style.visibility = 'visible';

            await new Promise(r => setTimeout(r, 150));

            const canvas = await domtoimage.toCanvas(captureArea, {
                quality: 1,
                pixelRatio: Math.min(window.devicePixelRatio || 2, 3),
                bgcolor: '#fff6ef'
            });

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
            const file = new File([blob], `bingo_${Date.now()}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Bingo',
                });
                return true;
            } else {
                const link = document.createElement('a');
                link.download = `bingo_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png', 1);
                link.click();
                showIOSGalleryHint();
                return true;
            }
        } catch (e) {
            console.error('iOS screenshot error:', e);
            alert('Не удалось сохранить автоматически.\n\nПросто сделайте скриншот экрана (громкость + кнопка питания).');
            return false;
        } finally {
            captureArea.style.opacity = originalOpacity;
            captureArea.style.visibility = originalVisibility;
        }
    }

    function showIOSGalleryHint() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && 'ontouchend' in document);
        if (isIOS) {
            const hintModal = document.getElementById('galleryHintModal');
            if (hintModal) hintModal.style.display = 'flex';
        }
    }

    // --- Сохранение ---
    if (saveBtn) {
        const DomToImageLib = window.domtoimage;
        if (!DomToImageLib) {
            console.warn('Библиотека dom-to-image-more не загружена.');
            saveBtn.disabled = true;
            return;
        }

        saveBtn.disabled = false;

        // Надёжная загрузка изображения
        async function forceLoadImage(src, attempts = 3) {
            for (let i = 0; i < attempts; i++) {
                try {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    const cacheBustedSrc = src.includes('?') 
                        ? src + '&t=' + Date.now() 
                        : src + '?t=' + Date.now();

                    await new Promise((resolve, reject) => {
                        img.onload = () => resolve(img);
                        img.onerror = () => {
                            if (i === attempts - 1) reject(new Error(`Не удалось загрузить ${src}`));
                            else resolve(null);
                        };
                        img.src = cacheBustedSrc;
                    });

                    if (!img) continue;
                    if (img.decode) {
                        try { await img.decode(); } catch (e) {}
                    }
                    return img;
                } catch (e) {
                    if (i === attempts - 1) throw e;
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        }

        async function imgToCanvas(img) {
            if (!img || !img.naturalWidth) throw new Error('Изображение не загружено');
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d', { alpha: true });
            
            for (let i = 0; i < 3; i++) {
                ctx.drawImage(img, 0, 0);
                const data = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
                if (data[3] !== 0) return canvas;
                await new Promise(r => setTimeout(r, 50));
            }
            return canvas;
        }

        saveBtn.onclick = async function () {
            if (isSaving) return;
            isSaving = true;

            const originalHTML = saveBtn.innerHTML;
            saveBtn.innerHTML = 'Создание...';
            saveBtn.disabled = true;

            let cloneContainer = null;
            let saveModal = null;

            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && 'ontouchend' in document);

            try {
                if (document.activeElement?.blur) document.activeElement.blur();
                fitAllFontSizes();

                // === iOS Safari — специальный метод ===
                if (isIOS) {
                    const success = await saveAsScreenshotIOS();
                    if (success) {
                        saveBtn.innerHTML = originalHTML;
                        saveBtn.disabled = false;
                        isSaving = false;
                        return;
                    }
                }

                // === Обычный метод для остальных ===
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

                const topImg = document.querySelector('.top-banner');
                const bottomImg = document.querySelector('.bottom-banner');

                const [topLoaded, bottomLoaded] = await Promise.all([
                    forceLoadImage(topImg.src),
                    forceLoadImage(bottomImg.src)
                ]);

                const topCanvas = await imgToCanvas(topLoaded);
                const bottomCanvas = await imgToCanvas(bottomLoaded);

                const EXPORT_WIDTH = 1250;
                const SIDE_PADDING = 25;
                const pixelRatio = Math.min(window.devicePixelRatio || 2, 2.5);

                cloneContainer = document.createElement('div');
                Object.assign(cloneContainer.style, {
                    position: 'absolute',
                    top: '-99999px',
                    left: '-99999px',
                    width: EXPORT_WIDTH + 'px',
                    padding: `0 ${SIDE_PADDING}px`,
                    backgroundColor: '#fff6ef',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    fontFamily: 'Arial, sans-serif'
                });

                const topClone = document.querySelector('.top-banner-wrapper').cloneNode(true);
                const topCloneImg = topClone.querySelector('img');
                topCloneImg.replaceWith(topCanvas);
                topCanvas.style.width = '100%';
                topCanvas.style.display = 'block';
                cloneContainer.appendChild(topClone);

                const gridClone = document.getElementById('smartGrid').cloneNode(true);
                gridClone.style.width = '100%';
                gridClone.style.aspectRatio = '1 / 1';
                cloneContainer.appendChild(gridClone);

                const bottomClone = document.querySelector('.bottom-banner-wrapper').cloneNode(true);
                const bottomCloneImg = bottomClone.querySelector('img');
                bottomCloneImg.replaceWith(bottomCanvas);
                bottomCanvas.style.width = '100%';
                bottomCanvas.style.display = 'block';
                cloneContainer.appendChild(bottomClone);

                document.body.appendChild(cloneContainer);

                await new Promise(r => requestAnimationFrame(r));
                await new Promise(r => setTimeout(r, 200));

                MAX_FONT_SIZE = 2000;

                cloneContainer.querySelectorAll('.cell-editable').forEach(el => {
                    el.style.lineHeight = '1.15';
                    fitFontSizeForExport(el);
                });

                await new Promise(r => setTimeout(r, 80));

                const dataUrl = await DomToImageLib.toPng(cloneContainer, {
                    quality: 1,
                    pixelRatio: pixelRatio,
                    backgroundColor: '#fff6ef',
                    cacheBust: true,
                    filter: (node) => node.tagName !== 'A'
                });

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
                link.click();

                if (isIOS) showIOSGalleryHint();

            } catch (error) {
                console.error('Save error:', error);
                alert('Ошибка сохранения: ' + error.message + '\n\nНа iOS можно просто сделать скриншот экрана.');
            } finally {
                MAX_FONT_SIZE = 40;
                if (cloneContainer) cloneContainer.remove();
                if (saveModal) saveModal.remove();
                saveBtn.innerHTML = originalHTML;
                saveBtn.disabled = false;
                isSaving = false;
            }
        };
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