import * as ampq from "amqplib";
import { constVoid, pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as E from "fp-ts/Either";
import { InitiativeEnum } from "./types";

export const getQueuePublisher = (
  connectionString: string
): TE.TaskEither<Error, ampq.Channel> =>
  pipe(
    TE.tryCatch(() => ampq.connect(connectionString), E.toError),
    TE.chain((conn) => TE.tryCatch(() => conn.createChannel(), E.toError))
  );

export const publishMessage =
  <T>(topicName: string) =>
  (channel: ampq.Channel, message: T): TE.TaskEither<Error, void> =>
    pipe(
      message,
      JSON.stringify,
      (strMsg) =>
        E.tryCatch(
          () => channel.sendToQueue(topicName, Buffer.from(strMsg)),
          E.toError
        ),
      TE.fromEither,
      TE.map(constVoid)
    );

export const initializePublishers = (
  connectionString: string,
  initiatives: ReadonlyArray<InitiativeEnum>
): TE.TaskEither<Error, { readonly [initiative: string]: ampq.Channel }> =>
  pipe(
    initiatives,
    RA.map((initiative) =>
      pipe(
        getQueuePublisher(connectionString),
        TE.map((channel) => ({ channel, initiative }))
      )
    ),
    RA.sequence(TE.ApplicativeSeq),
    TE.map(
      RA.reduce({}, (_, curr) => ({
        [curr.initiative]: curr.channel,
      }))
    )
  );
