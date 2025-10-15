import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getGeminiReply(prompt) {
  try {
    // ✅ Dùng model mới
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    // Hoặc model "gemini-2.5-flash" nếu tài khoản bạn đã được bật quyền truy cập

    const result = await model.generateContent(`
      Bạn là trợ lý WorkHub, chatbot hỗ trợ người dùng bằng tiếng Việt.
      Trả lời ngắn gọn, thân thiện, dễ hiểu.
      Người dùng: ${prompt}
      Trợ lý:
    `);

    return result.response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Xin lỗi, mình đang gặp chút trục trặc khi kết nối với Gemini 😢";
  }
}
