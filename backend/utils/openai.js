const OpenAI = require("openai");
const path = require("path");
const dotenv = require("dotenv");
const { getCalendarEvents } = require("./gmailService");

const result = dotenv.config({
  path: path.resolve(__dirname, ".env"),
});

envvars = result.parsed;

const openai = new OpenAI({
  apiKey: envvars.OPENAI_API_KEY,
});

async function classifyEmail(emailContent, rules, profile) {
  const ruleKeys = Object.keys(rules);

  const ruleDescriptions = ruleKeys.map((key) => {
    const rule = rules[key];

    return `- ${key} : ${rule.action}: ${rule.prompt}`;
  });

  const prompt = `Here are some rules for handling emails:
${ruleDescriptions.join("\n")}

Here is the user's profile:

${profile == undefined ? "None" : profile.join("\n")}

Given the following email, identify the rule that strongly correlates to the email content, if any. If none of the rules apply strongly, return "Null":
"${emailContent}"

Return only the key (as a number starting from 0) of the rule that best applies or "Null" if no rule applies.`;

  console.log("Prompt:", prompt);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that helps classify emails based on rules.",
        },
        { role: "user", content: prompt },
      ],
    });

    console.log("Completion:", completion.choices[0].message.content.trim());
    // const ruleKey = parseInt(completion.choices[0].message.content.trim(), 10);
    const ruleKey = completion.choices[0].message.content.trim();
    return ruleKey;
  } catch (error) {
    console.error("Error classifying email:", error);
    return null;
  }
}

// const emailContent = "This is a newsletter about the latest tech trendsWelcome back to Week in Review. This week, we’re unpacking the latest layoffs at Mozilla, Perplexity offering to cross a picket line, and Apple warning investors that it might never top the iPhone. Let’s get into it. The Mozilla Foundation laid off 30% of its employees in the second round of layoffs for the Firefox browser maker this year. Executive director Nabiha Syed confirmed that two of the foundation’s major divisions — advocacy and global programs — are “no longer a part of our structure.” Mozilla's communications chief, Brandon Borrman, told TechCrunch that advocacy “is still a central tenet” of the company’s work but did not provide specifics. Anduril is considering building its first major manufacturing plant, a 5-million-square-foot facility known as “Arsenal-1,” in Arizona, Ohio, or Texas following its $1.5 billion round, according to someone familiar with the matter. When TechCrunch asked an Anduril spokesperson if the defense tech company was now choosing between these three locations for its factory, she responded, “That is incorrect,” but she would not specify what part exactly was incorrect.Video game giant Activision fixed a bug in its anti-cheat system that it said affected “a small number of legitimate player accounts” that were getting banned because of it. But according to the hacker who found the bug and was exploiting it, they were able to ban “thousands upon thousands” of Call of Duty players, who they framed as cheaters. The hacker spoke to TechCrunch about the exploit and told their side of the story." ;
// const emailContent = "This is a high priority email from your boss. Please respond ASAP.";

// // Example rules provided by the user
// const rules = {
//   0: {
//     action: "Label High Priority Emails",
//     prompt: "Automatically label emails marked as high priority",
//     type: [{ type: "label", config: { labelName: "High Priority" } }]
//   },
//   1: {
//     action: "Archive Newsletters",
//     prompt: "Automatically archive emails identified as newsletters",
//     type: [{ type: "archive", config: { archiveImmediately: true } }]
//   }
// };

// classifyEmail(emailContent, rules).then(ruleKey => {
//   if (ruleKey !== null && rules[ruleKey]) {
//     console.log(`The email should be handled by rule: ${ruleKey} - ${rules[ruleKey].action}`);
//   } else {
//     console.log("No suitable rule found.");
//   }
// });

async function createDraftEmail(
  emailContent,
  promptDescription,
  calendarEvents,
  accessToken
) {
  if ((!emailContent, !promptDescription)) {
    return null;
  }

  const calendarToggle = false;

  if (calendarEvents != undefined && calendarEvents != false) {
    const calenderToggle = true;
  }

  const events = await getCalendarEvents(accessToken);
  const prompt = `Here is an email for which we need to draft a response: ${emailContent}. Please complete the email draft with a suitable response based on this instruction: ${promptDescription}. The response should be concise and should address the main points of the email. ${
    calendarToggle
      ? `This is the user's events that they have on the calendar to use as context: ${events}.`
      : ""
  } It should also be of the same tone as the original email. Only respond with the body of the draft email.`;
  console.log("Promptt:", prompt);
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an assistant that helps draft emails.",
        },
        { role: "user", content: prompt },
      ],
    });
    console.log("Completion:", completion.choices[0].message.content);
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error creating draft email:", error);
    return null;
  }
}

module.exports = { createDraftEmail, classifyEmail };
