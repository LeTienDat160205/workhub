export async function getTaskContext(req) {
  const cookie = req.headers.cookie || "";

  const [unfinished, upcoming] = await Promise.all([
    fetch("http://localhost:3000/api/chatbot/stats/tasks", {
      headers: { cookie }
    }).then(r => r.json()),

    fetch("http://localhost:3000/api/chatbot/stats/upcoming", {
      headers: { cookie }
    }).then(r => r.json())
  ]);

  return {
    unfinishedTasks: unfinished.unfinishedTasks,
    upcomingTasks: upcoming
  };
}
