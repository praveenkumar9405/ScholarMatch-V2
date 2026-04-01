export function matchScholarships(user, scholarships) {
  return scholarships
    .map((scholarship) => {
      let score = 0;
      let isEligible = true;

      // 1. Filter: caste match
      if (scholarship.caste_required && scholarship.caste_required !== 'all') {
        const allowedCastes = scholarship.caste_required.toLowerCase().split(',');
        if (!allowedCastes.includes(user.caste.toLowerCase())) {
          isEligible = false;
        }
      }

      // 2. Filter: income limit
      if (scholarship.income_limit && parseFloat(user.income) > parseFloat(scholarship.income_limit)) {
        isEligible = false;
      }

      // 3. Filter: state match
      if (scholarship.state && scholarship.state.toLowerCase() !== 'all') {
        const allowedStates = scholarship.state.toLowerCase().split(',');
        if (!allowedStates.includes(user.state.toLowerCase())) {
           isEligible = false;
        }
      }

      // 4. Filter: course match
      if (scholarship.course && scholarship.course.toLowerCase() !== 'all') {
         const allowedCourses = scholarship.course.toLowerCase().split(',');
         if (!allowedCourses.includes(user.course.toLowerCase())) {
            isEligible = false;
         }
      }

      if (!isEligible) return { ...scholarship, score: 0 };

      // Base score for passing hard filters
      score += 50;

      // Score: Deadline proximity (up to 25 points)
      if (scholarship.deadline) {
        const daysUntilDeadline = (new Date(scholarship.deadline) - new Date()) / (1000 * 60 * 60 * 24);
        if (daysUntilDeadline > 0 && daysUntilDeadline <= 15) {
          score += 25;
        } else if (daysUntilDeadline > 15 && daysUntilDeadline <= 30) {
          score += 15;
        } else if (daysUntilDeadline > 30) {
           score += 5;
        }
      }

      // Score: Scholarship amount (up to 25 points)
      if (scholarship.amount) {
        score += Math.min((scholarship.amount / 100000) * 25, 25);
      }

      // Cap at 99 for realism
      return { ...scholarship, score: Math.min(score, 99) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
