import { AMQPClient, AMQPQueue } from "@cloudamqp/amqp-client";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as E from "fp-ts/Either";
import { InitiativeEnum } from "./types";

export const getQueueConsumer = (
  connectionString: string,
  topicName: string
): TE.TaskEither<Error, AMQPQueue> =>
  pipe(
    new AMQPClient(connectionString),
    (client) => TE.tryCatch(() => client.connect(), E.toError),
    TE.chain((bc) => TE.tryCatch(() => bc.channel(), E.toError)),
    TE.chain((c) => TE.tryCatch(() => c.queue(topicName), E.toError))
  );

export const initializeConsumers = (
  connectionString: string,
  initiatives: ReadonlyArray<InitiativeEnum>
): TE.TaskEither<Error, { readonly [initiative: string]: AMQPQueue }> =>
  pipe(
    initiatives,
    RA.map((initiative) => getQueueConsumer(connectionString, initiative)),
    RA.sequence(TE.ApplicativeSeq),
    TE.map(
      RA.reduce({}, (_, curr) => ({
        [curr.name]: curr,
      }))
    )
  );
