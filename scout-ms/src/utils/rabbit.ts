import * as ampq from "amqplib";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as E from "fp-ts/Either";
import { InitiativeEnum } from "./types";

export const getQueueConsumer = (
  connectionString: string,
  topicName: string
): TE.TaskEither<Error, ampq.Channel> =>
  pipe(
    TE.tryCatch(() => ampq.connect(connectionString), E.toError),
    TE.bind("channel", (conn) =>
      TE.tryCatch(() => conn.createChannel(), E.toError)
    ),
    TE.bind("assert", ({ channel }) =>
      TE.tryCatch(() => channel.assertQueue(topicName), E.toError)
    ),
    TE.map(({ channel }) => channel)
  );

export const initializeConsumers = (
  connectionString: string,
  initiatives: ReadonlyArray<InitiativeEnum>
): TE.TaskEither<Error, { readonly [initiative: string]: ampq.Channel }> =>
  pipe(
    initiatives,
    RA.map((initiative) =>
      pipe(
        getQueueConsumer(connectionString, initiative),
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
