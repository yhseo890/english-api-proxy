export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // 이미지 전송을 위해 용량 제한을 조금 늘려줍니다.
    },
  },
};

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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const requestBody = JSON.stringify({
      contents: [{
        parts: [
          { text: text },
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    });

    // 503(과부하) 에러 대비 최대 3번 재시도, 매번 조금씩 대기시간 늘림
    let data;
    let lastError;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody
      });

      data = await response.json();

      // 성공 or 재시도해도 소용없는 에러(404, 400 등)면 바로 빠져나감
      if (response.ok || (data.error && data.error.code !== 503)) {
        break;
      }

      lastError = data.error;
      console.log(`Gemini 503, 재시도 ${attempt + 1}/${maxRetries}`);
      // 1초, 2초, 3초 순서로 대기 후 재시도
      await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
    }

    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      console.error("Gemini Response Error:", data);
      return res.status(500).json({ error: 'Gemini로부터 올바른 응답을 받지 못했습니다. (서버 과부하일 수 있어요, 잠시 후 다시 시도해주세요)' });
    }

    const rawContent = data.candidates[0].content.parts[0].text;
    res.status(200).json(JSON.parse(rawContent));

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: 'Failed to fetch from Gemini', details: error.message });
  }
}