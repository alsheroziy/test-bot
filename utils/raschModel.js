/**
 * Rash modeli (Rasch model) implementatsiyasi
 * Bu model savollar qiyinligi va talabgor qobiliyati o'rtasidagi o'zaro ta'sirni hisobga oladi
 */

class RaschModel {
  /**
   * Rash modeli bo'yicha ball hisoblash
   * @param {number} correctAnswers - To'g'ri javoblar soni
   * @param {number} totalQuestions - Jami savollar soni
   * @param {Array} questionDifficulty - Har bir savolning qiyinlik darajasi (0-1)
   * @param {Array} userAnswers - Foydalanuvchi javoblari
   * @param {Array} testQuestions - Test savollari (to'g'ri javoblarni olish uchun)
   * @returns {Object} Rash modeli natijalari
   */
  static calculateRaschScore(
    correctAnswers,
    totalQuestions,
    questionDifficulty,
    userAnswers,
    testQuestions
  ) {
    try {
      // Agar qiyinlik ma'lumotlari yo'q bo'lsa, oddiy ball hisoblash
      if (!questionDifficulty || questionDifficulty.length === 0) {
        return {
          rawScore: correctAnswers,
          totalQuestions: totalQuestions,
          percentage: Math.round((correctAnswers / totalQuestions) * 100),
          raschScore: Math.round((correctAnswers / totalQuestions) * 100),
          adjustedScore: Math.round((correctAnswers / totalQuestions) * 100),
          grade: this.getGrade(
            Math.round((correctAnswers / totalQuestions) * 100)
          ),
        };
      }

      // Rash modeli parametrlari
      const userAbility = this.estimateUserAbility(
        correctAnswers,
        totalQuestions,
        questionDifficulty
      );

      // Har bir savol uchun Rash ballini hisoblash
      let raschScore = 0;
      let adjustedScore = 0;
      let totalWeight = 0;
      let answeredQuestions = 0;

      for (let i = 0; i < totalQuestions; i++) {
        const difficulty = questionDifficulty[i] || 0.5; // Default qiyinlik
        const userAnswerData = userAnswers[i];
        const question = testQuestions[i];

        let isCorrect = false;
        let answered = false;

        if (userAnswerData) {
          if (question.questionType === "written") {
            // Yozma savol
            if (userAnswerData.type === "written" && !userAnswerData.skipped) {
              answered = true;
              isCorrect =
                userAnswerData.answer.toLowerCase().trim() ===
                question.correctWrittenAnswer.toLowerCase().trim();
            }
          } else {
            // Variantli savol
            if (
              userAnswerData.type === "multiple_choice" &&
              !userAnswerData.skipped
            ) {
              answered = true;
              isCorrect = userAnswerData.answer === question.correctAnswer;
            }
          }
        }

        // Rash modeli formulasiga asoslangan ball
        const raschProbability = this.calculateRaschProbability(
          userAbility,
          difficulty
        );
        const questionWeight = this.calculateQuestionWeight(difficulty);

        if (answered) {
          // Faqat javob berilgan savollar
          answeredQuestions++;
          if (isCorrect) {
            // Rash modeli balli: qiyinlikka asoslangan
            raschScore += raschProbability * 100;
            // Tuzatilgan ball: qiyin savollarga ko'proq ball
            // Qiyin savol = ko'proq ball
            adjustedScore += (1 + difficulty) * 100;
          }
          totalWeight += 1 + difficulty;
        }
      }

      // O'rtacha ball hisoblash
      const averageRaschScore =
        answeredQuestions > 0 ? Math.round(raschScore / answeredQuestions) : 0;

      // Tuzatilgan ball: qiyin savollarga ko'proq ball berish
      let finalAdjustedScore = 0;
      if (totalWeight > 0) {
        // Qiyinlikka asoslangan ball
        const weightedScore = adjustedScore / totalWeight;
        // Rash modeli bilan o'rtacha
        finalAdjustedScore = Math.round(
          (weightedScore + averageRaschScore) / 2
        );
      } else {
        finalAdjustedScore = averageRaschScore;
      }

      // Debug ma'lumotlari
      console.log("Rash modeli hisoblash:", {
        correctAnswers,
        totalQuestions,
        rawPercentage: (correctAnswers / totalQuestions) * 100,
        userAbility,
        averageRaschScore,
        weightedScore: totalWeight > 0 ? adjustedScore / totalWeight : 0,
        finalAdjustedScore,
      });

      return {
        rawScore: correctAnswers,
        totalQuestions: totalQuestions,
        percentage: Math.round((correctAnswers / totalQuestions) * 100),
        raschScore: averageRaschScore,
        adjustedScore: finalAdjustedScore,
        userAbility: userAbility,
        grade: this.getGrade(finalAdjustedScore),
      };
    } catch (error) {
      console.error("Rasch model calculation error:", error);
      // Xatolik bo'lsa oddiy ball qaytarish
      return {
        rawScore: correctAnswers,
        totalQuestions: totalQuestions,
        percentage: Math.round((correctAnswers / totalQuestions) * 100),
        raschScore: Math.round((correctAnswers / totalQuestions) * 100),
        adjustedScore: Math.round((correctAnswers / totalQuestions) * 100),
        grade: this.getGrade(
          Math.round((correctAnswers / totalQuestions) * 100)
        ),
      };
    }
  }

