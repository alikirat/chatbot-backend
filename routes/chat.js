import express from 'express';
import Chat from '../models/Chat.js';


/**
 * GET /api/chat return all chats
 */
const chatRouter = express.Router();

chatRouter.get('/', async (req, res) => {
    try {
        const chats = await Chat.find();
        res.json(chats);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

/**
 * Get /api/chat/:id return chat by id
 */
chatRouter.get('/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).send('Chat not found');
        }

        res.json(chat);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

/**
 * POST /api/chat create a new chat
 */
chatRouter.post('/', async (req, res) => {
    // {
    //     "title": "Chat 1",
    //     "messages": [
            
    //     ]
    // }
    try {
        const newChat = new Chat(req.body);
        await newChat.save();
        res.status(201).json(newChat);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

/**
 * DELETE /api/chat/:id delete chat by id
 */

chatRouter.delete('/:id', async (req, res) => {
    try {
        const deletedChat = await Chat.findByIdAndDelete(req.params.id);
        
        if (!deletedChat) {
            return res.status(404).send('Chat not found');
        }

        res.send("Chat deleted successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
        
    }
});

/**
 * PATCH /api/chat/:id update chat by id
 */
chatRouter.patch('/:id', async (req, res) => {
    try {
        const chat = await Chat.findByIdAndUpdate(req.params.id);
        if (!chat) {
            return res.status(404).send('Chat not found');
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