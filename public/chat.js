class InterviewCoach {
    constructor() {
        // TODO: add more voice languages
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.apiBase = isLocalDev ? 'http://127.0.0.1:8787/api' : 'https://ai-interview-coach.aayushmishraaa.workers.dev/api';
        this.userId = this.generateUserId();
        this.isListening = false;
        this.recognition = null;
        this.voiceEnabled = false;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeSpeechRecognition();
        this.initializeSession();
    }

    generateUserId() {
        let userId = localStorage.getItem('interview_coach_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('interview_coach_user_id', userId);
        }
        return userId;
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendMessage');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.welcomeMessage = document.getElementById('welcomeMessage');
        this.charCount = document.getElementById('charCount');

        this.voiceToggle = document.getElementById('voiceToggle');
        this.voiceInput = document.getElementById('voiceInput');
        this.voiceModal = document.getElementById('voiceModal');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.voiceTranscript = document.getElementById('voiceTranscript');
        this.closeVoiceModal = document.getElementById('closeVoiceModal');
        this.stopVoice = document.getElementById('stopVoice');

        this.clearChat = document.getElementById('clearChat');
        this.errorToast = document.getElementById('errorToast');
        this.successToast = document.getElementById('successToast');
        this.closeToast = document.getElementById('closeToast');
        this.closeSuccessToast = document.getElementById('closeSuccessToast');
    }

    initializeEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => this.validateInput());

        this.voiceToggle.addEventListener('click', () => this.toggleVoice());
        this.voiceInput.addEventListener('click', () => this.startVoiceRecognition());
        this.closeVoiceModal.addEventListener('click', () => this.stopVoiceRecognition());
        this.stopVoice.addEventListener('click', () => this.stopVoiceRecognition());

        this.clearChat.addEventListener('click', () => this.clearSession());

        this.closeToast.addEventListener('click', () => this.hideToast('error'));
        this.closeSuccessToast.addEventListener('click', () => this.hideToast('success'));

        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.voiceStatus.textContent = 'Listening... Speak now';
                this.voiceModal.classList.remove('hidden');
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                this.voiceTranscript.innerHTML = 
                    '<strong>Final:</strong> ' + finalTranscript + 
                    '<br><strong>Interim:</strong> ' + interimTranscript;

                if (finalTranscript) {
                    this.messageInput.value = finalTranscript;
                    this.validateInput();
                    this.stopVoiceRecognition();
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showToast('Voice recognition error: ' + event.error, 'error');
                this.stopVoiceRecognition();
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.voiceModal.classList.add('hidden');
            };
        } else {
            console.warn('Speech recognition not supported');
            this.voiceInput.style.display = 'none';
            this.voiceToggle.style.display = 'none';
        }
    }

    async initializeSession() {
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiBase}/session/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: this.userId })
            });

            const data = await response.json();
            
            if (data.success) {
                this.welcomeMessage.classList.add('hidden');
                this.displayMessages(data.session.messages);
                this.showToast('Session initialized successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to initialize session');
            }
        } catch (error) {
            console.error('Session initialization error:', error);
            this.showToast('Failed to initialize session: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.sendButton.disabled) return;

        try {
            // Add user message to chat immediately
            this.addMessage(message, 'user');
            this.messageInput.value = '';
            this.validateInput();
            this.showLoading(true);

            const response = await fetch(`${this.apiBase}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    userId: this.userId
                })
            });

            const data = await response.json();

            if (data.success) {
                this.addMessage(data.message.content, 'assistant');
            } else {
                throw new Error(data.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Send message error:', error);
            this.showToast('Failed to send message: ' + error.message, 'error');
            this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant', true);
        } finally {
            this.showLoading(false);
        }
    }

    addMessage(content, role, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}${isError ? ' error' : ''}`;
        
        const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${role === 'user' ? 'You' : 'AI Coach'}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-text">${this.formatMessage(content)}</div>
            </div>
            ${role === 'assistant' ? '<div class="message-avatar"><i class="fas fa-robot"></i></div>' : ''}
        `;

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Hide welcome message if it's still visible
        if (!this.welcomeMessage.classList.contains('hidden')) {
            this.welcomeMessage.classList.add('hidden');
        }
    }

    displayMessages(messages) {
        this.chatMessages.innerHTML = '';
        messages.forEach(msg => {
            this.addMessage(msg.content, msg.role);
        });
    }

    formatMessage(content) {
        // Basic formatting for code blocks and markdown-like content
        return content
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    validateInput() {
        const message = this.messageInput.value.trim();
        const length = this.messageInput.value.length;
        
        this.sendButton.disabled = !message || length > 2000;
        this.charCount.textContent = `${length}/2000`;
        
        if (length > 2000) {
            this.charCount.style.color = '#ff4444';
        } else {
            this.charCount.style.color = '#666';
        }
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        const statusSpan = this.voiceToggle.querySelector('.voice-status');
        
        if (this.voiceEnabled) {
            statusSpan.textContent = 'Voice On';
            this.voiceToggle.classList.add('active');
            this.showToast('Voice input enabled', 'success');
        } else {
            statusSpan.textContent = 'Voice Off';
            this.voiceToggle.classList.remove('active');
            this.showToast('Voice input disabled', 'success');
        }
    }

    startVoiceRecognition() {
        if (!this.recognition) {
            this.showToast('Voice recognition not supported in this browser', 'error');
            return;
        }

        if (this.isListening) {
            this.stopVoiceRecognition();
            return;
        }

        try {
            this.voiceTranscript.innerHTML = '';
            this.recognition.start();
        } catch (error) {
            console.error('Voice recognition start error:', error);
            this.showToast('Failed to start voice recognition', 'error');
        }
    }

    stopVoiceRecognition() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        this.isListening = false;
        this.voiceModal.classList.add('hidden');
    }

    async clearSession() {
        if (!confirm('Are you sure you want to clear the chat history? This action cannot be undone.')) {
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiBase}/session/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: this.userId })
            });

            const data = await response.json();

            if (data.success) {
                this.chatMessages.innerHTML = '';
                this.welcomeMessage.classList.remove('hidden');
                this.showToast('Chat history cleared successfully!', 'success');
                
                // Reinitialize session to get welcome message
                setTimeout(() => this.initializeSession(), 1000);
            } else {
                throw new Error(data.error || 'Failed to clear session');
            }
        } catch (error) {
            console.error('Clear session error:', error);
            this.showToast('Failed to clear session: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        if (show) {
            this.loadingIndicator.classList.remove('hidden');
            this.sendButton.disabled = true;
        } else {
            this.loadingIndicator.classList.add('hidden');
            this.validateInput();
        }
    }

    showToast(message, type = 'error') {
        const toast = type === 'error' ? this.errorToast : this.successToast;
        const messageElement = document.getElementById(type === 'error' ? 'errorMessage' : 'successMessage');
        
        messageElement.textContent = message;
        toast.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideToast(type);
        }, 5000);
    }

    hideToast(type) {
        const toast = type === 'error' ? this.errorToast : this.successToast;
        toast.classList.add('hidden');
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.interviewCoach = new InterviewCoach();
});

// Handle page visibility changes to manage voice recognition
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.interviewCoach && window.interviewCoach.isListening) {
        window.interviewCoach.stopVoiceRecognition();
    }
});