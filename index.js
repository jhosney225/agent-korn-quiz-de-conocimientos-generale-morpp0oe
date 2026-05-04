import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function generateQuestions() {
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate 5 general knowledge quiz questions in JSON format. 
        Each question should have:
        - id: number (1-5)
        - question: string
        - options: array of 4 strings (a, b, c, d)
        - correct_answer: string (a, b, c, or d)
        - category: string
        
        Return ONLY the JSON array, no other text.
        Example format:
        [
          {
            "id": 1,
            "question": "What is the capital of France?",
            "options": ["London", "Paris", "Berlin", "Madrid"],
            "correct_answer": "b",
            "category": "Geography"
          }
        ]`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") {
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }

  throw new Error("Failed to parse questions from Claude response");
}

async function runQuiz() {
  console.log("\n🎯 GENERAL KNOWLEDGE QUIZ 🎯");
  console.log("================================");
  console.log("Generating questions from Claude...\n");

  const questions = await generateQuestions();

  let score = 0;
  const answers = [];

  for (const q of questions) {
    console.log(`\n[Question ${q.id}/${questions.length}] - ${q.category}`);
    console.log(q.question);

    q.options.forEach((option, index) => {
      const letter = String.fromCharCode(97 + index);
      console.log(`  ${letter}) ${option}`);
    });

    let userAnswer = "";
    let valid = false;

    while (!valid) {
      userAnswer = await askQuestion("\nYour answer (a/b/c/d): ");
      userAnswer = userAnswer.toLowerCase().trim();

      if (["a", "b", "c", "d"].includes(userAnswer)) {
        valid = true;
      } else {
        console.log("Invalid input. Please enter a, b, c, or d.");
      }
    }

    answers.push({
      questionId: q.id,
      userAnswer: userAnswer,
      correctAnswer: q.correct_answer,
      isCorrect: userAnswer === q.correct_answer,
    });

    if (userAnswer === q.correct_answer) {
      console.log("✅ Correct!");
      score++;
    } else {
      const correctIndex = q.correct_answer.charCodeAt(0) - 97;
      console.log(`❌ Wrong! The correct answer was: ${q.correct_answer}) ${q.options[correctIndex]}`);
    }
  }

  displayResults(score, questions.length, answers);
  rl.close();
}

function displayResults(score, total, answers) {
  const percentage = Math.round((score / total) * 100);

  console.log("\n\n================================");
  console.log("📊 QUIZ RESULTS 📊");
  console.log("================================");
  console.log(`Final Score: ${score}/${total}`);
  console.log(`Percentage: ${percentage}%`);

  let performance = "";
  if (percentage === 100) {
    performance = "🌟 PERFECT SCORE! Outstanding!";
  } else if (percentage >= 80) {
    performance = "👏 Excellent work!";
  } else if (percentage >= 60) {
    performance = "👍 Good job!";
  } else if (percentage >= 40) {
    performance = "📚 Keep practicing!";
  } else {
    performance = "💪 Keep learning!";
  }

  console.log(`\n${performance}`);

  console.log("\n--- Answer Review ---");
  answers.forEach((answer, index) => {
    const status = answer.isCorrect ? "✅" : "❌";
    console.log(`Q${index + 1}: ${status}`);
  });

  console.log("\n================================");
}

async function main() {
  try {
    await runQuiz();
  } catch (error) {
    if (error.code !== "ERR_USE_AFTER_CLOSE") {
      console.error("Error:", error.message);
    }
    rl.close();
    process.exit(1);
  }
}

main();