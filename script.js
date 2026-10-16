function formatCurrency(amount) {
    return 'IDR ' + parseInt(amount).toLocaleString('id-ID');
}

function calculateInvoice() {
    const items = document.querySelectorAll('.item-row');
    let total = 0;
    
    const itemsPreview = document.getElementById('itemsPreview');
    itemsPreview.innerHTML = '';
    
    items.forEach(item => {
        const name = item.querySelector('.item-name').value;
        const qty = parseInt(item.querySelector('.item-qty').value) || 0;
        const rate = parseInt(item.querySelector('.item-rate').value) || 0;
        const amount = qty * rate;
        total += amount;
        
        if (name) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-left" style="padding-left: 20px;">${name}</td>
                <td class="text-center">${qty}</td>
                <td class="text-left">${formatCurrency(rate)}</td>
                <td class="text-left">${formatCurrency(amount)}</td>
            `;
            itemsPreview.appendChild(tr);
        }
    });
    
    const dp = parseInt(document.getElementById('dpInput').value) || 0;
    const balanceDue = total - dp;
    
    document.getElementById('balanceDuePreview').textContent = formatCurrency(balanceDue);
    document.getElementById('dpRatePreview').textContent = formatCurrency(dp);
    document.getElementById('dpAmountPreview').textContent = formatCurrency(dp);
    document.getElementById('totalPreview').textContent = formatCurrency(total);
    document.getElementById('afterDpPreview').textContent = formatCurrency(balanceDue);
}

function updatePreview() {
    const companyName = document.getElementById('companyNameInput').value;
    document.getElementById('companyNamePreviewText').textContent = companyName;
    document.getElementById('companyNameHeader').textContent = companyName;
    document.getElementById('billToPreview').textContent = document.getElementById('billToInput').value;
    
    const dateVal = document.getElementById('dateInput').value;
    if(dateVal) {
        const dateObj = new Date(dateVal);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        document.getElementById('datePreview').textContent = 'DATE ' + dateObj.toLocaleDateString('en-GB', options).toUpperCase();
    }
    
    document.getElementById('notesPreview').textContent = document.getElementById('notesInput').value;
    document.getElementById('termsPreview').textContent = 'Term : ' + document.getElementById('termsInput').value;
    
    calculateInvoice();
}

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    document.getElementById('dateInput').valueAsDate = new Date();
    updatePreview();

    // Default logo logic
    const defaultLogoSrc = (typeof DEFAULT_LOGO !== 'undefined' && DEFAULT_LOGO) ? DEFAULT_LOGO : 'logo.png';
    const logoImg = document.getElementById('logoImage');
    const companyNamePreview = document.getElementById('companyNamePreviewText');
    const removeBtn = document.getElementById('removeLogoBtn');
    const logoUpload = document.getElementById('logoUpload');

    function applyLogo(src, isCustom = false) {
        if (src) {
            logoImg.src = src;
            logoImg.style.display = 'block';
            if (companyNamePreview) companyNamePreview.style.display = 'none';
            if (removeBtn) {
                removeBtn.style.display = isCustom ? 'block' : 'none';
                removeBtn.textContent = 'Reset Default';
            }
        } else {
            logoImg.removeAttribute('src');
            logoImg.style.display = 'none';
            if (companyNamePreview) companyNamePreview.style.display = 'block';
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }

    logoImg.addEventListener('error', function() {
        this.style.display = 'none';
        if (companyNamePreview) companyNamePreview.style.display = 'block';
    });

    // Check if user has uploaded a custom logo
    const savedLogo = localStorage.getItem('invoiceLogo');
    if (savedLogo) {
        applyLogo(savedLogo, true);
    } else {
        applyLogo(defaultLogoSrc, false);
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            localStorage.removeItem('invoiceLogo');
            if (logoUpload) logoUpload.value = '';
            applyLogo(defaultLogoSrc, false);
        });
    }

    if (logoUpload) {
        logoUpload.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const customLogo = evt.target.result;
                    applyLogo(customLogo, true);
                    localStorage.setItem('invoiceLogo', customLogo);
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    // Event listeners for inputs
    const inputs = document.querySelectorAll('input:not(#logoUpload), textarea');
    inputs.forEach(input => {
        input.addEventListener('input', updatePreview);
    });

    document.getElementById('addItemBtn').addEventListener('click', () => {
        const container = document.getElementById('itemsContainer');
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <input type="text" class="item-name" placeholder="Item Name">
            <input type="number" class="item-qty" placeholder="Qty" value="1">
            <input type="number" class="item-rate" placeholder="Rate" value="0">
            <button type="button" class="remove-item">X</button>
        `;
        container.appendChild(row);
        
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', updatePreview);
        });
        
        row.querySelector('.remove-item').addEventListener('click', function() {
            row.remove();
            updatePreview();
        });
    });

    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.item-row').remove();
            updatePreview();
        });
    });

    // ========== Auto Fill / Quick Paste Logic ==========
    function parseAmount(str) {
        if (!str) return 0;
        str = str.toLowerCase().trim();
        let multiplier = 1;
        if (str.includes('jt') || str.includes('juta')) {
            multiplier = 1000000;
        } else if (str.includes('k') || str.includes('rb') || str.includes('ribu')) {
            multiplier = 1000;
        }
        
        if (multiplier > 1) {
            str = str.replace(/,/g, '.');
            const numStr = str.replace(/[^\d.]/g, '');
            const val = parseFloat(numStr);
            return isNaN(val) ? 0 : val * multiplier;
        } else {
            const numStr = str.replace(/[^\d]/g, '');
            const val = parseInt(numStr);
            return isNaN(val) ? 0 : val;
        }
    }

    document.getElementById('autoFillBtn').addEventListener('click', () => {
        const text = document.getElementById('quickPasteInput').value.trim();
        if (!text) return;

        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) {
            alert('Format tidak valid. Minimal harus ada nama dan satu item.');
            return;
        }

        // First line is Name
        document.getElementById('billToInput').value = lines[0];

        const itemsContainer = document.getElementById('itemsContainer');
        itemsContainer.innerHTML = '';
        
        for (let i = 1; i < lines.length; i++) {
            let line = lines[i];
            const lowerLine = line.toLowerCase();
            
            if (lowerLine.startsWith('total') || lowerLine.startsWith('sisa')) {
                continue;
            }
            
            if (lowerLine.startsWith('dp')) {
                const dpStr = lowerLine.replace(/^dp\s*/, '');
                document.getElementById('dpInput').value = parseAmount(dpStr);
                continue;
            }
            
            // Try to match "Item Name Amount"
            const match = line.match(/(.+?)\s+((?:\d+(?:[.,]\d+)?)\s*(?:jt|juta|ribu|k|rb)?)$/i);
            
            let itemName = line;
            let itemRate = 0;
            
            if (match) {
                itemName = match[1].trim();
                itemRate = parseAmount(match[2]);
            } else {
                const numMatch = line.match(/(.+?)\s+([\d.,]+)$/);
                if (numMatch) {
                    itemName = numMatch[1].trim();
                    itemRate = parseAmount(numMatch[2]);
                }
            }
            
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <input type="text" class="item-name" placeholder="Item Name" value="${itemName}">
                <input type="number" class="item-qty" placeholder="Qty" value="1">
                <input type="number" class="item-rate" placeholder="Rate" value="${itemRate}">
                <button type="button" class="remove-item">X</button>
            `;
            itemsContainer.appendChild(row);
            
            row.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', updatePreview);
            });
            
            row.querySelector('.remove-item').addEventListener('click', function() {
                row.remove();
                updatePreview();
            });
        }
        
        // Clear textarea optionally
        // document.getElementById('quickPasteInput').value = '';
        
        updatePreview();
    });

    document.getElementById('downloadPdfBtn').addEventListener('click', function() {
        const btn = this;
        const originalText = btn.textContent;
        btn.textContent = 'Generating PDF...';
        btn.disabled = true;

        const element = document.getElementById('invoice');
        const wrapper = document.getElementById('invoiceWrapper');
        
        // Save current mobile styles
        const savedTransform = element.style.transform;
        const savedTransformOrigin = element.style.transformOrigin;
        const savedBoxShadow = element.style.boxShadow;
        const savedWrapperHeight = wrapper ? wrapper.style.height : '';
        const savedWrapperOverflow = wrapper ? wrapper.style.overflow : '';
        const savedElementHeight = element.style.height;
        const savedElementMinHeight = element.style.minHeight;
        const savedElementMaxHeight = element.style.maxHeight;
        const savedElementOverflow = element.style.overflow;
        
        // Temporarily reset styles for PDF capture to avoid forced height overflow
        element.style.transform = 'none';
        element.style.transformOrigin = '';
        element.style.boxShadow = 'none';
        element.style.minHeight = 'auto';
        element.style.height = 'auto';
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';
        
        if (wrapper) {
            wrapper.style.height = 'auto';
            wrapper.style.overflow = 'visible';
        }
        
        const filename = 'invoice-' + (document.getElementById('billToInput').value || 'document') + '.pdf';
        const opt = {
            margin:       0,
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true,
                scrollY: 0,
                scrollX: 0,
                width: 794,
                logging: false
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        // Small delay to let browser repaint after style reset
        setTimeout(() => {
            const pdfWorker = html2pdf().set(opt).from(element);

            const cleanup = () => {
                element.style.transform = savedTransform;
                element.style.transformOrigin = savedTransformOrigin;
                element.style.boxShadow = savedBoxShadow;
                element.style.height = savedElementHeight;
                element.style.minHeight = savedElementMinHeight;
                element.style.maxHeight = savedElementMaxHeight;
                element.style.overflow = savedElementOverflow;
                if (wrapper) {
                    wrapper.style.height = savedWrapperHeight;
                    wrapper.style.overflow = savedWrapperOverflow;
                }
                btn.textContent = originalText;
                btn.disabled = false;
            };

            // Use File System Access API if supported to open a "Save As" file dialog
            if ('showSaveFilePicker' in window) {
                pdfWorker.outputPdf('blob').then(async (blob) => {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: filename,
                            types: [{
                                description: 'PDF Document',
                                accept: { 'application/pdf': ['.pdf'] }
                            }]
                        });
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            console.error('Error saving file:', err);
                            // Fallback if save picker fails
                            pdfWorker.save();
                        }
                    } finally {
                        cleanup();
                    }
                }).catch(err => {
                    console.error('Error generating PDF blob:', err);
                    cleanup();
                    alert('There was an error generating the PDF. Please try again.');
                });
            } else {
                pdfWorker.save().then(cleanup).catch(err => {
                    console.error('Error generating PDF:', err);
                    cleanup();
                    alert('There was an error generating the PDF. Please try again.');
                });
            }
        }, 100);
    });

    // ========== Mobile Scaling ==========
    function scaleInvoiceForMobile() {
        const wrapper = document.getElementById('invoiceWrapper');
        const invoice = document.getElementById('invoice');
        if (!wrapper || !invoice) return;
        
        const availableWidth = wrapper.parentElement.clientWidth - 32; // minus padding
        const invoiceWidth = 794;
        
        if (availableWidth < invoiceWidth) {
            const scale = availableWidth / invoiceWidth;
            invoice.style.transform = 'scale(' + scale + ')';
            invoice.style.transformOrigin = 'top center';
            wrapper.style.height = (invoice.offsetHeight * scale) + 'px';
            wrapper.style.overflow = 'hidden';
        } else {
            invoice.style.transform = '';
            invoice.style.transformOrigin = '';
            wrapper.style.height = '';
            wrapper.style.overflow = '';
        }
    }

    // ========== Toggle Preview / Edit ==========
    const formSection = document.getElementById('formSection');
    const previewSection = document.getElementById('previewSection');

    document.getElementById('previewBtn').addEventListener('click', () => {
        updatePreview();
        formSection.style.display = 'none';
        previewSection.style.display = 'flex';
        window.scrollTo(0, 0);
        // Wait for layout to settle, then scale
        setTimeout(scaleInvoiceForMobile, 50);
    });

    document.getElementById('backToEditBtn').addEventListener('click', () => {
        previewSection.style.display = 'none';
        formSection.style.display = 'block';
        window.scrollTo(0, 0);
    });

    window.addEventListener('resize', () => {
        if (previewSection.style.display !== 'none') {
            scaleInvoiceForMobile();
        }
    });
});
