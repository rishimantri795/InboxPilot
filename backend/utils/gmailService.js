const axios = require("axios");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

// not currently using this
async function accessGmailApi(accessToken) {
  const gmailEndpoint = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

  try {
    const response = await axios.get(gmailEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`, // use the access token here, tells gmail api we're using oAuth
        Accept: "application/json", // give response in json
      },
      params: { maxResults: 10 }, // only output max 10 messages
      httpsAgent: agent,
    });

    // extract all the message.id from response.data.message (array of messages)
    const messageIds = response.data.messages.map((message) => message.id);
    console.log("Gmail Messages:", messageIds);

    // fetch full details for each message
    for (const messageId of messageIds) {
      await getMessageDetails(messageId, accessToken);
    }
  } catch (error) {
    console.error("Error accessing Gmail API:", error.response ? error.response.data : error.message);
  }
}

async function getMessageDetails(accessToken, messageId) {
  const messageEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;

  try {
    const response = await axios.get(messageEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`, // use the access token here, tells Gmail API we're using OAuth
        Accept: "application/json", // give response in json
      },
      httpsAgent: agent,
    });

    console.log("Message Details:", response.data); // Output the message content
  } catch (error) {
    console.error(`Error fetching details for message ID ${messageId}:`, error.response ? error.response.data : error.message);
  }
}

async function fetchEmailHistory(accessToken, historyId) {
  const gmailEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/history`;
  const params = {
    startHistoryId: historyId,
    labelId: "INBOX", // Only fetch inbox emails
  };

  try {
    const response = await axios.get(gmailEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      params,
    });

    // Log the Gmail API response to inspect its structure
    console.log("Gmail API Response:", response.data);

    // Log the startHistoryId to check which history we're querying from
    console.log("startHistoryId:", historyId);

    // Check if there is a history object with messagesAdded
    if (response.data.history) {
      console.log("History found:", response.data.history);
      // filters for events with messagesAdded (indicating new messages) and maps them to retrieve each message object
      const newMessages = response.data.history.filter((event) => event.messagesAdded).map((event) => event.messagesAdded[0].message);

      console.log("New messages found:", newMessages);

      if (newMessages.length === 0) {
        console.log("No new messages were found.");
      } else {
        // Fetch full details for each new message
        for (const message of newMessages) {
          await getMessageDetails(accessToken, message.id);
        }
      }
    } else {
      console.log("No new messages or history found.");
    }
  } catch (error) {
    console.error("Error fetching email history:", error.response ? error.response.data : error.message);
  }
}

// this runs whenever the user is logged
// links user to pub/sub
async function watchGmailInbox(accessToken) {
  const gmailEndpoint = "https://gmail.googleapis.com/gmail/v1/users/me/watch";
  const requestBody = {
    labelIds: ["INBOX"], // only monitor the inbox
    topicName: "projects/inboxpilot-c4098/topics/gmail-watch",
  };

  try {
    const response = await axios.post(gmailEndpoint, requestBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    console.log("Watch response:", response.data);
  } catch (error) {
    console.error("Error setting up Gmail watch:", error.response ? error.response.data : error.message);
  }
}

module.exports = { accessGmailApi, getMessageDetails, fetchEmailHistory, watchGmailInbox };