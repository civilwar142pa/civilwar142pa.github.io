// Discord-optimized Google Sheets loader
async function loadBooksFromGoogleSheets() {
    const debugElement = document.getElementById('random-result');
    
    debugElement.innerHTML = `
        <div class="error-message">
            🔧 Loading books for Discord...<br>
            Sheet ID: ${CONFIG.googleSheetsUrl}
        </div>
    `;

    try {
        updateStatus('Loading books from Google Sheets...');
        
        const SHEET_ID = CONFIG.googleSheetsUrl;
        const timestamp = new Date().getTime();
        
        // Use the published HTML version instead of the API - this works better in Discord
        const publishedUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5-gAZ6rbi9IDi-cIVEvQ85It9sXHXMPFCs6xVsntZv7ijfKPmYzfHpxPTn4BI-g8B2zAK_PPq2ACA/pubhtml`;
        
        debugElement.innerHTML += `<br>🔧 Using published HTML version`;
        
        let response;
        
        // For Discord, we need to use a reliable CORS proxy
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(publishedUrl)}`;
        
        debugElement.innerHTML += `<br>🔧 Fetching via CORS proxy...`;
        
        response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html',
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        debugElement.innerHTML += `<br>🔧 Got HTML response: ${html.length} chars`;
        
        // Parse the HTML table
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tables = doc.querySelectorAll('table');
        
        debugElement.innerHTML += `<br>🔧 Found ${tables.length} tables`;
        
        if (tables.length === 0) {
            throw new Error('No tables found in published sheet');
        }
        
        // Get the main data table (usually the first one)
        const dataTable = tables[0];
        const rows = dataTable.querySelectorAll('tr');
        
        debugElement.innerHTML += `<br>🔧 Found ${rows.length} rows`;
        
        // Process rows, skipping header
        books = [];
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length >= 2) {
                const title = cells[0]?.textContent?.trim() || '';
                const author = cells[1]?.textContent?.trim() || '';
                const status = cells[2]?.textContent?.trim() || 'future option';
                const link = cells[3]?.textContent?.trim() || '';
                
                if (title) {
                    books.push({
                        title,
                        author,
                        status: status.toLowerCase(),
                        link,
                        rowIndex: i
                    });
                }
            }
        }
        
        debugElement.innerHTML += `<br>🔧 Processed ${books.length} books`;
        
        // Categorize books
        availableBooks = books.filter(book => 
            book.status.includes('future') || 
            book.status === '' || 
            !book.status
        );
        currentlyReadingBooks = books.filter(book => 
            book.status.includes('currently')
        );
        finishedBooks = books.filter(book => 
            book.status.includes('finished') || 
            book.status.includes('read')
        );

        // Set current book if available
        if (currentlyReadingBooks.length > 0 && !currentBook) {
            currentBook = {
                ...currentlyReadingBooks[0],
                progress: 0,
                startDate: new Date().toISOString().split('T')[0]
            };
        }
        
        // SUCCESS MESSAGE
        debugElement.innerHTML = `
            <div class="success-message">
                ✅ SUCCESS! Loaded ${books.length} books in Discord!<br>
                Available: ${availableBooks.length} | Reading: ${currentlyReadingBooks.length} | Finished: ${finishedBooks.length}
            </div>
        `;
        
        showNotification(`Successfully loaded ${books.length} books in Discord!`, 'success');
        updateBookList();
        
    } catch (error) {
        console.error('Error loading Google Sheets in Discord:', error);
        
        debugElement.innerHTML = `
            <div class="error-message">
                ❌ DISCORD SHEETS FAILED: ${error.message}<br>
                Trying alternative method...
            </div>
        `;
        
        // Try alternative method
        await loadBooksAlternativeMethod();
    }
}

