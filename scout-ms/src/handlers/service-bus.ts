/* eslint-disable no-console */
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import { ServiceBusReceiver } from "@azure/service-bus";
import { errorsToReadableMessages } from "@pagopa/ts-commons/lib/reporters";
import { MessagePayload } from "../utils/types";

export const serviceBusHandler =
  (receiver: ServiceBusReceiver) =>
  (
    documentHandler: (message: MessagePayload) => TE.TaskEither<Error, void>
  ): TE.TaskEither<
    Error,
    {
      close(): Promise<void>;
    }
  > =>
    pipe(
      receiver.subscribe({
        async processMessage(message) {
          await pipe(
            {
              sequenceNumber: message.sequenceNumber.low,
              timestamp: message.enqueuedTimeUtc.getTime(),
              ...message.body,
            },
            MessagePayload.decode,
            E.mapLeft((errs) =>
              Error(errorsToReadableMessages(errs).join("|"))
            ),
            TE.fromEither,
            TE.chain(documentHandler),
            TE.chain(() =>
              TE.tryCatch(() => receiver.completeMessage(message), E.toError)
            ),
            TE.getOrElse((err) => {
              throw err;
            })
          )();
        },
        async processError(args) {
          console.log(args.error);
        },
      }),
      TE.right
    );
