P1-To generate a basic skeleton of the project to begin with


You are an expert Cloudflare developer and full-stack engineer. 
Build a complete AI-powered web application called **AI Interview Coach** using Cloudflare’s platform. 
The app should be a chat-based web app where users can practice technical or behavioral interview questions with an AI agent that provides feedback, remembers past sessions, and adapts to the user’s skill level.

Tech Requirements:
1. Use **Llama 3.3** model via **Workers AI** for natural language generation.
   - Model name: "@cf/meta/llama-3.3-8b-instruct"
   - It should simulate an interview coach, ask follow-up questions, and give constructive feedback.
2. Use **Cloudflare Durable Objects** for maintaining user session state (chat memory per user).
   - Each user session should store their chat history.
   - Store the state in memory and optionally back up to Cloudflare KV.
3. Use **Cloudflare Pages** for frontend UI (HTML + JS + CSS).
   - Create a modern, minimal chat interface.
   - Include a text input and “Send” button.
   - Render the full chat (user + AI messages).
4. Use **Cloudflare Realtime API** or simple fetch polling to stream responses from the AI in near-real-time.
5. Include **voice input** (optional but preferred) using the browser’s SpeechRecognition API for converting voice to text.
6. Create a **main Worker API endpoint (/api/chat)** that:
   - Accepts user input from the frontend.
   - Looks up or creates a Durable Object session.
   - Passes the conversation context + new message to the LLM.
   - Returns the AI’s reply to the frontend.
7. Include a clean **wrangler.toml** config with all bindings (Durable Object, KV, AI, Pages, etc.).

Folder Structure:
/project-root
├─ /functions
│ ├─ index.js # Cloudflare Worker API logic
│ ├─ durableObject.js # Session handling and memory
│ └─ workflow.js # (Optional) If using Cloudflare Workflows
├─ /public
│ ├─ index.html # Frontend UI
│ ├─ chat.js # JS logic for sending/receiving messages
│ └─ style.css # Basic styling
├─ wrangler.toml
├─ package.json
└─ README.md


Copy code

Conversation Logic:
- The AI should act like an interview coach: ask one question at a time, listen to user’s answer, and give specific feedback.
- Maintain context so it knows what was discussed earlier in the interview.
- Example system prompt:
You are an expert software engineering interview coach.
Conduct a mock interview with the user.
Ask thoughtful questions on algorithms, data structures, or behavioral topics.
Provide encouraging yet critical feedback.
Keep track of the user’s past answers and adapt future questions based on weaknesses.


Copy code
- Save this prompt as part of the Durable Object session initialization.

Deployment:
- Use Wrangler CLI (`wrangler dev`, `wrangler deploy`) for testing and deployment.
- Ensure the project runs entirely on Cloudflare (no external APIs).

Deliverables:
- Fully functional AI Interview Coach app.
- Proper error handling and comments in code.
- README explaining architecture, setup, and Cloudflare component usage.

Generate all necessary files and code.