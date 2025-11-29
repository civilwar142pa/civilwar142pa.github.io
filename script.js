<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="style.css">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Club Manager - Keyboard Edition</title>
</head>

<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>📚 Book Club Manager</h1>
            <div class="session-controls">
                <span class="keyboard-hint">🎮 Use keyboard controls</span>
            </div>
        </div>

        <!-- Current Book Section -->
        <div class="section">
            <h2>📖 Currently Reading</h2>
            <div id="current-book" class="current-book-card">
                <div class="no-book">
                    <p>No book selected. Press <kbd>1</kbd> or <kbd>R</kbd> to pick one!</p>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="section">
            <h2>🎮 Quick Actions</h2>
            <div class="keyboard-controls">
                <div class="control-group">
                    <kbd>1</kbd> - Random Book • 
                    <kbd>2</kbd> - 25% • 
                    <kbd>3</kbd> - 50% • 
                    <kbd>4</kbd> - 75% • 
                    <kbd>5</kbd> - Finish
                </div>
                <div class="control-group">
                    <kbd>R</kbd> - Random • 
                    <kbd>N</kbd> - New Question • 
                    <kbd>F</kbd> - Finish • 
                    <kbd>C</kbd> - Change • 
                    <kbd>H</kbd> - Help
                </div>
            </div>
        </div>

        <!-- Results & Messages -->
        <div id="random-result" class="section">
            <div class="success-message">
                Welcome! Press <kbd>H</kbd> for help
            </div>
        </div>

        <!-- Available Books -->
        <div class="section">
            <h2>📚 Available Books (<span id="available-count">0</span>)</h2>
            <div id="book-list" class="item-list"></div>
        </div>

        <!-- Discussion Questions -->
        <div class="section">
            <h2>💬 Discussion Questions</h2>
            <div class="input-group">
                <input type="text" id="question-input" placeholder="Press N to add a question, then type and press ENTER...">
            </div>
            <div id="questions-list" class="item-list"></div>
        </div>

        <!-- Status -->
        <div class="status-bar">
            <span id="status-message">Press H for help</span>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>