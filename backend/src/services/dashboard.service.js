export function dashboardService(db, payments) {
  return {
    async creator(creatorId) {
      const [totalCourses, publishedCourses, totalEnrollments, students, earnings, topCourses, courses] = await Promise.all([
        db.course.count({ where: { creatorId } }),
        db.course.count({ where: { creatorId, status: 'PUBLISHED' } }),
        db.enrollment.count({ where: { course: { creatorId } } }),
        db.enrollment.groupBy({ by: ['studentId'], where: { course: { creatorId } } }),
        payments.earnings(creatorId),
        db.course.findMany({ where: { creatorId }, select: { id: true, title: true, _count: { select: { enrollments: true } } }, orderBy: { enrollments: { _count: 'desc' } }, take: 5 }),
        db.course.findMany({ where: { creatorId }, orderBy: { createdAt: 'desc' } }),
      ]);
      return { totalCourses, publishedCourses, totalStudents: students.length, totalEnrollments, totalSales: earnings.reduce((n, e) => n + e.totalSales, 0), earnings, topCourses, courses };
    },
    async student(studentId) {
      const enrollments = await db.enrollment.findMany({ where: { studentId }, include: { progress: { where: { completed: true } }, course: { include: { modules: { include: { _count: { select: { lessons: true } } } } } } } });
      let total = 0, done = 0, completedCourses = 0, inProgressCourses = 0;
      for (const e of enrollments) {
        const lessons = e.course.modules.reduce((n, m) => n + m._count.lessons, 0);
        total += lessons; done += e.progress.length;
        if (lessons > 0 && e.progress.length === lessons) completedCourses++;
        else if (e.progress.length) inProgressCourses++;
      }
      return { totalCourses: enrollments.length, inProgressCourses, completedCourses, overallProgress: total ? Math.round(done / total * 100) : 0 };
    },
  };
}
