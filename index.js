
const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const db = require('./db');
const { 
  handleAddCommand, 
  handleListCommand, 
  handleReviewCommand, 
  handleAnswerCommand,
  handleScoreCommand,
} = require('./handlers');

dotenv.config();

async function main() {
  await db.initDatabase();

  const client = new MezonClient(process.env.APPLICATION_TOKEN);
  await client.login();

  client.onChannelMessage(async (event) => {
    if (!event?.content?.t) return;
    const messageText = event.content.t.trim();

    // Điều phối viên Lệnh
    if (messageText.startsWith('/add ')) {
      const content = messageText.substring(5);
      await handleAddCommand(client, event, content);
    } else if (messageText === '/list') {
      await handleListCommand(client, event);
    } else if (messageText === '/review') {
      await handleReviewCommand(client, event);
    } else if (messageText === '/dapan') {
      await handleAnswerCommand(client, event);
    } else if (messageText === '/dung') {
      await handleScoreCommand(client, event, true);
    } else if (messageText === '/sai') {
      await handleScoreCommand(client, event, false);
    } else if (messageText === '/help') {
        const helpText = `
**VocaBuddy Help** 📖
- \`/add Từ - Nghĩa - [Ví dụ]\`: Thêm từ mới.
- \`/list\`: Xem danh sách từ đã học.
- \`/review\`: Bắt đầu một phiên ôn tập.
- \`/dapan\`: Xem đáp án của từ đang ôn tập.
- \`/dung\` hoặc \`/sai\`: Tự đánh giá câu trả lời của bạn.
`;
        const channel = await client.channels.fetch(event.channel_id);
        await channel.send({ t: helpText });
    }
  });
}

main()
  .then(() => {
    console.log("VocaBuddy Bot is now online and ready!");
  })
  .catch((error) => {
    console.error("Fatal error starting bot:", error);
  });
