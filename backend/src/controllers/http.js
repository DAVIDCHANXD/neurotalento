export const respond = (handler, status = 200) => async (req, res) => {
  const data = await handler(req);
  res.status(status).json({ success: true, data });
};
