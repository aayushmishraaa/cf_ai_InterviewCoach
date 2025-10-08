import { InterviewSession } from './durableObject.js';

export { InterviewSession };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname.startsWith('/api/')) {
        const response = await handleApiRequest(request, env, url);
        const responseBody = await response.text();
        return new Response(responseBody, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            ...corsHeaders
          }
        });
      }

      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(`
          <html>
            <head>
              <title>AI Interview Coach</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              <h1>AI Interview Coach API</h1>
              <p>Backend API for the interview coaching platform.</p>
              <h2>Endpoints:</h2>
              <ul>
                <li><a href="/api/health">GET /api/health</a></li>
                <li>POST /api/chat</li>
                <li>POST /api/session/init</li>
                <li>GET /api/session/history</li>
                <li>POST /api/session/clear</li>
              </ul>
            </body>
          </html>
        `, {
          headers: { 
            'Content-Type': 'text/html',
            ...corsHeaders 
          }
        });
      }

      return new Response('Not found', { status: 404 });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });
    }
  }
};

async function handleApiRequest(request, env, url) {
  const path = url.pathname.replace('/api', '');

  switch (path) {
    case '/chat':
      return handleChatRequest(request, env);
    case '/session/init':
      return handleSessionInit(request, env);
    case '/session/history':
      return handleSessionHistory(request, env);
    case '/session/clear':
      return handleSessionClear(request, env);
    case '/health':
      return handleHealthCheck(request, env);
    default:
      return new Response(JSON.stringify({
        success: false,
        error: 'API endpoint not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

async function handleChatRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const requestBody = await request.json();
    const { message, userId } = requestBody;

    if (!message || !userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message and userId are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const durableObjectId = env.INTERVIEW_SESSIONS.idFromName(userId);
    const durableObject = env.INTERVIEW_SESSIONS.get(durableObjectId);

    const sessionRequest = new Request(`http://localhost/session/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    return await durableObject.fetch(sessionRequest);

  } catch (error) {
    console.error('Chat request error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process chat request'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleSessionInit(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const requestBody = await request.json();
    const { userId } = requestBody;

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'userId is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const durableObjectId = env.INTERVIEW_SESSIONS.idFromName(userId);
    const durableObject = env.INTERVIEW_SESSIONS.get(durableObjectId);

    const sessionRequest = new Request(`http://localhost/session/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    return await durableObject.fetch(sessionRequest);

  } catch (error) {
    console.error('Session init error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to initialize session'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleSessionHistory(request, env) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'userId parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const durableObjectId = env.INTERVIEW_SESSIONS.idFromName(userId);
    const durableObject = env.INTERVIEW_SESSIONS.get(durableObjectId);

    const sessionRequest = new Request(`http://localhost/session/history`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    return await durableObject.fetch(sessionRequest);

  } catch (error) {
    console.error('Session history error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get session history'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleSessionClear(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const requestBody = await request.json();
    const { userId } = requestBody;

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'userId is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const durableObjectId = env.INTERVIEW_SESSIONS.idFromName(userId);
    const durableObject = env.INTERVIEW_SESSIONS.get(durableObjectId);

    const sessionRequest = new Request(`http://localhost/session/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    return await durableObject.fetch(sessionRequest);

  } catch (error) {
    console.error('Session clear error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to clear session'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleHealthCheck(request, env) {
  return new Response(JSON.stringify({
    success: true,
    message: 'AI Interview Coach API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}