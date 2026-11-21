import { respond } from './http.js';
export function paymentsController(service) {
  return {
    checkout: respond(req => service.checkout(req.user.id, req.input.courseId), 201),
    history: respond(req => service.history(req.user.id)),
    earnings: respond(req => service.earnings(req.user.id)),
  };
}
