
const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const db = require('./db');
const { 
  handleNaturalAdd, 
  handleNaturalReview,
  handleReviewAnswer,
  handleGiveUp,
  userConversations,
} = require('./handlers');


dotenv.config();

async function main() {
  await db.initDatabase();

  const client = new MezonClient(process.env.MEZON_API_KEY);
  await client.login();

  client.onChannelMessage(async (event) => {
    if (!event?.content?.t) return;
    const messageText = event.content.t.trim();
    const lowerCaseMessage = messageText.toLowerCase();
    const mezonId = event.sender_id;

    // Tạo một đối tượng context để truyền đi
    const context = { client, event };

    // KIỂM TRA TRẠNG THÁI HỘI THOẠI TRƯỚC
    const currentConversation = userConversations.get(mezonId);
    if (currentConversation && currentConversation.type === 'reviewing') {
      if (lowerCaseMessage.includes('bó tay') || lowerCaseMessage.includes('chịu') || lowerCaseMessage.includes('quên rồi')) {
        return handleGiveUp(context);
      }
      return handleReviewAnswer(context, messageText);
    }

    // PHÂN TÍCH Ý ĐỊNH MỚI
    const addWordRegex = /(?:tui|mình|tớ) mới học (?:được )?từ "?(.+?)"?,? nghĩa là "?(.+?)"?/;
    const addMatch = lowerCaseMessage.match(addWordRegex);
    if (addMatch) {
        const [, word, meaning] = addMatch;
        return handleNaturalAdd(context, { word, meaning });
    }

    if (['ôn bài', 'kiểm tra bài cũ', 'đố đi', 'kiểm tra tui'].some(keyword => lowerCaseMessage.includes(keyword))) {
        return handleNaturalReview(context);
    }

    if (lowerCaseMessage === '/help' || lowerCaseMessage === 'giúp tui' || lowerCaseMessage.includes('làm sao để dùng')) {
      const helpText = `
**Ê bồ, tui là VocaBuddy đây!** 📖
Tụi mình sẽ học từ vựng cùng nhau nhé:

1.  **Để thêm từ mới**, cứ nói chuyện tự nhiên, ví dụ:
    > "tui mới học từ 'diligent' nghĩa là 'chăm chỉ'"

2.  **Để ôn bài**, hãy rủ tui:
    > "ôn bài đi" hoặc "kiểm tra tui miếng"

3.  **Khi đang ôn bài**, nếu quên thì cứ nói:
    > "bó tay" hoặc "quên rồi"

Tụi mình cùng cố gắng nha! 💪
      `;
      const channel = await client.channels.fetch(event.channel_id);
      return channel.send({ t: helpText });
    }
  });
}

main()
  .then(() => {
    console.log("VocaBuddy, your AI study buddy, is now online!");
  })
  .catch((error) => {
    console.error("Fatal error starting the study buddy:", error);
  });