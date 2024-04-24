import { ServiceBusClient, ServiceBusSender } from "@azure/service-bus";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";

export const createSender = (
  connectionString: string,
  topicName: string
): ServiceBusSender =>
  new ServiceBusClient(connectionString).createSender(topicName);

export const publishMessage =
  (initiativeId: string) =>
  <T>(sender: ServiceBusSender, message: T): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      () =>
        sender.sendMessages({
          body: message,
          contentType: "application/json",
          partitionKey: initiativeId,
          sessionId: initiativeId,
        }),

      E.toError
    );
