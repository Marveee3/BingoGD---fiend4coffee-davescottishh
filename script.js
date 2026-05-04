(function () {
    const GRID_SIZE = 5;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    const MIN_FONT_SIZE = 6;
    const MAX_FONT_SIZE = 40;

    const container = document.getElementById('smartGrid');
    const saveBtn = document.getElementById('saveBtn');
    const captureArea = document.getElementById('captureArea');
    const loadingScreen = document.getElementById('loadingScreen');
    const bottomBanner = document.getElementById('bottomBanner');
    
    // Музыкальные элементы
    const bgMusic = document.getElementById('bgMusic');
    const musicToggleBtn = document.getElementById('musicToggleBtn');

    if (!container) return;

    // --- Управление загрузкой ТОЛЬКО для изображений ---
    let loadedImages = 0;
    let totalImagesToLoad = 0;
    const progressBar = document.querySelector('.loading-progress-bar');
    const mainElements = [captureArea, document.querySelector('.button-group-left'), saveBtn];
    
    // Функция обновления прогресса загрузки изображений
    function updateLoadingProgress() {
        if (!progressBar) return;
        const progress = (loadedImages / totalImagesToLoad) * 100;
        progressBar.style.width = progress + '%';
        
        if (loadedImages >= totalImagesToLoad && totalImagesToLoad > 0) {
            // Все изображения загружены, скрываем экран загрузки
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.classList.add('fade-out');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }
                // Показываем основной контент с анимацией
                mainElements.forEach(el => {
                    if (el) {
                        el.style.opacity = '1';
                        el.style.visibility = 'visible';
                        el.classList.add('fade-in');
                    }
                });
            }, 300);
        }
    }
    
    // Подсчет изображений для загрузки
    function countImagesToLoad() {
        const images = document.querySelectorAll('.banner');
        totalImagesToLoad = images.length;
        
        if (totalImagesToLoad === 0) {
            updateLoadingProgress();
        }
    }
    
    // Отслеживание загрузки изображений
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
                    // Даже если ошибка, считаем загруженным
                    loadedImages++;
                    updateLoadingProgress();
                });
            }
        });
    }
    
    // Инициализация загрузки изображений
    countImagesToLoad();
    setupImageLoading();

    // --- Инициализация музыки (фоновая загрузка, без ожидания) ---
    let musicEnabled = true;
    let musicInitialized = false;
    let musicReady = false;
    
    function playMusic() {
        if (!bgMusic || !musicEnabled) return;
        
        bgMusic.volume = 0.3;
        
        const playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Автовоспроизведение заблокировано браузером:", error);
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
        if (musicReady) {
            playMusic();
        }
    }
    
    function disableMusic() {
        if (!bgMusic) return;
        musicEnabled = false;
        musicToggleBtn.classList.add('muted');
        bgMusic.pause();
    }
    
    function toggleMusic() {
        if (!bgMusic) return;
        if (musicEnabled) {
            disableMusic();
        } else {
            enableMusic();
        }
    }
    
    function initMusic() {
        if (musicInitialized) return;
        musicInitialized = true;
        
        if (bgMusic && musicToggleBtn) {
            musicEnabled = true;
            musicToggleBtn.classList.remove('muted');
            
            // Проверяем готовность аудио
            if (bgMusic.readyState >= 2) {
                musicReady = true;
                setTimeout(() => {
                    playMusic();
                }, 100);
            } else {
                bgMusic.addEventListener('canplaythrough', () => {
                    musicReady = true;
                    if (musicEnabled) {
                        playMusic();
                    }
                }, { once: true });
            }
            
            bgMusic.addEventListener('ended', function() {
                if (musicEnabled) {
                    this.currentTime = 0;
                    this.play().catch(e => console.log("Replay error:", e));
                }
            });
            
            musicToggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleMusic();
            });
        }
    }
    
    // Запускаем инициализацию музыки в фоне (через 500 мс после загрузки страницы)
    setTimeout(() => {
        initMusic();
    }, 500);

    // --- Функции для сетки бинго ---
    function fitFontSize(el) {
        const text = el.innerText.trim();
        if (!text) {
            el.style.fontSize = '1rem';
            return;
        }
        let low = MIN_FONT_SIZE;
        let high = MAX_FONT_SIZE;
        let best = MIN_FONT_SIZE;
        const parent = el.parentElement;
        if (!parent) return;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = mid + 'px';
            if (el.scrollHeight <= parent.clientHeight + 1 && 
                el.scrollWidth <= parent.clientWidth + 1) {
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

    // Создание сетки
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

    // Функция обрезки изображения по ширине нижнего баннера
    function cropToBannerWidth(canvas) {
        return new Promise((resolve) => {
            // Получаем реальные размеры нижнего баннера в DOM
            if (!bottomBanner) {
                resolve(canvas);
                return;
            }
            
            // Получаем bounding rectangle элемента
            const bannerRect = bottomBanner.getBoundingClientRect();
            const captureRect = captureArea.getBoundingClientRect();
            
            // Вычисляем позицию баннера относительно captureArea
            const bannerX = bannerRect.left - captureRect.left;
            const bannerWidth = bannerRect.width;
            
            // Масштабируем координаты под размер canvas (scale = 2 в html2canvas)
            const scale = 2;
            const cropX = Math.max(0, bannerX * scale);
            const cropWidth = bannerWidth * scale;
            const canvasWidth = canvas.width;
            
            // Определяем итоговую ширину обрезки (не больше самого canvas)
            const finalCropX = Math.min(cropX, canvasWidth - 10);
            const finalCropWidth = Math.min(cropWidth, canvasWidth - finalCropX);
            
            if (finalCropWidth <= 0 || finalCropX >= canvasWidth) {
                resolve(canvas);
                return;
            }
            
            // Создаем временный canvas для обрезки
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = finalCropWidth;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');
            
            // Рисуем обрезанное изображение
            ctx.drawImage(
                canvas,
                finalCropX, 0, finalCropWidth, canvas.height,
                0, 0, finalCropWidth, canvas.height
            );
            
            resolve(tempCanvas);
        });
    }

    // Сохранение скриншота с обрезкой по ширине bottomBanner
    if (saveBtn) {
        saveBtn.onclick = function() {
            fitAllFontSizes();
            
            const originalText = saveBtn.innerText;
            saveBtn.innerText = "Создание...";
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0';

            const options = {
                backgroundColor: '#fff6ef',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                onclone: (clonedDoc) => {
                    const btn = clonedDoc.getElementById('saveBtn');
                    if (btn) btn.style.display = 'none';
                    
                    const musicBtn = clonedDoc.getElementById('musicToggleBtn');
                    if (musicBtn) musicBtn.style.display = 'none';
                    
                    const dntBtnLink = clonedDoc.querySelector('.dnt-button-link');
                    if (dntBtnLink) dntBtnLink.style.display = 'none';
                    
                    const buttonGroup = clonedDoc.querySelector('.button-group-left');
                    if (buttonGroup) buttonGroup.style.display = 'none';
                    
                    const audio = clonedDoc.getElementById('bgMusic');
                    if (audio) audio.style.display = 'none';
                    
                    const loadingScrn = clonedDoc.querySelector('.loading-screen');
                    if (loadingScrn) loadingScrn.style.display = 'none';
                    
                    const githubLink = clonedDoc.querySelector('a[href="https://github.com/Marveee3"]');
                    if (githubLink) githubLink.style.display = 'none';
                    
                    clonedDoc.querySelectorAll('.banner').forEach(banner => {
                        banner.style.width = 'auto';
                        banner.style.maxWidth = '100%';
                        banner.style.height = 'auto';
                        banner.style.objectFit = 'none';
                    });

                    const grid = clonedDoc.getElementById('smartGrid');
                    if (grid) {
                        grid.style.display = 'grid';
                    }
                }
            };

            setTimeout(() => {
                html2canvas(captureArea, options).then(canvas => {
                    return cropToBannerWidth(canvas);
                }).then(finalCanvas => {
                    try {
                        const link = document.createElement('a');
                        link.download = `bingo_${Date.now()}.png`;
                        link.href = finalCanvas.toDataURL('image/png');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } catch (e) {
                        console.error(e);
                        const dataUrl = finalCanvas.toDataURL();
                        const win = window.open();
                        if (win) win.document.write('<img src="' + dataUrl + '" style="max-width:100%">');
                    }
                }).finally(() => {
                    saveBtn.innerText = originalText;
                    saveBtn.disabled = false;
                    saveBtn.style.opacity = '1';
                });
            }, 200);
        };
    }

    // Применяем авторазмер после загрузки
    window.addEventListener('load', () => {
        fitAllFontSizes();
    });
    
    window.addEventListener('resize', fitAllFontSizes);
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(fitAllFontSizes);
        ro.observe(container);
    }
})();