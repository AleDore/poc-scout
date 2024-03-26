import * as ampq from "amqplib";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as J from "fp-ts/Json";
import { constVoid, flow, pipe } from "fp-ts/lib/function";
import { readableReport } from "../utils/logging";
import { MessagePayload } from "../utils/types";

export const ampqHandler =
  (queueChannel: ampq.Channel, queueName: string) =>
  (
    documentHandler: (
      ampqDocument: MessagePayload
    ) => TE.TaskEither<Error, void>
  ): TE.TaskEither<Error, void> =>
    pipe(
      TE.tryCatch(
        () =>
          queueChannel.consume(
            queueName,
            async (msg: ampq.ConsumeMessage) =>
              await pipe(
                msg.content.toString(),
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
                TE.chain(documentHandler),
                TE.map(() => queueChannel.ack(msg)),
                TE.orElse(() => TE.of(queueChannel.nack(msg))),
                TE.toUnion
              )()
          ),
        E.toError
      ),
      TE.map(constVoid)
    );
