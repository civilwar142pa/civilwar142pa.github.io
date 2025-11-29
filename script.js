// Discord Integration
let discordActivity = null;

// Initialize Discord when app loads
async function initializeDiscord() {
    try {
        // Check if we're running in Discord
        if (window.DiscordSDK) {
            // Note: The correct syntax might be different - this is a common approach
            discordActivity = window.DiscordSDK;
            console.log('Discord SDK detected');
        }
    } catch (error) {
        console.log('Discord Activity initialization failed:', error);
    }
}

// Configuration 
const CONFIG = {
    googleSheetsUrl: '1TRraVAkBbpZHz0oLLe0TRkx9i8F4OwAUMkP4gm74nYs', // Just the sheet ID, not full URL
    meetingNotesUrl: '',
    bookListUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5-gAZ6rbi9IDi-cIVEvQ85It9sXHXMPFCs6xVsntZv7ijfKPmYzfHpxPTn4BI-g8B2zAK_PPq2ACA/pubhtml'
};

// Data storage
let books = [];
let availableBooks = []; // Status: "future option"
let currentlyReadingBooks = []; // Status: "currently reading"
let finishedBooks = []; // Status: "finished"
let questions = [];
let currentBook = null;

// Initialize the application
async function initialize() {
    await initializeDiscord();
    updateStatus('Loading book club manager...');
    await loadBooksFromGoogleSheets();
    updateBookList();
    loadLocalData();
    updateStatus('Ready! Books loaded: ' + books.length);
    showNotification('Book Club Manager loaded successfully!', 'success');
}

// Simple JSON loader for published Google Sheets
async function loadBooksFromGoogleSheets() {
    try {
        updateStatus('Loading books from Google Sheets...');
        
        const SHEET_ID = CONFIG.googleSheetsUrl;
        
        if (!SHEET_ID || SHEET_ID === 'YOUR_SHEET_ID_HERE') {
            throw new Error('Please set your Google Sheet ID in the CONFIG section');
        }
        
        // Use CORS proxy to bypass restrictions
        const timestamp = new Date().getTime();
        const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&_=${timestamp}`;
        
        // Try different CORS proxies - one of these should work
        const proxyUrls = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(googleSheetsUrl)}`,
            `https://cors-anywhere.herokuapp.com/${googleSheetsUrl}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(googleSheetsUrl)}`,
            googleSheetsUrl // Try direct as fallback
        ];
        
        let response;
        let lastError;
        
        // Try each proxy until one works
        for (const proxyUrl of proxyUrls) {
            try {
                console.log(`Trying proxy: ${proxyUrl.substring(0, 50)}...`);
                response = await fetch(proxyUrl, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json',
                    }
                });
                
                if (response.ok) {
                    console.log(`Success with proxy: ${proxyUrl.substring(0, 30)}...`);
                    break;
                } else {
                    lastError = `HTTP ${response.status} from proxy`;
                }
            } catch (error) {
                lastError = error.message;
                console.log(`Proxy failed: ${error.message}`);
                // Continue to next proxy
            }
        }
        
        if (!response || !response.ok) {
            throw new Error(`All proxies failed. Last error: ${lastError}`);
        }
        
        const text = await response.text();
        
        // Parse the special Google format
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const sheetData = json.table.rows;
        
        // Process the data with YOUR column names
        books = sheetData.map((row, index) => {
            const cells = row.c;
            return {
                title: cells[0] ? (cells[0].v || '').toString().trim() : '',
                author: cells[1] ? (cells[1].v || '').toString().trim() : '',
                status: cells[2] ? (cells[2].v || 'future option').toString().toLowerCase().trim() : 'future option',
                link: cells[3] ? (cells[3].v || '').toString().trim() : '',
                rowIndex: index + 1
            };
        }).filter(book => book.title && book.title !== ''); // Filter out empty rows
        
        // Categorize books by status
        availableBooks = books.filter(book => 
            book.status.includes('future') || 
            book.status === '' || 
            !book.status
        );
        currentlyReadingBooks = books.filter(book => 
            book.status.includes('currently') && 
            !book.read
        );
        finishedBooks = books.filter(book => 
            book.status.includes('finished') || 
            book.status.includes('read') ||
            book.read
        );

        // Set current book if available
        if (currentlyReadingBooks.length > 0 && !currentBook) {
            const validCurrentlyReading = currentlyReadingBooks.filter(book => !book.read);
            if (validCurrentlyReading.length > 0) {
                currentBook = {
                    ...validCurrentlyReading[0],
                    progress: 0,
                    startDate: new Date().toISOString().split('T')[0]
                };
            }
        }
        
        showNotification(`Successfully loaded ${books.length} books from Google Sheets!`, 'success');
        
    } catch (error) {
        console.error('Error loading Google Sheets data:', error);
        updateStatus('Error: ' + error.message);
        showNotification('Failed to load Google Sheets. Using local storage.', 'error');
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
        console.log('Loaded books from local storage:', books.length);
    } else {
        // Sample data for testing
        availableBooks = [
            { title: "Sample Book 1", author: "Author One", status: "future option", link: "" },
            { title: "Sample Book 2", author: "Author Two", status: "future option", link: "" }
        ];
        books = [...availableBooks];
        console.log('Using sample books - no local storage data found');
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
                    <button onclick="setFirstCurrentlyReading()" class="primary" style="margin-top: 10px;">
                        Set "${currentlyReadingBooks[0].title}" as Current
                    </button>
                ` : ''}
            </div>
        `;
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
                    <button onclick="updateProgress(0)" class="small-btn">0%</button>
                    <button onclick="updateProgress(25)" class="small-btn">25%</button>
                    <button onclick="updateProgress(50)" class="small-btn">50%</button>
                    <button onclick="updateProgress(75)" class="small-btn">75%</button>
                    <button onclick="updateProgress(100)" class="small-btn">Finished! 🎉</button>
                    <input type="number" id="custom-progress" min="0" max="100" placeholder="Custom %">
                    <button onclick="updateCustomProgress()" class="small-btn">Set</button>
                </div>
            </div>
            
            <div class="book-actions">
                <button onclick="markAsFinished()" class="finished-btn">Mark as Finished</button>
                <button onclick="changeCurrentBook()" class="secondary-btn">Change Book</button>
            </div>
        </div>
    `;
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

// Book randomizer
function pickRandomBook() {
    if (availableBooks.length === 0) {
        showNotification('No available books found! Check your Google Sheet for books with "future option" status.', 'error');
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * availableBooks.length);
    const selectedBook = availableBooks[randomIndex];
    
    // Set as current book
    currentBook = {
        ...selectedBook,
        progress: 0,
        startDate: new Date().toISOString().split('T')[0]
    };
    
    // Remove from available books
    availableBooks.splice(randomIndex, 1);
    
    displayCurrentBook();
    updateBookList();
    saveLocalData();
    
    // Show result
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
    
    // Add current book back to available if it's not finished
    if (currentBook && currentBook.progress < 100) {
        availableBooks.push(currentBook);
    }
    
    pickRandomBook();
}

// Progress tracking
function updateProgress(percent) {
    if (!currentBook) return;
    
    currentBook.progress = percent;
    displayCurrentBook();
    saveLocalData();

    //update Discord activity if available
    if (discordActivity && discordActivity.initialized) {
        discordActivity.updateBookProgress(currentBook.title, percent);
    }
    
    if (percent === 100) {
        showNotification('Congratulations! Book finished! 🎉', 'success');
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

function markAsFinished() {
    if (!currentBook) return;
    
    currentBook.progress = 100;
    currentBook.endDate = new Date().toISOString().split('T')[0];
    currentBook.read = true;
    currentBook.status = 'finished'; // Explicitly set status to finished
    
    // Remove from currently reading books
    currentlyReadingBooks = currentlyReadingBooks.filter(book => book.title !== currentBook.title);
    
    // Add to finished books (only if not already there)
    if (!finishedBooks.some(book => book.title === currentBook.title)) {
        finishedBooks.push(currentBook);
    }
    
    // Remove from available books
    availableBooks = availableBooks.filter(book => book.title !== currentBook.title);
    
    showNotification(`Finished reading: ${currentBook.title}`, 'success');
    
    // Clear current book
    const finishedBookTitle = currentBook.title;
    currentBook = null;
    displayCurrentBook();
    updateBookList();
    saveLocalData();
    
    // Show celebration
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
                <button onclick="selectBookManually('${book.title.replace(/'/g, "\\'")}')" class="small-btn primary">
                    Select This Book
                </button>
            </div>
        </div>
    `).join('');
}

