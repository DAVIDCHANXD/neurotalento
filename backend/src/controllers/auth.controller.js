export function authController(service, google) {
  return {
    register: async (req, res) => res.status(201).json({ success: true, data: await service.register(req.input) }),
    login: async (req, res) => res.json({ success: true, data: await service.login(req.input) }),
    guardian: async (req, res) => res.json({ success: true, data: await service.saveGuardian(req.user, req.input) }),
    me: (req, res) => res.json({ success: true, data: req.user }),
    googleChallenge: (req, res) => res.json({ success: true, data: google.challenge() }),
    google: async (req, res) => res.json({ success: true, data: await google.login(req.input) }),
  };
}
