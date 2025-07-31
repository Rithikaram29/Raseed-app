import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { sendNotification } from "../services/sendNotification";

export default async function NotificationRoutes(app: FastifyInstance) {
  app.post("/send-push", async (request, reply) => {
    const { token, title, body } = request.body as any;

    const data = await sendNotification({ token, title, body });
    reply.send(data);
  });
}
