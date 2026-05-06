(function () {
    const GRID_SIZE = 5;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    const MIN_FONT_SIZE = 6;
    const MAX_FONT_SIZE = 40;
    const WRAP_THRESHOLD = 15;

    const container = document.getElementById('smartGrid');
    const saveBtn = document.getElementById('saveBtn');
    const captureArea = document.getElementById('captureArea');
    const loadingScreen = document.getElementById('loadingScreen');
    const bottomBanner = document.getElementById('bottomBanner');
    
    const bgMusic = document.getElementById('bgMusic');
    const musicToggleBtn = document.getElementById('musicToggleBtn');

    if (!container) return;

    let loadedImages = 0;
    let totalImagesToLoad = 0;
    const progressBar = document.querySelector('.loading-progress-bar');
    let isSaving = false;

    // --- Загрузка баннеров ---
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

    // --- Подбор шрифта ---
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
        editable.addEventListener('input', () => fitFontSize(editable));
        editable.addEventListener('paste', function (e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
            fitFontSize(editable);
        });
        cell.appendChild(editable);
        container.appendChild(cell);
    }

    function adjustLayout() {
        const topBanner = document.querySelector('.top-banner');
        const bottomBannerEl = document.getElementById('bottomBanner');
        const buttonRow = document.querySelector('.button-row');
        if (!topBanner || !bottomBannerEl || !buttonRow || !captureArea) return;
        const topHeight = topBanner.offsetHeight;
        const bottomHeight = bottomBannerEl.offsetHeight;
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

    // --- Обрезка изображения по области между верхним и нижним баннерами, с шириной нижнего баннера ---
    async function cropToBannersArea(fullCanvas, captureRect, topBannerRect, bottomBannerRect) {
        // Определяем область обрезки в координатах captureArea (без масштаба)
        const cropX = (captureRect.width - bottomBannerRect.width) / 2;   // центрируем по ширине нижнего баннера
        const cropY = topBannerRect.top - captureRect.top;                // от верхнего края верхнего баннера
        const cropWidth = bottomBannerRect.width;
        const cropHeight = bottomBannerRect.bottom - topBannerRect.top;    // до нижнего края нижнего баннера

        if (cropWidth <= 0 || cropHeight <= 0) {
            throw new Error('Некорректные размеры обрезки: проверьте отображение баннеров');
        }

        // Масштабируем под размер canvas
        const scaleX = fullCanvas.width / captureRect.width;
        const scaleY = fullCanvas.height / captureRect.height;
        // Используем единый масштаб (при рендеринге с pixelRatio=2 он одинаков по обеим осям)
        const sx = cropX * scaleX;
        const sy = cropY * scaleY;
        const sw = cropWidth * scaleX;
        const sh = cropHeight * scaleY;

        // Защита от выходов за границы
        const safeSx = Math.max(0, sx);
        const safeSy = Math.max(0, sy);
        const safeSw = Math.min(sw, fullCanvas.width - safeSx);
        const safeSh = Math.min(sh, fullCanvas.height - safeSy);

        if (safeSw <= 0 || safeSh <= 0) {
            throw new Error('Обрезаемая область выходит за пределы изображения');
        }

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = safeSw;
        croppedCanvas.height = safeSh;
        const ctx = croppedCanvas.getContext('2d');
        ctx.drawImage(fullCanvas, safeSx, safeSy, safeSw, safeSh, 0, 0, safeSw, safeSh);
        return croppedCanvas;
    }

    // --- Сохранение через html-to-image с обрезкой между баннерами ---
    if (saveBtn && window.htmlToImage) {
        saveBtn.onclick = async function() {
            if (isSaving) return;
            isSaving = true;
            
            if (document.activeElement && document.activeElement.blur) {
                document.activeElement.blur();
            }
            fitAllFontSizes();
            
            const originalText = saveBtn.innerText;
            saveBtn.innerText = "Создание...";
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0';
            
            try {
                // Получаем элементы баннеров для обрезки
                const topBanner = document.querySelector('.top-banner');
                const bottomBannerEl = document.getElementById('bottomBanner');
                if (!topBanner || !bottomBannerEl) {
                    throw new Error('Верхний или нижний баннер не найден');
                }

                // Сначала рендерим всю captureArea
                const dataUrl = await window.htmlToImage.toPng(captureArea, {
                    quality: 1,
                    pixelRatio: 2,
                    backgroundColor: '#fff6ef',
                    cacheBust: true,
                });
                
                // Загружаем в Image, чтобы получить canvas
                const img = new Image();
                img.src = dataUrl;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                
                const fullCanvas = document.createElement('canvas');
                fullCanvas.width = img.width;
                fullCanvas.height = img.height;
                const ctx = fullCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Получаем актуальные позиции элементов
                const captureRect = captureArea.getBoundingClientRect();
                const topRect = topBanner.getBoundingClientRect();
                const bottomRect = bottomBannerEl.getBoundingClientRect();
                
                // Обрезаем по нужной области
                const finalCanvas = await cropToBannersArea(fullCanvas, captureRect, topRect, bottomRect);
                
                // Скачиваем
                const link = document.createElement('a');
                link.download = `bingo_${Date.now()}.png`;
                link.href = finalCanvas.toDataURL('image/png');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
            } catch (error) {
                console.error('Ошибка сохранения:', error);
                alert('Не удалось сохранить изображение: ' + error.message);
            } finally {
                saveBtn.innerText = originalText;
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                isSaving = false;
            }
        };
    } else if (saveBtn) {
        console.warn('Библиотека html-to-image не загружена');
        saveBtn.disabled = true;
        saveBtn.title = 'Библиотека не загружена';
    }

    window.addEventListener('load', () => {
        fitAllFontSizes();
        adjustLayout();
    });
    window.addEventListener('resize', adjustLayout);
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
            if (!isSaving) fitAllFontSizes();
        });
        ro.observe(container);
    }
})();