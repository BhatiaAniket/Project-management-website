const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a performance summary based on metrics (legacy helper)
 */
exports.generatePerformanceSummary = async (metrics) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return 'AI Summary unavailable: Missing API Key.';
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a senior project management consultant. Generate a concise, 2-3 sentence performance summary for an employee based on the provided metrics.',
        },
        {
          role: 'user',
          content: JSON.stringify(metrics),
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Error:', error);
    return 'Error generating AI summary.';
  }
};

/**
 * Generate a detailed AI performance report for an EMPLOYEE
 */
exports.generateEmployeeAIReport = async ({ name, position, score, breakdown }) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return 'AI Report unavailable: Missing API Key. Please configure OPENAI_API_KEY in your environment.';
    }

    const prompt = `Generate a professional performance report for an employee.

Employee: ${name}
Position: ${position || 'Not specified'}

Performance Data:
- Overall Score: ${score}/1000
- Total Tasks: ${breakdown.total}
- Completed On Time: ${breakdown.completedOnTime}
- Completed Late: ${breakdown.completedLate}
- Currently Overdue: ${breakdown.overdue}
- In Progress: ${breakdown.inProgress}
- Average Manager Rating: ${breakdown.managerRatingAvg}/5

Write a 4-5 sentence professional performance summary that:
1. Highlights strengths based on the data
2. Identifies areas needing improvement
3. Gives specific actionable recommendations
4. Ends with an encouraging motivational note

Keep tone professional but supportive. Do not use bullet points. Write in paragraph form.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Employee Report Error:', error);
    return 'Error generating AI report. Please try again later.';
  }
};

/**
 * Generate a detailed AI performance report for a MANAGER
 */
exports.generateManagerAIReport = async ({ name, score, breakdown }) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return 'AI Report unavailable: Missing API Key. Please configure OPENAI_API_KEY in your environment.';
    }

    const prompt = `Generate a professional performance report for a manager.

Manager: ${name}

Performance Data:
- Overall Score: ${score}/1000
- Team Score (out of 500): ${breakdown.teamScore}
- Process Quality (out of 300): ${breakdown.processScore}
- Own Tasks Score (out of 200): ${breakdown.ownScore}
- Team Completion Rate: ${breakdown.teamCompletionRate}%
- Team Overdue Rate: ${breakdown.teamOverdueRate}%
- Unassigned Tasks: ${breakdown.unassignedTasks}
- Reassigned Tasks: ${breakdown.reassignedTasks}

Write a 4-5 sentence analysis focusing on:
1. Team management effectiveness
2. Planning and delegation quality
3. Process improvement areas
4. Leadership recommendations

Keep tone professional and constructive. Do not use bullet points. Write in paragraph form.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Manager Report Error:', error);
    return 'Error generating AI report. Please try again later.';
  }
};
