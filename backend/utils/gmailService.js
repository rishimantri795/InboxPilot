const axios = require("axios");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

// not currently using this
async function accessGmailApi(accessToken) {
  const gmailEndpoint =
    "https://gmail.googleapis.com/gmail/v1/users/me/messages";

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
    console.error(
      "Error accessing Gmail API:",
      error.response ? error.response.data : error.message
    );
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
    console.error(
      `Error fetching details for message ID ${messageId}:`,
      error.response ? error.response.data : error.message
    );
  }
}

// Function to fetch email history and return new messages
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

    // Check if there is a history object with messagesAdded
    if (response.data.history) {
      console.log("History found:", response.data.history);

      // Filters for events with messagesAdded (indicating new messages)
      const newMessages = response.data.history
        .filter((event) => event.messagesAdded)
        .map((event) => event.messagesAdded[0].message);

      console.log("New messages found:", newMessages);

      return newMessages; // Return new messages for further processing
    } else {
      console.log("No new messages or history found.");
      return []; // Return an empty array if no new messages
    }
  } catch (error) {
    console.error(
      "Error fetching email history:",
      error.response ? error.response.data : error.message
    );
    throw error; // Rethrow the error for higher-level error handling
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
    console.error(
      "Error setting up Gmail watch:",
      error.response ? error.response.data : error.message
    );
  }
}

