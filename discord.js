// discord.js - Discord Activity Integration
class DiscordActivity {
    constructor() {
        this.sdk = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // Initialize Discord SDK
            this.sdk = new DiscordSDK.ApplicationId('YOUR_APPLICATION_ID');
            await this.sdk.ready();
            console.log('Discord SDK ready');
            
            // Set up activity state
            await this.setActivityState();
            this.initialized = true;
            
        } catch (error) {
            console.log('Running outside Discord - Activity features disabled');
            // This is normal when testing locally
        }
    }

    async setActivityState() {
        if (!this.initialized) return;
        
        try {
            await this.sdk.commands.setActivity({
                state: 'Managing Book Club',
                details: 'Reading with friends',
                timestamps: {
                    start: Date.now()
                },
                assets: {
                    large_image: 'book-club',
                    large_text: 'Book Club Manager'
                },
                buttons: [
                    {
                        label: 'Join Book Club',
                        url: 'https://discord.gg/your-invite-link'
                    }
                ]
            });
        } catch (error) {
            console.log('Could not set activity state:', error);
        }
    }

    async updateBookProgress(bookTitle, progress) {
        if (!this.initialized) return;
        
        try {
            await this.sdk.commands.setActivity({
                state: `Reading: ${bookTitle}`,
                details: `${progress}% complete`,
                timestamps: {
                    start: Date.now()
                },
                assets: {
                    large_image: 'book-reading',
                    large_text: bookTitle
                }
            });
        } catch (error) {
            console.log('Could not update activity:', error);
        }
    }
}

// Initialize Discord integration
const discordActivity = new DiscordActivity();