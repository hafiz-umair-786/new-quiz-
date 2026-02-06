import quizData from "../../data/questions.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { category, askedIds = [] } = req.body || {};

  const categoryData = quizData.find(c => c.category === category);
  if (!categoryData) {
    return res.status(400).json({ error: "Invalid category" });
  }

  if (askedIds.length >= categoryData.questions.length) {
    return res.json({ finished: true });
  }

  const remainingIndexes = categoryData.questions
    .map((_, i) => i)
    .filter(i => !askedIds.includes(i));

  const randomIndex =
    remainingIndexes[Math.floor(Math.random() * remainingIndexes.length)];

  const q = categoryData.questions[randomIndex];

  res.status(200).json({
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    whyCorrect: q.whyCorrect,
    originalIndex: randomIndex,
    finished: false,
  });
}
