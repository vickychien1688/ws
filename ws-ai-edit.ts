// Supabase Edge Function: ws-ai-edit
// 局部 AI 修圖代理：網頁傳「原圖＋遮罩＋指令」，這裡帶著 API 金鑰去呼叫 OpenAI，回傳新圖。
// 金鑰只存在 Supabase 的環境變數，永遠不會出現在網頁原始碼裡。
// 只允許名單內的帳號使用（Vicky＋教務共用帳號）。

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ALLOWED_EMAILS = ['vickychien127@gmail.com', 'pas.english@gmail.com'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: '只接受 POST' }, 405);
  if (!OPENAI_KEY) return json({ error: '後台還沒設定 OPENAI_API_KEY' }, 500);

  // 1) 驗證是本人的登入憑證
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: '缺少登入憑證' }, 401);

  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
  });
  if (!who.ok) return json({ error: '登入已過期，請重新登入' }, 401);
  const user = await who.json();
  if (!ALLOWED_EMAILS.includes(user?.email)) return json({ error: '沒有使用權限' }, 403);

  // 2) 取出參數
  let body: { image?: string; mask?: string; prompt?: string; size?: string };
  try { body = await req.json(); } catch { return json({ error: '資料格式錯誤' }, 400); }
  const { image, mask, prompt } = body;
  if (!image || !mask || !prompt) return json({ error: '需要 image、mask、prompt' }, 400);
  if (prompt.length > 1000) return json({ error: '指令太長' }, 400);

  // 3) 呼叫 OpenAI 圖片編輯（只改遮罩透明的區域）
  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('image', new Blob([b64ToBytes(image)], { type: 'image/png' }), 'image.png');
  form.append('mask', new Blob([b64ToBytes(mask)], { type: 'image/png' }), 'mask.png');
  form.append('prompt', prompt);
  form.append('size', body.size ?? '1024x1024');
  form.append('n', '1');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: form,
  });

  const out = await res.json();
  if (!res.ok) {
    const msg = out?.error?.message ?? '影像編輯失敗';
    return json({ error: msg }, res.status);
  }
  const b64 = out?.data?.[0]?.b64_json;
  if (!b64) return json({ error: 'AI 沒有回傳圖片' }, 502);

  return json({ image: `data:image/png;base64,${b64}` });
});
