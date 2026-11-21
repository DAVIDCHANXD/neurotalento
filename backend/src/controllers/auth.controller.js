export function authController(service) {
  return {
    register: async (req, res) => res.status(201).json({ success: true, data: await service.register(req.input) }),
    login: async (req, res) => res.json({ success: true, data: await service.login(req.input) }),
    me: (req, res) => res.json({ success: true, data: req.user }),
  };
}
