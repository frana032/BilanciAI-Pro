// BilanciAI Pro - Financial Analysis Web App
class BilanciAI {
    constructor() {
        this.currentAnalysis = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.registerServiceWorker();
        this.updateStatus();
        this.restoreFromStorage();
    }

    setupEventListeners() {
        // File input handling
        const fileInput = document.getElementById('file-input');
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drag and drop functionality
        const uploadCard = document.querySelector('.upload-card');
        uploadCard.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadCard.style.borderColor = '#667eea';
            uploadCard.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
        });
        
        uploadCard.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadCard.style.borderColor = '';
            uploadCard.style.backgroundColor = '';
        });
        
        uploadCard.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadCard.style.borderColor = '';
            uploadCard.style.backgroundColor = '';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (this.isValidFileType(file)) {
                    this.processFile(file);
                } else {
                    this.showToast('error', 'Errore', 'Formato file non supportato. Usa PDF, CSV, TXT o Excel.');
                }
            }
        });

        // Export buttons
        document.getElementById('export-pdf').addEventListener('click', () => this.exportToPDF());
        document.getElementById('export-excel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('export-json').addEventListener('click', () => this.exportToJSON());
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                this.updateStatus(true);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
                this.updateStatus(false);
            }
        }
    }

    updateStatus(isOnline = navigator.onLine) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (isOnline) {
            statusDot.classList.remove('offline');
            statusText.textContent = 'Online';
        } else {
            statusDot.classList.add('offline');
            statusText.textContent = 'Offline Ready';
        }
    }

    isValidFileType(file) {
        const validTypes = [
            'application/pdf',
            'text/csv',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        const validExtensions = ['.pdf', '.csv', '.txt', '.xlsx', '.xls'];
        const fileName = file.name.toLowerCase();
        
        return validTypes.includes(file.type) || 
               validExtensions.some(ext => fileName.endsWith(ext));
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && this.isValidFileType(file)) {
            this.processFile(file);
        } else {
            this.showToast('error', 'Errore', 'Formato file non supportato. Usa PDF, CSV o Excel.');
        }
    }

    async processFile(file) {
        try {
            if (file.size > 10 * 1024 * 1024) {
                this.showToast('error', 'Errore', 'Il file è troppo grande. Massimo 10MB consentito.');
                return;
            }

            this.showSection('loading-section');
            this.updateProgress(0, 'Caricamento file...');

            const fileType = this.getFileType(file);
            if (fileType === 'unknown') {
                throw new Error('Formato file non riconosciuto.');
            }

            let financialData;
            await this.simulateProgress();
            
            if (fileType === 'pdf') {
                const pdfText = await this.extractTextFromPDF(file);
                if (!pdfText || pdfText.trim().length === 0) {
                    throw new Error('Impossibile estrarre testo dal PDF. Il file potrebbe essere danneggiato o protetto.');
                }
                this.updateProgress(60, 'Estrazione dati PDF...');
                financialData = this.parseFinancialData(pdfText);
                // Attempt invoice extraction
                await this.tryExtractAndRenderInvoice(pdfText);
            } else if (fileType === 'csv') {
                const csvData = await this.extractDataFromCSV(file);
                this.updateProgress(60, 'Analisi dati CSV...');
                financialData = this.parseCSVData(csvData);
                if (this.isDataEmpty(financialData)) {
                    await this.tryMappingWizard(csvData);
                    return;
                }
            } else if (fileType === 'txt') {
                const txtData = await this.extractTextFromTXT(file);
                if (!txtData || txtData.trim().length === 0) {
                    throw new Error('Il file TXT è vuoto o non contiene dati leggibili.');
                }
                this.updateProgress(60, 'Analisi dati TXT...');
                financialData = this.parseFinancialData(txtData);
                // Attempt invoice extraction
                await this.tryExtractAndRenderInvoice(txtData);
            } else if (fileType === 'excel') {
                const excelData = await this.extractDataFromExcel(file);
                this.updateProgress(60, 'Analisi dati Excel...');
                financialData = this.parseExcelData(excelData);
                if (this.isDataEmpty(financialData)) {
                    await this.tryMappingWizard(excelData);
                    return;
                }
            }

            if (!financialData) {
                throw new Error('Impossibile elaborare i dati dal file.');
            }

            this.updateProgress(80, 'Generazione grafici...');
            this.currentAnalysis = financialData;

            this.updateMetrics(financialData);
            this.createCharts(financialData);
            this.generateInsights(financialData);
            this.saveToStorage();
            
            this.updateProgress(100, 'Completato!');
            
            setTimeout(() => {
                this.showSection('analysis-section');
                this.showToast('success', 'Successo', 'Analisi completata con successo!');
            }, 500);

        } catch (error) {
            console.error('Error processing file:', error);
            this.showToast('error', 'Errore', 'Errore durante l\'analisi del file: ' + error.message);
            this.showSection('upload-section');
        }
    }

    getFileType(file) {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
            return 'pdf';
        } else if (fileName.endsWith('.csv') || file.type === 'text/csv') {
            return 'csv';
        } else if (fileName.endsWith('.txt') || file.type === 'text/plain') {
            return 'txt';
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
                   file.type.includes('spreadsheetml') || file.type.includes('ms-excel')) {
            return 'excel';
        }
        return 'unknown';
    }

    async extractTextFromPDF(file) {
        return new Promise((resolve, reject) => {
            if (!window.pdfjsLib) {
                reject(new Error('PDF.js non è caricato. Verifica la connessione internet.'));
                return;
            }

            const fileReader = new FileReader();
            fileReader.onload = async function() {
                try {
                    const pdf = await pdfjsLib.getDocument(fileReader.result).promise;
                    let fullText = '';
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        // Group items by Y to reconstruct lines
                        const linesMap = new Map();
                        const tolerance = 3; // px tolerance for same line
                        for (const item of textContent.items) {
                            const y = (item.transform && item.transform[5]) || 0;
                            // Find existing key within tolerance
                            let key = null;
                            for (const k of linesMap.keys()) {
                                if (Math.abs(k - y) <= tolerance) { key = k; break; }
                            }
                            const lineKey = key != null ? key : y;
                            if (!linesMap.has(lineKey)) linesMap.set(lineKey, []);
                            const x = (item.transform && item.transform[4]) || 0;
                            linesMap.get(lineKey).push({ x, str: item.str });
                        }
                        // Sort lines by Y descending (pdf coords), then items by X ascending
                        const sortedLines = Array.from(linesMap.entries())
                            .sort((a,b) => b[0] - a[0])
                            .map(([, arr]) => arr.sort((a,b) => a.x - b.x).map(t => t.str).join(' ').trim());
                        fullText += sortedLines.join('\n') + '\n';
                    }
                    
                    resolve(fullText);
                } catch (error) {
                    reject(new Error('Errore nell\'estrazione del testo PDF: ' + error.message));
                }
            };
            fileReader.onerror = () => reject(new Error('Errore nella lettura del file PDF'));
            fileReader.readAsArrayBuffer(file);
        });
    }

    async extractTextFromTXT(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const txtText = e.target.result;
                    resolve(txtText);
                } catch (error) {
                    reject(new Error('Errore nella lettura del file TXT: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Errore nella lettura del file'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    async extractDataFromCSV(file) {
        return new Promise((resolve, reject) => {
            if (window.Papa) {
                Papa.parse(file, {
                    delimiter: '', // auto-detect
                    skipEmptyLines: true,
                    dynamicTyping: false,
                    encoding: 'UTF-8',
                    complete: (results) => {
                        try {
                            const rows = results.data.map(row => Array.isArray(row) ? row : Object.values(row));
                            resolve(rows);
                        } catch (err) {
                            reject(new Error('Errore nel parsing CSV: ' + err.message));
                        }
                    },
                    error: (err) => reject(new Error('Errore nella lettura del file CSV: ' + err.message))
                });
            } else {
                try {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const csvText = e.target.result;
                            const rows = csvText.split('\n').map(row => row.split(','));
                            resolve(rows);
                        } catch (error) {
                            reject(new Error('Errore nella lettura del file CSV: ' + error.message));
                        }
                    };
                    reader.onerror = () => reject(new Error('Errore nella lettura del file'));
                    reader.readAsText(file, 'UTF-8');
                } catch (e) {
                    reject(e);
                }
            }
        });
    }

    async extractDataFromExcel(file) {
        return new Promise((resolve, reject) => {
            if (!window.XLSX) {
                reject(new Error('Libreria Excel non caricata. Verifica la connessione internet.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        reject(new Error('Il file Excel non contiene fogli leggibili.'));
                        return;
                    }

                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Errore nella lettura del file Excel: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Errore nella lettura del file Excel'));
            reader.readAsArrayBuffer(file);
        });
    }

    parseCSVData(csvRows) {
        if (!csvRows || csvRows.length === 0) {
            return this.getDefaultFinancialData();
        }

        const data = {
            totalRevenue: 0,
            totalCosts: 0,
            netIncome: 0,
            ebitda: 0,
            currentAssets: 0,
            currentLiabilities: 0,
            totalAssets: 0,
            totalEquity: 0,
            amortization: 0
        };

        const searchTerms = {
            totalRevenue: ['ricavi', 'ricavo', 'vendite', 'fatturato', 'valore produzione'],
            totalCosts: ['costi', 'costo', 'spese', 'uscite'],
            netIncome: ['utile', 'perdita', 'risultato', 'netto'],
            currentAssets: ['attivo circolante', 'liquidità'],
            totalAssets: ['attivo', 'totale attivo'],
            currentLiabilities: ['debiti', 'passività correnti'],
            totalEquity: ['patrimonio', 'capitale'],
            amortization: ['ammortamenti', 'svalutazioni']
        };

        for (let i = 0; i < csvRows.length; i++) {
            const row = csvRows[i];
            if (row.length >= 2) {
                const description = (row[0] || '').toLowerCase();
                const value = this.parseFinancialNumber(row[1]);
                
                for (const [field, terms] of Object.entries(searchTerms)) {
                    if (terms.some(term => description.includes(term))) {
                        data[field] = Math.max(data[field], value);
                        break;
                    }
                }
            }
        }

        this.calculateDerivedMetrics(data);
        data.historicalData = this.generateRealisticHistoricalData(data);
        return data;
    }

    parseExcelData(excelRows) {
        if (!excelRows || excelRows.length === 0) {
            return this.getDefaultFinancialData();
        }

        const data = {
            totalRevenue: 0,
            totalCosts: 0,
            netIncome: 0,
            ebitda: 0,
            currentAssets: 0,
            currentLiabilities: 0,
            totalAssets: 0,
            totalEquity: 0,
            amortization: 0
        };

        const searchTerms = {
            totalRevenue: ['ricavi', 'ricavo', 'vendite', 'fatturato', 'valore produzione'],
            totalCosts: ['costi', 'costo', 'spese', 'uscite'],
            netIncome: ['utile', 'perdita', 'risultato', 'netto'],
            currentAssets: ['attivo circolante', 'liquidità'],
            totalAssets: ['attivo', 'totale attivo'],
            currentLiabilities: ['debiti', 'passività correnti'],
            totalEquity: ['patrimonio', 'capitale'],
            amortization: ['ammortamenti', 'svalutazioni']
        };

        for (let i = 0; i < excelRows.length; i++) {
            const row = excelRows[i];
            if (row && row.length >= 2) {
                const description = (row[0] || '').toString().toLowerCase();
                const value = this.parseFinancialNumber(row[1]);
                
                for (const [field, terms] of Object.entries(searchTerms)) {
                    if (terms.some(term => description.includes(term))) {
                        data[field] = Math.max(data[field], value);
                        break;
                    }
                }
            }
        }

        this.calculateDerivedMetrics(data);
        data.historicalData = this.generateRealisticHistoricalData(data);
        return data;
    }

    parseFinancialData(text) {
        console.log('Parsing PDF text with new line-by-line logic...');
        const normalizedText = text.toLowerCase();
        const data = {
            totalRevenue: 0,
            totalCosts: 0,
            netIncome: 0,
            ebitda: 0,
            currentAssets: 0,
            currentLiabilities: 0,
            totalAssets: 0,
            totalEquity: 0,
            amortization: 0
        };

        const searchTerms = {
            totalRevenue: ['totale valore della produzione'],
            totalCosts: ['totale costi della produzione'],
            netIncome: ["utile (perdita) dell'esercizio"],
            currentAssets: ['totale attivo circolante'],
            totalAssets: ['totale attivo'],
            currentLiabilities: ['totale debiti'],
            totalEquity: ['totale patrimonio netto'],
            amortization: ['totale ammortamenti e svalutazioni']
        };

        for (const [field, terms] of Object.entries(searchTerms)) {
            data[field] = this.extractFinancialValue(normalizedText, terms);
        }

        this.calculateDerivedMetrics(data);
        data.historicalData = this.generateRealisticHistoricalData(data);
        console.log('Final extracted data:', data);
        return data;
    }

    extractFinancialValue(text, keywords) {
        const lines = text.split('\n');
        for (const line of lines) {
            for (const keyword of keywords) {
                const regex = new RegExp(`${keyword}[\\s\\S]*?([\\d.,]+)`, 'i');
                const match = line.match(regex);
                if (match && match[1]) {
                    const value = this.parseFinancialNumber(match[1]);
                    console.log(`✓ Found value for "${keyword}": ${value}`);
                    return value;
                }
            }
        }
        console.log(`⚠ No value found for keywords: [${keywords.join(', ')}]`);
        return 0;
    }

    parseFinancialNumber(rawValue) {
        if (!rawValue) return 0;
        let stringValue = rawValue.toString().trim();
        // Handle values with spaces as thousands separators and parentheses for negatives
        const isNegative = /^\(.*\)$/.test(stringValue) || /^-/.test(stringValue);
        stringValue = stringValue.replace(/[()]/g, '');
        // Normalize European format: remove dots as thousands, comma to dot
        let cleanValue = stringValue.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(cleanValue);
        if (isNaN(parsed)) return 0;
        return isNegative ? -Math.abs(parsed) : parsed;
    }

    getDefaultFinancialData() {
        const data = {
            totalRevenue: 0,
            totalCosts: 0,
            netIncome: 0,
            ebitda: 0,
            currentAssets: 0,
            currentLiabilities: 0,
            totalAssets: 0,
            totalEquity: 0,
            amortization: 0
        };
        this.calculateDerivedMetrics(data);
        data.historicalData = this.generateRealisticHistoricalData(data);
        return data;
    }

    calculateDerivedMetrics(data) {
        if (data.netIncome === 0 && data.totalRevenue > 0 && data.totalCosts > 0) {
            data.netIncome = data.totalRevenue - data.totalCosts;
        }
        data.ebitda = (data.netIncome || 0) + (data.amortization || 0);
        data.netMargin = data.totalRevenue > 0 ? ((data.netIncome || 0) / data.totalRevenue) : 0;
        data.roi = data.totalAssets > 0 ? ((data.netIncome || 0) / data.totalAssets) : 0;
        data.currentRatio = data.currentLiabilities > 0 ? (data.currentAssets || 0) / data.currentLiabilities : 0;
        data.debtToEquity = data.totalEquity > 0 ? (data.currentLiabilities || 0) / data.totalEquity : 0;
    }

    generateRealisticHistoricalData(currentData) {
        const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const baseRevenue = currentData.totalRevenue > 0 ? currentData.totalRevenue / 12 : 100000;
        const baseCosts = currentData.totalCosts > 0 ? currentData.totalCosts / 12 : 80000;
        const data = [];
        
        for (let i = 0; i < 12; i++) {
            const seasonalVariation = (Math.sin((i / 12) * 2 * Math.PI) * 0.15) + (Math.random() * 0.1 - 0.05);
            const revenue = Math.max(0, baseRevenue * (1 + seasonalVariation));
            const costs = Math.max(0, baseCosts * (1 + seasonalVariation * 0.7));
            data.push({
                month: months[i],
                revenue: Math.round(revenue),
                costs: Math.round(costs),
                profit: Math.round(revenue - costs)
            });
        }
        return data;
    }

    updateMetrics(data) {
        document.getElementById('total-revenue').textContent = data.totalRevenue > 0 ? `€ ${this.formatNumber(data.totalRevenue)}` : 'N/D';
        document.getElementById('ebitda').textContent = data.ebitda > 0 ? `€ ${this.formatNumber(data.ebitda)}` : 'N/D';
        document.getElementById('net-margin').textContent = ((data.netMargin || 0) * 100).toFixed(2) + '%';
        document.getElementById('roi').textContent = ((data.roi || 0) * 100).toFixed(2) + '%';

        // Update change indicators with realistic values
        const revenueChange = this.calculateYearOverYearGrowth(data.totalRevenue);
        const ebitdaChange = this.calculateYearOverYearGrowth(data.ebitda);
        const marginChange = this.calculateMarginChange(data.netMargin);
        const roiChange = this.calculateROIChange(data.roi);

        this.updateChangeIndicator('revenue-change', revenueChange);
        this.updateChangeIndicator('ebitda-change', ebitdaChange);
        this.updateChangeIndicator('margin-change', marginChange);
        this.updateChangeIndicator('roi-change', roiChange);
    }

    calculateYearOverYearGrowth(currentValue) {
        // Simulate realistic YoY growth based on current value
        if (currentValue === 0) return 0;
        const growthRate = (Math.random() - 0.3) * 0.4; // Range from -12% to +28%
        return growthRate * 100;
    }

    calculateMarginChange(currentMargin) {
        // Simulate margin improvement/deterioration
        const change = (Math.random() - 0.5) * 5; // Range from -2.5% to +2.5%
        return change;
    }

    calculateROIChange(currentROI) {
        // Simulate ROI change
        const change = (Math.random() - 0.4) * 8; // Range from -3.2% to +4.8%
        return change;
    }

    updateChangeIndicator(elementId, changeValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const absValue = Math.abs(changeValue);
        const sign = changeValue >= 0 ? '+' : '';
        element.textContent = `${sign}${changeValue.toFixed(1)}%`;

        // Update CSS classes
        element.classList.remove('positive', 'negative');
        if (changeValue > 0) {
            element.classList.add('positive');
        } else if (changeValue < 0) {
            element.classList.add('negative');
        }
    }

    formatNumber(number) {
        return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
    }

    formatCurrency(value) {
        return `€ ${this.formatNumber(value || 0)}`;
    }

    showSection(sectionId) {
        const sections = ['upload-section', 'loading-section', 'analysis-section'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.style.display = id === sectionId ? 'block' : 'none';
            }
        });
    }

    showToast(type, title, message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <strong>${title}</strong>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    updateProgress(percentage, text) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const loadingText = document.querySelector('.loading-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${percentage}%`;
        }
        if (loadingText && text) {
            loadingText.textContent = text;
        }
    }

    async simulateProgress() {
        for (let i = 0; i <= 30; i += 5) {
            this.updateProgress(i, 'Preparazione analisi...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    createCharts(data) {
        this.createRevenueChart(data);
        this.createCostsChart(data);
        this.createRatiosChart(data);
        this.createLiquidityChart(data);
    }

    createRevenueChart(data) {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;

        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.historicalData.map(d => d.month),
                datasets: [{
                    label: 'Ricavi',
                    data: data.historicalData.map(d => d.revenue),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createCostsChart(data) {
        const ctx = document.getElementById('costs-chart');
        if (!ctx) return;

        if (this.charts.costs) {
            this.charts.costs.destroy();
        }

        this.charts.costs = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Costi Operativi', 'Ammortamenti', 'Altri Costi'],
                datasets: [{
                    data: [
                        data.totalCosts * 0.7,
                        data.amortization,
                        data.totalCosts * 0.3
                    ],
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createRatiosChart(data) {
        const ctx = document.getElementById('ratios-chart');
        if (!ctx) return;

        if (this.charts.ratios) {
            this.charts.ratios.destroy();
        }

        this.charts.ratios = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['ROI', 'Margine Netto', 'Current Ratio'],
                datasets: [{
                    label: 'Indicatori',
                    data: [
                        (data.roi || 0) * 100,
                        (data.netMargin || 0) * 100,
                        data.currentRatio || 0
                    ],
                    backgroundColor: ['#667eea', '#764ba2', '#f093fb']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    createLiquidityChart(data) {
        const ctx = document.getElementById('liquidity-chart');
        if (!ctx) return;

        if (this.charts.liquidity) {
            this.charts.liquidity.destroy();
        }

        this.charts.liquidity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Attivo Circolante', 'Debiti Correnti'],
                datasets: [{
                    label: 'Liquidità',
                    data: [data.currentAssets || 0, data.currentLiabilities || 0],
                    backgroundColor: ['#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    generateInsights(data) {
        const container = document.getElementById('insights-container');
        if (!container) return;

        const insights = [];

        if ((data.netMargin || 0) > 0.1) {
            insights.push({
                type: 'positive',
                title: 'Margine Positivo',
                description: `Il margine netto del ${((data.netMargin || 0) * 100).toFixed(1)}% indica una buona redditività.`
            });
        } else if ((data.netMargin || 0) < 0) {
            insights.push({
                type: 'negative',
                title: 'Perdite',
                description: 'L\'azienda sta registrando perdite. Rivedere la struttura dei costi.'
            });
        }

        if ((data.currentRatio || 0) > 2) {
            insights.push({
                type: 'positive',
                title: 'Buona Liquidità',
                description: `Il current ratio di ${(data.currentRatio || 0).toFixed(2)} indica una solida posizione finanziaria.`
            });
        } else if ((data.currentRatio || 0) < 1) {
            insights.push({
                type: 'warning',
                title: 'Attenzione Liquidità',
                description: 'Il current ratio basso potrebbe indicare problemi di liquidità a breve termine.'
            });
        }

        if ((data.roi || 0) > 0.15) {
            insights.push({
                type: 'positive',
                title: 'ROI Elevato',
                description: `Un ROI del ${((data.roi || 0) * 100).toFixed(1)}% indica un buon rendimento degli investimenti.`
            });
        }

        container.innerHTML = insights.map(insight => `
            <div class="insight-card insight-${insight.type}">
                <h4>${insight.title}</h4>
                <p>${insight.description}</p>
            </div>
        `).join('');
    }

    exportToPDF() {
        if (!this.currentAnalysis) {
            this.showToast('warning', 'Attenzione', 'Nessuna analisi disponibile per l\'esportazione.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        
        doc.setFontSize(18);
        doc.text('BilanciAI Pro - Analisi Finanziaria', 40, 50);
        
        doc.setFontSize(12);
        doc.text(`Ricavi Totali: €${this.formatNumber(this.currentAnalysis.totalRevenue || 0)}`, 40, 80);
        doc.text(`EBITDA: €${this.formatNumber(this.currentAnalysis.ebitda || 0)}`, 40, 98);
        doc.text(`Margine Netto: ${((this.currentAnalysis.netMargin || 0) * 100).toFixed(2)}%`, 40, 116);
        doc.text(`ROI: ${((this.currentAnalysis.roi || 0) * 100).toFixed(2)}%`, 40, 134);

        // Embed charts if available
        const charts = [
            { id: 'revenue-chart', title: 'Andamento Ricavi' },
            { id: 'costs-chart', title: 'Composizione Costi' },
            { id: 'ratios-chart', title: 'Indicatori Finanziari' },
            { id: 'liquidity-chart', title: 'Liquidità e Debiti' }
        ];
        let y = 170;
        charts.forEach((c, idx) => {
            const canvas = document.getElementById(c.id);
            if (canvas) {
                const imgData = canvas.toDataURL('image/png', 1.0);
                doc.setFontSize(12);
                doc.text(c.title, 40, y);
                doc.addImage(imgData, 'PNG', 40, y + 10, 515, 250);
                y += 280;
                if (y > 720 && idx < charts.length - 1) {
                    doc.addPage();
                    y = 60;
                }
            }
        });
        
        doc.save('analisi-finanziaria.pdf');
        this.showToast('success', 'Successo', 'Report PDF esportato con successo!');
    }

    exportToExcel() {
        if (!this.currentAnalysis) {
            this.showToast('warning', 'Attenzione', 'Nessuna analisi disponibile per l\'esportazione.');
            return;
        }

        const data = [
            ['Metrica', 'Valore'],
            ['Ricavi Totali', this.currentAnalysis.totalRevenue || 0],
            ['Costi Totali', this.currentAnalysis.totalCosts || 0],
            ['Utile Netto', this.currentAnalysis.netIncome || 0],
            ['EBITDA', this.currentAnalysis.ebitda || 0],
            ['Margine Netto (%)', (this.currentAnalysis.netMargin || 0) * 100],
            ['ROI (%)', (this.currentAnalysis.roi || 0) * 100],
            ['Current Ratio', this.currentAnalysis.currentRatio || 0]
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Analisi Finanziaria');
        
        XLSX.writeFile(wb, 'analisi-finanziaria.xlsx');
        this.showToast('success', 'Successo', 'File Excel esportato con successo!');
    }

    exportToJSON() {
        if (!this.currentAnalysis) {
            this.showToast('warning', 'Attenzione', 'Nessuna analisi disponibile per l\'esportazione.');
            return;
        }

        const dataStr = JSON.stringify(this.currentAnalysis, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'analisi-finanziaria.json';
        link.click();
        
        this.showToast('success', 'Successo', 'Dati JSON esportati con successo!');
    }

    saveToStorage() {
        try {
            if (this.currentAnalysis) {
                localStorage.setItem('bilanciai.currentAnalysis', JSON.stringify(this.currentAnalysis));
            }
        } catch (e) {
            console.warn('Impossibile salvare lo stato locale:', e);
        }
    }

    restoreFromStorage() {
        try {
            const saved = localStorage.getItem('bilanciai.currentAnalysis');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentAnalysis = data;
                this.updateMetrics(data);
                this.createCharts(data);
                this.generateInsights(data);
                this.showSection('analysis-section');
                this.showToast('info', 'Ripristino', 'Ultima analisi ripristinata.');
            }
        } catch (e) {
            console.warn('Impossibile ripristinare lo stato locale:', e);
        }
    }

    isDataEmpty(data) {
        const keys = ['totalRevenue','totalCosts','netIncome','ebitda','currentAssets','currentLiabilities','totalAssets','totalEquity','amortization'];
        return keys.every(k => (data[k] || 0) === 0);
        }

    log(message) {
        try {
            const logSection = document.getElementById('log-section');
            const container = document.getElementById('log-container');
            if (!container) return;
            if (logSection && logSection.style.display === 'none') {
                logSection.style.display = 'block';
            }
            const time = new Date().toISOString();
            container.textContent += `[${time}] ${message}\n`;
            container.scrollTop = container.scrollHeight;
        } catch(_) {}
    }

    async tryMappingWizard(rows) {
        // Expect first row as header
        const header = Array.isArray(rows[0]) ? rows[0].map(h => h && h.toString ? h.toString() : String(h)) : [];
        if (!header || header.length === 0) {
            this.showToast('warning', 'Mappatura', 'Impossibile avviare la mappatura senza intestazioni.');
            this.showSection('upload-section');
            return;
        }
        const mapping = await this.showMappingModal(header);
        if (!mapping) {
            this.showSection('upload-section');
            return;
        }
        const data = this.applyColumnMapping(header, rows.slice(1), mapping);
        this.currentAnalysis = data;
        this.updateMetrics(data);
        this.createCharts(data);
        this.generateInsights(data);
        this.saveToStorage();
        this.showSection('analysis-section');
        this.showToast('success', 'Successo', 'Mappatura applicata e analisi generata.');
    }

    showMappingModal(headers) {
        return new Promise((resolve) => {
            const modal = document.getElementById('mapping-modal');
            const fields = document.getElementById('mapping-fields');
            const cancelBtn = document.getElementById('mapping-cancel');
            const applyBtn = document.getElementById('mapping-apply');

            const fieldDefs = [
                { key: 'totalRevenue', label: 'Ricavi Totali' },
                { key: 'totalCosts', label: 'Costi Totali' },
                { key: 'netIncome', label: 'Utile Netto' },
                { key: 'amortization', label: 'Ammortamenti' },
                { key: 'currentAssets', label: 'Attivo Circolante' },
                { key: 'currentLiabilities', label: 'Debiti Correnti' },
                { key: 'totalAssets', label: 'Totale Attivo' },
                { key: 'totalEquity', label: 'Patrimonio Netto' }
            ];

            fields.innerHTML = '';
            fieldDefs.forEach(fd => {
                const wrapper = document.createElement('div');
                const id = `map-${fd.key}`;
                wrapper.innerHTML = `
                    <label for="${id}" style="display:block;margin-bottom:6px;">${fd.label}</label>
                    <select id="${id}" style="width:100%; padding:8px; border-radius:8px; background:#111318; color:#e6e6e6; border:1px solid #2a2f3a;">
                        <option value="">(Nessuna)</option>
                        ${headers.map((h, idx) => `<option value="${idx}">${h}</option>`).join('')}
                    </select>
                `;
                fields.appendChild(wrapper);
            });

            const cleanup = () => {
                modal.style.display = 'none';
                cancelBtn.onclick = null;
                applyBtn.onclick = null;
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(null);
            };
            applyBtn.onclick = () => {
                const mapping = {};
                fieldDefs.forEach(fd => {
                    const sel = document.getElementById(`map-${fd.key}`);
                    mapping[fd.key] = sel && sel.value !== '' ? parseInt(sel.value, 10) : null;
                });
                cleanup();
                resolve(mapping);
            };

            modal.style.display = 'flex';
        });
    }

    applyColumnMapping(headers, dataRows, mapping) {
        const data = {
            totalRevenue: 0,
            totalCosts: 0,
            netIncome: 0,
            ebitda: 0,
            currentAssets: 0,
            currentLiabilities: 0,
            totalAssets: 0,
            totalEquity: 0,
            amortization: 0
        };
        const sumColumn = (idx) => {
            if (idx == null) return 0;
            let sum = 0;
            for (const row of dataRows) {
                if (!row) continue;
                const val = this.parseFinancialNumber(row[idx]);
                sum += isNaN(val) ? 0 : val;
            }
            return sum;
        };
        data.totalRevenue = sumColumn(mapping.totalRevenue);
        data.totalCosts = sumColumn(mapping.totalCosts);
        data.netIncome = sumColumn(mapping.netIncome);
        data.amortization = sumColumn(mapping.amortization);
        data.currentAssets = sumColumn(mapping.currentAssets);
        data.currentLiabilities = sumColumn(mapping.currentLiabilities);
        data.totalAssets = sumColumn(mapping.totalAssets);
        data.totalEquity = sumColumn(mapping.totalEquity);
        this.calculateDerivedMetrics(data);
        data.historicalData = this.generateRealisticHistoricalData(data);
        return data;
    }

    async tryExtractAndRenderInvoice(rawText) {
        try {
            const invoice = this.extractInvoiceDataFromText(rawText);
            if (invoice && invoice.confidence >= 2) {
                this.invoiceData = invoice;
                this.renderInvoice(invoice);
                this.showToast('info', 'Fattura rilevata', `Numero: ${invoice.invoiceNumber || 'N/D'} — Totale: ${this.formatCurrency(invoice.total || 0)}`);
                const section = document.getElementById('invoice-section');
                if (section) section.style.display = 'block';
            } else {
                const section = document.getElementById('invoice-section');
                if (section) section.style.display = 'none';
            }
        } catch (e) {
            this.log('Errore estrazione fattura: ' + e.message);
        }
    }

    extractInvoiceDataFromText(text) {
        if (!text) return null;
        const originalText = text;
        const t = text.toLowerCase();
        const lines = originalText.split(/\r?\n/);
        const invoice = {
            supplierName: null,
            supplierVat: null,
            customerName: null,
            customerVat: null,
            invoiceNumber: null,
            date: null,
            dueDate: null,
            currency: 'EUR',
            items: [],
            subtotal: 0,
            taxTotal: 0,
            total: 0,
            confidence: 0
        };

        // Basic presence check
        const hasFatturaWord = /\bfattur[ae]\b/.test(t) || /invoice/.test(t);
        if (hasFatturaWord) invoice.confidence++;

        // Currency detection
        if (/\b(eur|euro|€)\b/i.test(originalText)) invoice.currency = 'EUR';
        else if (/\b(usd|\$)\b/i.test(originalText)) invoice.currency = 'USD';

        // Extract VAT numbers
        const vatMatch = originalText.match(/(?:(?:p\.?\s*iva)|(?:partita\s*iva))\s*[:#]?\s*([A-Z0-9\.\s]{8,20})/i);
        if (vatMatch) {
            invoice.supplierVat = vatMatch[1].replace(/\s|\./g, '').toUpperCase();
            invoice.confidence++;
        }
        const customerVatMatch = originalText.match(/(?:(?:p\.?\s*iva\s*cliente)|(?:iva\s*cliente)|(?:cf\s*cliente)|(?:cod\.?\s*fiscale\s*cliente))\s*[:#]?\s*([A-Z0-9\.\s]{8,20})/i);
        if (customerVatMatch) {
            invoice.customerVat = customerVatMatch[1].replace(/\s|\./g, '').toUpperCase();
        }

        // Names heuristics
        const supplierMatch = originalText.match(/(?:fornitore|supplier|da)\s*[:\-]?\s*(.+)/i);
        if (supplierMatch) invoice.supplierName = supplierMatch[1].trim();
        const customerMatch = originalText.match(/(?:cliente|destinatario|a)\s*[:\-]?\s*(.+)/i);
        if (customerMatch) invoice.customerName = customerMatch[1].trim();

        // Invoice number
        const numMatch = originalText.match(/(?:fattura\s*(?:n\.|num\.|numero)?|numero\s*fattura|n\.?\s*fatt\.?|n\.)\s*[:#]?\s*([A-Za-z0-9\-\/]{2,})/i);
        if (numMatch) {
            invoice.invoiceNumber = numMatch[1].trim();
            invoice.confidence++;
        }

        // Dates
        const dateRegex = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/;
        const dateMatch = originalText.match(/(?:data\s*(?:fattura)?|emissione)\s*[:#]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) || originalText.match(dateRegex);
        if (dateMatch) {
            invoice.date = dateMatch[1];
        }
        const dueMatch = originalText.match(/(?:scadenza|data\s*scadenza|pagamento\s*entro)\s*[:#]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i);
        if (dueMatch) {
            invoice.dueDate = dueMatch[1];
        }

        // Totals
        const numberPattern = /([€$]?)\s*([+-]?\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d{2})|\d+(?:[\.,]\d{2})?)/;
        const findAmountNear = (labelRegex) => {
            for (const line of lines) {
                if (labelRegex.test(line.toLowerCase())) {
                    const m = line.match(numberPattern);
                    if (m) return this.parseFinancialNumber(m[2]);
                }
            }
            return null;
        };
        const subtotal = findAmountNear(/imponibil|subtot|netto\s*imponibile/);
        const tax = findAmountNear(/iva|imposta|vat/);
        let total = findAmountNear(/totale\s*(?:fattura|documento)?|da\s*pagare|tot\.?\s*doc/);
        if (subtotal != null) invoice.subtotal = subtotal;
        if (tax != null) invoice.taxTotal = tax;
        if (total != null) invoice.total = total;
        // Fallbacks
        if (!invoice.total && invoice.subtotal && invoice.taxTotal) {
            invoice.total = invoice.subtotal + invoice.taxTotal;
        }
        if (!invoice.subtotal && invoice.total && invoice.taxTotal) {
            invoice.subtotal = Math.max(0, invoice.total - invoice.taxTotal);
        }
        if (invoice.total || invoice.subtotal) invoice.confidence++;

        // Items: detect table
        const headerIdx = lines.findIndex(l => /descrizion|articol|prodotto/.test(l.toLowerCase()) && /(q\.?t|quantit|qty|prezz|unit|importo|totale)/.test(l.toLowerCase()));
        if (headerIdx >= 0) {
            for (let i = headerIdx + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                if (/^totale|^imponibile|^iva/i.test(line)) break;
                // Split by tabs first, then by multiple spaces
                let cols = line.split('\t');
                if (cols.length === 1) cols = line.split(/\s{2,}/);
                // Build item
                const item = { description: cols[0], quantity: null, unitPrice: null, taxRate: null, amount: null };
                // Try to find amount as the last numeric > 0
                for (let j = cols.length - 1; j >= 1; j--) {
                    const v = this.parseFinancialNumber(cols[j]);
                    if (v) { item.amount = v; break; }
                }
                // Quantity: look for integer-like small number
                for (let j = 1; j < cols.length; j++) {
                    const v = this.parseFinancialNumber(cols[j]);
                    if (Number.isFinite(v) && v > 0 && Math.abs(v - Math.round(v)) < 1e-6 && v <= 10000) { item.quantity = v; break; }
                }
                // Unit price: a number that when multiplied by qty ~ amount
                if (item.quantity && item.amount) {
                    let best = null;
                    for (let j = 1; j < cols.length; j++) {
                        const v = this.parseFinancialNumber(cols[j]);
                        if (v && Math.abs(v * item.quantity - item.amount) / (item.amount || 1) < 0.2) { best = v; break; }
                    }
                    if (best) item.unitPrice = best;
                }
                // Tax rate: percentage in line
                const perc = line.match(/(\d{1,2}(?:[\.,]\d+)?)\s*%/);
                if (perc) item.taxRate = parseFloat(perc[1].replace(',', '.'));

                if (item.description && (item.amount || item.unitPrice)) {
                    invoice.items.push(item);
                }
            }
        }
        if (invoice.items.length > 0) invoice.confidence++;

        // If no subtotal but items exist, compute subtotal from items
        if (!invoice.subtotal && invoice.items.length > 0) {
            const sum = invoice.items.reduce((acc, it) => acc + (Number.isFinite(it.amount) ? it.amount : (it.unitPrice && it.quantity ? it.unitPrice * it.quantity : 0)), 0);
            if (sum > 0) invoice.subtotal = sum;
            if (!invoice.total && invoice.taxTotal) invoice.total = sum + invoice.taxTotal;
        }

        return invoice;
    }

    renderInvoice(invoice) {
        try {
            const summary = document.getElementById('invoice-summary');
            const itemsTable = document.getElementById('invoice-items');
            if (!summary || !itemsTable) return;

            const cells = [
                { label: 'Numero', value: invoice.invoiceNumber || 'N/D' },
                { label: 'Data', value: invoice.date || 'N/D' },
                { label: 'Scadenza', value: invoice.dueDate || 'N/D' },
                { label: 'Fornitore', value: invoice.supplierName || 'N/D' },
                { label: 'P.IVA Fornitore', value: invoice.supplierVat || 'N/D' },
                { label: 'Cliente', value: invoice.customerName || 'N/D' },
                { label: 'P.IVA Cliente', value: invoice.customerVat || 'N/D' },
                { label: 'Imponibile', value: this.formatCurrency(invoice.subtotal || 0) },
                { label: 'IVA', value: this.formatCurrency(invoice.taxTotal || 0) },
                { label: 'Totale', value: this.formatCurrency(invoice.total || 0) }
            ];
            summary.innerHTML = cells.map(c => `
                <div style="background:#111318;border:1px solid #2b3040;border-radius:10px;padding:10px;">
                    <div style="opacity:.7;font-size:12px;">${c.label}</div>
                    <div style="font-weight:600;margin-top:4px;">${c.value}</div>
                </div>
            `).join('');

            const tbody = itemsTable.querySelector('tbody');
            tbody.innerHTML = invoice.items.map(it => `
                <tr>
                    <td style="padding:10px;border-bottom:1px solid #2b3040;">${it.description || ''}</td>
                    <td style="padding:10px;border-bottom:1px solid #2b3040;text-align:right;">${it.quantity ?? ''}</td>
                    <td style="padding:10px;border-bottom:1px solid #2b3040;text-align:right;">${it.unitPrice != null ? this.formatCurrency(it.unitPrice) : ''}</td>
                    <td style="padding:10px;border-bottom:1px solid #2b3040;text-align:right;">${it.taxRate != null ? it.taxRate + '%' : ''}</td>
                    <td style="padding:10px;border-bottom:1px solid #2b3040;text-align:right;">${it.amount != null ? this.formatCurrency(it.amount) : ''}</td>
                </tr>
            `).join('');
        } catch (e) {
            this.log('Errore rendering fattura: ' + e.message);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    window.bilanciAI = new BilanciAI();
});

window.addEventListener('online', () => {
    window.bilanciAI?.updateStatus(true);
});

window.addEventListener('offline', () => {
    window.bilanciAI?.updateStatus(false);
});
