import { ServiceBusClient, ServiceBusReceiver } from "@azure/service-bus";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as RA from "fp-ts/ReadonlyArray";
import { pipe } from "fp-ts/lib/function";
import { InitiativeEnum } from "./types";

export const createReceiverBySession = (
  connectionString: string,
  topicName: string,
  sessionId: string
): TE.TaskEither<Error, ServiceBusReceiver> =>
  pipe(new ServiceBusClient(connectionString), (client) =>
    TE.tryCatch(() => client.acceptSession(topicName, sessionId), E.toError)
  );

export const initializeConsumers = (
  connectionString: string,
  topicName: string,
  initiatives: ReadonlyArray<InitiativeEnum>
): TE.TaskEither<
  Error,
  { readonly [initiative: string]: ServiceBusReceiver }
> =>
  pipe(
    initiatives,
    RA.map((initiative) =>
      pipe(
        createReceiverBySession(connectionString, topicName, initiative),
        TE.map((receiver) => ({ receiver, initiative }))
      )
    ),
    RA.sequence(TE.ApplicativeSeq),
    TE.map(
      RA.reduce({}, (_, curr) => ({
        [curr.initiative]: curr.receiver,
      }))
    )
  );
