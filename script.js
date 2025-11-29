// Discord Keyboard-Only Book Club Manager
const CONFIG = {
    googleSheetsUrl: '1TRraVAkBbpZHz0oLLe0TRkx9i8F4OwAUMkP4gm74nYs',
    bookListUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5-gAZ6rbi9IDi-cIVEvQ85It9sXHXMPFCs6xVsntZv7ijfKPmYzfHpxPTn4BI-g8B2zAK_PPq2ACA/pubhtml'
};

let books = [];
let availableBooks = [];
let currentlyReadingBooks = [];
let finishedBooks = [];
let questions = [];
let currentBook = null;
let currentInput = '';

// Initialize everything
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
    setupKeyboardControls();
});

async function initializeApp() {
    updateStatus('🚀 Starting Book Club Manager...');
    
    // Show we're loading
    document.getElementById('random-result').innerHTML = `
        <div class="error-message">
            📚 Loading books from Google Sheets...
        </div>
    `;
    
    await loadBooksFromGoogleSheets();
    updateBookList();
    loadLocalData();
    
    document.getElementById('random-result').innerHTML = `
        <div class="success-message">
            ✅ Ready! Loaded ${books.length} books<br>
            <small>Use NUMBER KEYS to select options</small>
        </div>
    `;
    
    showHelp();
}

function setupKeyboardControls() {
    document.addEventListener('keydown', function(event) {
        const key = event.key;
        
        // Number keys for quick actions
        if (key >= '1' && key <= '9') {
            handleNumberInput(parseInt(key));
        }
        
        // Special keys
        switch(key) {
            case 'r': // Random book
                pickRandomBook();
                break;
            case 'n': // New question
                focusQuestionInput();
                break;
            case 'h': // Help
                showHelp();
                break;
            case 'f': // Finish current book
                if (currentBook) markAsFinished();
                break;
            case 'c': // Change book
                changeCurrentBook();
                break;
            case 'Enter':
                if (document.activeElement.id === 'question-input') {
                    addQuestion();
                }
                break;
            case 'Escape':
                clearInput();
                break;
        }
    });
}

function handleNumberInput(number) {
    if (number === 1 && availableBooks.length > 0) {
        pickRandomBook();
    } else if (number === 2 && currentBook) {
        updateProgress(25);
    } else if (number === 3 && currentBook) {
        updateProgress(50);
    } else if (number === 4 && currentBook) {
        updateProgress(75);
    } else if (number === 5 && currentBook) {
        updateProgress(100);
    } else if (number >= 6 && number <= 10) {
        const bookIndex = number - 6;
        if (bookIndex < availableBooks.length) {
            selectBookByIndex(bookIndex);
        }
    }
}

function showHelp() {
    const helpHTML = `
        <div class="success-message" style="text-align: left;">
            <h3>🎮 Keyboard Controls</h3>
            <strong>Quick Actions:</strong><br>
            • <kbd>1</kbd> - Pick random book<br>
            • <kbd>2</kbd> - Set 25% progress<br>
            • <kbd>3</kbd> - Set 50% progress<br>
            • <kbd>4</kbd> - Set 75% progress<br>
            • <kbd>5</kbd> - Finish book (100%)<br>
            • <kbd>6-0</kbd> - Select book 1-5<br>
            <br>
            <strong>Other Commands:</strong><br>
            • <kbd>R</kbd> - Random book<br>
            • <kbd>N</kbd> - New question<br>
            • <kbd>F</kbd> - Finish current book<br>
            • <kbd>C</kbd> - Change book<br>
            • <kbd>H</kbd> - Show this help<br>
            • <kbd>ESC</kbd> - Clear input
        </div>
    `;
    document.getElementById('random-result').innerHTML = helpHTML;
}

function focusQuestionInput() {
    const input = document.getElementById('question-input');
    input.focus();
    document.getElementById('random-result').innerHTML = `
        <div class="error-message">
            💬 Type your question and press ENTER
        </div>
    `;
}

function clearInput() {
    const input = document.getElementById('question-input');
    input.value = '';
    input.blur();
    showHelp();
}

// Modified Google Sheets loader for Discord
async function loadBooksFromGoogleSheets() {
    try {
        const SHEET_ID = CONFIG.googleSheetsUrl;
        const csvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5-gAZ6rbi9IDi-cIVEvQ85It9sXHXMPFCs6xVsntZv7ijfKPmYzfHpxPTn4BI-g8B2zAK_PPq2ACA/pub?output=csv`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
        
        const response = await fetch(proxyUrl);
        const csvText = await response.text();
        
        // Parse CSV
        const lines = csvText.split('\n');
        books = [];
        
        for (let i = 1; i < lines.length; i++) {
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
        
        // Categorize books
        availableBooks = books.filter(book => book.status.includes('future') || !book.status);
        currentlyReadingBooks = books.filter(book => book.status.includes('currently'));
        finishedBooks = books.filter(book => book.status.includes('finished') || book.status.includes('read'));
        
        if (currentlyReadingBooks.length > 0 && !currentBook) {
            currentBook = { ...currentlyReadingBooks[0], progress: 0 };
        }
        
    } catch (error) {
        console.error('Failed to load books:', error);
        // Fallback to sample data
        availableBooks = [
            { title: "Sample Book 1", author: "Author One", status: "future option" },
            { title: "Sample Book 2", author: "Author Two", status: "future option" }
        ];
        books = [...availableBooks];
    }
}

// Rest of your existing functions (pickRandomBook, updateProgress, etc.)
// ... keep all your existing functionality but remove button dependencies

function pickRandomBook() {
    if (availableBooks.length === 0) {
        showNotification('No available books!', 'error');
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
    
    document.getElementById('random-result').innerHTML = `
        <div class="success-message">
            🎉 Selected: <strong>${selectedBook.title}</strong><br>
            by ${selectedBook.author}<br>
            <small>Press 2-5 to set progress</small>
        </div>
    `;
}

function selectBookByIndex(index) {
    if (index < availableBooks.length) {
        const book = availableBooks[index];
        
        if (currentBook && currentBook.progress < 100) {
            availableBooks.push(currentBook);
        }
        
        currentBook = {
            ...book,
            progress: 0,
            startDate: new Date().toISOString().split('T')[0]
        };
        
        availableBooks.splice(index, 1);
        
        displayCurrentBook();
        updateBookList();
        saveLocalData();
        
        document.getElementById('random-result').innerHTML = `
            <div class="success-message">
                📖 Selected: <strong>${book.title}</strong><br>
                by ${book.author}
            </div>
        `;
    }
}

// Update your HTML to remove all buttons and add keyboard instructions