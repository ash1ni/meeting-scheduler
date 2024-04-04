const { OpenAI } = require("openai");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();
// const { Conversation } = require("../models");

const openai = new OpenAI({ key: process.env.OPENAI_API_KEY });

let chatPrompt = "";
let jsonPrompt = "";

const loadPDFText = async () => {
  const first_prompt = path.join(__dirname, "..", "first_prompt.pdf");
  const second_prompt = path.join(__dirname, "..", "second_prompt.pdf");

  try {
      const first_prompt_buffer = await fs.readFile(first_prompt);
      const first_prompt_data = await pdfParse(first_prompt_buffer);
      chatPrompt = first_prompt_data.text;
  
      const second_prompt_buffer = await fs.readFile(second_prompt);
      const second_prompt_data = await pdfParse(second_prompt_buffer);
      jsonPrompt = second_prompt_data.text;
  } catch (error) {
      console.error("Error loading PDF text:", error);
  }
};

loadPDFText();

const chatWithUser = async (req, res) => {
  try {
    const userMessage = req.body.message;

    const messages = [
      {
        role: "system",
        content: "You are a helpful meeting scheduling assistant.",
      },
      {
        role: "assistant",
        content: chatPrompt,
      },
      {
        role: "user",
        content: userMessage,
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 150,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    res.json({ message: response.choices[0].message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const saveConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const messages = req.body.messages;
    const conversationName = req.body.conversationName;

    let conversation = await Conversation.create({
      user_id: userId,
      conversation_name: conversationName,
      messages: messages,
    });

    res.status(201).json({
      message: "Conversation saved successfully",
      conversation,
    });
  } catch (error) {
    console.error("Error saving messages:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const summarizeUserMessage = async (req, res) => {
  try {
    const chatMessages = req.body;

    const userMessagesConcatenated = chatMessages
      .filter((msg) => msg.role === "user")
      .map((msg) => msg.message)
      .join("");
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: jsonPrompt,
        },
        {
          role: "user",
          content: userMessagesConcatenated,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    const parsedContent = JSON.parse(response.choices[0].message.content);

    res.json({ summary: response.choices[0].message, parsedContent });
  } catch (error) {
    console.error("Error summarizing user messages:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { chatWithUser, saveConversation, summarizeUserMessage };
