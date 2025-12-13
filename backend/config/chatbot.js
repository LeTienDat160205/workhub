// import { GoogleGenerativeAI } from "@google/generative-ai";
// import dotenv from "dotenv";
// dotenv.config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// export async function getGeminiReply(prompt) {
//   try {
//     // Dùng model mới
//     const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
//     // Hoặc model "gemini-2.5-flash" nếu tài khoản bạn đã được bật quyền truy cập

//     const result = await model.generateContent(`
//       Bạn là trợ lý WorkHub, chatbot hỗ trợ người dùng bằng tiếng Việt.
//       Trả lời ngắn gọn, thân thiện, dễ hiểu.
//       Người dùng: ${prompt}
//       Trợ lý:
//     `);

//     return result.response.text();
//   } catch (error) {
//     console.error("Gemini API error:", error);
//     return "Xin lỗi, mình đang gặp chút trục trặc khi kết nối với Gemini 😢";
//   }
// }

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getGeminiReply(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Retry 3 lần
  for (let i = 0; i < 3; i++) {
    try {
      const SYSTEM_PROMPT = `
Bạn là *WorkHub Assistant* — trợ lý thông minh của nền tảng quản lý công việc và nhóm WorkHub.

Nhiệm vụ của bạn:
- Trả lời bằng tiếng Việt, giọng **thân thiện – rõ ràng – chính xác – lịch sự**
- Hướng dẫn người dùng sử dụng WorkHub: nhóm, công việc, chat, giao việc, nộp file, thông báo…
- Ưu tiên câu trả lời ngắn gọn nhưng đủ ý
- Nếu người dùng hỏi về tính năng có thật → giải thích chi tiết
- Nếu người dùng hỏi về công việc → đưa ra lời khuyên thực tế
- Nếu không chắc → hỏi lại hoặc xin thêm thông tin

Quy tắc trả lời:
- Tránh dùng câu rập khuôn như “tôi không biết bạn đang nói gì”
- Không nói lan man
- Không tạo dữ liệu không tồn tại
- Luôn đặt lợi ích người dùng lên trước

Thông tin về hệ thống WorkHub để bạn sử dụng trong trả lời:

- WorkHub cho phép tạo nhóm (team) và mời thành viên tham gia
- Công việc (task) có: tên, mô tả, deadline, người tạo, người được giao
- Công việc có thể có file đính kèm và file nộp
- Mỗi công việc sẽ có 1 phòng chat riêng (chat task)
- Người dùng có thể chat real-time trong nhóm và trong công việc
- Hệ thống có thông báo (notification)
- Người dùng có vai trò: leader, member

Chỉ dùng dữ liệu thật — không được bịa đặt task ID, group ID hay tên người dùng.

Trả lời theo giọng như trợ lý thật, không máy móc.
`;

      const result = await model.generateContent(`
        ${SYSTEM_PROMPT}
        Người dùng: ${prompt}
        Trợ lý:
      `);

      return result.response.text();
    } catch (error) {
      console.error("Gemini API error (attempt " + (i + 1) + "):", error);

      // Model overloaded → thử lại
      if (
        error.message?.includes("overloaded") ||
        error.message?.includes("503")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 800)); // đợi 0.8s rồi thử lại
        continue;
      }

      // Lỗi khác → break luôn
      break;
    }
  }

  // Fallback nếu thử 3 lần vẫn lỗi
  return "Server Gemini đang quá tải hoặc không phản hồi. Bạn thử lại sau 1 phút nhé!";
}