function selectBookManually(bookTitle) {
    const book = availableBooks.find(b => b.title === bookTitle);
    if (book) {
        // Add current book back to available if not finished
        if (currentBook && currentBook.progress < 100) {
            availableBooks.push(currentBook);
        }
        
        currentBook = {
            ...book,
            progress: 0,
            startDate: new Date().toISOString().split('T')[0]
        };
        
        // Remove from available
        availableBooks = availableBooks.filter(b => b.title !== bookTitle);
        
        displayCurrentBook();
        updateBookList();
        saveLocalData();
        
        showNotification(`Manually selected: ${bookTitle}`, 'success');
    }
}

// Discussion questions
function addQuestion() {
    const input = document.getElementById('new-question');
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
                <button onclick="toggleQuestionAnswered(${index})" class="small-btn">
                    ${q.answered ? '✅ Answered' : '◻️ Mark Answered'}
                </button>
                <button onclick="removeQuestion(${index})" class="small-btn danger">Remove</button>
            </div>
        </div>
    `).join('');
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
// History functions - WITH DUPLICATE FILTERING
function showBookHistory() {
    const historyList = document.getElementById('history-list');
    const historyPanel = document.getElementById('book-history');
    
    // Create copies to avoid modifying the original arrays
    const displayCurrentlyReading = [...currentlyReadingBooks];
    const displayFinishedBooks = [...finishedBooks];
    
    // Remove any books from currently reading that are also in finished
    const uniqueCurrentlyReading = displayCurrentlyReading.filter(
        currentBook => !displayFinishedBooks.some(finished => finished.title === currentBook.title)
    );
    
    // Remove any books from finished that are also in currently reading (shouldn't happen, but just in case)
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
    // Simple notification - you can enhance this with a proper notification system
    console.log(`${type}: ${message}`);
    
    // Visual notification
    const notification = document.createElement('div');
    notification.className = type === 'error' ? 'error-message' : 'success-message';
    notification.textContent = message;
    notification.style.margin = '10px 0';
    
    const randomResult = document.getElementById('random-result');
    randomResult.innerHTML = '';
    randomResult.appendChild(notification);
    
    // Auto-remove after 5 seconds
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
    
    // Test both direct and proxy connections
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initialize);
