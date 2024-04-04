const { OpenAI } = require("openai");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();
const Conversation = require("../models/Conversation");
const MeetingDetail = require("../models/MeetingDetail");
const { Sequelize } = require("sequelize");
const sequelize = new Sequelize(
  "postgresql://postgres:root123@3.109.59.175:5432/meetingDB"
);

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
    // Directly use req.body if it's the array you're sending
    const messages = req.body;

    // Ensure messages is not null or undefined and is an array
    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({
          message: "Messages data is missing or not in expected format",
        });
    }

    // Since your data structure is already in the desired format, you can directly serialize the entire array
    const serializedMessages = JSON.stringify(messages);

    const conversation = await Conversation.create({
      messages: serializedMessages,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Conversation saved successfully",
      conversation: conversation.toJSON(), // Ensure the response includes the saved data
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
    const bearerToken = process.env.BEARER_TOKEN
    const apiResponse = await fetch("https://govintranetnew.nic.in/meityapissecurity/calendar/ai_get_meeting_details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(parsedContent),
    });

    // Ensure response is ok
    if (!apiResponse.ok) {
      throw new Error(`HTTP error! Status: ${apiResponse.status}`);
    }

    // Parse the response JSON
    const responseData = await apiResponse.json();

    // Handle the response from the API as needed
    const scheduleData = responseData.data;
    console.log(scheduleData);
  } catch (error) {
    console.error("Error summarizing user messages:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const saveMeetingDetails = async (req, res) => {
  try {
    const { email, title, description, venue, mode, baRule, category, chairperson } = req.body;

    // Validate required fields
    if (!email || !venue || !mode || !baRule || !category || !chairperson) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const meetingDetails = await MeetingDetail.create({
      email,
      title,
      description,
      venue,
      mode,
      baRule,
      category,
      chairperson,
    });

    res.status(201).json({
      message: "Meeting details saved successfully",
      meetingDetails,
    });
  } catch (error) {
    console.error("Error saving meeting details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  chatWithUser,
  saveConversation,
  summarizeUserMessage,
  saveMeetingDetails,
};
