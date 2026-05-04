(function () {
    const GRID_SIZE = 5;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    const MIN_FONT_SIZE = 6;
    const MAX_FONT_SIZE = 40;

    const container = document.getElementById('smartGrid');
    const saveBtn = document.getElementById('saveBtn');
    const captureArea = document.getElementById('captureArea');

    if (!container) return;

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
                    try {
                        const link = document.createElement('a');
                        link.download = `bingo_${Date.now()}.png`;
                        link.href = canvas.toDataURL('image/png');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } catch (e) {
                        console.error(e);
                        const dataUrl = canvas.toDataURL();
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

    window.addEventListener('load', fitAllFontSizes);
    window.addEventListener('resize', fitAllFontSizes);
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(fitAllFontSizes);
        ro.observe(container);
    }
})();