// Alternative method for Discord
async function loadBooksAlternativeMethod() {
    const debugElement = document.getElementById('random-result');
    
    try {
        debugElement.innerHTML += `<br>🔧 Trying alternative CSV method...`;
        
        // Use CSV export - often works better in restricted environments
        const csvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5-gAZ6rbi9IDi-cIVEvQ85It9sXHXMPFCs6xVsntZv7ijfKPmYzfHpxPTn4BI-g8B2zAK_PPq2ACA/pub?output=csv`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
        
        const response = await fetch(proxyUrl);
        const csvText = await response.text();
        
        debugElement.innerHTML += `<br>🔧 Got CSV: ${csvText.length} chars`;
        
        // Parse CSV
        const lines = csvText.split('\n');
        books = [];
        
        for (let i = 1; i < lines.length; i++) { // Skip header
            const cells = lines[i].split(',');
            if (cells.length >= 2) {
                const title = cells[0]?.replace(/"/g, '').trim() || '';
                const author = cells[1]?.replace(/"/g, '').trim() || '';
                const status = cells[2]?.replace(/"/g, '').trim() || 'future option';
                const link = cells[3]?.replace(/"/g, '').trim() || '';
                
                if (title) {
                    books.push({
                        title,
                        author,
                        status: status.toLowerCase(),
                        link,
                        rowIndex: i
                    });
                }
            }
        }
        
        debugElement.innerHTML += `<br>🔧 Alternative method processed ${books.length} books`;
        
        // Categorize books
        availableBooks = books.filter(book => 
            book.status.includes('future') || 
            book.status === '' || 
            !book.status
        );
        currentlyReadingBooks = books.filter(book => 
            book.status.includes('currently')
        );
        finishedBooks = books.filter(book => 
            book.status.includes('finished') || 
            book.status.includes('read')
        );
        
        debugElement.innerHTML = `
            <div class="success-message">
                ✅ ALTERNATIVE METHOD SUCCESS!<br>
                Loaded ${books.length} books in Discord!<br>
                Available: ${availableBooks.length} | Reading: ${currentlyReadingBooks.length} | Finished: ${finishedBooks.length}
            </div>
        `;
        
        showNotification(`Alternative method loaded ${books.length} books!`, 'success');
        updateBookList();
        
    } catch (error) {
        console.error('Alternative method also failed:', error);
        
        debugElement.innerHTML = `
            <div class="error-message">
                ❌ ALL METHODS FAILED: ${error.message}<br>
                Using sample data for now.
            </div>
        `;
        
        loadBooksFromLocalStorage();
    }
}

// Local storage fallback
function loadBooksFromLocalStorage() {
    const savedBooks = localStorage.getItem('bookClub_books');
    if (savedBooks) {
        books = JSON.parse(savedBooks);
        availableBooks = books.filter(book => !book.read);
        finishedBooks = books.filter(book => book.read);
        
        document.getElementById('random-result').innerHTML += `
            <div class="error-message">
                📁 Using previously saved books from local storage: ${books.length} books
            </div>
        `;
    } else {
        availableBooks = [
            { title: "Sample Book 1", author: "Author One", status: "future option", link: "" },
            { title: "Sample Book 2", author: "Author Two", status: "future option", link: "" }
        ];
        books = [...availableBooks];
        
        document.getElementById('random-result').innerHTML += `
            <div class="error-message">
                🧪 USING SAMPLE BOOKS - No Google Sheets data available
            </div>
        `;
    }
}

function loadLocalData() {
    const savedQuestions = localStorage.getItem('bookClub_questions');
    const savedCurrentBook = localStorage.getItem('bookClub_currentBook');
    
    if (savedQuestions) {
        questions = JSON.parse(savedQuestions);
    }
    if (savedCurrentBook) {
        currentBook = JSON.parse(savedCurrentBook);
    }
    
    displayCurrentBook();
    updateQuestionsList();
}

// Save data to local storage
function saveLocalData() {
    localStorage.setItem('bookClub_questions', JSON.stringify(questions));
    if (currentBook) {
        localStorage.setItem('bookClub_currentBook', JSON.stringify(currentBook));
    }
}

// Display current book
function displayCurrentBook() {
    const currentBookElement = document.getElementById('current-book');
    
    if (!currentBook) {
        currentBookElement.innerHTML = `
            <div class="no-book">
                <p>No book currently reading. Pick one from the randomizer!</p>
                ${currentlyReadingBooks.length > 0 ? `
                    <button id="set-first-reading-btn" class="primary" style="margin-top: 10px;">
                        Set "${currentlyReadingBooks[0].title}" as Current
                    </button>
                ` : ''}
            </div>
        `;
        
        // Add event listener for the dynamically created button
        setTimeout(() => {
            const setFirstBtn = document.getElementById('set-first-reading-btn');
            if (setFirstBtn) {
                setFirstBtn.addEventListener('click', setFirstCurrentlyReading);
            }
        }, 100);
        
        return;
    }
    
    currentBookElement.innerHTML = `
        <div class="current-book-card">
            <div class="book-header">
                <h3>${currentBook.title}</h3>
                ${currentBook.link ? `
                    <a href="${currentBook.link}" target="_blank" class="book-link" title="Open book link">🔗</a>
                ` : ''}
            </div>
            <p class="book-meta">by ${currentBook.author}</p>
            ${currentBook.status ? `<p class="book-meta">Status: ${currentBook.status}</p>` : ''}
            
            <div class="progress-section">
                <label>Reading Progress:</label>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${currentBook.progress}%"></div>
                    </div>
                    <span class="progress-text">${currentBook.progress}%</span>
                </div>
                <div class="progress-buttons">
                    <button class="progress-0-btn small-btn">0%</button>
                    <button class="progress-25-btn small-btn">25%</button>
                    <button class="progress-50-btn small-btn">50%</button>
                    <button class="progress-75-btn small-btn">75%</button>
                    <button class="progress-100-btn small-btn">Finished! 🎉</button>
                    <input type="number" id="custom-progress" min="0" max="100" placeholder="Custom %">
                    <button class="progress-custom-btn small-btn">Set</button>
                </div>
            </div>
            
            <div class="book-actions">
                <button class="mark-finished-btn finished-btn">Mark as Finished</button>
                <button class="change-book-btn secondary-btn">Change Book</button>
            </div>
        </div>
    `;
    
    // Add event listeners for progress buttons
    setTimeout(() => {
        document.querySelector('.progress-0-btn')?.addEventListener('click', () => updateProgress(0));
        document.querySelector('.progress-25-btn')?.addEventListener('click', () => updateProgress(25));
        document.querySelector('.progress-50-btn')?.addEventListener('click', () => updateProgress(50));
        document.querySelector('.progress-75-btn')?.addEventListener('click', () => updateProgress(75));
        document.querySelector('.progress-100-btn')?.addEventListener('click', () => updateProgress(100));
        document.querySelector('.progress-custom-btn')?.addEventListener('click', updateCustomProgress);
        document.querySelector('.mark-finished-btn')?.addEventListener('click', markAsFinished);
        document.querySelector('.change-book-btn')?.addEventListener('click', changeCurrentBook);
    }, 100);
}

function setFirstCurrentlyReading() {
    if (currentlyReadingBooks.length > 0) {
        currentBook = {
            ...currentlyReadingBooks[0],
            progress: 0,
            startDate: new Date().toISOString().split('T')[0]
        };
        displayCurrentBook();
        saveLocalData();
        showNotification(`Now reading: ${currentBook.title}`, 'success');
    }
}

// Progress tracking
function updateProgress(percent) {
    if (!currentBook) return;
    
    currentBook.progress = percent;
    displayCurrentBook();
    saveLocalData();

    if (discordActivity) {
        updateDiscordBookProgress(currentBook.title, percent);
    }
    
    if (percent === 100) {
        showNotification('Congratulations! Book finished! 🎉', 'success');
        if (discordActivity) {
            updateDiscordActivity('Book Finished!', `Completed: ${currentBook.title}`);
        }
    }
}

function updateCustomProgress() {
    const input = document.getElementById('custom-progress');
    const percent = parseInt(input.value);
    
    if (percent >= 0 && percent <= 100) {
        updateProgress(percent);
        input.value = '';
    } else {
        showNotification('Please enter a number between 0 and 100', 'error');
    }
}

// Book randomizer
function pickRandomBook() {
    if (availableBooks.length === 0) {
        showNotification('No available books found! Check your Google Sheet for books with "future option" status.', 'error');
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * availableBooks.length);
    const selectedBook = availableBooks[randomIndex];
    
    currentBook = {
        ...selectedBook,
        progress: 0,
        startDate: new Date().toISOString().split('T')[0]
    };
    
    availableBooks.splice(randomIndex, 1);
    
    displayCurrentBook();
    updateBookList();
    saveLocalData();

    if (discordActivity) {
        updateDiscordBookProgress(currentBook.title, 0);
    }
    
    document.getElementById('random-result').innerHTML = `
        <div class="success-message">
            🎉 Next book selected: 
            <strong>${selectedBook.title}</strong> 
            by ${selectedBook.author}
            ${selectedBook.link ? `<br><a href="${selectedBook.link}" target="_blank" style="color: white; text-decoration: underline;">View Book Details</a>` : ''}
        </div>
    `;
    
    showNotification(`Selected: ${selectedBook.title}`, 'success');
}

function changeCurrentBook() {
    if (availableBooks.length === 0) {
        showNotification('No available books to switch to!', 'error');
        return;
    }
    
    if (currentBook && currentBook.progress < 100) {
        availableBooks.push(currentBook);
    }
    
    pickRandomBook();
}

function markAsFinished() {
    if (!currentBook) return;
    
    currentBook.progress = 100;
    currentBook.endDate = new Date().toISOString().split('T')[0];
    currentBook.read = true;
    currentBook.status = 'finished';
    
    currentlyReadingBooks = currentlyReadingBooks.filter(book => book.title !== currentBook.title);
    
    if (!finishedBooks.some(book => book.title === currentBook.title)) {
        finishedBooks.push(currentBook);
    }
    
    availableBooks = availableBooks.filter(book => book.title !== currentBook.title);
    
    showNotification(`Finished reading: ${currentBook.title}`, 'success');
    
    const finishedBookTitle = currentBook.title;
    currentBook = null;
    displayCurrentBook();
    updateBookList();
    saveLocalData();
    
    document.getElementById('random-result').innerHTML = `
        <div class="success-message">
            🎉 Congratulations! "${finishedBookTitle}" finished! 
            <br>Use the randomizer to pick your next adventure!
        </div>
    `;
}

// Update book list display
function updateBookList() {
    const bookList = document.getElementById('book-list');
    const availableCount = document.getElementById('available-count');
    
    availableCount.textContent = availableBooks.length;
    
    if (availableBooks.length === 0) {
        bookList.innerHTML = `
            <div class="no-items">
                <p>No available books with "future option" status.</p>
                <p>Add more books to your Google Sheet or refresh to reload!</p>
            </div>
        `;
        return;
    }
    
    bookList.innerHTML = availableBooks.map(book => `
        <div class="book-item">
            <div class="book-header">
                <strong>${book.title}</strong>
                ${book.link ? `
                    <a href="${book.link}" target="_blank" class="book-link" title="Open book link">🔗</a>
                ` : ''}
            </div>
            <div class="book-details">
                by ${book.author}
                ${book.status ? ` • Status: ${book.status}` : ''}
            </div>
            <div class="book-actions">
                <button class="select-book-btn small-btn primary" data-book-title="${book.title.replace(/'/g, "\\'")}">
                    Select This Book
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners for select book buttons
    setTimeout(() => {
        document.querySelectorAll('.select-book-btn').forEach(button => {
            button.addEventListener('click', function() {
                const bookTitle = this.getAttribute('data-book-title');
                selectBookManually(bookTitle);
            });
        });
    }, 100);
}

function selectBookManually(bookTitle) {
    const book = availableBooks.find(b => b.title === bookTitle);
    if (book) {
        if (currentBook && currentBook.progress < 100) {
            availableBooks.push(currentBook);
        }
        
        currentBook = {
            ...book,
            progress: 0,
            startDate: new Date().toISOString().split('T')[0]
        };
        
        availableBooks = availableBooks.filter(b => b.title !== bookTitle);
        
        displayCurrentBook();
        updateBookList();
        saveLocalData();
        
        showNotification(`Manually selected: ${bookTitle}`, 'success');
    }
}

// Discussion questions
function addQuestion() {
    const input = document.getElementById('new-question-input');
    const question = input.value.trim();
    
    if (question) {
        questions.push({
            text: question,
            answered: false,
            timestamp: new Date().toLocaleString()
        });
        input.value = '';
        updateQuestionsList();
        saveLocalData();
        showNotification('Question added!', 'success');
    }
}

function updateQuestionsList() {
    const questionsList = document.getElementById('questions-list');
    
    if (questions.length === 0) {
        questionsList.innerHTML = '<p class="no-items">No discussion questions yet. Add one above!</p>';
        return;
    }
    
    questionsList.innerHTML = questions.map((q, index) => `
        <div class="question-item ${q.answered ? 'answered' : ''}">
            <span class="question-text">${q.text}</span>
            <div class="question-actions">
                <span class="timestamp">${q.timestamp}</span>
                <button class="toggle-question-btn small-btn" data-index="${index}">
                    ${q.answered ? '✅ Answered' : '◻️ Mark Answered'}
                </button>
                <button class="remove-question-btn small-btn danger" data-index="${index}">Remove</button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners for question buttons
    setTimeout(() => {
        document.querySelectorAll('.toggle-question-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                toggleQuestionAnswered(index);
            });
        });
        
        document.querySelectorAll('.remove-question-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removeQuestion(index);
            });
        });
    }, 100);
}

function toggleQuestionAnswered(index) {
    questions[index].answered = !questions[index].answered;
    updateQuestionsList();
    saveLocalData();
}

function removeQuestion(index) {
    if (confirm('Are you sure you want to remove this question?')) {
        questions.splice(index, 1);
        updateQuestionsList();
        saveLocalData();
        showNotification('Question removed', 'info');
    }
}

// History functions
function showBookHistory() {
    const historyList = document.getElementById('history-list');
    const historyPanel = document.getElementById('book-history');
    
    const displayCurrentlyReading = [...currentlyReadingBooks];
    const displayFinishedBooks = [...finishedBooks];
    
    const uniqueCurrentlyReading = displayCurrentlyReading.filter(
        currentBook => !displayFinishedBooks.some(finished => finished.title === currentBook.title)
    );
    
    const uniqueFinishedBooks = displayFinishedBooks.filter(
        finishedBook => !displayCurrentlyReading.some(current => current.title === finishedBook.title)
    );
    
    if (uniqueFinishedBooks.length === 0 && uniqueCurrentlyReading.length === 0) {
        historyList.innerHTML = '<p class="no-items">No reading history yet.</p>';
    } else {
        historyList.innerHTML = `
            ${uniqueCurrentlyReading.length > 0 ? `
                <h4>Currently Reading (${uniqueCurrentlyReading.length})</h4>
                ${uniqueCurrentlyReading.map(book => `
                    <div class="history-item current">
                        <strong>${book.title}</strong> by ${book.author}
                        ${currentBook && currentBook.title === book.title ? ' <em>(active)</em>' : ''}
                    </div>
                `).join('')}
            ` : ''}
            
            ${uniqueFinishedBooks.length > 0 ? `
                <h4>Finished Books (${uniqueFinishedBooks.length})</h4>
                ${uniqueFinishedBooks.map(book => `
                    <div class="history-item finished">
                        <strong>${book.title}</strong> by ${book.author}
                        ${book.endDate ? `<br><small>Finished: ${book.endDate}</small>` : ''}
                    </div>
                `).join('')}
            ` : ''}
        `;
    }
    
    historyPanel.style.display = 'block';
}

function hideBookHistory() {
    const historyPanel = document.getElementById('book-history');
    historyPanel.style.display = 'none';
}

// Utility functions
function showNotification(message, type = 'info') {
    console.log(`${type}: ${message}`);
    
    const notification = document.createElement('div');
    notification.className = type === 'error' ? 'error-message' : 'success-message';
    notification.textContent = message;
    notification.style.margin = '10px 0';
    
    const randomResult = document.getElementById('random-result');
    randomResult.innerHTML = '';
    randomResult.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function updateStatus(message) {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function exportData() {
    const data = {
        currentBook,
        questions,
        availableBooksCount: availableBooks.length,
        currentlyReadingCount: currentlyReadingBooks.length,
        finishedBooksCount: finishedBooks.length,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `book-club-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('Data exported successfully!', 'success');
}

function resetSession() {
    if (confirm('Are you sure you want to reset the current session? This will clear questions and current book progress, but will reload books from Google Sheets.')) {
        questions = [];
        currentBook = null;
        localStorage.removeItem('bookClub_questions');
        localStorage.removeItem('bookClub_currentBook');
        displayCurrentBook();
        updateQuestionsList();
        loadBooksFromGoogleSheets();
        showNotification('Session reset successfully', 'success');
    }
}

async function refreshBooks() {
    await loadBooksFromGoogleSheets();
    updateBookList();
    showNotification('Books refreshed from Google Sheets!', 'success');
}

function openLink(url) {
    if (url && !url.includes('YOUR_')) {
        window.open(url, '_blank');
    } else {
        showNotification('Please update the link in the configuration', 'error');
    }
}

// Test Google Sheet connection
async function testGoogleSheet() {
    const SHEET_ID = CONFIG.googleSheetsUrl;
    const testUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
    
    const resultElement = document.getElementById('random-result');
    resultElement.innerHTML = `
        <div class="error-message">
            Testing connection to Google Sheets...
        </div>
    `;
    
    const testUrls = [
        { name: 'Direct', url: testUrl },
        { name: 'AllOrigins Proxy', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(testUrl)}` },
        { name: 'CodeTabs Proxy', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(testUrl)}` }
    ];
    
    let results = [];
    
    for (const test of testUrls) {
        try {
            const response = await fetch(test.url, { method: 'GET', mode: 'cors' });
            if (response.ok) {
                results.push(`✅ ${test.name}: SUCCESS (${response.status})`);
            } else {
                results.push(`❌ ${test.name}: FAILED (${response.status})`);
            }
        } catch (error) {
            results.push(`❌ ${test.name}: ERROR (${error.message})`);
        }
    }
    
    resultElement.innerHTML = `
        <div class="error-message">
            <strong>Connection Test Results:</strong><br>
            ${results.join('<br>')}
        </div>
    `;
}

// Test Discord connection
async function testDiscordConnection() {
    const resultElement = document.getElementById('random-result');
    
    if (discordActivity) {
        resultElement.innerHTML = `
            <div class="success-message">
                ✅ Discord SDK is connected and ready!<br>
                Application ID: 1444120600330240053<br>
                You should see rich presence in Discord.
            </div>
        `;
        
        document.getElementById('discord-status').style.display = 'block';
    } else {
        resultElement.innerHTML = `
            <div class="error-message">
                ❌ Discord SDK not detected.<br>
                This is normal if you're testing outside of Discord.<br>
                Make sure you're running this as a Discord Activity.
            </div>
        `;
    }
}

// Simple test function
function simpleFunctionTest() {
    const resultElement = document.getElementById('random-result');
    resultElement.innerHTML = `
        <div class="success-message">
            ✅ Simple function test working!<br>
            Buttons are functioning correctly.<br>
            Time: ${new Date().toLocaleTimeString()}
        </div>
    `;
    showNotification('Simple test completed!', 'success');
}

// Test Discord Google Sheets connectivity
async function testDiscordSheets() {
    const debugElement = document.getElementById('random-result');
    debugElement.innerHTML = `
        <div class="error-message">
            🧪 Testing Discord Sheets Connection...<br>
            Environment: ${window.DiscordSDK ? 'Discord' : 'Browser'}
        </div>
    `;

    // Test basic fetch first
    try {
        debugElement.innerHTML += `<br>🧪 Testing basic fetch...`;
        const testFetch = await fetch('https://httpbin.org/get');
        debugElement.innerHTML += `<br>🧪 Basic fetch: ${testFetch.status === 200 ? '✅ WORKING' : '❌ FAILED'}`;
    } catch (e) {
        debugElement.innerHTML += `<br>🧪 Basic fetch: ❌ FAILED (${e.message})`;
    }

    // Test CORS proxy
    try {
        debugElement.innerHTML += `<br>🧪 Testing CORS proxy...`;
        const proxyTest = await fetch('https://corsproxy.io/?https://httpbin.org/get');
        debugElement.innerHTML += `<br>🧪 CORS proxy: ${proxyTest.status === 200 ? '✅ WORKING' : '❌ FAILED'}`;
    } catch (e) {
        debugElement.innerHTML += `<br>🧪 CORS proxy: ❌ FAILED (${e.message})`;
    }

    // Now test actual Google Sheets
    debugElement.innerHTML += `<br>🧪 Testing Google Sheets...`;
    await loadBooksFromGoogleSheets();
}

// Discord-compatible event listeners
function setupDiscordEventListeners() {
    console.log('🔧 Setting up Discord event listeners...');
    
    // Header buttons
    document.getElementById('export-data-btn')?.addEventListener('click', exportData);
    document.getElementById('reset-session-btn')?.addEventListener('click', resetSession);
    document.getElementById('refresh-books-btn')?.addEventListener('click', refreshBooks);
    
    // Randomizer buttons
    document.getElementById('pick-random-btn')?.addEventListener('click', pickRandomBook);
    document.getElementById('show-history-btn')?.addEventListener('click', showBookHistory);
    document.getElementById('close-history-btn')?.addEventListener('click', hideBookHistory);
    document.getElementById('open-sheet-btn')?.addEventListener('click', () => openLink(CONFIG.bookListUrl));
    
    // Questions
    document.getElementById('add-question-btn')?.addEventListener('click', addQuestion);
    document.getElementById('new-question-input')?.addEventListener('keypress', handleQuestionKeypress);
    
    // Resources
    document.getElementById('master-list-btn')?.addEventListener('click', () => openLink(CONFIG.bookListUrl));
    
    // Debug tools
    document.getElementById('test-sheets-btn')?.addEventListener('click', testGoogleSheet);
    document.getElementById('test-discord-btn')?.addEventListener('click', testDiscordConnection);
    document.getElementById('simple-test-btn')?.addEventListener('click', simpleFunctionTest);
    document.getElementById('clear-data-btn')?.addEventListener('click', clearAllData);
    document.getElementById('test-discord-sheets-btn')?.addEventListener('click', testDiscordSheets);
    
    console.log('🔧 Event listeners setup complete');
}

// Visual debug function for Discord
async function visualDebug() {
    const debugElement = document.getElementById('random-result');
    
    // Create a detailed debug output
    let debugHTML = `
        <div class="error-message" style="text-align: left; padding: 15px;">
            <h3>🔍 VISUAL DEBUG PANEL</h3>
            <hr>
    `;

    // Test 1: Environment
    debugHTML += `<strong>1. Environment:</strong><br>`;
    debugHTML += `• Discord SDK: ${window.DiscordSDK ? '✅ DETECTED' : '❌ NOT FOUND'}<br>`;
    debugHTML += `• User Agent: ${navigator.userAgent.substring(0, 50)}...<br>`;
    
    // Test 2: Basic functionality
    debugHTML += `<br><strong>2. Basic Functions:</strong><br>`;
    debugHTML += `• Buttons: ✅ WORKING (you clicked this!)<br>`;
    debugHTML += `• DOM: ✅ WORKING<br>`;
    
    // Test 3: Fetch test
    debugHTML += `<br><strong>3. Network Tests:</strong><br>`;
    
    try {
        const testFetch = await fetch('https://httpbin.org/json');
        debugHTML += `• Basic Fetch: ✅ ${testFetch.status}<br>`;
    } catch (e) {
        debugHTML += `• Basic Fetch: ❌ ${e.message}<br>`;
    }
    
    try {
        const proxyTest = await fetch('https://corsproxy.io/?https://httpbin.org/json');
        debugHTML += `• CORS Proxy: ✅ ${proxyTest.status}<br>`;
    } catch (e) {
        debugHTML += `• CORS Proxy: ❌ ${e.message}<br>`;
    }
    
    // Test 4: Google Sheets direct
    debugHTML += `<br><strong>4. Google Sheets Tests:</strong><br>`;
    
    const sheetTests = [
        { name: 'Published HTML', url: CONFIG.bookListUrl },
        { name: 'API JSON', url: `https://docs.google.com/spreadsheets/d/${CONFIG.googleSheetsUrl}/gviz/tq?tqx=out:json` },
        { name: 'CSV Export', url: `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5-gAZ6rbi9IDi-cIVEvQ85It9sXHXMPFCs6xVsntZv7ijfKPmYzfHpxPTn4BI-g8B2zAK_PPq2ACA/pub?output=csv` }
    ];
    
    for (let test of sheetTests) {
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(test.url)}`;
            const response = await fetch(proxyUrl, { method: 'HEAD' });
            debugHTML += `• ${test.name}: ✅ ${response.status}<br>`;
        } catch (e) {
            debugHTML += `• ${test.name}: ❌ ${e.message}<br>`;
        }
        // Small delay to not overwhelm
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    debugHTML += `<br><strong>5. Next Steps:</strong><br>`;
    debugHTML += `• Share this debug output<br>`;
    debugHTML += `• We'll see exactly what's blocked<br>`;
    
    debugHTML += `</div>`;
    
    debugElement.innerHTML = debugHTML;
}

// Clear all local data
function clearAllData() {
    if (confirm('Clear ALL local data including questions and progress?')) {
        localStorage.clear();
        location.reload();
    }
}

// Event handlers for Enter key
function handleQuestionKeypress(event) {
    if (event.key === 'Enter') addQuestion();
}

// Auto-run when page loads
document.addEventListener('DOMContentLoaded', async function() {
    const debugElement = document.getElementById('random-result');
    
    // Create a detailed debug output that shows automatically
    let debugHTML = `
        <div class="error-message" style="text-align: left; padding: 15px;">
            <h3>🔍 AUTO-DEBUG PANEL</h3>
            <hr>
            <strong>1. Environment:</strong><br>
            • Discord SDK: ${window.DiscordSDK ? '✅ DETECTED' : '❌ NOT FOUND'}<br>
            • Page Loaded: ✅ SUCCESS<br>
            <br><strong>2. Basic Functions:</strong><br>
            • JavaScript: ✅ EXECUTING<br>
            • DOM: ✅ WORKING<br>
    `;
    
    debugElement.innerHTML = debugHTML;
    
    // Test 3: Fetch test
    debugHTML += `<br><strong>3. Network Tests:</strong><br>`;
    
    try {
        const testFetch = await fetch('https://httpbin.org/json');
        debugHTML += `• Basic Fetch: ✅ ${testFetch.status}<br>`;
    } catch (e) {
        debugHTML += `• Basic Fetch: ❌ ${e.message}<br>`;
    }
    
    try {
        const proxyTest = await fetch('https://corsproxy.io/?https://httpbin.org/json');
        debugHTML += `• CORS Proxy: ✅ ${proxyTest.status}<br>`;
    } catch (e) {
        debugHTML += `• CORS Proxy: ❌ ${e.message}<br>`;
    }
    
    // Test 4: Google Sheets direct
    debugHTML += `<br><strong>4. Google Sheets Tests:</strong><br>`;
    
    const sheetTests = [
        { name: 'Published HTML', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5-gAZ6rbi9IDi-cIVEvQ85It9sXHXMPFCs6xVsntZv7ijfKPmYzfHpxPTn4BI-g8B2zAK_PPq2ACA/pubhtml' },
        { name: 'API JSON', url: `https://docs.google.com/spreadsheets/d/1TRraVAkBbpZHz0oLLe0TRkx9i8F4OwAUMkP4gm74nYs/gviz/tq?tqx=out:json` },
        { name: 'CSV Export', url: `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5-gAZ6rbi9IDi-cIVEvQ85It9sXHXMPFCs6xVsntZv7ijfKPmYzfHpxPTn4BI-g8B2zAK_PPq2ACA/pub?output=csv` }
    ];
    
    for (let test of sheetTests) {
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(test.url)}`;
            const response = await fetch(proxyUrl, { method: 'HEAD' });
            debugHTML += `• ${test.name}: ✅ ${response.status}<br>`;
        } catch (e) {
            debugHTML += `• ${test.name}: ❌ ${e.message}<br>`;
        }
        // Small delay to not overwhelm
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    debugHTML += `<br><strong>5. Analysis:</strong><br>`;
    
    // Determine what's working
    const isDiscord = !!window.DiscordSDK;
    if (isDiscord) {
        debugHTML += `• Running in: 🎮 DISCORD ACTIVITY<br>`;
        debugHTML += `• Buttons: ❌ LIKELY BLOCKED<br>`;
        debugHTML += `• Solution: Auto-load data<br>`;
    } else {
        debugHTML += `• Running in: 🌐 REGULAR BROWSER<br>`;
        debugHTML += `• Buttons: ✅ SHOULD WORK<br>`;
    }
    
    debugHTML += `</div>`;
    
    debugElement.innerHTML = debugHTML;
    
    // Now continue with normal initialization
    await initializeDiscord();
    updateStatus('Loading book club manager...');
    await loadBooksFromGoogleSheets();
    updateBookList();
    loadLocalData();
    updateStatus('Ready! Books loaded: ' + books.length);
    showNotification('Book Club Manager loaded successfully!', 'success');
    
    // Update Discord activity with loaded books count
    if (discordActivity) {
        await updateDiscordActivity('Managing Book Club', `${books.length} books loaded`);
    }
    
    // Setup event listeners for Discord compatibility
    setupDiscordEventListeners();
});