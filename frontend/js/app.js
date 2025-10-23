/**
 * Spam Filter Manager - Main Application JavaScript
 */

class SpamFilterApp {
    constructor() {
        this.apiBaseUrl = process.env.API_BASE_URL || '/api/v1';
        this.authToken = localStorage.getItem('authToken');
        this.currentMailbox = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Add entry buttons
        document.getElementById('add-whitelist-btn').addEventListener('click', () => {
            this.addEntry('whitelist');
        });

        document.getElementById('add-blacklist-btn').addEventListener('click', () => {
            this.addEntry('blacklist');
        });

        // Enter key on input fields
        document.getElementById('whitelist-entry').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addEntry('whitelist');
            }
        });

        document.getElementById('blacklist-entry').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addEntry('blacklist');
            }
        });

        // Modal events
        document.getElementById('confirm-cancel').addEventListener('click', () => {
            this.hideModal();
        });

        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        // Click outside modal to close
        document.getElementById('confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-modal') {
                this.hideModal();
            }
        });
    }

    async checkAuthStatus() {
        if (this.authToken) {
            try {
                const response = await this.apiCall('/auth/verify', 'POST', {
                    token: this.authToken
                });
                
                if (response.status === 'success') {
                    this.currentMailbox = response.mailbox;
                    this.showMainApp();
                    await this.loadSpamRules();
                } else {
                    this.showLoginScreen();
                }
            } catch (error) {
                console.error('Auth verification failed:', error);
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');

        if (!email || !password) {
            this.showError('Please enter both email and password', errorElement);
            return;
        }

        try {
            this.setLoading(true);
            
            const response = await this.apiCall('/auth/verify-mailbox', 'POST', {
                email: email,
                password: password,
                mailbox: email
            });

            if (response.status === 'success') {
                this.authToken = response.token;
                this.currentMailbox = email;
                localStorage.setItem('authToken', this.authToken);
                
                this.showMainApp();
                await this.loadSpamRules();
                this.showSuccess('Login successful!');
            } else {
                this.showError(response.message || 'Login failed', errorElement);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please check your credentials.', errorElement);
        } finally {
            this.setLoading(false);
        }
    }

    async handleLogout() {
        try {
            if (this.authToken) {
                await this.apiCall('/auth/logout', 'POST', {
                    token: this.authToken
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.authToken = null;
            this.currentMailbox = null;
            localStorage.removeItem('authToken');
            this.showLoginScreen();
            this.showSuccess('Logged out successfully');
        }
    }

    async loadSpamRules() {
        try {
            const response = await this.apiCall(`/spam-rules?mailbox=${this.currentMailbox}`, 'GET');
            
            if (response.status === 'success') {
                this.renderEntries('whitelist', response.whitelist);
                this.renderEntries('blacklist', response.blacklist);
            } else {
                this.showError('Failed to load spam rules');
            }
        } catch (error) {
            console.error('Failed to load spam rules:', error);
            this.showError('Failed to load spam rules');
        }
    }

    async addEntry(listType) {
        const inputId = `${listType}-entry`;
        const input = document.getElementById(inputId);
        const entry = input.value.trim();

        if (!entry) {
            this.showError(`Please enter a ${listType} entry`);
            return;
        }

        try {
            this.setLoading(true);
            
            const response = await this.apiCall('/spam-rules', 'POST', {
                mailbox: this.currentMailbox,
                listType: listType,
                entry: entry
            });

            if (response.status === 'success') {
                input.value = '';
                await this.loadSpamRules();
                this.showSuccess(`Entry added to ${listType} successfully`);
            } else {
                this.showError(response.message || `Failed to add entry to ${listType}`);
            }
        } catch (error) {
            console.error(`Failed to add ${listType} entry:`, error);
            this.showError(`Failed to add entry to ${listType}`);
        } finally {
            this.setLoading(false);
        }
    }

    async removeEntry(listType, entry) {
        try {
            this.setLoading(true);
            
            const response = await this.apiCall('/spam-rules', 'DELETE', {
                mailbox: this.currentMailbox,
                listType: listType,
                entry: entry
            });

            if (response.status === 'success') {
                await this.loadSpamRules();
                this.showSuccess(`Entry removed from ${listType} successfully`);
            } else {
                this.showError(response.message || `Failed to remove entry from ${listType}`);
            }
        } catch (error) {
            console.error(`Failed to remove ${listType} entry:`, error);
            this.showError(`Failed to remove entry from ${listType}`);
        } finally {
            this.setLoading(false);
        }
    }

    renderEntries(listType, entries) {
        const container = document.getElementById(`${listType}-entries`);
        
        if (entries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-${listType === 'whitelist' ? 'check-circle' : 'ban'}"></i>
                    <p>No ${listType} entries found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = entries.map(entry => `
            <div class="entry-item">
                <span class="entry-value">${this.escapeHtml(entry)}</span>
                <div class="entry-actions">
                    <button class="btn-icon" onclick="app.confirmRemoveEntry('${listType}', '${this.escapeHtml(entry)}')" 
                            title="Remove entry">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    confirmRemoveEntry(listType, entry) {
        this.showModal(
            `Remove from ${listType}`,
            `Are you sure you want to remove "${entry}" from your ${listType}?`,
            () => this.removeEntry(listType, entry)
        );
    }

    showModal(title, message, onConfirm) {
        document.querySelector('#confirm-modal .modal-header h3').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        
        const confirmBtn = document.getElementById('confirm-ok');
        confirmBtn.onclick = () => {
            onConfirm();
            this.hideModal();
        };
        
        document.getElementById('confirm-modal').classList.remove('hidden');
    }

    hideModal() {
        document.getElementById('confirm-modal').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('user-email').textContent = this.currentMailbox;
    }

    showLoginScreen() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    }

    setLoading(loading) {
        const app = document.getElementById('spam-filter-app');
        if (loading) {
            app.classList.add('loading');
        } else {
            app.classList.remove('loading');
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'API call failed');
        }

        return result;
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const container = document.getElementById('status-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;
        
        container.appendChild(messageElement);
        
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SpamFilterApp();
});

// Handle page visibility change to refresh data when user returns
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.app && window.app.currentMailbox) {
        window.app.loadSpamRules();
    }
});
