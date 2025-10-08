const { fetch } = globalThis;

if (!fetch) {
    console.log('Fetch not available');
    process.exit(1);
}

async function testAPI() {
    const API_BASE = 'http://127.0.0.1:8787/api';
    const userId = 'test_user_' + Date.now();
    
    console.log('Testing AI Interview Coach API...');
    console.log('API Base:', API_BASE);
    console.log('Test User ID:', userId);
    
    try {
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });
        
        console.log('Health response status:', healthResponse.status);
        console.log('Health response headers:', Object.fromEntries(healthResponse.headers.entries()));
        
        if (!healthResponse.ok) {
            const errorText = await healthResponse.text();
            throw new Error(`Health check failed: ${healthResponse.status} - ${errorText}`);
        }
        
        const healthData = await healthResponse.json();
        console.log('✅ Health check passed:', healthData);
        
        // Test session initialization
        console.log('\n2. Testing session initialization...');
        const initResponse = await fetch(`${API_BASE}/session/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ userId: userId })
        });
        
        console.log('Init response status:', initResponse.status);
        
        if (!initResponse.ok) {
            const errorText = await initResponse.text();
            throw new Error(`Session init failed: ${initResponse.status} - ${errorText}`);
        }
        
        const initData = await initResponse.json();
        console.log('Session init response:', initData);
        
        if (initData.success) {
            console.log('Session initialized successfully!');
            console.log('Welcome message:', initData.session.messages[0]?.content?.substring(0, 100) + '...');
        } else {
            console.log('Session initialization failed:', initData.error);
            return;
        }
        
        // Test sending a message
        console.log('\n3. Testing chat message...');
        const chatResponse = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ 
                userId: userId,
                message: 'Hello, I want to practice for a software engineer position'
            })
        });
        
        console.log('Chat response status:', chatResponse.status);
        
        if (!chatResponse.ok) {
            const errorText = await chatResponse.text();
            throw new Error(`Chat failed: ${chatResponse.status} - ${errorText}`);
        }
        
        const chatData = await chatResponse.json();
        console.log('Chat response:', chatData);
        
        if (chatData.success) {
            console.log('Chat message sent successfully!');
            console.log('AI Response:', chatData.message.content?.substring(0, 200) + '...');
        } else {
            console.log('Chat message failed:', chatData.error);
        }
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
        process.exit(1);
    }
}

// Run the test
testAPI();