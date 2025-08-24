import { OpenAI } from "openai";
import Cors from 'cors';

// Initialize the cors middleware
const cors = Cors({
  methods: ['POST', 'GET', 'HEAD', 'OPTIONS'],
  origin: '*',
});

// Helper method to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subject, numQuestions, difficulty, additionalDetails } = req.body;
    
    // Validate inputs
    if (!subject || !numQuestions || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const prompt = `Create a ${difficulty} level quiz about ${subject} with ${numQuestions} questions. 
    ${additionalDetails ? `Additional details: ${additionalDetails}` : ''}
    Format the response as a JSON object with the following structure:
    {
      "title": "Quiz Title",
      "questions": [
        {
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Correct option (A, B, C, or D)",
          "explanation": "Brief explanation of the answer"
        }
      ]
    }`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful quiz creator assistant." },
        { role: "user", content: prompt }
      ],
    });
    
    // Parse the JSON from the completion
    const quizData = JSON.parse(completion.choices[0].message.content);
    
    return res.status(200).json(quizData);
  } catch (error) {
    console.error('Error generating quiz:', error);
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
}