// Helper function to apply a label to an email
async function applyLabelToEmail(accessToken, messageId, labelId) {
  const messageEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;

  try {
    await axios.post(
      messageEndpoint,
      {
        addLabelIds: [labelId], // Adds the specified label
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Label ${labelId} applied to email ${messageId}`);
  } catch (error) {
    console.error(
      `Error applying label to message ID ${messageId}:`,
      error.response ? error.response.data : error.message
    );
  }
}

async function favouriteEmail(accessToken, messageId, labelId) {
  const messageEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;

  // Not sure if it would work, but after some research, The only way to favourite an email is by labeing it as STARRED  
  // labeling an email as STARRED is how gmail knows that it is a favourited email
  try {
    await axios.post(
      messageEndpoint,
      {
        addLabelIds: ["STARRED"], // Adds the "STARRED" label
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Label ${labelId} applied to email ${messageId}`);
  } catch (error) {
    console.error(
      `Error applying label to message ID ${messageId}:`,
      error.response ? error.response.data : error.message
    );
  }
}

async function createDraftEmail(accessToken, to, subject, messageDescription) {
  const draftEndpoint = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts';

  // Construct the raw email content
  const emailContent = [
    `To: ${to}`,
    `Subject: ${subject}`,
    '',
    messageDescription,
  ].join('\n');

  // Encode the email content in base64
  const encodedMessage = Buffer.from(emailContent);

  try {
    // Send the request to create a draft
    const response = await axios.post(
      draftEndpoint,
      {
        message: {
          raw: encodedMessage,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Draft created with ID: ${response.data.id}`);
  } catch (error) {
    console.error(
      `Error creating draft email:`,
      error.response ? error.response.data : error.message
    );
  }
}


// Fetch email history and apply labels to new messages
async function fetchEmailHistoryAndApplyLabel(accessToken, historyId) {
  const gmailEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/history`;
  const params = {
    startHistoryId: historyId,
    labelId: "INBOX",
  };

  try {
    const response = await axios.get(gmailEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      params,
    });

    if (response.data.history) {
      const newMessages = response.data.history
        .filter((event) => event.messagesAdded)
        .map((event) => event.messagesAdded[0].message);

      console.log("New messages found:", newMessages);

      // Apply a label to each new message
      for (const message of newMessages) {
        await applyLabelToEmail(accessToken, message.id, "IMPORTANT"); // Use actual label ID
      }
    } else {
      console.log("No new messages or history found.");
    }
  } catch (error) {
    console.error(
      "Error fetching email history:",
      error.response ? error.response.data : error.message
    );
  }
}

async function fetchEmailHistoryWithRetry(
  accessToken,
  historyId,
  retries = 3,
  delay = 1000
) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const userMessages = await fetchEmailHistory(accessToken, historyId);
      if (userMessages.length > 0) {
        return userMessages; // If new messages are found, return them immediately
      }
      console.log("No new messages found, retrying...");
      await new Promise((resolve) => setTimeout(resolve, delay)); // Pause before retrying
    } catch (error) {
      console.error("Error fetching email history:", error.message);
    }
  }
  return []; // Return an empty array if no new messages are found after retries
}

// Helper function to get or create a label
async function getOrCreatePriorityLabel(accessToken) {
  const listLabelsEndpoint =
    "https://gmail.googleapis.com/gmail/v1/users/me/labels";
  const createLabelEndpoint =
    "https://gmail.googleapis.com/gmail/v1/users/me/labels";

  try {
    // Check if the label already exists
    const listResponse = await axios.get(listLabelsEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const existingLabel = listResponse.data.labels.find(
      (label) => label.name === "Priority"
    );
    if (existingLabel) {
      console.log(`Label "Priority" exists with ID: ${existingLabel.id}`);
      return existingLabel.id;
    }

    // Create the "Priority" label if it doesn't exist
    const createResponse = await axios.post(
      createLabelEndpoint,
      {
        name: "Priority",
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Created label "Priority" with ID: ${createResponse.data.id}`);
    return createResponse.data.id;
  } catch (error) {
    console.error(
      "Error creating or retrieving label:",
      error.response ? error.response.data : error.message
    );
  }
}

async function archiveEmail(accessToken, messageId) {
  const archiveEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;

  try {
    await axios.post(
      archiveEndpoint,
      {
        removeLabelIds: ["INBOX"],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Email ${messageId} archived successfully.`);
  } catch (error) {
    console.error(
      `Error archiving email ID ${messageId}:`,
      error.response ? error.response.data : error.message
    );
  }
}

async function forwardEmail(accessToken, messageId, forwardToEmail) {
  const emailContentEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
  const sendEmailEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;

  try {
    const response = await axios.get(emailContentEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      params: { format: "full" },
    });

    const originalMessageId = response.data.payload.headers.find(
      (header) => header.name === "Message-ID"
    )?.value;

    const subject = response.data.payload.headers.find(
      (header) => header.name === "Subject"
    )?.value;

    const emailContent = [
      `To: ${forwardToEmail}`,
      `Subject: Fwd: ${subject}`,
      `In-Reply-To: ${originalMessageId}`,
      `References: ${originalMessageId}`,
      "",
      Buffer.from(response.data.raw, "base64").toString("utf-8"),
    ].join("\n");

    const encodedMessage = Buffer.from(emailContent).toString("base64");

    await axios.post(
      sendEmailEndpoint,
      {
        raw: encodedMessage,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Email ${messageId} forwarded to ${forwardToEmail} successfully.`);
  } catch (error) {
    console.error(
      `Error forwarding email ID ${messageId}:`,
      error.response ? error.response.data : error.message
    );
  }
}

async function createForwardingAddress(accessToken, forwardingEmail) {
  const forwardingAddressEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/settings/forwardingAddresses`;
  
  try {
    const response = await axios.post(
      forwardingAddressEndpoint,
      { forwardingEmail },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`Forwarding address ${forwardingEmail} created. Check your inbox to verify it if necessary.`);
  } catch (error) {
    console.error(
      `Error creating forwarding address:`,
      error.response ? error.response.data : error.message
    );
    return;
  }
}

async function checkForwardingVerification(accessToken, forwardingEmail) {
  const listEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/settings/forwardingAddresses`;
  
  const response = await axios.get(listEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const forwardingAddresses = response.data.forwardingAddresses || [];
  return forwardingAddresses.some(
    (address) => address.forwardingEmail === forwardingEmail && address.verificationStatus === 'accepted'
  );
}

async function createFilter(accessToken, forwardingEmail, criteria) {
  const filterEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/settings/filters`;

  try {
    const response = await axios.post(
      filterEndpoint,
      {
        criteria,
        action: { forward: forwardingEmail },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`Filter created successfully for forwarding to ${forwardingEmail}.`);
  } catch (error) {
    console.error(
      `Error creating filter for forwarding:`,
      error.response ? error.response.data : error.message
    );
  }
}

module.exports = {
  accessGmailApi,
  getMessageDetails,
  fetchEmailHistory,
  watchGmailInbox,
  applyLabelToEmail,
  fetchEmailHistoryAndApplyLabel,
  getOrCreatePriorityLabel,
  fetchEmailHistoryWithRetry,
  archiveEmail,
  forwardEmail,
};
