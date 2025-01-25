import axios from "axios";

interface Rule {
  id: string;
  name: string;
  description: string;
  action: string;
}

export const addRule = async (
  userId: string,
  action: string,
  prompt: string,
  type: string
): Promise<Rule> => {
  const response = await axios.post(
    `http://localhost:3010/api/users/${userId}`,
    { action, prompt, type },
    { withCredentials: true }
  );
  const updatedUser = response.data.user;
  const ruleIndices = Object.keys(updatedUser.Rules).map(Number);
  const newRuleIndex = Math.max(...ruleIndices);
  const newRuleData = updatedUser.Rules[newRuleIndex];
  return {
    id: newRuleIndex.toString(),
    name: newRuleData.action,
    description: newRuleData.prompt,
    action: newRuleData.type,
  };
};

export const deleteRule = async (
  userId: string,
  ruleIndex: string
): Promise<void> => {
  await axios.delete(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${userId}/rules/${ruleIndex}`,
    { withCredentials: true }
  );
};
