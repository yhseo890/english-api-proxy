export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;

  // 🚨 모델명 자동 치환 (Groq deprecated 모델 대응)
  const MODEL_MAP = {
    "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
    "llama-3.1-8b-instant": "openai/gpt-oss-20b",
  };

  if (body.model && MODEL_MAP[body.model]) {
    body.model = MODEL_MAP[body.model];
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return res.status(200).json(data);
}