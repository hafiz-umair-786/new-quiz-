import quizData from "../../data/questions.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const categories = quizData.map(c => ({
    category: c.category,
    category_title: c.category_title,
  }));

  res.status(200).json({ categories });
}
