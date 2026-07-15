export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // 이미지 전송을 위해 용량 제한을 조금 늘려줍니다.
    },
  },
};

// 깃허브 강제 업데이트용 주석

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
      return res.status(500).json({ error: 'Vercel에 GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: text },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
          ]
        }],
        generationConfig: { 
          response_mime_type: "application/json" 
        }
      })
    });

    const data = await response.json();
    
    // API 응답 구조 검증
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      console.error("Gemini Response Error:", data);
      return res.status(500).json({ error: 'Gemini로부터 올바른 응답을 받지 못했습니다.' });
    }

    const rawContent = data.candidates[0].content.parts[0].text;
    res.status(200).json(JSON.parse(rawContent));

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: 'Failed to fetch from Gemini', details: error.message });
  }
}
