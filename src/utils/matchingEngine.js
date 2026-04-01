export function matchScholarships(user, scholarships) {
  if (!user || !scholarships || !Array.isArray(scholarships)) return [];
  
  return scholarships
    .map((scholarship) => {
      let score = 0;
      let isEligible = true;

      // 1. Filter: caste match
      if (scholarship.caste_required && scholarship.caste_required.toLowerCase() !== 'all') {
        const allowedCastes = scholarship.caste_required.toLowerCase().split(',').map(c => c.trim());
        const userCaste = (user.caste || '').toLowerCase();
        if (userCaste && !allowedCastes.includes(userCaste)) {
          isEligible = false;
        }
      }

      // 2. Filter: income limit (works with both bigint from DB and string from local)
      if (scholarship.income_limit && user.income) {
        if (Number(user.income) > Number(scholarship.income_limit)) {
          isEligible = false;
        }
      }

      // 3. Filter: state match (handles 'all', 'All India', and specific states)
      if (scholarship.state) {
        const stateVal = scholarship.state.toLowerCase().trim();
        if (stateVal !== 'all' && stateVal !== 'all india') {
          const allowedStates = stateVal.split(',').map(s => s.trim());
          const userState = (user.state || '').toLowerCase().trim();
          if (userState && userState !== 'all india' && !allowedStates.includes(userState)) {
             isEligible = false;
          }
        }
      }

      // 4. Filter: course match
      if (scholarship.course && scholarship.course.toLowerCase() !== 'all') {
         const allowedCourses = scholarship.course.toLowerCase().split(',').map(c => c.trim());
         const userCourse = (user.course || '').toLowerCase().trim();
         if (userCourse && !allowedCourses.includes(userCourse)) {
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
      const amt = Number(scholarship.amount);
      if (!isNaN(amt) && amt > 0) {
        score += Math.min((amt / 100000) * 25, 25);
      }

      // Cap at 99 for realism
      return { ...scholarship, score: Math.min(score, 99) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
