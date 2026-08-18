import express from 'express';
import Groq from 'groq-sdk';
import Chat from '../models/Chat.js';
import authenticateJWT from '../middleware/authenticateJWT.js';

const chatRouter = express.Router();

// Created lazily (not at module load) since env vars from .env aren't
// guaranteed to be loaded yet when this module is imported - ES module
// imports are evaluated before the importing file's own top-level code
// (including its dotenv.config() call) runs.
let groq;
function getGroqClient() {
    if (!groq) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return groq;
}

/**
 * POST /api/chat/completion - proxy a chat completion through Groq
 * server-side, so the Groq API key never has to reach the browser.
 */
chatRouter.post('/completion', authenticateJWT, async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: "messages array is required" });
        }

        const completion = await getGroqClient().chat.completions.create({
            messages,
            model: "openai/gpt-oss-20b",
        });

        res.json(completion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error generating chat completion", error: error.message });
    }
});

/**
 * GET /api/chat return the authenticated user's chats
 */
chatRouter.get('/', authenticateJWT, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user.userId }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

/**
 * GET /api/chat/:id return chat by id, if owned by the authenticated user
 */
chatRouter.get('/:id', authenticateJWT, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).send('Chat not found');
        }

        if (!chat.userId || chat.userId.toString() !== req.user.userId) {
            return res.status(403).send('Forbidden');
        }

        res.json(chat);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

/**
 * POST /api/chat create a new chat, owned by the authenticated user
 */
chatRouter.post('/', authenticateJWT, async (req, res) => {
    // {
    //     "title": "Chat 1",
    //     "messages": [

    //     ]
    // }
    try {
        const newChat = new Chat({ ...req.body, userId: req.user.userId });
        await newChat.save();
        res.status(201).json(newChat);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

/**
 * DELETE /api/chat/:id delete chat by id, if owned by the authenticated user
 */
chatRouter.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).send('Chat not found');
        }

        if (!chat.userId || chat.userId.toString() !== req.user.userId) {
            return res.status(403).send('Forbidden');
        }

        await Chat.findByIdAndDelete(req.params.id);
        res.send("Chat deleted successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);

    }
});

/**
 * PATCH /api/chat/:id update chat by id, if owned by the authenticated user
 */
chatRouter.patch('/:id', authenticateJWT, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).send('Chat not found');
        }

        if (!chat.userId || chat.userId.toString() !== req.user.userId) {
            return res.status(403).send('Forbidden');
        }

        // update title of the chat
        if(req.body.title){
            chat.title = req.body.title;
        }

        // update messages of the chat
        if(req.body.messages){
            chat.messages.push(...req.body.messages);
        }

        await chat.save(); // save updated chat
        res.json(chat); // return updated chat
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
    });

    export default chatRouter;
