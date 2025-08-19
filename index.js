import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import OpenAI from 'openai';

// === Env ===
const TOKEN = process.env.DISCORD_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const TARGET_CHANNEL = process.env.TARGET_CHANNEL;      // مثال: "1406353807956508848"
const ROAST_ROLE_ID = process.env.ROAST_ROLE_ID;        // الرتبة الي نقرصها (بدون إساءة)
const OWNER_ID = process.env.OWNER_ID;                  // عشان نقول لك "مولاي"

// === Discord client ===
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// === OpenAI ===
const ai = new OpenAI({ apiKey: OPENAI_KEY });

// مساعد للتأكد إن الرد ما فيه تجاوز
function safetyGuard(text) {
  const banned = [
    // كلمات وإهانات مباشرة/عنصرية/شتائم – نحذف أو نستبدل لو ظهرت
    'عنصري', 'حمار', 'غبي', '***' // اترك أمثلة فقط؛ النموذج أصلاً موجه لتجنبها
  ];
  let clean = text;
  for (const w of banned) {
    clean = clean.replace(new RegExp(w, 'gi'), '🙂');
  }
  return clean;
}

// توليد رد ذكي
async function smartReply({ content, style = 'friendly', displayName = 'صاحبي' }) {
  const system = `
أنت مساعد عربي ذكي جداً، خفيف دم، وتراعي الذوق العام.
- ممنوع السب أو الكلام العنصري أو إهانات جارحة.
- الردود مختصرة ومضحكة عند الحاجة.
- لو طُلب "roast" يكون قصف خفيف لطيف (مزاح)، بدون إساءة شخصية أو كلمات سوقية.
- استخدم لهجة عربية بسيطة ومفهومة.
`;

  const userPrompt =
    style === 'roast'
      ? `اكتب رد "roast" لطيف بدون إساءة لشخص اسمه ${displayName}. تعليق المستخدم: «${content}»`
      : `اكتب رداً ودوداً وذكيّاً. تعليق المستخدم: «${content}»`;

  const res = await ai.responses.create({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt }
    ]
  });

  const text =
    res.output_text?.trim() ||
    '🤖 جاهز دائماً للكلام الذكي، بس يبدو فيه هدوء بالشبكة...';

  return safetyGuard(text);
}

bot.once('ready', () => {
  console.log(`✅ Logged in as ${bot.user.tag}`);
});

bot.on('messageCreate', async (msg) => {
  try {
    if (msg.author.bot) return;
    if (!TARGET_CHANNEL || msg.channelId !== TARGET_CHANNEL) return;

    // معاملة خاصة للمالك
    if (msg.author.id === OWNER_ID) {
      const reply = await smartReply({
        content: msg.content,
        style: 'friendly',
        displayName: 'مولاي'
      });
      return void msg.reply(`يا مولاي 😌\n${reply}`);
    }

    // لو عنده رتبة الـ roast نرد عليه بقصف لطيف
    const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
    const hasRoastRole = member?.roles.cache.has(ROAST_ROLE_ID);

    const style = hasRoastRole ? 'roast' : 'friendly';
    const displayName = member?.displayName || msg.author.username;

    const reply = await smartReply({ content: msg.content, style, displayName });
    await msg.reply(reply);
  } catch (err) {
    console.error(err);
    if (!msg.author.bot) {
      msg.reply('⚠️ صار خطأ بسيط، جرّب رسالة ثانية.');
    }
  }
});

if (!TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN');
  process.exit(1);
}
if (!OPENAI_KEY) {
  console.error('❌ Missing OPENAI_KEY');
  process.exit(1);
}

bot.login("MTQwNzA1MDUyNDY0NTM5MjQ2NQ.GxrcxE.tRAuXRYb7ydxNmUQyowC9vdgaL5sXYeEbN6tNM");
