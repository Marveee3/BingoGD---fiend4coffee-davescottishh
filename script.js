(function () {
    const GRID_SIZE = 5;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    let MIN_FONT_SIZE = 6;
    let MAX_FONT_SIZE = 40;
    let WRAP_THRESHOLD = 15;   // можно оставить const, если не меняется

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
        const limit = MAX_FONT_SIZE; // временно увеличен до 2000 во время экспорта

        // Пробуем без переносов
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
            return; // Уместилось в одну строку
        }

        // Включаем перенос и ищем максимальный размер во всём диапазоне
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


    // --- Сохранение с увеличенным шрифтом и отступами ---
    if (saveBtn) {
        const DomToImageLib = window.domtoimage;
        if (!DomToImageLib) {
            console.warn('Библиотека dom-to-image-more не загружена.');
            saveBtn.disabled = true;
            saveBtn.title = 'Библиотека не загружена';
        } else {
            saveBtn.disabled = false;
            saveBtn.title = '';
            saveBtn.onclick = async function() {
                if (isSaving) return;
                isSaving = true;

                if (document.activeElement && document.activeElement.blur) {
                    document.activeElement.blur();
                }
                fitAllFontSizes();

                const originalHTML = saveBtn.innerHTML;
                saveBtn.innerHTML = `
                    <span class="save-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top:2px solid transparent;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px;"></span>
                    Создание...
                `;
                saveBtn.disabled = true;

                let cloneContainer = null;
                const originalMaxFontSize = MAX_FONT_SIZE;  // запоминаем экранный лимит (обычно 40)

                try {
                    const topWrapper = document.querySelector('.top-banner-wrapper');
                    const grid = document.getElementById('smartGrid');
                    const bottomWrapper = document.querySelector('.bottom-banner-wrapper');

                    if (!topWrapper || !grid || !bottomWrapper) {
                        throw new Error('Не удалось найти элементы для сохранения');
                    }

                    const banners = document.querySelectorAll('.banner');
                    const allBannersOk = Array.from(banners).every(
                        img => img.complete && img.naturalWidth > 0 && img.offsetHeight > 0
                    );
                    if (!allBannersOk) {
                        throw new Error('Баннеры не загрузились или имеют нулевой размер.');
                    }

                    // -- ПАРАМЕТРЫ ЭКСПОРТА --
                    const EXPORT_WIDTH = 1250;   // общая ширина
                    const SIDE_PADDING = 25;     // отступы слева/справа (фон по бокам)
                    const pixelRatio = 1;        // 2 для сверхчёткости
                    // -----------------------

                    cloneContainer = document.createElement('div');
                    cloneContainer.style.position = 'fixed';
                    cloneContainer.style.left = '-9999px';
                    cloneContainer.style.top = '0';
                    cloneContainer.style.backgroundColor = '#fff6ef';
                    cloneContainer.style.width = EXPORT_WIDTH + 'px';
                    cloneContainer.style.paddingLeft = SIDE_PADDING + 'px';
                    cloneContainer.style.paddingRight = SIDE_PADDING + 'px';
                    cloneContainer.style.boxSizing = 'border-box';
                    cloneContainer.style.display = 'flex';
                    cloneContainer.style.flexDirection = 'column';
                    cloneContainer.style.alignItems = 'center';

                    const topClone = topWrapper.cloneNode(true);
                    topClone.style.width = '100%';
                    cloneContainer.appendChild(topClone);

                    const gridClone = grid.cloneNode(true);
                    gridClone.style.width = '100%';
                    gridClone.style.aspectRatio = '1 / 1';
                    cloneContainer.appendChild(gridClone);

                    const bottomClone = bottomWrapper.cloneNode(true);
                    bottomClone.style.width = '100%';
                    cloneContainer.appendChild(bottomClone);

                    // Убираем max-height у баннеров, чтобы они масштабировались свободно
                    cloneContainer.querySelectorAll('.banner').forEach(img => {
                        img.style.maxHeight = 'none';
                        img.style.height = 'auto';
                    });

                    document.body.appendChild(cloneContainer);

                    // Ждём два кадра для полной отрисовки
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    await new Promise(resolve => requestAnimationFrame(resolve));

                    // Временно поднимаем максимальный размер шрифта до гигантского
                    MAX_FONT_SIZE = 2000;

                    // Принудительно фиксируем line-height у клонов
                    const cloneEditables = cloneContainer.querySelectorAll('.cell-editable');
                    cloneEditables.forEach(el => {
                        el.style.lineHeight = '1.1';
                    });

                    // Применяем функцию подгонки для экспорта (без ограничения WRAP_THRESHOLD)
                    cloneEditables.forEach(el => fitFontSizeForExport(el));

                    // Ещё раз после короткой паузы – чтобы точно применилось
                    await new Promise(r => setTimeout(r, 50));
                    cloneEditables.forEach(el => fitFontSizeForExport(el));

                    // Возвращаем лимит для основного экрана
                    MAX_FONT_SIZE = originalMaxFontSize;

                    // Ждём загрузки всех картинок клона
                    const cloneImages = Array.from(cloneContainer.querySelectorAll('img'));
                    await Promise.all(cloneImages.map(img => {
                        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                        return new Promise((resolve) => {
                            const onDone = () => {
                                img.removeEventListener('load', onDone);
                                img.removeEventListener('error', onDone);
                                resolve();
                            };
                            img.addEventListener('load', onDone);
                            img.addEventListener('error', onDone);
                            if (img.complete) onDone();
                        });
                    }));

                    await new Promise(r => setTimeout(r, 200));

                    const clonedBanners = cloneContainer.querySelectorAll('.banner');
                    const anyZeroHeight = Array.from(clonedBanners).some(img => img.offsetHeight === 0);
                    if (anyZeroHeight) {
                        throw new Error('Баннер в клоне имеет нулевую высоту.');
                    }

                    const dataUrl = await DomToImageLib.toPng(cloneContainer, {
                        quality: 1,
                        pixelRatio: pixelRatio,
                        backgroundColor: '#fff6ef',
                        cacheBust: true,
                    });

                    const link = document.createElement('a');
                    link.download = `bingo_${Date.now()}.png`;
                    link.href = dataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                } catch (error) {
                    console.error('Ошибка сохранения:', error);
                    alert('Не удалось сохранить: ' + error.message);
                } finally {
                    // Гарантированно восстанавливаем лимит
                    MAX_FONT_SIZE = originalMaxFontSize;
                    if (cloneContainer) {
                        document.body.removeChild(cloneContainer);
                    }
                    saveBtn.innerHTML = originalHTML;
                    saveBtn.disabled = false;
                    isSaving = false;
                }
            };
        }
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