  /**
   * Foydalanuvchi qobiliyatini taxmin qilish
   * @param {number} correctAnswers - To'g'ri javoblar soni
   * @param {number} totalQuestions - Jami savollar soni
   * @param {Array} questionDifficulty - Savollar qiyinligi
   * @returns {number} Foydalanuvchi qobiliyati (-3 dan 3 gacha)
   */
  static estimateUserAbility(
    correctAnswers,
    totalQuestions,
    questionDifficulty
  ) {
    const rawPercentage = correctAnswers / totalQuestions;

    // Qiyinlik o'rtachasini hisoblash
    const avgDifficulty =
      questionDifficulty.reduce((sum, diff) => sum + (diff || 0.5), 0) /
      questionDifficulty.length;

    // Rash modeli formulasiga asoslangan qobiliyat taxmini
    let ability;

    if (rawPercentage === 1.0) {
      // 100% to'g'ri javob - maksimal qobiliyat
      ability = 3.0;
    } else if (rawPercentage === 0.0) {
      // 0% to'g'ri javob - minimal qobiliyat
      ability = -3.0;
    } else {
      // Logit transformatsiyasi (0-100% oralig'ida)
      const logit = Math.log(rawPercentage / (1 - rawPercentage));
      ability = logit;
    }

    // Qiyinlik bilan tuzatish
    const adjustedAbility = ability + (avgDifficulty - 0.5) * 2;

    // Chegaralash (-3 dan 3 gacha)
    return Math.max(-3, Math.min(3, adjustedAbility));
  }

  /**
   * Rash modeli ehtimolligini hisoblash
   * @param {number} ability - Foydalanuvchi qobiliyati
   * @param {number} difficulty - Savol qiyinligi
   * @returns {number} To'g'ri javob berish ehtimolligi
   */
  static calculateRaschProbability(ability, difficulty) {
    const logit = ability - difficulty;
    return 1 / (1 + Math.exp(-logit));
  }

  /**
   * Savol og'irligini hisoblash (qiyinlikka asoslangan)
   * @param {number} difficulty - Savol qiyinligi (0-1)
   * @returns {number} Savol og'irligi
   */
  static calculateQuestionWeight(difficulty) {
    // Qiyin savollarga ko'proq og'irlik berish
    // 0.1 qiyinlik (oson) = 1.0 og'irlik
    // 0.9 qiyinlik (qiyin) = 2.0 og'irlik
    return 1.0 + difficulty;
  }

  /**
   * To'g'ri javobni olish (test ma'lumotlaridan)
   * @param {number} questionIndex - Savol indeksi
   * @param {Array} testQuestions - Test savollari
   * @returns {number} To'g'ri javob indeksi
   */
  static getCorrectAnswer(questionIndex, testQuestions) {
    if (testQuestions && testQuestions[questionIndex]) {
      return testQuestions[questionIndex].correctAnswer;
    }
    return 0; // Default fallback
  }

  /**
   * Baholash tizimi
   * @param {number} percentage - Foiz
   * @returns {string} Baho
   */
  static getGrade(percentage) {
    if (percentage >= 70) return "A+";
    if (percentage >= 65) return "A";
    if (percentage >= 60) return "B+";
    if (percentage >= 55) return "B";
    if (percentage >= 50) return "C+";
    if (percentage >= 46) return "C";
    return "F";
  }

  /**
   * Savollar qiyinligini hisoblash (barcha foydalanuvchilar natijalariga asoslangan)
   * @param {Array} allUserAnswers - Barcha foydalanuvchilar javoblari
   * @param {number} totalQuestions - Jami savollar soni
   * @returns {Array} Har bir savolning qiyinlik darajasi
   */
  static calculateQuestionDifficulty(allUserAnswers, totalQuestions) {
    const difficulty = [];

    for (let i = 0; i < totalQuestions; i++) {
      let correctCount = 0;
      let totalAttempts = 0;

      allUserAnswers.forEach((userAnswers) => {
        if (userAnswers[i] !== undefined && userAnswers[i] !== -1) {
          totalAttempts++;
          // Bu yerda to'g'ri javobni tekshirish kerak
          // Hozircha oddiy hisob qilamiz
          if (userAnswers[i] === 0) {
            // A javobini to'g'ri deb hisoblaymiz
            correctCount++;
          }
        }
      });

      // Qiyinlik = 1 - to'g'ri javob berish foizi
      const difficultyLevel =
        totalAttempts > 0 ? 1 - correctCount / totalAttempts : 0.5;
      difficulty.push(difficultyLevel);
    }

    return difficulty;
  }
}

module.exports = RaschModel;
