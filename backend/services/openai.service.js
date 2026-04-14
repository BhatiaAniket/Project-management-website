const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a performance summary based on metrics
 */
exports.generatePerformanceSummary = async (metrics) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return "AI Summary unavailable: Missing API Key.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a senior project management consultant. Generate a concise, 2-3 sentence performance summary for an employee based on the provided metrics."
        },
        {
          role: "user",
          content: JSON.stringify(metrics)
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Error:', error);
    return "Error generating AI summary.";
  }
};
