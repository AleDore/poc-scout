import { AMQPMessage, AMQPQueue } from "@cloudamqp/amqp-client";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as J from "fp-ts/Json";
import { constVoid, flow, pipe } from "fp-ts/lib/function";
import { readableReport } from "../utils/logging";
import { MessagePayload } from "../utils/types";

export const ampqHandler =
  (queue: AMQPQueue) =>
  (
    documentHandler: (
      ampqDocument: MessagePayload,
      timestamp: Date
    ) => TE.TaskEither<Error, void>
  ): TE.TaskEither<Error, void> =>
    pipe(
      TE.tryCatch(
        () =>
          queue.subscribe(
            { noAck: false, exclusive: true },
            async (msg: AMQPMessage) =>
              await pipe(
                msg.bodyToString(),
                J.parse,
                E.mapLeft((errs) =>
                  Error(
                    `Cannot parse ampq message to json|ERROR=${String(errs)}`
                  )
                ),
                E.chainW(
                  flow(
                    MessagePayload.decode,
                    E.mapLeft((e) =>
                      Error(
                        `Cannot decode ampq message to type |ERROR=${readableReport(
                          e
                        )}`
                      )
                    )
                  )
                ),
                TE.fromEither,
                TE.chain((doc) =>
                  documentHandler(doc, msg.properties.timestamp)
                ),
                TE.chain(() => TE.tryCatch(() => msg.ack(), E.toError)),
                TE.orElse(() => TE.tryCatch(() => msg.nack(true), E.toError)),
                TE.toUnion
              )()
          ),
        E.toError
      ),
      TE.map(constVoid)
    );
