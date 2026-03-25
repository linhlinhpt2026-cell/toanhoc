module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' })
  }

  const { prompt } = req.body
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  const systemPrompt = `You are a question generator for an educational quiz game.
Given the user's request, generate quiz questions in the exact JSON format below.

IMPORTANT RULES:
- Each question must have exactly 4 answer options
- One option must be the correct answer
- The "correct" field must exactly match one of the options
- Options should be plausible but only one is correct
- Questions should be appropriate for the requested difficulty/grade level
- Generate the number of questions the user asks for (default 10 if not specified)
- Questions and options text should be in Vietnamese if the user writes in Vietnamese, otherwise match the user's language
- Return ONLY a valid JSON array, no markdown, no code blocks, no extra text

JSON format:
[
  {
    "text": "question text here",
    "correct": "the correct answer",
    "options": ["option A", "option B", "option C", "option D"]
  }
]`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      return res.status(502).json({ error: 'Failed to generate questions from AI' })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return res.status(502).json({ error: 'No response from AI' })
    }

    const questions = JSON.parse(text)

    if (!Array.isArray(questions)) {
      return res.status(502).json({ error: 'AI returned invalid format' })
    }

    // Validate and clean questions
    const cleaned = questions
      .filter(q => q.text && q.correct && Array.isArray(q.options) && q.options.length === 4)
      .map(q => ({
        text: String(q.text),
        correct: String(q.correct),
        options: q.options.map(o => String(o))
      }))

    if (cleaned.length === 0) {
      return res.status(502).json({ error: 'AI generated no valid questions' })
    }

    res.json({ questions: cleaned })
  } catch (err) {
    console.error('Generate questions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
