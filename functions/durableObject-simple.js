export class InterviewSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      
      switch (url.pathname) {
        case "/session/init":
          return await this.handleInit(request);
        case "/session/message":
          return await this.handleMessage(request);
        case "/session/history":
          return await this.handleHistory(request);
        case "/session/clear":
          return await this.handleClear(request);
        default:
          return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      console.error('Durable Object error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Durable Object error: ' + error.message
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  async handleInit(request) {
    try {
      const { userId } = await request.json();
      
      let sessionData = await this.state.storage.get("sessionData");
      
      if (!sessionData) {
        sessionData = {
          userId: userId,
          messages: [{
            role: "assistant",
            content: "Hello! I'm your AI Interview Coach. I'm here to help you practice technical and behavioral interview questions. What type of role are you preparing for?",
            timestamp: new Date().toISOString(),
            messageId: Date.now().toString()
          }],
          userProfile: {
            skillLevel: "intermediate",
            focusAreas: [],
            weaknesses: [],
            strengths: []
          },
          sessionStarted: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
      }

      sessionData.userId = userId;
      sessionData.lastActivity = new Date().toISOString();
      
      await this.state.storage.put("sessionData", sessionData);

      return new Response(JSON.stringify({
        success: true,
        session: sessionData
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error('Init error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Init failed: ' + error.message
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  async handleMessage(request) {
    try {
      const { message, userId } = await request.json();
      
      let sessionData = await this.state.storage.get("sessionData");
      
      if (!sessionData) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Session not found'
        }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const userMessage = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
        messageId: Date.now().toString()
      };
      sessionData.messages.push(userMessage);

      const aiResponse = await this.generateAIResponse(sessionData.messages);
      
      const aiMessage = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
        messageId: (Date.now() + 1).toString()
      };
      sessionData.messages.push(aiMessage);

      sessionData.lastActivity = new Date().toISOString();
      
      await this.state.storage.put("sessionData", sessionData);

      return new Response(JSON.stringify({
        success: true,
        message: aiMessage,
        sessionData: sessionData
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error('Message error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Message failed: ' + error.message
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  async handleHistory(request) {
    try {
      const sessionData = await this.state.storage.get("sessionData");
      
      return new Response(JSON.stringify({
        success: true,
        messages: sessionData?.messages || [],
        userProfile: sessionData?.userProfile || {}
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error('History error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'History failed: ' + error.message
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  async handleClear(request) {
    try {
      const { userId } = await request.json();
      
      // Clear storage
      await this.state.storage.delete("sessionData");

      return new Response(JSON.stringify({
        success: true,
        message: "Session cleared successfully"
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error('Clear error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Clear failed: ' + error.message
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  async generateAIResponse(messages) {
    try {
      const systemPrompt = `You are an expert software engineering interview coach. Your role is to:
1. Conduct mock interviews with users
2. Ask thoughtful questions on algorithms, data structures, system design, or behavioral topics
3. Provide encouraging yet constructive feedback
4. Adapt questions based on the user's responses
5. Keep responses concise but helpful

Current session context: The user is practicing for technical interviews.`;

      const aiMessages = [
        { role: "system", content: systemPrompt },
        ...messages.slice(-5) // Keep last 5 messages for context
      ];

      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct-awq", {
        messages: aiMessages,
        max_tokens: 400,
        temperature: 0.7,
        top_p: 0.9,
      });

      return response.response || "I'm having trouble generating a response right now. Could you please try again?";
      
    } catch (error) {
      console.error("AI API Error:", error);
      return "I'm experiencing some technical difficulties. Let me try to help you in a different way. Could you tell me more about what you'd like to practice?";
    }
  }
}