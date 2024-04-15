const { OpenAI } = require("openai");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();
const Conversation = require("../models/Conversation");
const MeetingDetail = require("../models/MeetingDetail");
const { Sequelize } = require("sequelize");
const { log } = require("util");
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
      return res.status(400).json({
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
    console.log(response.choices[0].message);
    const parsedContent = JSON.parse(response.choices[0].message.content);
    console.log(parsedContent);

    

    // Getting details for meeting from remote API
    const bearerToken = process.env.BEARER_TOKEN;
    const apiPayload = {
      email: parsedContent.Internal_participant,
      venue: parsedContent.venue,
      mode: parsedContent.mode,
      baRule: parsedContent.baRule,
      category: parsedContent.category,
      chairperson: parsedContent.chairperson,
    };
    console.log("API payload: ",apiPayload);
    const apiResponse = await fetch(
      "https://govintranetnew.nic.in/meityapissecurity/calendar/ai_get_meeting_details",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(apiPayload),
      }
    );

    // Ensure response is ok
    if (!apiResponse.ok) {
      throw new Error(`HTTP error! Status: ${apiResponse.status}`);
    }

    // Parse the response JSON
    const responseData = await apiResponse.json();

    // Handle the response from the API as needed
    const scheduleData = responseData.data;
    console.log(scheduleData);
    // console.log(scheduleData.chairperson[0].id);
    const emails = scheduleData.email;
    let emailPayload = [];
    // Loop through each object in the array
    emails.forEach((email) => {
      // Construct payload object for each email
      const payloadObj = {
        member_id: email.memberid,
        role_id: email.roleId,
        ministry_id: email.ministryId,
        department_id: email.departmentId,
      };

      // Push payload object to the array
      emailPayload.push(payloadObj);
    });
    console.log("Email Payloads ", emailPayload);

    // ---------------------Scheduling Meeting on BharatVC Logic--------------------------
    const meetingPayload = {
      meetingStartDate: parsedContent.start_date,
      meetingEndDate: parsedContent.end_date,
      startTime: parsedContent.start_time,
      endTime: parsedContent.end_time,
      subject: parsedContent.baRule,
      guest: null,
      record:false
    };
    console.log(meetingPayload);
    const meetingResponse = await fetch(
      "https://govintranetnew.nic.in/meityapissecurity/calendar/BharatVC_auto_link_generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(meetingPayload),
      }
    );

    // Ensure response is ok
    if (!meetingResponse.ok) {
      throw new Error(`HTTP error! Status: ${meetingResponse.status}`);
    }

    // Parse the response JSON
    const meetingData = await meetingResponse.json();
    console.log(meetingData);

    const bharatvcResponse = meetingData.data;
    console.log(bharatvcResponse);

    // ----Scheduling Meeting API call-----------

const schedulePayload = {
  natureOfEng:2,
  frequencyId:1,
  category_id: scheduleData.category[0].id,
  baRule: scheduleData.baRule[0].id,
  subject: parsedContent.baRule,
  meetingStartDate: parsedContent.start_date,
  meetingEndDate: parsedContent.end_date,
  for_parent:false,
  startTime: parsedContent.start_time,
  endTime: parsedContent.end_time,
  venueId: null,
  modeOfEng: 1,
  meetingURL: bharatvcResponse.meetingURL,
  password: '',
  goalId: null,
  subGoalId:null,
  taskId:null,
  isAllDay:false,
  venue_text:null,
  agenda: [],
  isRecurringMeeting:false,
  intParticipant: emailPayload,
  extParticipant:[],
  bharatvc_record_video:true,
};
console.log(schedulePayload);

const formData = new FormData();

// Append each key-value pair from the schedulePayload to the formData
for (const key in schedulePayload) {
  if (schedulePayload.hasOwnProperty(key)) {
    formData.append(key, schedulePayload[key]);
  }
}
console.log(formData);

const scheduleMeeting = await fetch("https://govintranetnew.nic.in/meityapissecurity/calendar/create_meeting2", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${bearerToken}`,
  },
  body: JSON.stringify(schedulePayload),
});

const scheduleMeetingData = await scheduleMeeting.json();

console.log("Scheduled meeting data : ", scheduleMeetingData);

// Ensure response is ok
if (!scheduleMeeting.ok) {
  throw new Error(`HTTP error! Status: ${scheduleMeeting.status}`);
}

const scheduleMeetingResponse = scheduleMeetingData.data;
console.log(scheduleMeetingResponse);

const summary = response.choices[0].message
// return summary;
res.json({ summary: response.choices[0].message });
  } catch (error) {
    console.error("Error summarizing user messages:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const saveMeetingDetails = async (req, res) => {
  try {
    const {
      email,
      title,
      description,
      venue,
      mode,
      baRule,
      category,
      chairperson,
      start_date,
      end_date,
      start_time,
      end_time,
    } = req.body;

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
      start_date,
      end_date,
      start_time,
      end_time,
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