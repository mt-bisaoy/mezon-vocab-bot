 const userService = require('./services/userService');
const vocabService = require('./services/vocabService');

// Biến tạm để lưu trạng thái review của user
const activeReviews = new Map();

const handleAddCommand = async (client, event, content) => {
  const channel = await client.channels.fetch(event.channel_id);
  const parts = content.split(' - ').map(p => p.trim());
  if (parts.length < 2) {
    return channel.send({ t: "Cú pháp sai. Dùng: `/add Từ - Nghĩa - [Ví dụ]`" });
  }

  const [word, meaning, example = ''] = parts;
  const mezonUser = await client.users.fetch(event.sender_id);
  const user = await userService.findOrCreateUser(event.sender_id, mezonUser.username);

  try {
    await vocabService.addWord(user.id, word, meaning, example);
    await channel.send({ t: `✅ Đã thêm từ mới: **${word}**` });
  } catch (err) {
    console.error('Error in /add command:', err);
    await channel.send({ t: "❌ Đã có lỗi xảy ra." });
  }
};

const handleListCommand = async (client, event) => {
    const channel = await client.channels.fetch(event.channel_id);
    const mezonUser = await client.users.fetch(event.sender_id);
    const user = await userService.findOrCreateUser(event.sender_id, mezonUser.username);
    try {
        const words = await vocabService.listWords(user.id);
        if (words.length === 0) {
            return channel.send({ t: "Bạn chưa có từ nào." });
        }
        const wordList = words.map((w, i) => `${i + 1}. **${w.word}**: ${w.meaning}`).join('\n');
        await channel.send({ t: `📚 **Từ vựng của bạn:**\n${wordList}` });
    } catch (err) {
        console.error('Error in /list command:', err);
        await channel.send({ t: "❌ Đã có lỗi xảy ra." });
    }
};

const handleReviewCommand = async (client, event) => {
    const channel = await client.channels.fetch(event.channel_id);
    const mezonUser = await client.users.fetch(event.sender_id);
    const user = await userService.findOrCreateUser(event.sender_id, mezonUser.username);

    try {
        const wordToReview = await vocabService.getReviewWord(user.id);
        if (!wordToReview) {
            return channel.send({ t: "🎉 Tuyệt vời! Bạn đã ôn hết các từ cần ôn. Hãy học từ mới hoặc chờ nhé!" });
        }

        // Lưu lại từ đang review cho user này
        activeReviews.set(user.mezon_id, wordToReview);

        const reviewMessage = `🤔 **Ôn tập nào!**\n\nTừ vựng: **${wordToReview.word}**\n\nNghĩa là gì nhỉ?\n\n*Gửi \`/dapan\` để xem và chấm điểm.*`;
        await channel.send({ t: reviewMessage });

    } catch (err) {
        console.error('Error in /review command:', err);
        await channel.send({ t: "❌ Đã có lỗi xảy ra." });
    }
};

const handleAnswerCommand = async (client, event) => {
    const channel = await client.channels.fetch(event.channel_id);
    const mezonId = event.sender_id;
    const wordToReview = activeReviews.get(mezonId);

    if (!wordToReview) {
        return channel.send({ t: "Bạn không có từ nào đang chờ ôn tập. Dùng `/review` để bắt đầu." });
    }
    
    // Xóa từ khỏi danh sách chờ để tránh trả lời nhiều lần
    activeReviews.delete(mezonId);

    const mezonUser = await client.users.fetch(event.sender_id);
    const user = await userService.findOrCreateUser(event.sender_id, mezonUser.username);
    
    const explanation = `**${wordToReview.word}**: ${wordToReview.meaning}\n*Ví dụ: ${wordToReview.example || 'Không có'}*`;

    // Đây là phần bạn sẽ hỏi người dùng là "bạn trả lời đúng hay sai?"
    // Vì Mezon chưa có button, ta sẽ mặc định là họ tự đánh giá
    await channel.send({ t: `**Đáp án:**\n${explanation}\n\nBạn đã trả lời đúng chứ? Gửi \`/dung\` hoặc \`/sai\` để ghi nhận tiến độ.` });
    
    // Lưu lại từ để chờ chấm điểm
    activeReviews.set(mezonId, { ...wordToReview, waitingForScore: true });
};

const handleScoreCommand = async (client, event, isCorrect) => {
    const channel = await client.channels.fetch(event.channel_id);
    const mezonId = event.sender_id;
    const wordInfo = activeReviews.get(mezonId);

    if (!wordInfo || !wordInfo.waitingForScore) {
        return channel.send({ t: "Không có đáp án nào đang chờ bạn chấm điểm." });
    }

    activeReviews.delete(mezonId);

    const mezonUser = await client.users.fetch(event.sender_id);
    const user = await userService.findOrCreateUser(event.sender_id, mezonUser.username);

    try {
        await vocabService.updateReviewProgress(user.id, wordInfo.id, isCorrect);
        const feedback = isCorrect 
            ? "✅ Tuyệt vời! Đã ghi nhận bạn trả lời đúng." 
            : "❌ Không sao cả! Lần sau sẽ nhớ nhé. Đã ghi nhận bạn trả lời sai.";
        await channel.send({ t: feedback });
    } catch (err) {
        console.error('Error updating score:', err);
        await channel.send({ t: "❌ Lỗi khi cập nhật tiến độ." });
    }
};


module.exports = {
  handleAddCommand,
  handleListCommand,
  handleReviewCommand,
  handleAnswerCommand,
  handleScoreCommand,
};
   

