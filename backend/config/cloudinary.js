import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.dqoc6wrdw,
  api_key: process.env.292454249529146,
  api_secret: process.env.ZMPDQvL2QPzbZtwTn__N8nBtqUg,
});

console.log("Cloudinary connected:", cloudinary.config().cloud_name);
export default cloudinary;
