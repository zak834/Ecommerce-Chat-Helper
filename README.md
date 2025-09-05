# Ecommerce Chat Helper

## Overview

**Ecommerce Chat Helper** is an AI-powered chatbot agent designed for furniture store e-commerce platforms. It leverages Google Gemini (Generative AI) models and MongoDB Atlas to provide intelligent, context-aware responses to customer queries about furniture inventory. The agent can search the product database using semantic vector search and fallback text search, ensuring customers receive relevant information even if the database is sparse or the AI model encounters errors.

### Key Features

- **AI Chatbot:** Uses Google Gemini (via LangChain) for natural language understanding and generation.
- **Inventory Search:** Integrates semantic vector search (Google Generative AI Embeddings + MongoDB Atlas Vector Search) and fallback text search for robust item lookup.
- **Custom Tools:** Implements a custom `item_lookup` tool for querying the inventory.
- **Stateful Conversations:** Persists chat state and history using MongoDB for multi-turn conversations.
- **Error Handling:** Gracefully manages API rate limits, authentication issues, and empty database scenarios.
- **Extensible Workflow:** Built with LangChain's StateGraph for flexible agent orchestration.

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Avaneeshakrishna/Ecommerce-Chat-Helper.git
cd Ecommerce-Chat-Helper/server
```

### 2. Install Dependencies

Make sure you have [Node.js](https://nodejs.org/) (v18+) and [npm](https://www.npmjs.com/) installed.

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the `server` directory with the following content:

```env
MONGODB_ATLAS_URI=your_mongodb_atlas_connection_string
GOOGLE_API_KEY=your_google_generative_ai_api_key
```

- **MONGODB_ATLAS_URI:** Get this from your MongoDB Atlas dashboard.
- **GOOGLE_API_KEY:** Obtain from Google Cloud Console after enabling the Generative Language API.

### 4. Seed the Database

Generate synthetic furniture data and populate your MongoDB collection:

```bash
npm run seed
```

This will connect to MongoDB, create the `items` collection, and insert sample data using the Gemini model. If the API fails, fallback static data will be used.

### 5. Start the Server

```bash
npm start
```

The server will start (default: `http://localhost:8000`) and expose a `/chat` endpoint for chatbot interactions.

---

## Usage

### Chat Endpoint

Send a POST request to `/chat` with your message:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"message": "Do you have any dining tables?"}' http://localhost:8000/chat
```

The chatbot will respond with relevant inventory details or a helpful fallback message.

---

## Project Structure

```
ecommerce-chat-helper/
├── server/
│   ├── agent.ts             # Main AI agent logic
│   ├── seed-database.ts     # Database seeding script
│   ├── index.ts             # Express server entry point
│   ├── .env                 # Environment variables
│   └── ...                  # Other source files
├── package.json
└── README.md
```

---

## Troubleshooting

- **API Errors:** Ensure the Generative Language API is enabled in your Google Cloud project.
- **MongoDB Connection:** Verify your Atlas URI and network access settings.
- **TypeScript Errors:** Make sure all dependencies are installed and your environment variables are set.

---

## Contributing

Feel free to fork the repository and submit pull requests for improvements or bug fixes.

---

## License

This project is licensed under the MIT License.

---

## Contact

For questions or support, open an issue on GitHub or contact [Avaneeshakrishna](https://github.com/Avaneeshakrishna).
