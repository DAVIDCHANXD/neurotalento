import { respond } from './http.js';
export function coursesController(service) {
  return {
    list: respond(req => service.list(req.filters)),
    detail: respond(req => service.detail(req.params.id, req.user)),
    create: respond(req => service.create(req.input, req.user), 201),
    update: respond(req => service.update(req.params.id, req.input, req.user)),
    publish: respond(req => service.publish(req.params.id, req.user)),
    archive: respond(req => service.archive(req.params.id, req.user)),
    addModule: respond(req => service.addModule(req.params.courseId, req.input, req.user), 201),
    addLesson: respond(req => service.addLesson(req.params.moduleId, req.input, req.user), 201),
    edit: (kind, remove = false) => respond(req => service.editContent(kind, req.params.id, req.input, req.user, remove)),
  };
}
